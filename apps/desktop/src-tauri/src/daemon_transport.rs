use std::io::{Read, Write};
use std::path::Path;
use std::time::Duration;

use serde_json::{json, Value};

use crate::bridge::{BridgeError, MAX_REQUEST_BYTES, MAX_RESPONSE_BYTES};
use crate::daemon_recovery::{classify_connect_error, ProbeOutcome};
use crate::runtime_paths::RuntimePaths;

#[derive(Debug)]
pub struct ProbeError {
    pub outcome: ProbeOutcome,
    pub error: BridgeError,
}

impl ProbeError {
    pub fn into_bridge(self) -> BridgeError {
        self.error
    }
}

pub fn send_request(paths: &RuntimePaths, request: &Value) -> Result<Value, ProbeError> {
    let envelope = json!({ "token": paths.token, "request": request });
    let serialized = serde_json::to_vec(&envelope).map_err(|error| ProbeError {
        outcome: ProbeOutcome::AuthenticatedRpcFailure,
        error: BridgeError::new("bounded_validation_failed", error.to_string()),
    })?;
    if serialized.len() > MAX_REQUEST_BYTES {
        return Err(ProbeError {
            outcome: ProbeOutcome::AuthenticatedRpcFailure,
            error: BridgeError::new(
                "bounded_validation_failed",
                "daemon request exceeds the native bridge bound",
            ),
        });
    }

    #[cfg(unix)]
    {
        send_unix_request(&paths.endpoint, &serialized)
    }
    #[cfg(windows)]
    {
        send_named_pipe_request(paths, &serialized)
    }
}

#[cfg(unix)]
fn send_unix_request(endpoint: &Path, serialized: &[u8]) -> Result<Value, ProbeError> {
    use std::os::unix::net::UnixStream;
    let mut stream = UnixStream::connect(endpoint).map_err(|error| ProbeError {
        outcome: classify_connect_error(&error),
        error: BridgeError::new("disconnected", error.to_string()),
    })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| ProbeError {
            outcome: ProbeOutcome::TemporaryFailure,
            error: BridgeError::new("internal_failure", error.to_string()),
        })?;
    stream
        .write_all(serialized)
        .and_then(|_| stream.write_all(b"\n"))
        .map_err(|error| ProbeError {
            outcome: ProbeOutcome::TemporaryFailure,
            error: BridgeError::new("disconnected", error.to_string()),
        })?;
    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|error| ProbeError {
            outcome: ProbeOutcome::TemporaryFailure,
            error: BridgeError::new("disconnected", error.to_string()),
        })?;
    parse_response(&response)
}

#[cfg(windows)]
fn send_named_pipe_request(paths: &RuntimePaths, serialized: &[u8]) -> Result<Value, ProbeError> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::windows::named_pipe::ClientOptions;

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|error| ProbeError {
            outcome: ProbeOutcome::TemporaryFailure,
            error: BridgeError::new("internal_failure", error.to_string()),
        })?;
    runtime.block_on(async {
        let mut client = ClientOptions::new()
            .open(&paths.endpoint)
            .map_err(|error| ProbeError {
                outcome: classify_connect_error(&error),
                error: BridgeError::new("disconnected", error.to_string()),
            })?;
        client
            .write_all(serialized)
            .await
            .map_err(|error| ProbeError {
                outcome: ProbeOutcome::TemporaryFailure,
                error: BridgeError::new("disconnected", error.to_string()),
            })?;
        client.write_all(b"\n").await.map_err(|error| ProbeError {
            outcome: ProbeOutcome::TemporaryFailure,
            error: BridgeError::new("disconnected", error.to_string()),
        })?;
        let mut response = Vec::new();
        client
            .read_to_end(&mut response)
            .await
            .map_err(|error| ProbeError {
                outcome: ProbeOutcome::TemporaryFailure,
                error: BridgeError::new("disconnected", error.to_string()),
            })?;
        parse_response(&response)
    })
}

