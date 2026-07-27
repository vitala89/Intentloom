# Desktop v0.6 Phase 1 Contracts

Status: complete for the v0.6 contract-freeze gate. This document records the
typed contract slice; connected Desktop lifecycle and richer presentation
models remain Phase 2 work.

## Capability discovery

The daemon exposes `intentloom.daemon.info.v1` over the authenticated local
IPC transport. The request carries the wire `protocolVersion` and an explicit
`clientProtocolVersion`. The response contains:

- the daemon protocol and daemon version;
- only the method identifiers backed by handlers in that daemon instance;
- an operation name and `read-only` or `mutating` classification for each
  capability;
- bounded message, response, connection, and request-timeout limits;
- an explicit `compatible` or `incompatible` result.

Compatibility is exact for protocol v1. A client may still complete discovery
with an incompatible result so the presentation layer can show a recovery
state instead of treating a handshake mismatch as an untyped transport error.

## Client error taxonomy

The typed daemon client and wire error metadata use stable codes for:

`authentication_failed`, `protocol_incompatible`, `unsupported_capability`,
`invalid_root`, `stale_root`, `bounded_validation_failed`, `timed_out`,
`cancelled`, `disconnected`, and `internal_failure`.

`invalid_root` and `stale_root` are reserved for the root-bound Inspect,
Doctor, Diff, and Timeline slices. The current discovery slice already emits
and consumes the authentication, unsupported-capability, bounded-validation,
cancelled, disconnected, and timeout categories where they can occur.

## Cancellation semantics

The typed discovery client accepts an `AbortSignal`. If it is already aborted,
or is aborted while the request is in flight, the client closes its local
transport and rejects with `cancelled`. This is a transport cancellation
boundary; the daemon-side read-only application operation may still finish and
its result is discarded when the transport is gone. It does not claim
cancellation of a long-running application operation. Such operations must
define their own safe cancellation behavior before they are exposed through the
Desktop client.

All discovery and current daemon capability metadata are read-only. No Desktop
components or new project writes are introduced by this slice.

## Project Diff and Local Timeline

`intentloom.project.diff.v1` carries an explicit project root, profile, and
adapter set. Its response returns the canonical root, operation version `1`,
bounded change records, and diagnostics from the existing application
`diffProject` plan. The daemon invokes it with `dryRun: true`.

`intentloom.project.timeline.v1` carries an explicit root, case ID, commit
limit, git timeout, and git output bound. The daemon rejects missing,
non-directory, or symbolic-link roots before dispatch. The application facade
uses the existing local-git evidence collector and returns a canonical root,
deterministic release events, quality, findings, and diagnostics. No git or
project files are written.

Both operations are exposed through typed daemon client helpers and advertise
their method IDs through discovery only when the corresponding daemon handler
is enabled.

Inspect and Doctor now use the same typed transport helper as discovery, Diff,
and Timeline. Doctor preserves its existing request shape; Inspect validates
the existing project ID/root response shape. This completes the typed client
invocation path for the five required read-only operations, while richer
presentation models and long-running cancellation remain later work.

## Validation

Protocol request/response validators cover the discovery shape, positive
bounded limits, capability classifications, and compatibility versions.
Daemon tests cover Unix-socket discovery, incompatible client versions,
authentication failures, pre-dispatch cancellation, and unsupported wire
capabilities. The dependency-complete validation run passes: full Vitest
reports 740 passed and 3 skipped tests across 83 files; workspace typecheck,
lint, format check, build, and `git diff --check` also pass. IPC tests require
local Unix-socket permissions on macOS. The Windows/Linux SEA matrix remains a
separate packaging gate.
