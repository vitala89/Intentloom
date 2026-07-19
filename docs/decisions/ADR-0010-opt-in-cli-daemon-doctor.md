# ADR-0010: Opt-in CLI daemon doctor mode

## Status

Accepted

## Context

`intentloomd` provides the private, authenticated, local-IPC implementation of
the versioned read-only doctor protocol. The CLI needs an opt-in client without
changing default CLI behaviour, starting a background process, or passing a
session secret in a command argument.

## Decision

Only `intentloom doctor` may use daemon mode. It requires an explicit local IPC
endpoint and an explicit token-file path. The CLI reads the existing token file
locally; the token itself is never accepted as a flag, printed, or persisted.
Daemon mode neither creates a runtime directory nor starts, restarts, discovers,
or shuts down `intentloomd`. Any connection, authentication, framing, timeout,
or protocol failure is reported as a safe CLI failure. All other commands retain
their direct operation paths.

Direct and daemon doctor modes are equivalent over the content-safe v1 contract:
finding code, severity, category, path, message, diagnostics, and exit code must
match for the same explicit root, profile, and adapter list. The direct CLI's
additional local-only report fields are not part of the daemon wire contract.

## Consequences

The daemon client remains private implementation code and accepts only the same
local IPC endpoint forms as the daemon. Tests must cover direct/daemon contract
equivalence, explicit opt-in parsing, token-file handling, authentication
failure, and the guarantee that daemon mode does not mutate the project.
