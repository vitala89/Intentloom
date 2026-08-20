use serde_json::{json, Value};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::bridge::{BridgeError, MAX_REQUEST_BYTES, PROTOCOL_VERSION};
use crate::daemon_runtime::DaemonRuntime;
use crate::method_allowlist::{is_foundation_method, is_inception_method};
use crate::native_paths::canonical_project_root;

async fn run_blocking<F, T>(work: F) -> Result<T, BridgeError>
where
    F: FnOnce() -> Result<T, BridgeError> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?
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

#[tauri::command]
pub async fn get_daemon_info(
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
pub async fn select_project_root(app: AppHandle) -> Result<Option<String>, BridgeError> {
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
pub async fn inspect_project(
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
pub async fn run_doctor(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    root: String,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.project.doctor.v1")?;
        let canonical_root = canonical_project_root(&root)?;
        let mut daemon_request = request;
        if let Some(params) = daemon_request
            .get_mut("params")
            .and_then(Value::as_object_mut)
        {
            params.insert("root".to_owned(), Value::String(canonical_root));
        }
        state
            .ensure_daemon(&app, &daemon_request)
            .map(|(_, response)| response)
    })
    .await
}

#[tauri::command]
pub async fn preview_project_diff(
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
pub async fn load_project_timeline(
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

#[tauri::command]
pub async fn invoke_inception_request(
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

#[tauri::command]
pub async fn invoke_foundation_request(
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
