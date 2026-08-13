use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

const PROTOCOL_VERSION: u64 = 1;
const MAX_REQUEST_BYTES: usize = 512 * 1024;
const MAX_RESPONSE_BYTES: usize = 1024 * 1024;

#[derive(Debug, Serialize, Clone)]
struct BridgeError {
    code: &'static str,
    message: String,
}

impl BridgeError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone)]
struct RuntimePaths {
    endpoint: PathBuf,
    token_file: PathBuf,
    token: String,
}

#[derive(Default)]
struct RuntimeInner {
    paths: Option<RuntimePaths>,
    child: Option<Child>,
    owns_daemon: bool,
}

#[derive(Clone, Default)]
struct DaemonRuntime(Arc<Mutex<RuntimeInner>>);

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
    fn prepare(&self, app: &AppHandle) -> Result<RuntimePaths, BridgeError> {
        let mut inner = self
            .0
            .lock()
            .map_err(|_| BridgeError::new("internal_failure", "runtime state is poisoned"))?;
        if let Some(paths) = inner.paths.as_ref() {
            return Ok(paths.clone());
        }

        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
        let directory = app_data.join("runtime");
        fs::create_dir_all(&directory)
            .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
        restrict_directory(&directory)?;

        let token_file = directory.join("session.token");
        let token = if token_file.exists() {
            let metadata = fs::metadata(&token_file)
                .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
            if !metadata.is_file() {
                return Err(BridgeError::new(
                    "authentication_failed",
                    "daemon token path is not a regular file",
                ));
            }
            restrict_file(&token_file)?;
            let token = fs::read_to_string(&token_file)
                .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?
                .trim()
                .to_owned();
            if token.len() < 32 {
                return Err(BridgeError::new(
                    "authentication_failed",
                    "daemon token is too short",
                ));
            }
            token
        } else {
            let token = random_token()?;
            let mut options = OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            let mut file = options
                .open(&token_file)
                .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
            file.write_all(token.as_bytes())
                .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
            restrict_file(&token_file)?;
            token
        };

        #[cfg(unix)]
        let endpoint = directory.join("daemon.sock");
        #[cfg(windows)]
        let endpoint = PathBuf::from(format!(r"\\.\pipe\intentloom-desktop-{}", &token[..12]));

        let paths = RuntimePaths {
            endpoint,
            token_file,
            token,
        };
        inner.paths = Some(paths.clone());
        Ok(paths)
    }

    fn ensure_daemon(
        &self,
        app: &AppHandle,
        request: &Value,
    ) -> Result<(RuntimePaths, Value), BridgeError> {
        let paths = self.prepare(app)?;
        {
            let inner = self
                .0
                .lock()
                .map_err(|_| BridgeError::new("internal_failure", "runtime state is poisoned"))?;
            if inner.child.is_none() && endpoint_exists(&paths.endpoint) {
                drop(inner);
                if let Ok(response) = send_request(&paths, request) {
                    return Ok((paths, response));
                }
                return Err(BridgeError::new(
                    "disconnected",
                    "an existing daemon endpoint did not respond",
                ));
            }
            if inner.child.is_some() {
                drop(inner);
                return send_request(&paths, request).map(|response| (paths, response));
            }
        }

        let (program, arguments, working_directory) = launch_spec(app)?;
        let mut command = Command::new(program);
        command
            .args(arguments)
            .arg("--endpoint")
            .arg(&paths.endpoint)
            .arg("--token-file")
            .arg(&paths.token_file)
            .arg("--catalog-root")
            .arg(catalog_root(app)?)
            .current_dir(working_directory)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        let child = command
            .spawn()
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        {
            let mut inner = self
                .0
                .lock()
                .map_err(|_| BridgeError::new("internal_failure", "runtime state is poisoned"))?;
            inner.child = Some(child);
            inner.owns_daemon = true;
        }

        let mut last_error = None;
        for _ in 0..50 {
            match send_request(&paths, request) {
                Ok(response) => return Ok((paths, response)),
                Err(error) => last_error = Some(error),
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        if let Ok(mut inner) = self.0.lock() {
            inner.shutdown();
        }
        Err(last_error.unwrap_or_else(|| {
            BridgeError::new("disconnected", "owned daemon did not become ready")
        }))
    }

    fn shutdown(&self) {
        if let Ok(mut inner) = self.0.lock() {
            inner.shutdown();
        }
    }
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

fn endpoint_exists(endpoint: &Path) -> bool {
    #[cfg(unix)]
    {
        endpoint.exists()
    }
    #[cfg(windows)]
    {
        false
    }
}

fn remove_owned_endpoint(endpoint: &Path) {
    #[cfg(unix)]
    {
        let _ = fs::remove_file(endpoint);
    }
    #[cfg(windows)]
    {
        let _ = endpoint;
    }
}

fn launch_spec(app: &AppHandle) -> Result<(String, Vec<String>, PathBuf), BridgeError> {
    #[cfg(debug_assertions)]
    {
        let manifest_directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let repository_root = manifest_directory.join("../../..");
        let daemon_script = repository_root.join("packages/daemon/dist/intentloomd.cjs");
        if daemon_script.is_file() {
            return Ok((
                "node".to_owned(),
                vec![daemon_script.to_string_lossy().into_owned()],
                repository_root,
            ));
        }
    }

    let resource_directory = app
        .path()
        .resource_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    let sidecar_name = if cfg!(windows) {
        "intentloomd.exe"
    } else {
        "intentloomd"
    };
    for sidecar in [
        resource_directory.join(sidecar_name),
        resource_directory.join("resources").join(sidecar_name),
    ] {
        if sidecar.is_file() {
            return Ok((
                sidecar.to_string_lossy().into_owned(),
                Vec::new(),
                resource_directory,
            ));
        }
    }
    Err(BridgeError::new(
        "unsupported_capability",
        "a self-contained intentloomd sidecar is not packaged",
    ))
}

fn catalog_root(app: &AppHandle) -> Result<PathBuf, BridgeError> {
    #[cfg(debug_assertions)]
    {
        let repository_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..");
        let catalog = repository_root.join("catalog");
        if catalog.is_dir() {
            return Ok(catalog);
        }
    }
    let resource_directory = app
        .path()
        .resource_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    for catalog in [
        resource_directory.join("catalog"),
        resource_directory.join("_up_").join("_up_").join("catalog"),
        resource_directory
            .join("_up_")
            .join("_up_")
            .join("_up_")
            .join("catalog"),
    ] {
        if catalog.is_dir() {
            return Ok(catalog);
        }
    }
    Err(BridgeError::new(
        "unsupported_capability",
        "the packaged catalog is not available",
    ))
}

fn canonical_project_root(root: &str) -> Result<String, BridgeError> {
    let path = Path::new(root);
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| BridgeError::new("invalid_root", "project root does not exist"))?;
    if metadata.file_type().is_symlink() {
        return Err(BridgeError::new(
            "stale_root",
            "project root is a symbolic link and is not stable",
        ));
    }
    if !metadata.is_dir() {
        return Err(BridgeError::new(
            "invalid_root",
            "project root must be a directory",
        ));
    }
    fs::canonicalize(path)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|_| BridgeError::new("stale_root", "project root changed during selection"))
}

