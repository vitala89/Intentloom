# Intentloom Project State

Last verified: 2026-07-27

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

Engineering Process Intelligence & Agent Memory Evaluation System — conformance, workflow variants, observed duration metrics, conformance trend summary, deterministic workflow repetition summary, and transition intervals are merged into `main` at `83941ab`; the process-intelligence increment is post-`0.4.0-beta.1` and not yet published to npm.

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
- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), transactional apply & rollback engine `intentloom adopt --apply` (Phase 3), pack update 3-way migration `intentloom update` (Phase 4), conformance & security profiles `intentloom conformance` (Phase 5), provider synchronization `intentloom sync` / `intentloom diff` (Phase 6), Memory & Security Candidates M1–M4, S1–S5, Daemon Protocol Contracts for Second Clients, Read-Only Interactive Surfaces TUI, Agent Workspace Discuss & Inspect Modes, Agent Workspace Plan, Review & Apply Modes, and Neutron Autonomous Subagent Orchestration & Local Workspace Sync Engine are merged into `main`.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Establish and maintain one canonical release-state matrix for published npm artifacts versus current `main` capabilities.
2. Keep bottleneck inference, remote ingestion, and model-based judgments behind separate approved specifications and threat review.

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

- Any expansion to bottleneck, performance, causal, actor, repository-reading, persisted, remote, or model-assisted analysis requires a new ADR, specification, and threat review.
- PR #84, PR #85, PR #86, and PR #87 are merged; current local `main` is
  `f546b76`.
- npm currently reports `latest=0.1.0-alpha.3` and `next=0.4.0-beta.1`.
- Release-state documentation now distinguishes the published `0.4.0-beta.1` artifact from post-release process-intelligence code in `main`.

## Current milestone

The first Engineering Process Intelligence & Agent Memory Evaluation increment, including transition intervals, is complete and merged in `main`; release-state documentation is the active follow-up milestone.

Expected outputs:

- versioned protocol contracts for deterministic, project-scoped conformance, workflow-variant, workflow-duration, and procedural-memory evaluation reads;
- versioned protocol contracts for deterministic workflow repetition summaries;
- versioned protocol contracts for deterministic observed transition interval summaries;
- shared application operations and authenticated local daemon handlers for the read-only operations;
- ADR-0020, ADR-0037, ADR-0038, and ADR-0039 documenting canonical boundaries and safety constraints.
- ADR-0040 documenting the deterministic workflow repetition boundary and safety constraints.
- ADR-0041 documenting the deterministic observed transition interval boundary and safety constraints.
- `docs/releases/RELEASE_STATE.md` documenting capability availability across `main`, npm, CLI, daemon, MCP, and experimental surfaces.

## Next platform milestone

Prepare the `v0.5.0-beta.1` release-readiness audit for the process-intelligence
increment already merged in `main`; publication remains a separate explicitly
authorized release action.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
