# Design-first architecture gate

Status: proposed. Applies to Intentloom features, integrations, and material architectural changes after maintainer approval.

## Mandatory sequence

1. **Discover:** read `AGENTS.md`, `AGENT_START_HERE.md`, `docs/README.md`, canonical architecture/governance documents, relevant ADRs, current code and tests. Identify existing boundaries and avoid duplicate guidance.
2. **Design:** prepare a reviewable System Design document before writing implementation code. Put new feature-specific designs under `docs/designs/<task-slug>/`; link existing canonical designs without duplicating them. Reuse existing ADRs; write a new ADR only for durable unresolved decisions.
3. **Review:** obtain explicit maintainer approval of the design. A design PR must not contain feature implementation. Record alternatives, trade-offs and unresolved questions.
4. **Implement:** only after approval, open a separate implementation PR linking the approved design and ADRs. Any material design deviation requires an updated review before proceeding.
5. **Verify:** compare the code to the approved design, run required checks and tests, document migration and rollback where relevant, and update project handoff documents.

## Minimum System Design content

Include each item that applies. Where one does not apply, say why.

- Problem, scope, requirements, acceptance criteria, and non-goals.
- Existing architecture and proposed architecture.
- Current-state and proposed context and component diagrams.
- Domain boundaries and ownership, using the ubiquitous language in `DOMAIN_MODELING.md`. Do not force unused domain patterns.
- Data flow, storage ownership, lifecycle, and persistence.
- Component interactions and typed contracts, including events, versioning, and compatibility.
- Dependency direction.
- Security, authorization, privacy, trust boundaries, and threat considerations.
- Error handling, retries, idempotency, timeouts, recovery, and rollback.
- Performance and resource constraints, and the alternatives considered.
- Accessibility impact, following `ACCESSIBILITY.md`.
- Migration and rollback.
- Test strategy, following `CODE_QUALITY_STANDARDS.md` section 5, including existing behavior and the checks that will show the change worked.
- Project plan, responsibilities, and the SWOT or RAID record required by `ENGINEERING_LIFECYCLE.md`.
- Sequence diagrams for successful and rejected or failed operations when behavior is not obvious from the text.

Use diagrams to clarify actual behavior, not as decoration. Distinguish verified current behavior from the proposal.

Planning fields added to this policy do not, by themselves, revoke a design the maintainer already approved. Before the next implementation, assess which new evidence is actually missing and record that assessment. Do not treat a previously approved design as void only because a later policy lists more headings.

## Scope and exceptions

Full design review is required for new features, external integrations, cross-boundary behavior, public contracts, persistence changes, security-sensitive changes, and substantial refactors. Small documentation edits, isolated test maintenance, and trivial fixes with no architectural impact may use a short impact statement instead. The author must justify the classification. Ambiguous cases use design review.

An urgent fix may use an abbreviated design and expedited explicit approval, and must still describe its boundary, risk, and verification. No agent may self-approve or treat silence as approval.

Before explicit owner approval, the allowed work is repository investigation, running existing tests, planning baseline characterization, and writing the test design. Do not start new feature implementation, a migration, or new feature tests before that approval. A material deviation from an approved design needs a new review and approval before the implementation continues.

Design and implementation stay in separate pull requests for every change that requires this gate.

## PR checklist

**Design PR:** canonical documents consulted; current/proposed diagrams; interfaces and flows; security and failure cases; alternatives; acceptance criteria; maintainer approval.

**Implementation PR:** link to approved design; conformity/deviations; relevant tests and CI; security/compatibility impact; migration/rollback; updated `PROJECT_STATE.md` and `DUTY_WATCH.md` where required.

This document supplements rather than replaces `docs/governance/AI_AGENT_WORKFLOW.md`, `docs/governance/ENGINEERING_LIFECYCLE.md`, `docs/governance/ACCESSIBILITY.md`, `docs/architecture/ARCHITECTURE.md`, `docs/governance/DOMAIN_MODELING.md`, and `docs/governance/CODE_QUALITY_STANDARDS.md`. If rules conflict, resolve them explicitly in review before implementation.

## Diagram sources and previews

New task-specific System Designs belong in `docs/designs/<task-slug>/`; link existing approved designs in their original location rather than duplicating them. Choose only the formats useful for the task, optionally combining them:

- Excalidraw `.excalidraw` for architecture sketches and wireframes; include a corresponding `.svg` preview.
- diagrams.net `.drawio` for detailed components, integrations and deployment; include a corresponding `.svg` preview.
- Mermaid in `.md` or `.mmd` for sequence, flowchart, state and data-flow diagrams; SVG is optional.

Commit editable source and synchronized, visually checked previews. Keep names paired (`overview.drawio` and `overview.svg`). Verify diagrams against actual components, existing DDD contexts, dependency direction, contracts and security boundaries. Separate observed behavior from proposals. Do not require all three tools or introduce duplicate architecture documents.

Design PRs link source diagrams and demonstrate visual review, failure flows and explicit maintainer approval. Implementation PRs link the approved design and document deviations; material deviations require renewed approval. A policy-only PR does not approve a feature design.