fn request_method(request: &Value, expected: &str) -> Result<(), BridgeError> {
    let serialized = serde_json::to_vec(request)
        .map_err(|error| BridgeError::new("bounded_validation_failed", error.to_string()))?;
    if serialized.len() > MAX_REQUEST_BYTES {
        return Err(BridgeError::new(
            "bounded_validation_failed",
            "desktop request exceeds the native bridge bound",
        ));
    }
    if request.get("jsonrpc") != Some(&Value::String("2.0".to_owned()))
        || request.get("method") != Some(&Value::String(expected.to_owned()))
    {
        return Err(BridgeError::new(
            "unsupported_capability",
            "desktop command is not allowed for this operation",
        ));
    }
    Ok(())
}

fn send_request(paths: &RuntimePaths, request: &Value) -> Result<Value, BridgeError> {
    let envelope = json!({ "token": paths.token, "request": request });
    let serialized = serde_json::to_vec(&envelope)
        .map_err(|error| BridgeError::new("bounded_validation_failed", error.to_string()))?;
    if serialized.len() > MAX_REQUEST_BYTES {
        return Err(BridgeError::new(
            "bounded_validation_failed",
            "daemon request exceeds the native bridge bound",
        ));
    }

    #[cfg(unix)]
    let mut stream = {
        use std::os::unix::net::UnixStream;
        UnixStream::connect(&paths.endpoint)
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?
    };
    #[cfg(windows)]
    return send_named_pipe_request(paths, &serialized);

    #[cfg(unix)]
    {
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
        stream
            .write_all(&serialized)
            .and_then(|_| stream.write_all(b"\n"))
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        let mut response = Vec::new();
        stream
            .read_to_end(&mut response)
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        if response.len() > MAX_RESPONSE_BYTES {
            return Err(BridgeError::new(
                "bounded_validation_failed",
                "daemon response exceeds the native bridge bound",
            ));
        }
        let line = response
            .split(|byte| *byte == b'\n')
            .next()
            .filter(|line| !line.is_empty())
            .ok_or_else(|| {
                BridgeError::new("bounded_validation_failed", "empty daemon response")
            })?;
        let value: Value = serde_json::from_slice(line)
            .map_err(|error| BridgeError::new("bounded_validation_failed", error.to_string()))?;
        if let Some(error) = value.get("error") {
            return Err(map_daemon_error(error));
        }
        Ok(value)
    }
}

