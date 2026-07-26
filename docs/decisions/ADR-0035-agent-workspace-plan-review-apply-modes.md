# ADR-0035: Agent Workspace Plan, Review, and Transactional Apply Modes

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

To bridge conversational AI collaboration with safe, deterministic codebase modification, Intentloom completes the Agent Workspace modes progression with **Plan**, **Review**, and **Apply** modes.

The Plan, Review, and Apply architecture:

1. **Plan Mode**: Promotes workspace conversation records into structured `AdoptionProposal` artifacts stored under `.aif/proposals/<id>.json`.
2. **Review Mode**: Performs read-only analysis of proposal items, affected filesystem paths, risk metrics, and sandbox capability policies without mutating code files.
3. **Apply Mode**: Executes approved proposals transactionally through the existing adoption engine (`applyAdoptionProposal`).
   - Requires explicit human approval metadata (`approvedBy`).
   - Validates plan identity, digest integrity, and proposal status.
   - Enforces atomic file writes and automatic rollback protection on failure.
4. Exposes CLI subcommands under `intentloom workspace promote`, `intentloom workspace review`, and `intentloom workspace apply`.

## Consequences

1. Conversational intent transitions into structured, reviewable change proposals before any codebase modifications occur.
2. Codebase mutations are strictly isolated to **Apply** mode, backed by human approval gates and transactional rollback.
3. Zero-mutation guarantees remain enforced across Discuss, Inspect, Plan, and Review modes.
