use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

use crate::bridge::BridgeError;

pub fn preflight_sidecar(program: &Path, working_directory: &Path) -> Result<(), BridgeError> {
    if !working_directory.is_dir() {
        return Err(BridgeError::new(
            "disconnected",
            format!(
                "packaged daemon working directory not found: {}",
                working_directory.display()
            ),
        ));
    }
    if !program.is_file() {
        return Err(BridgeError::new(
            "disconnected",
            format!(
                "packaged daemon executable not found: {}",
                program.display()
            ),
        ));
    }
    if file_starts_with_shebang(program) {
        return Err(BridgeError::new(
            "disconnected",
            format!(
                "packaged daemon is a script, not a self-contained executable: {}",
                program.display()
            ),
        ));
    }
    Ok(())
}

pub fn sidecar_spawn_error(
    program: &Path,
    working_directory: &Path,
    error: io::Error,
) -> BridgeError {
    if let Err(preflight) = preflight_sidecar(program, working_directory) {
        return preflight;
    }
    BridgeError::new(
        "disconnected",
        format!(
            "failed to launch packaged daemon {}: {error}",
            program.display()
        ),
    )
}

fn file_starts_with_shebang(path: &Path) -> bool {
    let mut header = [0_u8; 2];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map(|_| header == *b"#!")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::{preflight_sidecar, sidecar_spawn_error};
    use std::fs;
    use std::io::{self, ErrorKind};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("intentloom-sidecar-launch-{unique}"));
        fs::create_dir_all(&path).expect("temp dir");
        path
    }

    #[test]
    fn missing_executable_names_the_path() {
        let directory = temp_dir();
        let program = directory.join("intentloomd");
        let error = preflight_sidecar(&program, &directory).expect_err("missing sidecar");
        assert_eq!(error.code, "disconnected");
        assert!(error
            .message
            .contains("packaged daemon executable not found"));
        assert!(error.message.contains("intentloomd"));
    }

    #[test]
    fn missing_working_directory_is_explicit() {
        let directory = temp_dir().join("missing-cwd");
        let program = directory.join("intentloomd");
        let error = preflight_sidecar(&program, &directory).expect_err("missing cwd");
        assert!(error.message.contains("working directory not found"));
    }

    #[test]
    fn shebang_script_is_rejected_before_spawn() {
        let directory = temp_dir();
        let program = directory.join("intentloomd");
        fs::write(&program, "#!/usr/bin/env node\nconsole.log(1)\n").expect("script");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&program, fs::Permissions::from_mode(0o755)).expect("chmod");
        }
        let error = preflight_sidecar(&program, &directory).expect_err("shebang");
        assert!(error
            .message
            .contains("packaged daemon is a script, not a self-contained executable"));
        assert!(error.message.contains("intentloomd"));
    }

    #[test]
    fn spawn_error_keeps_the_program_path() {
        let directory = temp_dir();
        let program = directory.join("intentloomd");
        fs::write(&program, b"\xcf\xfa\xed\xfe").expect("binary stub");
        let error = sidecar_spawn_error(
            &program,
            &directory,
            io::Error::new(ErrorKind::NotFound, "No such file or directory"),
        );
        assert!(error.message.contains("failed to launch packaged daemon"));
        assert!(error.message.contains("intentloomd"));
        assert!(!error.message.contains("token"));
    }
}
