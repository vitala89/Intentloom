mod bridge;
mod commands;
mod daemon_launch;
mod daemon_recovery;
mod daemon_runtime;
mod daemon_transport;
mod method_allowlist;
mod native_paths;
mod runtime_paths;
mod sidecar_launch;

use commands::{
    get_daemon_info, inspect_project, invoke_foundation_request,
    invoke_inception_request, invoke_specialized_pack_activate_request,
    invoke_specialized_pack_preview_request, load_project_timeline, preview_project_diff,
    run_doctor, select_project_root,
};
use daemon_runtime::DaemonRuntime;

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
            invoke_specialized_pack_preview_request,
            invoke_specialized_pack_activate_request,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Intentloom Desktop");
    app.run(move |_app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            runtime_for_exit.shutdown();
        }
    });
}
