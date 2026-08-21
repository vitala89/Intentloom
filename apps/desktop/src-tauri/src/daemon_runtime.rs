use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
#[cfg(windows)]
use std::path::PathBuf;
use std::process::{Child, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::bridge::BridgeError;
use crate::daemon_recovery::{
    next_action_after_probe, next_action_before_probe, ChildState, EnsureAction,
};
use crate::daemon_transport::send_request;
use crate::daemon_launch::{
    build_launch_command, launch_spawn_error, preflight_launch, resolve_launch_spec,
};
use crate::native_paths::catalog_root;
use crate::runtime_paths::RuntimePaths;

#[derive(Default)]
struct RuntimeInner {
    paths: Option<RuntimePaths>,
    child: Option<Child>,
    owns_daemon: bool,
}

#[derive(Clone, Default)]
pub struct DaemonRuntime(Arc<Mutex<RuntimeInner>>);

impl Drop for RuntimeInner {
    fn drop(&mut self) {
        self.shutdown();
    }
}

impl RuntimeInner {
    fn shutdown(&mut self) {
        if self.owns_daemon {
            if let Some(child) = self.child.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }
            if let Some(paths) = self.paths.as_ref() {
                remove_owned_endpoint(&paths.endpoint);
            }
        }
        self.child = None;
        self.owns_daemon = false;
    }
}

impl DaemonRuntime {
    pub fn prepare(&self, app: &AppHandle) -> Result<RuntimePaths, BridgeError> {
        let mut inner = lock_runtime(&self.0)?;
        if let Some(paths) = inner.paths.as_ref() {
            return Ok(paths.clone());
        }
        let paths = create_runtime_paths(app)?;
        inner.paths = Some(paths.clone());
        Ok(paths)
    }

    pub fn ensure_daemon(
        &self,
        app: &AppHandle,
        request: &Value,
    ) -> Result<(RuntimePaths, Value), BridgeError> {
        let paths = self.prepare(app)?;
        let child = self.child_state()?;
        match next_action_before_probe(child, endpoint_exists(&paths.endpoint)) {
            EnsureAction::LaunchOwned => self.launch_owned(app, &paths, request),
            EnsureAction::ReclaimDeadChildAndLaunch => {
                self.shutdown();
                self.launch_owned(app, &paths, request)
            }
            EnsureAction::Probe => self.probe_then_continue(app, &paths, request, child),
            EnsureAction::ReuseExisting
            | EnsureAction::RecoverStaleAndLaunch
            | EnsureAction::ReplaceUnownedSessionAndLaunch
            | EnsureAction::FailKeepEndpoint => Err(BridgeError::new(
                "internal_failure",
                "daemon lifecycle produced an invalid pre-probe action",
            )),
        }
    }

    pub fn shutdown(&self) {
        if let Ok(mut inner) = self.0.lock() {
            inner.shutdown();
        }
    }

    fn probe_then_continue(
        &self,
        app: &AppHandle,
        paths: &RuntimePaths,
        request: &Value,
        child: ChildState,
    ) -> Result<(RuntimePaths, Value), BridgeError> {
        match send_request(paths, request) {
            Ok(response) => Ok((paths.clone(), response)),
            Err(error) => {
                self.recover_after_probe(app, paths, request, child, error.outcome, error)
            }
        }
    }

    fn recover_after_probe(
        &self,
        app: &AppHandle,
        paths: &RuntimePaths,
        request: &Value,
        child: ChildState,
        outcome: crate::daemon_recovery::ProbeOutcome,
        error: crate::daemon_transport::ProbeError,
    ) -> Result<(RuntimePaths, Value), BridgeError> {
        match next_action_after_probe(child, outcome) {
            EnsureAction::RecoverStaleAndLaunch | EnsureAction::ReplaceUnownedSessionAndLaunch => {
                remove_owned_endpoint(&paths.endpoint);
                self.launch_owned(app, paths, request)
            }
            EnsureAction::ReclaimDeadChildAndLaunch => {
                self.shutdown();
                self.launch_owned(app, paths, request)
            }
            EnsureAction::LaunchOwned => self.launch_owned(app, paths, request),
            EnsureAction::FailKeepEndpoint | EnsureAction::Probe | EnsureAction::ReuseExisting => {
                Err(error.into_bridge())
            }
        }
    }

    fn launch_owned(
        &self,
        app: &AppHandle,
        paths: &RuntimePaths,
        request: &Value,
    ) -> Result<(RuntimePaths, Value), BridgeError> {
        self.spawn_owned_sidecar(app, paths)?;
        wait_until_ready(paths, request).inspect_err(|_| {
            self.shutdown();
        })
    }