#[cfg(windows)]
fn send_named_pipe_request(paths: &RuntimePaths, serialized: &[u8]) -> Result<Value, BridgeError> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::windows::named_pipe::ClientOptions;

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    runtime.block_on(async {
        let mut client = ClientOptions::new()
            .open(&paths.endpoint)
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        client
            .write_all(serialized)
            .await
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        client
            .write_all(b"\n")
            .await
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        let mut response = Vec::new();
        client
            .read_to_end(&mut response)
            .await
            .map_err(|error| BridgeError::new("disconnected", error.to_string()))?;
        parse_response(&response)
    })
}

#[cfg(windows)]
fn parse_response(response: &[u8]) -> Result<Value, BridgeError> {
    if response.len() > MAX_RESPONSE_BYTES {
        return Err(BridgeError::new(
            "bounded_validation_failed",
            "daemon response exceeds the native bridge bound",
        ));
    }
    let line = response
        .split(|byte| *byte == b'\n')
        .next()
        .filter(|line| !line.is_empty())
        .ok_or_else(|| BridgeError::new("bounded_validation_failed", "empty daemon response"))?;
    let value: Value = serde_json::from_slice(line)
        .map_err(|error| BridgeError::new("bounded_validation_failed", error.to_string()))?;
    if let Some(error) = value.get("error") {
        return Err(map_daemon_error(error));
    }
    Ok(value)
}

fn map_daemon_error(error: &Value) -> BridgeError {
    let code = error
        .get("data")
        .and_then(|data| data.get("clientErrorCode"))
        .and_then(Value::as_str)
        .unwrap_or("internal_failure");
    let message = error
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("daemon returned an error");
    let known_code = match code {
        "authentication_failed" => "authentication_failed",
        "protocol_incompatible" => "protocol_incompatible",
        "unsupported_capability" => "unsupported_capability",
        "invalid_root" => "invalid_root",
        "stale_root" => "stale_root",
        "bounded_validation_failed" => "bounded_validation_failed",
        "timed_out" => "timed_out",
        "cancelled" => "cancelled",
        "disconnected" => "disconnected",
        _ => "internal_failure",
    };
    BridgeError::new(known_code, message)
}

/// Runs a blocking closure on the Tauri blocking thread pool and unwraps the
/// join result. Tauri v2 dispatches non-async `#[tauri::command]` handlers on
/// the main event-loop thread; this app's commands spawn child processes,
/// block on daemon socket I/O, and (for `select_project_root`) show a native
/// dialog that itself needs to pump the main thread's event loop. Running any
/// of that inline on the main thread freezes the whole window; the dialog
/// case deadlocks outright because it waits on an event loop it is blocking.
async fn run_blocking<F, T>(work: F) -> Result<T, BridgeError>
where
    F: FnOnce() -> Result<T, BridgeError> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?
}

#[tauri::command]
async fn get_daemon_info(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.daemon.info.v1")?;
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

#[tauri::command]
async fn select_project_root(app: AppHandle) -> Result<Option<String>, BridgeError> {
    run_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_title("Select a local Intentloom project")
            .blocking_pick_folder();
        selected
            .map(|path| {
                let path = path
                    .into_path()
                    .map_err(|error| BridgeError::new("invalid_root", error.to_string()))?;
                canonical_project_root(&path.to_string_lossy())
            })
            .transpose()
    })
    .await
}

