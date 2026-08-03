# Foundation-First Development Principles

## Status

Governance direction for Project Inception, Foundation Workshop, Blueprint,
scaffolding, Neutron planning, and future implementation workflows.

These principles do not create runtime behavior by themselves. They define the
expected boundaries for later contracts, clients, and implementation pull
requests.

## Principles

### 1. Understand before implementing

Intentloom should not convert an incomplete idea directly into production code or
scaffolding. It first establishes the problem, users, workflows, domain,
constraints, risks, quality expectations, and important future changes.

### 2. Start from the domain, not the stack

Technology is selected after the product and domain boundary is understood. A
framework, database, cloud provider, workspace tool, or architecture pattern is
never the starting requirement unless the user explicitly makes it a hard
constraint.

### 3. Support non-technical users

Users may describe needs in ordinary language. Neutron translates those answers
into candidate structured decisions and explains unfamiliar terms. Lack of
architecture vocabulary must not block participation.

### 4. Prefer the smallest coherent foundation

Intentloom recommends the simplest foundation that satisfies reviewed evidence.
Additional packages, services, deployables, layers, abstractions, and providers
must justify their operational and migration cost.

### 5. Design for likely change, not imaginary change

Future flexibility is based on reviewed change scenarios. The system must not
introduce speculative generality merely because a change is theoretically
possible.

### 6. Keep uncertain decisions reversible

When evidence is weak, prefer reversible defaults, explicit seams, review
triggers, and migration paths. Irreversible or expensive decisions require clear
trade-offs and approval.

### 7. Make coupling intentional

Some coupling may be accepted to reduce complexity. Accepted coupling is visible,
scoped, and reviewed. Hidden coupling is a finding.

### 8. Compare before recommending

Material decisions include a minimal option, a recommended option, and an
extensible option only when relevant. The comparison includes cost, risk,
security, operations, migration, reversibility, and change-scenario impact.

### 9. Separate recommendation, decision, approval, and mutation

```text
AI recommendation
!= selected foundation
!= approved blueprint
!= approved scaffold plan
!= mutation permission
```

No model, role, effort level, or generated explanation may approve its own
proposal.

### 10. Readiness is deterministic

Neutron may explain readiness findings, but versioned rules and reviewed evidence
determine whether the foundation is blocked, incomplete, provisional, ready, or
ready with accepted risks.

### 11. Prototype shortcuts are explicit

A prototype exception records purpose, lifetime, known shortcuts, forbidden data
and production use, review trigger, and migration or deletion expectation.
Prototype status must not be presented as production readiness.

### 12. The foundation can evolve

An approved foundation is versioned intent, not an immutable constitution. New
evidence or requirements may justify an explicit foundation change, ADR,
migration plan, and refreshed fitness functions.

### 13. Future tasks respect the foundation

Every task resolves the relevant foundation scopes. Conflicts are reported with
options to implement locally, migrate, or change the foundation. Agents must not
silently bypass approved boundaries.

### 14. Architecture needs fitness evidence

Where practical, important boundaries become deterministic checks for dependency
direction, public contracts, data ownership, security, accessibility,
performance, tests, releases, and compatibility.

### 15. Client surfaces remain equivalent

CLI, Desktop, TUI, MCP, daemon, and Neutron consume the same application
operations, readiness state, decisions, assumptions, risks, and approvals. A
visual interface must not have hidden authority unavailable to other clients.

### 16. Private discovery remains private by default

Raw conversations, provider payloads, private drafts, and sensitive observations
remain in user-local storage. Only reviewed project intent and explicitly
exported artifacts become project-visible.

### 17. Specialist authority is not simulated

Intentloom may identify that legal, security, privacy, accessibility, financial,
or regulatory review is required. It must not claim that an AI response replaces
that authority.

### 18. No hidden side effects

Foundation discovery and readiness evaluation are read-only. Dependency
installation, filesystem mutation, Git operations, network access, provider
writes, deployment, release, and publication remain separate reviewed actions.

## Required enforcement direction

Future implementation should make these principles observable through:

- versioned foundation contracts;
- typed questions and answers;
- visible assumptions and conflicts;
- change-scenario stress tests;
- deterministic readiness findings;
- approval digests and expiry;
- scaffold and task gates;
- audit and evidence records;
- client-parity fixtures;
- security and migration tests.

## Review rule

A pull request implementing Foundation Workshop behavior should explain which
principles it enforces, which remain deferred, and what evidence proves that the
implementation does not bypass recommendation, readiness, approval, ownership,
or mutation boundaries.