    fn spawn_owned_sidecar(
        &self,
        app: &AppHandle,
        paths: &RuntimePaths,
    ) -> Result<(), BridgeError> {
        let mut inner = lock_runtime(&self.0)?;
        match inspect_child(&mut inner.child) {
            ChildState::Alive => return Ok(()),
            ChildState::Dead => inner.shutdown(),
            ChildState::None => {}
        }
        if endpoint_exists(&paths.endpoint) {
            remove_owned_endpoint(&paths.endpoint);
        }
        let child = spawn_sidecar(app, paths)?;
        inner.child = Some(child);
        inner.owns_daemon = true;
        Ok(())
    }

    fn child_state(&self) -> Result<ChildState, BridgeError> {
        let mut inner = lock_runtime(&self.0)?;
        Ok(inspect_child(&mut inner.child))
    }
}

fn lock_runtime(
    lock: &Mutex<RuntimeInner>,
) -> Result<std::sync::MutexGuard<'_, RuntimeInner>, BridgeError> {
    lock.lock()
        .map_err(|_| BridgeError::new("internal_failure", "runtime state is poisoned"))
}

fn inspect_child(child: &mut Option<Child>) -> ChildState {
    let Some(current) = child.as_mut() else {
        return ChildState::None;
    };
    match current.try_wait() {
        Ok(None) => ChildState::Alive,
        Ok(Some(_)) | Err(_) => {
            *child = None;
            ChildState::Dead
        }
    }
}

fn create_runtime_paths(app: &AppHandle) -> Result<RuntimePaths, BridgeError> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    let directory = app_data.join("runtime");
    fs::create_dir_all(&directory)
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    restrict_directory(&directory)?;
    let token_file = directory.join("session.token");
    let token = load_or_create_token(&token_file)?;
    #[cfg(unix)]
    let endpoint = directory.join("daemon.sock");
    #[cfg(windows)]
    let endpoint = PathBuf::from(format!(r"\\.\pipe\intentloom-desktop-{}", &token[..12]));
    Ok(RuntimePaths {
        endpoint,
        token_file,
        token,
    })
}

fn load_or_create_token(token_file: &Path) -> Result<String, BridgeError> {
    if token_file.exists() {
        return read_existing_token(token_file);
    }
    write_new_token(token_file)
}

fn read_existing_token(token_file: &Path) -> Result<String, BridgeError> {
    let metadata = fs::metadata(token_file)
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    if !metadata.is_file() {
        return Err(BridgeError::new(
            "authentication_failed",
            "daemon token path is not a regular file",
        ));
    }
    restrict_file(token_file)?;
    let token = fs::read_to_string(token_file)
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?
        .trim()
        .to_owned();
    if token.len() < 32 {
        return Err(BridgeError::new(
            "authentication_failed",
            "daemon token is too short",
        ));
    }
    Ok(token)
}

fn write_new_token(token_file: &Path) -> Result<String, BridgeError> {
    let token = random_token()?;
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(token_file)
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    file.write_all(token.as_bytes())
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    restrict_file(token_file)?;
    Ok(token)
}

fn spawn_sidecar(app: &AppHandle, paths: &RuntimePaths) -> Result<Child, BridgeError> {
    let spec = resolve_launch_spec(app)?;
    preflight_launch(&spec)?;
    let mut command = build_launch_command(&spec);
    command
        .arg("--endpoint")
        .arg(&paths.endpoint)
        .arg("--token-file")
        .arg(&paths.token_file)
        .arg("--catalog-root")
        .arg(catalog_root(app)?)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command.spawn().map_err(|error| launch_spawn_error(&spec, error))
}

fn wait_until_ready(
    paths: &RuntimePaths,
    request: &Value,
) -> Result<(RuntimePaths, Value), BridgeError> {
    let mut last_error = None;
    for _ in 0..50 {
        match send_request(paths, request) {
            Ok(response) => return Ok((paths.clone(), response)),
            Err(error) => last_error = Some(error.into_bridge()),
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    Err(last_error
        .unwrap_or_else(|| BridgeError::new("disconnected", "owned daemon did not become ready")))
}

fn random_token() -> Result<String, BridgeError> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes)
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn restrict_directory(path: &Path) -> Result<(), BridgeError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    }
    Ok(())
}

fn restrict_file(path: &Path) -> Result<(), BridgeError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    }
    Ok(())
}

pub fn endpoint_exists(endpoint: &Path) -> bool {
    #[cfg(unix)]
    {
        endpoint.exists()
    }
    #[cfg(windows)]
    {
        let _ = endpoint;
        false
    }
}

pub fn remove_owned_endpoint(endpoint: &Path) {
    #[cfg(unix)]
    {
        let _ = fs::remove_file(endpoint);
    }
    #[cfg(windows)]
    {
        let _ = endpoint;
    }
}
