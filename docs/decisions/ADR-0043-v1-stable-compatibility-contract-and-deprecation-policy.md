# ADR-0043: v1.0 Stable Compatibility Contract, Deprecation Windows, and Protocol Guarantees

Status: accepted.

Date: 2026-07-28.

Authors: Vitalii Kasap (Project Lead), Antigravity AI Agent.

## Context

Intentloom has stabilized its TypeScript core, shared application operations, versioned protocol (`v1`), local authenticated daemon (`intentloomd`), CLI/MCP surfaces, and Desktop client shell (`v0.6.0-beta.1`).

As the project advances toward `v1.0.0`, a formal compatibility contract is required to define public SemVer 2.0 guarantees, deprecation windows, wire protocol versioning, runtime matrix support, and schema migration rules.

## Decision

### 1. Public API & SemVer 2.0 Guarantees

- **CLI Surface (`intentloom <subcommand>`)**: All documented subcommands, positional arguments, and flags follow strict Semantic Versioning. Non-breaking additions (new flags, subcommands) occur in minor releases (`1.x.0`). Breaking changes to existing CLI flags or output formats require a major version bump (`2.0.0`).
- **Wire Protocol (`@intentloom/protocol`)**: All request and response envelopes carry an explicit `protocolVersion: 1`. Method schemas (`daemon.info.v1`, `project.inspect.v1`, `project.doctor.v1`, `project.diff.v1`, `project.timeline.v1`) guarantee backward compatibility. Adding optional fields is backwards compatible; changing required fields or removing methods requires incrementing `protocolVersion` to `2` and preserving `v1` handlers during a transition window.
- **Config & Metadata Schemas (`.aif/`)**: `.aif/config.yaml`, `.aif/manifest.lock.json`, and `.aif/source-map.json` follow versioned JSON/YAML schemas. The application engine guarantees non-destructive automatic migration for all previous `v0.x` schema versions upon project loading.

### 2. Deprecation Policy & Windows

- **Deprecation Window**: Any CLI subcommand, flag, or protocol capability marked for deprecation must emit an explicit deprecation warning for at least **two minor releases** (e.g., deprecated in `1.1.0`, maintained through `1.2.0`, removable in `2.0.0`).
- **No Silent Behavior Removal**: Features are never silently removed or altered without prior deprecation notice in logs and documentation.

### 3. Runtime & Host Compatibility Matrix

| Component             | Supported Minimum                                        | Verified CI Matrix                                     | Support Window                             |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| **Node.js**           | Node.js 22 LTS                                           | Node.js 22 LTS & Node.js 24                            | Supported through Node 22 EOL              |
| **Operating Systems** | macOS (ARM64 & x86_64), Linux (x86_64), Windows (x86_64) | Hosted CI matrix on all three platforms                | Active support for current LTS releases    |
| **Desktop Shell**     | Tauri 2 + React 19                                       | macOS `.app`, Linux `.deb`, Windows executable sidecar | Synchronized with Intentloom core releases |

### 4. Client Compatibility & Capability Discovery

- **Explicit Mismatch Rejection**: Daemon clients (Desktop, CLI, MCP) verify protocol compatibility via `daemon.info.v1` upon connecting. If `protocolVersion` is incompatible, the client fails explicitly with `DesktopBridgeError("protocol-mismatch")` rather than attempting unsafe RPC execution.
- **Read-Only Invariant**: All inspection, doctor, diff, timeline, and discovery operations preserve 100% read-only zero project mutation guarantees.

## Consequences

- **Positive**: Clear, supportable contract for downstream users, open-source maintainers, and desktop application packages.
- **Positive**: Automatic schema migration ensures seamless upgrades from `v0.5.0-beta.1` and `v0.6.0-beta.1` to `v1.0.0`.
- **Negative**: Maintainers must preserve `v1` protocol compatibility and deprecation windows when introducing breaking wire protocol changes.
