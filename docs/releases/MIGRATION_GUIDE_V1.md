# Intentloom v1.0 Migration & Upgrade Guide

Status: official migration policy guide for `v1.0.0`.

Date: 2026-07-28.

## Overview

Intentloom `v1.0.0` introduces formal SemVer 2.0 API guarantees, versioned daemon RPC protocol (`v1`), structured error handling, and non-destructive configuration schema migration.

Projects initialized under `v0.5.0-beta.1` or `v0.6.0-beta.1` upgrade automatically without manual edits or file rewrites.

## Key Changes & Compatibility Guarantees

### 1. Non-Destructive Automatic Schema Migration

When opening a project initialized with earlier Intentloom versions (`v0.5.0-beta.1` or `v0.6.0-beta.1`), the Intentloom engine automatically migrates stored metadata in `.aif/config.yaml` to the `v1` schema format.

- **Project Ownership Invariant**: Explicitly retained instruction files (`AGENTS.md`), source files, and project documents are **never modified or moved**.
- **Backup & Idempotency**: Migration operations write a record to `.aif/migration-journal.json` for rollback traceability.

### 2. Daemon Wire Protocol (`v1`)

The daemon RPC protocol (`intentloomd`) enforces protocol version negotiation.

- **Handshake Method**: `intentloom.daemon.info.v1`
- **Supported Envelopes**:
  - `intentloom.daemon.info.v1`
  - `intentloom.project.inspect.v1`
  - `intentloom.project.doctor.v1`
  - `intentloom.project.diff.v1`
  - `intentloom.project.timeline.v1`
- **Incompatible Clients**: Clients specifying an unsupported `clientProtocolVersion` fail explicitly with typed error code `-32602` (`ProtocolValidationError: unsupported protocol version`).

### 3. Structured Error Handling

All public API boundaries and CLI subcommands return typed, structured error codes:

| Error Code  | Class                                  | Meaning                                               |
| ----------- | -------------------------------------- | ----------------------------------------------------- |
| `-32600`    | `ProtocolValidationError`              | Invalid RPC request envelope                          |
| `-32601`    | `ProtocolValidationError`              | Method not found                                      |
| `-32602`    | `ProtocolValidationError`              | Invalid RPC parameter or unsupported protocol version |
| `-32000`    | `CliUsageError` / `DesktopBridgeError` | Command usage error or transport bridge failure       |
| `cancelled` | `DesktopBridgeError`                   | Application-level request cancelled by user           |

### 4. CLI Subcommand & Option Compatibility

All `intentloom` CLI commands preserve backward compatibility. Option flags deprecated in future minor versions will emit explicit stderr warnings for at least two minor release cycles prior to removal in a major version bump.

## Upgrade Verification Steps

To verify upgrade readiness on an existing repository:

```bash
# 1. Inspect project status without making changes
intentloom inspect --root /path/to/project

# 2. Run diagnostic health checks
intentloom doctor --root /path/to/project

# 3. Review interactive workspace state (TUI)
intentloom ui --root /path/to/project --view inspect
```
