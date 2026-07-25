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

Controlled Agent Learning Candidate L4: Skill Evaluation & Regression Gates.

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
- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), transactional apply & rollback engine `intentloom adopt --apply` (Phase 3), pack update 3-way migration `intentloom update` (Phase 4), conformance & security profiles `intentloom conformance` (Phase 5), and provider synchronization `intentloom sync` / `intentloom diff` (Phase 6) are merged into `main`.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Define versioned `TaskSummary` and `SessionSummary` schemas in `@intentloom/protocol`.
2. Record task ID, selected root, intent, plan reference, affected paths, validation outcome, evidence references, used skills, unresolved work, provenance, trust class, and retention state.
3. Store summaries project-locally in `.aif/memory/tasks/` and `.aif/memory/sessions/` without storing raw chat transcripts.
4. Exclude secret-like paths (`secretLikePath`) and enforce root-bounded access.
5. Provide CLI command routing for `intentloom summary record`, `intentloom summary list`, and `intentloom summary get`.

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

- Candidate L1 introduces structured summaries as the first step of controlled agent learning without transcript logging or remote uploads.

## Current milestone

Implement Controlled Agent Learning Candidate L1: Structured Task and Session Summaries.

Expected outputs:

- versioned schemas for task and session summaries in `@intentloom/protocol`;
- application operations for recording, listing, retrieving, and inspecting task and session summaries in `@intentloom/application`;
- path-sanitized storage in `.aif/memory/` redacting secret-like paths;
- CLI command routing in `@intentloom/cli`;
- unit and integration tests proving summary recording, listing, filtering, redaction, and CLI execution.

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
