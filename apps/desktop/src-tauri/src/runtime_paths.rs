use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct RuntimePaths {
    pub endpoint: PathBuf,
    pub token_file: PathBuf,
    pub token: String,
    pub neutron_mutation_state_dir: PathBuf,
}

pub const NEUTRON_MUTATION_STATE_DIR_FLAG: &str = "--neutron-mutation-state-dir";
pub const NEUTRON_MUTATION_STATE_DIR_NAME: &str = "neutron-mutation-state";

pub fn neutron_mutation_state_dir(app_data: &Path) -> PathBuf {
    app_data.join(NEUTRON_MUTATION_STATE_DIR_NAME)
}

pub fn desktop_owned_daemon_args(paths: &RuntimePaths, catalog_root: &Path) -> Vec<OsString> {
    vec![
        OsString::from("--endpoint"),
        paths.endpoint.clone().into_os_string(),
        OsString::from("--token-file"),
        paths.token_file.clone().into_os_string(),
        OsString::from("--catalog-root"),
        catalog_root.as_os_str().to_owned(),
        OsString::from(NEUTRON_MUTATION_STATE_DIR_FLAG),
        paths.neutron_mutation_state_dir.clone().into_os_string(),
    ]
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

#[cfg(test)]
mod tests {
    use super::{
        desktop_owned_daemon_args, neutron_mutation_state_dir, remove_owned_endpoint, RuntimePaths,
        NEUTRON_MUTATION_STATE_DIR_FLAG, NEUTRON_MUTATION_STATE_DIR_NAME,
    };
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("intentloom-{label}-{unique}"));
        fs::create_dir_all(&path).expect("temp dir");
        path
    }

    fn fixture_paths(app_data: &Path) -> RuntimePaths {
        RuntimePaths {
            endpoint: app_data.join("runtime").join("daemon.sock"),
            token_file: app_data.join("runtime").join("session.token"),
            token: "a".repeat(32),
            neutron_mutation_state_dir: neutron_mutation_state_dir(app_data),
        }
    }

    #[test]
    fn durable_state_dir_is_stable_under_app_data() {
        let app_data = temp_dir("app-data");
        let first = neutron_mutation_state_dir(&app_data);
        let second = neutron_mutation_state_dir(&app_data);
        assert_eq!(first, second);
        assert_eq!(first, app_data.join(NEUTRON_MUTATION_STATE_DIR_NAME));
        assert!(first.starts_with(&app_data));
    }

    #[test]
    fn durable_state_dir_is_outside_project_root() {
        let home = temp_dir("host-home");
        let app_data = home.join("app-data");
        let project = home.join("projects").join("example");
        fs::create_dir_all(&project).expect("project");
        let durable = neutron_mutation_state_dir(&app_data);
        assert!(!durable.starts_with(&project));
        assert_ne!(durable, project);
    }

    #[test]
    fn relaunch_args_reuse_the_same_durable_state_dir() {
        let app_data = temp_dir("relaunch");
        let catalog = app_data.join("catalog");
        let first = fixture_paths(&app_data);
        let second = fixture_paths(&app_data);
        let first_args = desktop_owned_daemon_args(&first, &catalog);
        let second_args = desktop_owned_daemon_args(&second, &catalog);
        assert_eq!(first_args, second_args);
        let flag = first_args
            .iter()
            .position(|arg| arg == NEUTRON_MUTATION_STATE_DIR_FLAG)
            .expect("flag");
        assert_eq!(
            first_args[flag + 1],
            first.neutron_mutation_state_dir.clone().into_os_string()
        );
    }

    #[test]
    fn removing_owned_endpoint_does_not_delete_durable_state() {
        let app_data = temp_dir("reclaim");
        let paths = fixture_paths(&app_data);
        fs::create_dir_all(paths.endpoint.parent().expect("runtime")).expect("runtime");
        fs::create_dir_all(&paths.neutron_mutation_state_dir).expect("durable");
        fs::write(&paths.endpoint, []).expect("socket fixture");
        fs::write(paths.neutron_mutation_state_dir.join("marker"), b"keep").expect("marker");
        remove_owned_endpoint(&paths.endpoint);
        assert!(!paths.endpoint.exists());
        assert!(paths.neutron_mutation_state_dir.join("marker").exists());
    }
}
