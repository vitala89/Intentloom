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

Portable Adoption Phase 3: Transactional Apply and Rollback (`intentloom adopt --apply <plan>`).

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
- Duty Watch governance contracts (Phase 1) and interactive proposal CLI `intentloom adopt --plan` (Phase 2) are merged into `main`.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Implement `applyProjectAdoption` application operation and `intentloom adopt --apply <plan>` CLI command.
2. Execute approved operations in a single transactional batch with backup creation and recovery journal (`.aif/migration-journal.json`).
3. Preserve local sections, ownership boundaries, and project-owned files.
4. Validate paths, symlinks, project root, and secret redaction before mutation.
5. Provide atomic rollback recovery upon error or interrupted execution.
6. Guarantee idempotency across repeated apply operations.

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

- Phase 3 focuses on transactional execution and failure rollback for governance plans.
- Three-way updates (Phase 4), conformance automation (Phase 5), and security profiles (Phase 6) remain future phases.

## Current milestone

Implement Portable Adoption Phase 3: Transactional Apply and Rollback (`intentloom adopt --apply <plan>`).

Expected outputs:

- application operation `applyProjectAdoption` for applying approved plan operations in a single transaction;
- CLI command `intentloom adopt --apply <plan>` supporting `--json` and `--dry-run`;
- transactional backup creation, recovery journal, and atomic rollback on failure;
- unit and integration tests proving atomic apply, rollback on error, and idempotency.

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
