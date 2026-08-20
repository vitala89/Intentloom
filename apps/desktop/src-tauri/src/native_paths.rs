use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::bridge::BridgeError;

pub fn packaged_sidecar_candidates(resource_directory: &Path) -> [PathBuf; 2] {
    let sidecar_name = if cfg!(windows) {
        "intentloomd.exe"
    } else {
        "intentloomd"
    };
    [
        resource_directory.join(sidecar_name),
        resource_directory.join("resources").join(sidecar_name),
    ]
}

pub fn packaged_catalog_candidates(resource_directory: &Path) -> [PathBuf; 3] {
    [
        resource_directory.join("catalog"),
        resource_directory.join("_up_").join("_up_").join("catalog"),
        resource_directory
            .join("_up_")
            .join("_up_")
            .join("_up_")
            .join("catalog"),
    ]
}

pub fn launch_spec(app: &AppHandle) -> Result<(String, Vec<String>, PathBuf), BridgeError> {
    #[cfg(debug_assertions)]
    {
        if let Some(spec) = debug_launch_spec() {
            return Ok(spec);
        }
    }
    packaged_launch_spec(app)
}

pub fn catalog_root(app: &AppHandle) -> Result<PathBuf, BridgeError> {
    #[cfg(debug_assertions)]
    {
        let catalog = debug_repository_root().join("catalog");
        if catalog.is_dir() {
            return Ok(catalog);
        }
    }
    let resource_directory = app
        .path()
        .resource_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    packaged_catalog_candidates(&resource_directory)
        .into_iter()
        .find(|catalog| catalog.is_dir())
        .ok_or_else(|| {
            BridgeError::new(
                "unsupported_capability",
                "the packaged catalog is not available",
            )
        })
}

pub fn canonical_project_root(root: &str) -> Result<String, BridgeError> {
    let path = Path::new(root);
    let metadata = std::fs::symlink_metadata(path)
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
    std::fs::canonicalize(path)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|_| BridgeError::new("stale_root", "project root changed during selection"))
}

fn packaged_launch_spec(app: &AppHandle) -> Result<(String, Vec<String>, PathBuf), BridgeError> {
    let resource_directory = app
        .path()
        .resource_dir()
        .map_err(|error| BridgeError::new("internal_failure", error.to_string()))?;
    packaged_sidecar_candidates(&resource_directory)
        .into_iter()
        .find(|sidecar| sidecar.is_file())
        .map(|sidecar| {
            (
                sidecar.to_string_lossy().into_owned(),
                Vec::new(),
                resource_directory,
            )
        })
        .ok_or_else(|| {
            BridgeError::new(
                "unsupported_capability",
                "a self-contained intentloomd sidecar is not packaged",
            )
        })
}

#[cfg(debug_assertions)]
fn debug_repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

#[cfg(debug_assertions)]
fn debug_launch_spec() -> Option<(String, Vec<String>, PathBuf)> {
    let repository_root = debug_repository_root();
    let daemon_script = repository_root.join("packages/daemon/dist/intentloomd.cjs");
    daemon_script.is_file().then(|| {
        (
            "node".to_owned(),
            vec![daemon_script.to_string_lossy().into_owned()],
            repository_root,
        )
    })
}

#[cfg(test)]
mod tests {
    use super::{packaged_catalog_candidates, packaged_sidecar_candidates};
    use std::path::Path;

    #[test]
    fn packaged_sidecar_lookup_covers_bundle_layouts() {
        let resource = Path::new("/App/Contents/Resources");
        let candidates = packaged_sidecar_candidates(resource);
        let name = if cfg!(windows) {
            "intentloomd.exe"
        } else {
            "intentloomd"
        };
        assert_eq!(candidates[0], resource.join(name));
        assert_eq!(candidates[1], resource.join("resources").join(name));
    }

    #[test]
    fn packaged_catalog_lookup_covers_bundle_layouts() {
        let resource = Path::new("/App/Contents/Resources");
        let candidates = packaged_catalog_candidates(resource);
        assert_eq!(candidates[0], resource.join("catalog"));
        assert!(candidates.iter().all(|path| path.ends_with("catalog")));
    }
}