fn parse_response(response: &[u8]) -> Result<Value, ProbeError> {
    if response.len() > MAX_RESPONSE_BYTES {
        return Err(rpc_failure(
            "bounded_validation_failed",
            "daemon response exceeds the native bridge bound",
        ));
    }
    let line = response
        .split(|byte| *byte == b'\n')
        .next()
        .filter(|line| !line.is_empty())
        .ok_or_else(|| rpc_failure("bounded_validation_failed", "empty daemon response"))?;
    let value: Value = serde_json::from_slice(line).map_err(|error| ProbeError {
        outcome: ProbeOutcome::AuthenticatedRpcFailure,
        error: BridgeError::new("bounded_validation_failed", error.to_string()),
    })?;
    if let Some(error) = value.get("error") {
        let mapped = map_daemon_error(error);
        let outcome = if mapped.code == "authentication_failed" {
            ProbeOutcome::AuthenticationFailed
        } else {
            ProbeOutcome::AuthenticatedRpcFailure
        };
        return Err(ProbeError {
            outcome,
            error: mapped,
        });
    }
    Ok(value)
}

fn rpc_failure(code: &'static str, message: impl Into<String>) -> ProbeError {
    ProbeError {
        outcome: ProbeOutcome::AuthenticatedRpcFailure,
        error: BridgeError::new(code, message),
    }
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

#[cfg(all(test, unix))]
mod tests {
    use super::{parse_response, send_request};
    use crate::daemon_recovery::{is_recoverable_stale_connect, ProbeOutcome};
    use crate::runtime_paths::RuntimePaths;
    use serde_json::json;
    use std::io::{Read, Write};
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::path::PathBuf;
    use std::thread;
    use std::time::Duration;

    fn temp_sock(name: &str) -> PathBuf {
        PathBuf::from(format!(
            "/tmp/il{}{}.sock",
            name.chars().next().unwrap_or('x'),
            std::process::id()
        ))
    }

    #[test]
    fn stale_unix_socket_is_recoverable_connect_failure() {
        let path = temp_sock("stale");
        let _ = std::fs::remove_file(&path);
        let listener = UnixListener::bind(&path).expect("bind stale fixture");
        drop(listener);
        assert!(path.exists());
        let error = UnixStream::connect(&path).expect_err("stale connect");
        assert!(is_recoverable_stale_connect(&error));
        let paths = RuntimePaths {
            endpoint: path.clone(),
            token_file: path.with_extension("token"),
            token: "a".repeat(32),
        };
        let probe = send_request(&paths, &json!({"jsonrpc":"2.0"})).expect_err("stale request");
        assert_eq!(probe.outcome, ProbeOutcome::StaleConnect);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn live_unix_socket_reuses_authenticated_response() {
        let path = temp_sock("live");
        let _ = std::fs::remove_file(&path);
        let listener = UnixListener::bind(&path).expect("bind live fixture");
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept");
            let mut buf = [0u8; 4096];
            let _ = stream.read(&mut buf);
            let body = json!({"jsonrpc":"2.0","id":"ok","result":{"findings":[],"diagnostics":[]}});
            let _ = stream.write_all(format!("{body}\n").as_bytes());
            let _ = stream.shutdown(std::net::Shutdown::Both);
        });
        thread::sleep(Duration::from_millis(20));
        let paths = RuntimePaths {
            endpoint: path.clone(),
            token_file: path.with_extension("token"),
            token: "a".repeat(32),
        };
        let response = send_request(
            &paths,
            &json!({"jsonrpc":"2.0","method":"intentloom.project.diff.v1"}),
        )
        .expect("live request");
        assert_eq!(response["result"]["findings"], json!([]));
        server.join().expect("server");
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn authenticated_rpc_error_is_not_stale() {
        let payload = json!({
            "jsonrpc": "2.0",
            "error": {
                "message": "profile must be a non-empty string",
                "data": { "clientErrorCode": "bounded_validation_failed" }
            }
        });
        let encoded = format!("{payload}\n");
        let probe = parse_response(encoded.as_bytes()).expect_err("rpc error");
        assert_eq!(probe.outcome, ProbeOutcome::AuthenticatedRpcFailure);
        assert_eq!(probe.error.code, "bounded_validation_failed");
    }

    #[test]
    fn authentication_failed_is_classified_separately() {
        let payload = json!({
            "jsonrpc": "2.0",
            "error": {
                "message": "invalid token",
                "data": { "clientErrorCode": "authentication_failed" }
            }
        });
        let encoded = format!("{payload}\n");
        let probe = parse_response(encoded.as_bytes()).expect_err("auth error");
        assert_eq!(probe.outcome, ProbeOutcome::AuthenticationFailed);
    }
}
