# ADR-0036: Neutron Autonomous Subagent Orchestration and Local Workspace Sync

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

To enable modular, specialized AI engineering assistance without creating monolithic agent loops, Intentloom introduces Neutron subagent task records (`.aif/neutron/subagents/`) and a local workspace sync engine (`intentloom neutron sync`).

The Neutron Subagent & Workspace Sync architecture:

1. Defines typed subagent roles:
   - `research`: Source code, dependency, and evidence discovery.
   - `arch-checker`: Architecture boundary and ADR conformance validation.
   - `test-runner`: Verification and test suite execution analysis.
   - `conformance-auditor`: Engineering policy and security baseline evaluation.
   - `custom`: Domain-specific subagent roles.
2. Tracks subagent execution lifecycle states (`pending`, `running`, `completed`, `failed`) stored under `.aif/neutron/subagents/<id>.json`.
3. Implements `syncLocalWorkspaceState` to produce an aggregated, synchronized snapshot of project inspection, doctor diagnostics, security audit, active subagent tasks, and conversation history.
4. Enforces 100% read-only guarantees during subagent research, inspection, and workspace state synchronization.
5. Exposes CLI subcommands under `intentloom neutron subagent <spawn|get|list>` and `intentloom neutron sync`.

## Consequences

1. Autonomous tasks can be delegated to specialized subagents with explicit input, output, and execution state tracking.
2. Workspace state sync maintains real-time context coherence across CLI, TUI, daemon IPC, and desktop presentation surfaces.
3. Subagent research and workspace sync cause zero persistent side-effects on codebase source files.
