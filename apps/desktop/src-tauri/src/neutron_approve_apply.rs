use serde_json::Value;
use tauri::{AppHandle, State};

use crate::bridge::BridgeError;
use crate::commands::{request_method, run_blocking};
use crate::daemon_runtime::DaemonRuntime;
use crate::method_allowlist::is_neutron_mutation_approve_and_apply_method;

#[tauri::command]
pub async fn approve_and_apply_neutron_mutation(
    app: AppHandle,
    state: State<'_, DaemonRuntime>,
    request: Value,
) -> Result<Value, BridgeError> {
    let state = state.inner().clone();
    run_blocking(move || {
        request_method(&request, "intentloom.neutron.mutation.approveAndApply.v1")?;
        let method = request.get("method").and_then(Value::as_str).unwrap_or("");
        if !is_neutron_mutation_approve_and_apply_method(method) {
            return Err(BridgeError::new(
                "unsupported_capability",
                "desktop command is not allowed for this neutron mutation",
            ));
        }
        state
            .ensure_daemon(&app, &request)
            .map(|(_, response)| response)
    })
    .await
}
