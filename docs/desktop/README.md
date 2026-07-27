# Intentloom Desktop

Status: planned `v0.6.0-beta.1` product milestone.

Intentloom Desktop is the official local graphical client for the existing
Intentloom platform. It is built over the standalone authenticated daemon and
the versioned local protocol. It does not replace the CLI, TUI, MCP server,
TypeScript-first core, application operations, or transaction engine.

## Read in this order

1. [Desktop design brief](DESIGN_BRIEF.md)
2. [Desktop v0.6 implementation plan](../roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md)
3. [Interactive Surfaces and Agent Workspace](../concepts/INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md)
4. [ADR-0032: Second Client Daemon Protocol Contracts](../decisions/ADR-0032-second-client-daemon-protocol-contracts.md)
5. [ADR-0033: Interactive Surfaces](../decisions/ADR-0033-interactive-surfaces-tui-and-desktop-shell.md)
6. [Agent execution prompt](AGENT_EXECUTION_PROMPT.md)

## Product sequence

```text
release-state closure
        ↓
Desktop stack and distribution ADR
        ↓
client contract inventory and freeze
        ↓
Tauri 2 read-only vertical slice
        ↓
Desktop Workspace review surfaces
        ↓
TUI parity and hardening
        ↓
separately reviewed Approved Apply
```

## First vertical slice

```text
Launch
→ connect to or start intentloomd
→ select a project
→ confirm the canonical project root
→ Overview
→ Inspect
→ Doctor
→ Diff
→ Timeline
```

The first slice is read-only. Opening, navigating, refreshing, cancelling, or
closing the application must leave the selected project byte-for-byte
unchanged.

## Scope labels

Every design frame, issue, and implementation task must use one of these labels:

- `v0.6 MVP`: required for the first read-only Desktop vertical slice;
- `v0.6 follow-up`: Workspace or TUI work that follows the stable read-only
  slice;
- `future`: approved roadmap surface that is not part of the current milestone;
- `concept only`: exploration with no implementation commitment.

Future-looking screens must not imply that live providers, external MCP
ingestion, managed extension installation, hosted accounts, unrestricted shell
access, model training, or autonomous repository mutation already exist.

## Architectural boundary

```text
Desktop webview
      ↓
typed Desktop client
      ↓
minimal Tauri transport and lifecycle bridge
      ↓
authenticated local IPC
      ↓
intentloomd
      ↓
versioned protocol and shared application operations
```

The Tauri Rust layer may own native window, dialog, secure process, endpoint,
token, and IPC transport concerns. It must not reimplement project inspection,
doctor, diff, timeline, evidence, conformance, ownership, approval, or
transaction rules.
