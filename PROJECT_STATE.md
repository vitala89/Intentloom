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

`v0.5.0-beta.1` is released through Git tag and npm `next`. The next approved
product milestone is planning and delivery of `v0.6.0-beta.1`: a Tauri 2
read-only Desktop vertical slice over the standalone daemon, followed by TUI
parity and hardening over the same contracts.

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

1. Merge the Desktop v0.6 roadmap, design, and execution baseline.
2. Approve the Desktop stack and self-contained daemon distribution ADR.
3. Inventory and freeze capability discovery, Inspect, Doctor, Diff, Timeline,
   compatibility, cancellation, and structured client errors.
4. Complete System Designer handoff before visual product implementation.
5. Keep stable v1 compatibility planning as a later release gate and keep
   bottleneck inference, remote ingestion, and model-based judgments behind
   separate approved specifications and threat review.

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
- PR #84 through PR #93 are merged; this planning branch was created from
  verified remote `main` commit `05aa0c6`. PR #90 remote compatibility CI
  passed all 12 checks.
- npm currently reports `latest=0.1.0-alpha.3` and `next=0.5.0-beta.1`.
- Workspace packages are synchronized to `0.5.0-beta.1`; Git tag
  `v0.5.0-beta.1` is pushed and npm publication is complete.
- Published tarball registry shasum is
  `58b2e27eb66789f57c1e91cec46aea710a6fc241`; local build remains blocked by
  the interrupted dependency restore missing `@types/node`, while remote CI
  verified the release commit.
- PR #91 was merged into the already closed PR #90 branch rather than `main`;
  its Desktop/TUI roadmap intent must be recovered through a clean `main`-based
  change.
- Draft PR #94 currently places Desktop downstream of the v1 compatibility
  contract. It must be reconciled with the approved pre-1.0 v0.6 milestone
  before merge.
- `apps/desktop` does not exist. The UI framework, Tauri boundary, daemon
  lifecycle, token ownership, and self-contained packaged daemon strategy need
  an accepted ADR.
- Inspect and Doctor have application, protocol, and daemon paths. Project
  Diff, root-bound local Timeline, capability discovery, operation
  cancellation/progress, complete client errors, and Workspace RPC coverage
  require implementation inventory and contract work.

## Current milestone

The v0.5 Engineering Process Intelligence increment and release gates are
complete. The active product direction is `v0.6.0-beta.1`.

Expected outputs:

- accepted Desktop stack and distribution ADR;
- versioned capability discovery and client compatibility behavior;
- typed daemon operations for the first read-only project slice;
- official `apps/desktop` Tauri 2 client;
- approved light and dark token-based design system;
- packaged `Select project → Inspect → Doctor → Diff → Timeline` flow;
- explicit daemon mismatch, disconnect, cancellation, and recovery behavior;
- byte-for-byte read-only evidence;
- TUI parity over the stabilized shared contracts;
- cross-platform packaging, accessibility, dogfooding, and release-readiness
  evidence.

## Next platform milestone

Merge the
[Desktop v0.6 implementation plan](docs/roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md),
approve the stack/distribution ADR, and implement the client contract freeze
before creating product pages. Then deliver the Tauri 2 read-only vertical
slice and harden `intentloom ui` to parity. Stable v1 compatibility planning
uses this client evidence later and does not block the v0.6 product milestone.

The [v1.0 compatibility plan](docs/roadmap/V1_0_STABLE_COMPATIBILITY_PLAN.md)
remains the later stability gate. Its first compatibility-contract ADR/specification
should be prepared alongside the Desktop work where it does not block the v0.6
read-only milestone.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
