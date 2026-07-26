# Intentloom Project State

Last verified: 2026-07-26

This file records the durable current state of the project. It is not a
chronological log. Session history and handoff details belong in
`DUTY_WATCH.md`.

## Product identity

Intentloom is an independent, open-source, provider-neutral infrastructure
framework for reliable agentic engineering workflows. Applye is a separate
product consumer and is not part of Intentloom.

## Repository model

The selected direction is one public monorepo. The CLI, daemon, protocol, SDK,
MCP support, schemas, adapters, validator, memory contracts, security contracts,
and future official Desktop application are intended to evolve in the same
public repository unless a documented legal, operational, or lifecycle boundary
later justifies separation.

## Current phase

Agent Workspace: Discuss and Inspect Modes.

The project must avoid premature structural migration. New applications,
packages, and repository boundaries are introduced only when roadmap triggers
and real consumers justify them.

## Current implementation baseline

- Public package and CLI foundations exist from the earlier AIF stage.
- The prepared historical release line includes `0.1.0-alpha.1`.
- Core release-readiness work previously covered packaged CLI runtime,
  filesystem safety, ownership and synchronization, rollback handling, schema
  validation, adoption and doctor fixtures, adapters, cross-platform
  compatibility, and explicit-path read-only verification.
- The repository carries architecture and roadmap documents for project
  connection, evidence, MCP, interactive surfaces, Agent Workspace, Neutron,
  persistent memory, security analysis, engineering process intelligence,
  public monorepo evolution, controlled agent learning, and portable Duty Watch adoption.
- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), transactional apply & rollback engine `intentloom adopt --apply` (Phase 3), pack update 3-way migration `intentloom update` (Phase 4), conformance & security profiles `intentloom conformance` (Phase 5), provider synchronization `intentloom sync` / `intentloom diff` (Phase 6), Memory & Security Candidates M1–M4, S1–S5, Daemon Protocol Contracts for Second Clients, and Read-Only Interactive Surfaces TUI are merged into `main`.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Provide versioned `WorkspaceConversationRecord` schemas and validators in `@intentloom/protocol`.
2. Provide project-scoped workspace conversation lifecycle operations (`startWorkspaceConversation`, `getWorkspaceConversation`, `appendWorkspaceMessage`, `listWorkspaceConversations`) in `@intentloom/application`.
3. Provide CLI subcommand routing under `intentloom workspace <start|get|list|append> [--mode MODE] [--conversation-id ID] [--content TEXT] [--root PATH] [--json]`.

## Architectural invariants

- Platform first, interfaces second.
- Desktop depends on public platform contracts. Platform code never depends on
  Desktop.
- All interactive surfaces use shared application operations rather than
  duplicating domain logic.
- Evidence precedes mutation.
- Potentially destructive actions require explicit human approval.
- Local-first and provider-neutral behavior are defaults.
- No hidden telemetry, network calls, hooks, or dependency installation.
- Protocols and schemas have one canonical source of truth.
- Backward compatibility and safe migration are explicit concerns.

## Current blockers and unknowns

- Workspace conversations are local, project-isolated (`.aif/workspace/conversations/`), redact credentials automatically, and enforce 100% read-only guarantees for Discuss and Inspect modes.

## Current milestone

Implement Agent Workspace: Discuss and Inspect Modes.

Expected outputs:

- ADR-0034 documenting project-scoped workspace conversation records, vendor-neutral model provider adapters, bounded workspace modes (`discuss`, `inspect`), and zero-mutation guarantees;
- workspace conversation record schemas and validators in `@intentloom/protocol`;
- workspace conversation operations (`startWorkspaceConversation`, `getWorkspaceConversation`, `appendWorkspaceMessage`, `listWorkspaceConversations`) in `@intentloom/application`;
- CLI subcommand routing for `intentloom workspace`;
- unit and integration tests in `tests/workspace-agent.test.ts`.

## Next platform milestone

Implement Agent Workspace Plan, Review, and Transactional Apply Modes over approved change proposals.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
