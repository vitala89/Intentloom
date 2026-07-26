# ADR-0033: Interactive Surfaces TUI and Desktop Application Shell

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

To provide progressively richer user interfaces without creating independent domain logic, Intentloom introduces an interactive surface data provider operation (`getInteractiveWorkspaceState`) and a keyboard-first terminal UI (`intentloom ui`).

The interactive surface architecture:

1. Reuses shared application operations (`inspectProjectCapabilities`, `doctorProject`, `runContinuousSecurityAudit`, `listAgentSessionItems`) rather than duplicating domain rules or parsing text output.
2. Returns a unified `InteractiveWorkspaceState` snapshot containing:
   - Project inspection details (`projectId`, `root`, capability state)
   - Diagnostic findings (`DoctorFinding` items)
   - Continuous security audit report (`ContinuousSecurityAuditReport` or null)
   - Recent agent sessions (`AgentSessionItem` items)
3. Enforces 100% read-only guarantees: opening, navigating, or rendering interactive TUI views or Desktop shell windows produces zero persistent project mutations.
4. Exposes CLI subcommand routing under `intentloom ui [--root PATH] [--json]`.

## Consequences

1. Interactive surfaces (TUI, Desktop shell, IDE plugins) share identical presentation view models and application operations.
2. Read-only interactive navigation causes zero side-effects on repository state.
3. Plain-text and JSON output modes are available for both terminal interaction and programmatic consumption.
