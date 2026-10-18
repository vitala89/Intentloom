# Design-first architecture gate

Status: proposed. Applies to Intentloom features, integrations, and material architectural changes after maintainer approval.

## Mandatory sequence

1. **Discover:** read `AGENTS.md`, `AGENT_START_HERE.md`, `docs/README.md`, canonical architecture/governance documents, relevant ADRs, current code and tests. Identify existing boundaries and avoid duplicate guidance.
2. **Design:** prepare a reviewable System Design document before writing implementation code. Put feature-specific designs under `docs/design/` unless the documentation index specifies an existing canonical location. Reuse existing ADRs; write a new ADR only for durable unresolved decisions.
3. **Review:** obtain explicit maintainer approval of the design. A design PR must not contain feature implementation. Record alternatives, trade-offs and unresolved questions.
4. **Implement:** only after approval, open a separate implementation PR linking the approved design and ADRs. Any material design deviation requires an updated review before proceeding.
5. **Verify:** compare the code to the approved design, run required checks and tests, document migration and rollback where relevant, and update project handoff documents.

## Minimum System Design content

- Problem, scope, requirements, acceptance criteria and non-goals.
- Current-state and proposed context/component diagrams (Mermaid).
- Sequence diagrams for successful and rejected/failed operations.
- Data-flow diagram, storage ownership, lifecycle and persistence.
- DDD bounded contexts, ubiquitous language, dependency direction and ownership; do not force unnecessary domain patterns.
- Typed API/RPC contracts, events, versioning and compatibility.
- Authentication, authorization, approval boundaries, trust boundaries and threat considerations.
- Errors, retries, idempotency, timeouts, recovery, observability and rollback.
- Alternatives considered, performance and resource constraints.
- Test strategy: unit, integration, contract, E2E and negative cases as applicable.
- Implementation slices, migration steps, risks and open questions.

Use diagrams to clarify actual behavior, not decorative architecture. Explicitly distinguish verified current behavior from proposed behavior. Where a section does not apply, state why.

## Scope and exceptions

Full design review is required for new features, external integrations, cross-boundary behavior, public contracts, persistence changes, security-sensitive changes and substantial refactors. Small documentation edits, isolated test maintenance and trivial fixes with no architectural impact may use a short impact statement instead. The agent must justify the classification; ambiguous cases default to design review.

An urgent fix may use an abbreviated design and expedited explicit approval, but must still describe its boundary, risk and verification. No agent may self-approve or infer approval from silence.

## PR checklist

**Design PR:** canonical documents consulted; current/proposed diagrams; interfaces and flows; security and failure cases; alternatives; acceptance criteria; maintainer approval.

**Implementation PR:** link to approved design; conformity/deviations; relevant tests and CI; security/compatibility impact; migration/rollback; updated `PROJECT_STATE.md` and `DUTY_WATCH.md` where required.

This document supplements rather than replaces `docs/governance/AI_AGENT_WORKFLOW.md`, `docs/architecture/ARCHITECTURE.md`, `docs/governance/DOMAIN_MODELING.md`, and `docs/governance/CODE_QUALITY_STANDARDS.md`. If rules conflict, resolve them explicitly in review before implementation.
