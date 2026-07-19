# ADR-0009: Local daemon security and lifecycle

## Status

Accepted

## Context

The future `intentloomd` must expose only the already versioned, read-only
doctor operation without creating a network service, leaking project data, or
weakening current CLI safety guarantees. Node supports IPC named pipes on Windows
and Unix domain sockets elsewhere; its server close operation stops new
connections but waits for active ones to finish. See the [Node net
documentation](https://nodejs.org/api/net.html).

## Decision

`intentloomd` will listen only on an explicitly supplied private runtime
endpoint: a Unix domain socket on non-Windows hosts and a named pipe on Windows.
TCP, HTTP, WebSocket, wildcard addresses, port selection, discovery broadcasts,
and network fallback are prohibited. The daemon owns no project configuration
and accepts an explicit project root in every authenticated request.

The parent creates a cryptographically random, single-use session token in an
explicit runtime directory that is private to the current user. The daemon reads
the token from an explicitly supplied, pre-existing regular token file, retains it
only in memory, and deletes neither the file nor the runtime directory. A future
parent/client is responsible for removing the token file after a successful
authenticated readiness handshake. Tokens must never appear in command arguments,
logs, JSON-RPC errors, catalog data, or project metadata.

The initial listener accepts newline-delimited UTF-8 JSON-RPC messages only,
enforces one request per connection, a 1 MiB message limit, a bounded connection
count, and a request deadline. It accepts only
`intentloom.project.doctor.v1`; all other methods receive a safe protocol error.
The daemon returns only the existing content-safe doctor result contract.

On authenticated shutdown or process signals, the daemon stops accepting new
connections, waits a bounded interval for active read-only work, destroys any
remaining sockets, closes the server, and removes only the Unix socket path it
created. It never unlinks an existing endpoint before binding and treats address
in use as a safe startup failure. Windows named pipes disappear with their owning
process according to the Node IPC contract.

## Consequences

The daemon is local-only but still requires a per-session secret because local
IPC endpoints are not an authorization boundary between processes of the same
user. It will add no persistent credential store, automatic startup, background
service registration, telemetry, or CLI daemon mode. Lifecycle and security tests
must prove endpoint restrictions, token rejection, message/connection limits,
read-only behavior, safe shutdown, and stale/occupied endpoint handling before
the daemon phase can pass.
