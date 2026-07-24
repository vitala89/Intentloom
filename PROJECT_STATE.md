# Intentloom Project State

Last verified: 2026-07-24

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

Portable Adoption Phase 4: Pack Update and Three-Way Migration (`intentloom update --plan` / `--apply`).

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
  public monorepo evolution, and portable Duty Watch adoption.
- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), and transactional apply & rollback engine `intentloom adopt --apply` (Phase 3) are merged into `main`.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Implement `planPackUpdate` application operation and `intentloom update --plan` / `--apply` CLI command.
2. Store installed pack identity, version, canonical hashes, local overrides, and exceptions.
3. Compare old pack, current project state, and new pack using a 3-way migration comparison algorithm.
4. Generate safe fast-forwards, semantic merges, conflicts, deprecations, and removals.
5. Preserve local user modifications without overwriting merely because pack version increased.
6. Provide targeted conflict proposals for customized project files.

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

- Phase 4 focuses on 3-way migration between old pack, current project, and new pack version.
- Conformance automation (Phase 5) and security profiles (Phase 6) remain future phases.

## Current milestone

Implement Portable Adoption Phase 4: Pack Update and Three-Way Migration (`intentloom update --plan` / `--apply`).

Expected outputs:

- application operation `planPackUpdate` executing 3-way comparison (old pack vs current project vs new pack);
- CLI command `intentloom update --plan` and `intentloom update --apply <plan>` supporting `--json` and `--dry-run`;
- conflict detection for modified project files avoiding silent overwrites;
- unit and integration tests proving fast-forward updates, conflict generation, and local modification preservation.

## Next platform milestone

After Portable Adoption Phase 1 is merged, audit and define the minimum stable
daemon and protocol contract required by a second client.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