#[tauri::command]
async fn inspect_project(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    root: String,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.project.inspect.v1")?;
        let root = canonical_project_root(&root)?;
        let request = json!({
            "jsonrpc": "2.0",
            "id": "desktop-inspect",
            "method": "intentloom.project.inspect.v1",
            "params": { "protocolVersion": PROTOCOL_VERSION, "root": root }
        });
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

#[tauri::command]
async fn run_doctor(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    root: String,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.project.doctor.v1")?;
        let root = canonical_project_root(&root)?;
        let request = json!({
            "jsonrpc": "2.0",
            "id": "desktop-doctor",
            "method": "intentloom.project.doctor.v1",
            "params": {
                "protocolVersion": PROTOCOL_VERSION,
                "root": root,
                "profile": "generic",
                "adapters": []
            }
        });
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

#[tauri::command]
async fn preview_project_diff(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.project.diff.v1")?;
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

#[tauri::command]
async fn load_project_timeline(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.project.timeline.v1")?;
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

fn is_inception_method(method: &str) -> bool {
    matches!(
        method,
        "intentloom.inception.session.create.v1"
            | "intentloom.inception.session.get.v1"
            | "intentloom.inception.questions.list.v1"
            | "intentloom.inception.answer.record.v1"
            | "intentloom.inception.state.summarize.v1"
            | "intentloom.inception.conflicts.identify.v1"
            | "intentloom.inception.session.export.v1"
            | "intentloom.inception.session.delete.v1"
    )
}

#[tauri::command]
async fn invoke_inception_request(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        let method = request
            .get("method")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                BridgeError::new("unsupported_capability", "missing inception method")
            })?;
        if !is_inception_method(method) {
            return Err(BridgeError::new(
                "unsupported_capability",
                "desktop command is not allowed for this inception operation",
            ));
        }
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

fn is_foundation_method(method: &str) -> bool {
    matches!(
        method,
        "intentloom.foundation.workshop.create.v1"
            | "intentloom.foundation.workshop.get.v1"
            | "intentloom.foundation.questions.list.v1"
            | "intentloom.foundation.answer.record.v1"
            | "intentloom.foundation.understanding.summarize.v1"
            | "intentloom.foundation.conflicts.identify.v1"
            | "intentloom.foundation.readiness.evaluate.v1"
            | "intentloom.foundation.workshop.export.v1"
            | "intentloom.foundation.workshop.delete.v1"
            | "intentloom.foundation.discovery.questions.v1"
            | "intentloom.foundation.discovery.turn.v1"
            | "intentloom.foundation.blueprint.propose.v1"
            | "intentloom.foundation.blueprint.compare.v1"
            | "intentloom.foundation.blueprint.approve.v1"
            | "intentloom.foundation.blueprint.revoke.v1"
            | "intentloom.foundation.scaffold.prepare.v1"
            | "intentloom.foundation.scaffold.get.v1"
            | "intentloom.foundation.scaffold.compare.v1"
            | "intentloom.foundation.scaffold.validate.v1"
            | "intentloom.foundation.scaffold.apply.v1"
            | "intentloom.foundation.scaffold.rollback.v1"
            | "intentloom.existing-project.workspace.prepare.v1"
            | "intentloom.feature-intent.workspace.prepare.v1"
            | "intentloom.feature-intent.workspace.analyze.v1"
            | "intentloom.bounded-execution.workspace.prepare.v1"
            | "intentloom.bounded-execution.workspace.execute.v1"
    )
}

#[tauri::command]
async fn invoke_foundation_request(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        let method = request
            .get("method")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                BridgeError::new("unsupported_capability", "missing foundation method")
            })?;
        if !is_foundation_method(method) {
            return Err(BridgeError::new(
                "unsupported_capability",
                "desktop command is not allowed for this foundation operation",
            ));
        }
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}

fn main() {
    let runtime = DaemonRuntime::default();
    let runtime_for_exit = runtime.clone();
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(runtime)
        .invoke_handler(tauri::generate_handler![
            get_daemon_info,
            select_project_root,
            inspect_project,
            run_doctor,
            preview_project_diff,
            load_project_timeline,
            invoke_inception_request,
            invoke_foundation_request,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Intentloom Desktop");
    app.run(move |_app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            runtime_for_exit.shutdown();
        }
    });
}
