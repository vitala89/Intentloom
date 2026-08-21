use std::io;
use std::path::PathBuf;
use std::process::Command;

use tauri::AppHandle;
#[cfg(not(debug_assertions))]
use tauri::Manager;

use crate::bridge::BridgeError;
#[cfg(debug_assertions)]
use crate::native_paths::debug_repository_root;
#[cfg(not(debug_assertions))]
use crate::native_paths::packaged_sidecar_candidates;
use crate::sidecar_launch::{preflight_debug_node, preflight_sidecar, sidecar_spawn_error};

#[derive(Debug, Clone, PartialEq, Eq)]
#[allow(dead_code)] // PackagedSidecar is release-only; shared handlers stay unified.
pub enum DaemonLaunchSpec {
    DebugNode {
        node_program: String,
        daemon_script: PathBuf,
        working_directory: PathBuf,
    },
    PackagedSidecar {
        executable: PathBuf,
        working_directory: PathBuf,
    },
}

pub fn resolve_launch_spec(app: &AppHandle) -> Result<DaemonLaunchSpec, BridgeError> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        resolve_debug_launch_spec()
    }
    #[cfg(not(debug_assertions))]
    {
        resolve_packaged_launch_spec(app)
    }
}

pub fn preflight_launch(spec: &DaemonLaunchSpec) -> Result<(), BridgeError> {
    match spec {
        DaemonLaunchSpec::DebugNode {
            daemon_script,
            working_directory,
            ..
        } => preflight_debug_node(working_directory, daemon_script),
        DaemonLaunchSpec::PackagedSidecar {
            executable,
            working_directory,
        } => preflight_sidecar(executable, working_directory),
    }
}

pub fn launch_spawn_error(spec: &DaemonLaunchSpec, error: io::Error) -> BridgeError {
    match spec {
        DaemonLaunchSpec::DebugNode {
            node_program,
            daemon_script,
            working_directory,
        } => {
            if let Err(preflight) = preflight_debug_node(working_directory, daemon_script) {
                return preflight;
            }
            BridgeError::new(
                "disconnected",
                format!(
                    "failed to launch Node for debug daemon ({node_program} {}): {error}",
                    daemon_script.display()
                ),
            )
        }
        DaemonLaunchSpec::PackagedSidecar {
            executable,
            working_directory,
        } => sidecar_spawn_error(executable, working_directory, error),
    }
}

pub fn build_launch_command(spec: &DaemonLaunchSpec) -> Command {
    match spec {
        DaemonLaunchSpec::DebugNode {
            node_program,
            daemon_script,
            working_directory,
        } => {
            let mut command = Command::new(node_program);
            command.arg(daemon_script).current_dir(working_directory);
            command
        }
        DaemonLaunchSpec::PackagedSidecar {
            executable,
            working_directory,
        } => {
            let mut command = Command::new(executable);
            command.current_dir(working_directory);
            command
        }
    }
}

#[cfg(debug_assertions)]
fn resolve_debug_launch_spec() -> Result<DaemonLaunchSpec, BridgeError> {
    let repository_root = debug_repository_root();
    let daemon_script = repository_root.join("packages/daemon/dist/intentloomd.cjs");
    if !repository_root.is_dir() {
        return Err(BridgeError::new(
            "disconnected",
            format!(
                "debug daemon working directory not found: {}",
                repository_root.display()
            ),
        ));
    }
    if !daemon_script.is_file() {
        return Err(BridgeError::new(
            "disconnected",
            "debug daemon bundle not found at packages/daemon/dist/intentloomd.cjs; run pnpm build",
        ));
    }
    Ok(DaemonLaunchSpec::DebugNode {
        node_program: "node".to_owned(),
        daemon_script,
        working_directory: repository_root,
    })
}

#[cfg(not(debug_assertions))]
fn resolve_packaged_launch_spec(app: &AppHandle) -> Result<DaemonLaunchSpec, BridgeError> {
    let resource_directory = app
        .path()
        .resource_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    let executable = packaged_sidecar_candidates(&resource_directory)
        .into_iter()
        .find(|sidecar| sidecar.is_file())
        .ok_or_else(|| {
            BridgeError::new(
                "unsupported_capability",
                "a self-contained intentloomd sidecar is not packaged",
            )
        })?;
    Ok(DaemonLaunchSpec::PackagedSidecar {
        executable,
        working_directory: resource_directory,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        build_launch_command, preflight_launch, resolve_debug_launch_spec, DaemonLaunchSpec,
    };
    use crate::sidecar_launch::{preflight_debug_node, preflight_sidecar};
    use std::fs;
    use std::io;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("intentloom-daemon-launch-{unique}"));
        fs::create_dir_all(&path).expect("temp dir");
        path
    }

    #[test]
    #[cfg(debug_assertions)]
    fn debug_launch_spec_uses_node_without_packaged_preflight() {
        let spec = resolve_debug_launch_spec().expect("debug bundle from pnpm build");
        assert!(matches!(spec, DaemonLaunchSpec::DebugNode { .. }));
        preflight_launch(&spec).expect("debug preflight");
        let command = build_launch_command(&spec);
        let program = command.get_program().to_string_lossy();
        assert_eq!(program, "node");
        let args: Vec<_> = command
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();
        assert_eq!(args.len(), 1);
        assert!(args[0].ends_with("packages/daemon/dist/intentloomd.cjs"));
    }

    #[test]
    fn debug_preflight_rejects_missing_bundle_without_packaged_wording() {
        let directory = temp_dir();
        let script = directory.join("intentloomd.cjs");
        let error = preflight_debug_node(&directory, &script).expect_err("missing bundle");
        assert_eq!(error.code, "disconnected");
        assert!(error.message.contains("debug daemon bundle not found"));
        assert!(!error.message.contains("packaged daemon"));
    }

    #[test]
    fn packaged_preflight_still_requires_native_executable() {
        let directory = temp_dir();
        let program = directory.join("intentloomd");
        let error = preflight_sidecar(&program, &directory).expect_err("missing sidecar");
        assert!(error
            .message
            .contains("packaged daemon executable not found"));
    }

    #[test]
    fn packaged_preflight_still_rejects_shebang_script() {
        let directory = temp_dir();
        let program = directory.join("intentloomd");
        fs::write(&program, "#!/usr/bin/env node\n").expect("script");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&program, fs::Permissions::from_mode(0o755)).expect("chmod");
        }
        let error = preflight_sidecar(&program, &directory).expect_err("shebang");
        assert!(error
            .message
            .contains("packaged daemon is a script, not a self-contained executable"));
    }

    #[test]
    fn debug_spawn_error_identifies_node_launch() {
        let directory = temp_dir();
        let script = directory.join("intentloomd.cjs");
        fs::write(&script, "export {};\n").expect("script");
        let spec = DaemonLaunchSpec::DebugNode {
            node_program: "node".to_owned(),
            daemon_script: script,
            working_directory: directory,
        };
        let error = super::launch_spawn_error(
            &spec,
            io::Error::new(io::ErrorKind::NotFound, "No such file or directory"),
        );
        assert!(error.message.contains("failed to launch Node for debug daemon"));
        assert!(!error.message.contains("packaged daemon"));
    }
}
