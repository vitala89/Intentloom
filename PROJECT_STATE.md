# Intentloom Project State

Last verified: 2026-07-24

This file records the durable current state of the project. It is not a chronological log. Session history and handoff details belong in `DUTY_WATCH.md`.

## Product identity

Intentloom is an independent, open-source, provider-neutral infrastructure framework for reliable agentic engineering workflows. Applye is a separate product consumer and is not part of Intentloom.

## Repository model

The selected direction is one public monorepo. The CLI, daemon, protocol, SDK, MCP support, schemas, adapters, validator, memory contracts, security contracts, and future official Desktop application are intended to evolve in the same public repository unless a documented legal, operational, or lifecycle boundary later justifies separation.

## Current phase

Documentation, architecture consolidation, and implementation-readiness.

The project must avoid premature structural migration. New applications, packages, and repository boundaries are introduced only when roadmap triggers and real consumers justify them.

## Current implementation baseline

- Public package and CLI foundations exist from the earlier AIF stage.
- The prepared historical release line includes `0.1.0-alpha.1`.
- Core release-readiness work previously covered packaged CLI runtime, filesystem safety, ownership and synchronization, rollback handling, schema validation, adoption and doctor fixtures, adapters, cross-platform compatibility, and explicit-path read-only verification.
- The repository now carries architecture and roadmap documents for project connection, evidence, MCP, interactive surfaces, Agent Workspace, Neutron, persistent memory, security analysis, engineering process intelligence, and public monorepo evolution.

These statements must be revalidated against code, tags, CI, and Git history before a new release or implementation milestone is declared complete.

## Active focus

1. Keep the architecture coherent and implementation-oriented.
2. Stabilize CLI and daemon boundaries.
3. Establish a versioned protocol suitable for external clients.
4. Delay `apps/desktop` until daemon and protocol readiness criteria are satisfied.
5. Convert roadmap items into small, testable implementation milestones.
6. Use the Duty Watch protocol for every agent session.

## Architectural invariants

- Platform first, interfaces second.
- Desktop depends on public platform contracts. Platform code never depends on Desktop.
- All interactive surfaces use shared application operations rather than duplicating domain logic.
- Evidence precedes mutation.
- Potentially destructive actions require explicit human approval.
- Local-first and provider-neutral behavior are defaults.
- No hidden telemetry, network calls, hooks, or dependency installation.
- Protocols and schemas have one canonical source of truth.
- Backward compatibility and safe migration are explicit concerns.

## Current blockers and unknowns

- The exact implementation status of daemon and versioned protocol must be inspected before Desktop work begins.
- The current package layout may still reflect the earlier AIF structure and should not be reorganized only for aesthetics.
- Roadmap concepts must be converted into prioritized issues or implementation slices before broad feature development.
- Funding is currently expected to begin with sponsorship and donations, while optional hosted, team, enterprise, or support services remain future possibilities rather than current commitments.

## Next recommended milestone

Define and verify the minimum stable daemon and protocol contract required by a second client.

Expected outputs:

- current-state audit of daemon and protocol code;
- explicit protocol versioning and compatibility policy;
- minimal client interaction contract;
- tests for the supported lifecycle;
- updated roadmap and Duty Watch handoff.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without repository evidence.