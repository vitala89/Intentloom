# ADR-0032: Second Client Daemon Protocol Contracts

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

To support second clients (such as local Desktop applications, TUI utilities, or IDE extensions) over local IPC, the versioned local protocol (`packages/protocol`) and local daemon process (`packages/daemon`) expand their typed RPC contract beyond `doctor`.

The expanded daemon wire contract:

1. Operates exclusively over local domain sockets (UNIX) or named pipes (Windows) with mandatory per-session secret token authentication.
2. Expands `DaemonRequest` and `DaemonResponse` types to support five core application operations:
   - `doctor`: Project integrity diagnostic (`createDoctorRequest`)
   - `inspect`: Read-only project capability inspection (`createInspectRequest`)
   - `securityAudit`: Continuous security audit and invariant verification (`createSecurityAuditRequest`)
   - `memorySearch`: Local persistent memory search (`createMemorySearchRequest`)
   - `sessionGet`: Agent session lifecycle state retrieval (`createSessionGetRequest`)
3. Dispatches incoming RPC payloads directly to `@intentloom/application` domain operations.
4. Rejects unauthenticated, malformed, or out-of-bounds requests with structured error responses.

## Consequences

1. Second clients can interact with Intentloom core capabilities over a stable, versioned local IPC daemon connection without spawning CLI processes.
2. Security properties (token authentication, local-only socket binding, read-only payload bounds) are maintained across all daemon RPC operations.
3. No network listeners, HTTP servers, telemetry, or external ports are opened.
