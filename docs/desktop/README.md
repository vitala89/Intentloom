# Intentloom Desktop

Status: `v0.6.0-beta.1` milestone complete.

Intentloom Desktop is the official local graphical client for the existing
Intentloom platform. It is built over the standalone authenticated daemon and
the versioned local protocol. It does not replace the CLI, TUI, MCP server,
TypeScript-first core, application operations, or transaction engine.

## Read in this order

1. [v0.6.0-beta.1 Readiness Audit](V0_6_READINESS_AUDIT.md)
2. [Desktop design brief](DESIGN_BRIEF.md)
3. [Desktop v0.6 implementation plan](../roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md)
4. [ADR-0042: Desktop Stack and Self-Contained Daemon Distribution](../decisions/ADR-0042-desktop-stack-and-daemon-distribution.md)
5. [Self-contained daemon SEA feasibility spike](SEA_FEASIBILITY_SPIKE.md)
6. [Phase 1 client contracts](PHASE1_CONTRACTS.md)
7. [Accessibility Audit](A11Y_AUDIT.md)
8. [Interactive Surfaces and Agent Workspace](../concepts/INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md)
9. [ADR-0032: Second Client Daemon Protocol Contracts](../decisions/ADR-0032-second-client-daemon-protocol-contracts.md)
10. [ADR-0033: Interactive Surfaces](../decisions/ADR-0033-interactive-surfaces-tui-and-desktop-shell.md)
11. [Agent execution prompt](AGENT_EXECUTION_PROMPT.md)

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

The first slice is read-only. The current shell is intentionally disconnected
from the daemon until native lifecycle, token ownership, and bounded IPC are
wired. Opening, navigating, refreshing, cancelling, or closing the connected
application must leave the selected project byte-for-byte unchanged.

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

Packaging requires a platform-matched self-contained daemon artifact. Prepare
it with `INTENTLOOM_DESKTOP_SIDECAR=/absolute/path/to/intentloomd-sea` and
`pnpm desktop:prepare-sidecar`, then run
`pnpm --filter @intentloom/desktop package`. Development `cargo check` keeps
bundling disabled and never substitutes a system Node runtime for a packaged
sidecar.
