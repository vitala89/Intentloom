# Intentloom Domain Modeling

This document defines how domain concepts are modeled inside the Intentloom
repository. It complements `ENGINEERING_PRINCIPLES.md`,
`CODE_QUALITY_STANDARDS.md`, accepted ADRs, and package-specific contracts.

Intentloom uses **pragmatic Domain-Driven Design** together with Clean
Architecture and explicit dependency boundaries. DDD is a modeling discipline,
not a requirement to introduce every tactical pattern in every module.

## 1. Goals

Domain modeling in Intentloom exists to:

- keep product concepts precise as the platform grows;
- give maintainers, agents, protocols, CLI, daemon, Desktop, and tests one
  shared vocabulary;
- keep domain and application behavior independent from transports, frameworks,
  providers, storage, and UI;
- make ownership, invariants, trust boundaries, and lifecycle differences
  explicit;
- prevent accidental duplication of the same rule in multiple adapters;
- allow the architecture to evolve incrementally without ceremonial layers.

The goal is not to reproduce a textbook DDD structure mechanically.

## 2. Ubiquitous Language

Repository code, tests, documentation, protocol contracts, and user-facing
technical language should use the same term for the same domain concept.

Prefer names that describe the Intentloom domain directly, for example:

- `AdoptionProposal`, `AdoptionPlan`, `OwnershipDecision`;
- `MutationProposal`, `MutationReviewArtifact`, `ApprovalIntent`;
- `Checkpoint`, `TaskGraph`, `Evidence`, `Finding`;
- `ExtensionManifest`, `Capability`, `ConformanceProfile`.

Avoid introducing synonyms for an established concept unless the terms have
different domain meaning. Generic names such as `Manager`, `Handler`,
`Processor`, `Helper`, `Thing`, or `Data` should not hide a clearer domain
term.

Function and operation names should express domain intent:

- prefer `createMutationProposal()`, `issueMutationApproval()`, and
  `applyApprovedMutation()`;
- avoid `processMutation()`, `handleProposal()`, or `executeStuff()` when a
  more precise operation is known.

When a new fundamental concept is introduced, its name and meaning should be
checked against existing terminology before a competing term is added.

## 3. Bounded contexts

A bounded context is a semantic and ownership boundary where a coherent model
and vocabulary apply. It is not just a directory.

Current Intentloom areas that may act as bounded contexts or context candidates
include:

- Project Adoption;
- Engineering Intent and Catalog;
- Synchronization;
- Project Inspection and Evidence;
- Engineering Conformance and Assessment;
- Agent Workspace;
- Agent Memory;
- Neutron Execution;
- Mutation Governance;
- Managed Extensions.

This list is descriptive, not a frozen package map. A context should be promoted
to a formal architectural boundary only when repository evidence shows a real
difference in invariants, lifecycle, ownership, language, or integration
contract.

Do not create a bounded context because a feature is large, because a folder
exists, or because DDD terminology suggests one should exist.

Cross-context interaction should use explicit contracts. Avoid importing
internal models from one context into another merely for convenience.

## 4. Dependency direction

The default direction remains:

```text
Domain
  ↑
Application
  ↑
Ports / Protocol contracts
  ↑
Infrastructure / adapters / clients
```

The exact package topology may vary, but dependencies point toward stable domain
and application contracts.

### Domain

Domain code owns business concepts, invariants, state transitions, policies, and
value semantics that make sense without CLI, Desktop, MCP, filesystem, network,
GitHub, databases, model providers, or UI frameworks.

### Application

Application code coordinates use cases, authorization, transactions,
idempotency, cancellation, current-state validation, and interaction through
ports. Application code may orchestrate domain concepts, but should not leak
transport or UI concerns into them.

### Ports and protocol contracts

Ports describe capabilities needed by the application. Protocol contracts
describe stable cross-process or client-visible messages. They are boundaries,
not alternate homes for duplicated business rules.

### Infrastructure, adapters, and clients

Filesystem, Git, provider APIs, persistence, daemon transport, Tauri, CLI, MCP,
Desktop, and other technical integrations stay at the edges. They translate
between external representations and canonical contracts.

## 5. Tactical DDD patterns are optional

Use tactical patterns only when they clarify a real modeling problem.

### Entity

Use an Entity when identity persists while attributes may change and that
identity matters to behavior or lifecycle.

Do not turn every typed object with an `id` field into an Entity.

### Value Object

Use a Value Object when value equality and invariants matter more than identity.
Prefer immutable representations when practical.

A primitive wrapper is justified when it centralizes meaningful validation,
semantics, or safety. Do not wrap every string merely to look domain-driven.

### Aggregate

Use an Aggregate when multiple domain objects must maintain invariants as one
consistency or transaction boundary.

An Aggregate Root exists to protect those invariants. It is not a mandatory base
class and does not require inheritance.

Do not introduce an Aggregate for a single record with no cross-object
consistency rule.

### Repository

Use a Repository when the application needs a domain-oriented persistence or
retrieval abstraction whose implementation can vary independently.

A Repository is not a synonym for any filesystem helper, API client, cache, or
query function. Do not add repository interfaces around deterministic in-memory
logic or one-off reads without a real persistence boundary.

### Domain Service

Use a Domain Service for domain behavior that does not naturally belong to one
Entity or Value Object and remains independent from infrastructure.

Do not move arbitrary application orchestration into a Domain Service.

### Domain Event

Use a Domain Event when a completed domain fact has meaning beyond the local
operation and other parts of the system need to react to that fact.

Do not emit events only to decouple two functions in the same call path. Event
schemas, ordering, replay, idempotency, privacy, and versioning must be explicit
when events cross durable or distributed boundaries.

## 6. Invariants before abstractions

Model invariants first. Add abstractions second.

For example, Mutation Governance has meaningful distinctions such as:

- a proposal is not authorization;
- reviewed content is content-bound;
- approval is bound to exact reviewed state and trusted host authority;
- Apply is distinct from Verification;
- successful Apply does not imply successful Verification;
- stale project state fails closed.

Those invariants are more important than whether the implementation contains a
class named `AggregateRoot`.

A design review should therefore ask:

1. What domain rule or invariant is protected?
2. Which context owns it?
3. Which operation may change it?
4. Which external capability is required?
5. Where is the trust boundary?
6. What evidence proves the boundary is preserved?

If those answers are unclear, adding DDD vocabulary usually does not improve the
design.

## 7. Context boundaries and contracts

Across bounded contexts:

- share stable identifiers and explicit contracts, not internal mutable models;
- translate external/provider representations at the boundary;
- keep one context from reaching into another context's persistence internals;
- document ownership of shared schemas;
- prefer explicit application operations over cross-context state mutation;
- require an ADR when a change materially redefines ownership, data authority,
  transaction boundaries, or dependency direction.

A shared package is not automatically a shared domain. Shared code should
represent genuinely shared contracts or reusable technical capability, not
become a dumping ground for unrelated domain objects.

## 8. Naming and API shape

Domain-facing APIs should read in the language of the product.

Prefer:

```text
proposeExtensionAdoption()
reviewMutationProposal()
issueMutationApproval()
applyApprovedMutation()
verifyAppliedMutation()
reconcileTaskGraphExecution()
```

Avoid vague APIs such as:

```text
runManager()
handleData()
processItem()
doAction()
commonHelper()
```

Commands and public contracts should preserve the same distinctions as the
domain. UI wording may be friendlier, but it must not collapse security or
lifecycle distinctions that matter to correctness.

## 9. Evidence-based DDD

Do not claim that a module or repository follows DDD merely because it contains
folders or classes named `domain`, `aggregate`, `entity`, `repository`, or
`event`.

Evidence of healthy domain modeling includes:

- stable shared vocabulary;
- explicit ownership and context boundaries;
- domain invariants in one canonical place;
- dependencies pointing toward stable contracts;
- infrastructure kept at the edge;
- cross-context interaction through declared contracts;
- tests centered on observable domain behavior and invariants;
- abstractions introduced because of demonstrated need.

Architecture assessment should report uncertainty when those properties cannot
be established from repository evidence.

## 10. Incremental adoption

This document does not authorize a repository-wide rewrite.

Existing code should be improved incrementally when:

- a feature introduces a new domain concept;
- a touched area duplicates terminology or business rules;
- a context boundary is being crossed;
- an oversized module already mixes domain, application, and infrastructure
  concerns;
- a roadmap item or ADR establishes a new ownership boundary.

Do not rename stable public contracts, move packages, or split contexts only to
make the repository appear more DDD-like.

## 11. Agent and review checklist

Before introducing or changing a domain concept:

1. identify the owning bounded context or explain why no separate context is
   needed;
2. reuse the established ubiquitous language;
3. state the invariant or behavior being modeled;
4. preserve dependency direction;
5. decide whether Entity, Value Object, Aggregate, Repository, Domain Service, or
   Domain Event is actually required;
6. avoid infrastructure types in domain contracts;
7. add the lowest reliable behavior or invariant tests;
8. update this document, the relevant ADR, specification, or glossary-level
   documentation when a fundamental term or ownership boundary changes.

During review, reject architecture that adds tactical DDD patterns without a
demonstrated modeling need.

## 12. Relationship to Intentloom architecture profiles

`docs/roadmap/ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md` defines how
Intentloom may eventually describe architecture strategies for external projects.
That product capability is separate from this repository's own modeling rules.

Intentloom itself follows the pragmatic rules in this document regardless of
whether the future architecture-profile product feature is enabled.

DDD, Clean Architecture, vertical slices, ports-and-adapters, modular monoliths,
and other strategies may compose when their boundaries and assumptions are
explicit. No architecture label may weaken the repository's security, ownership,
approval, evidence, compatibility, or reversible-write invariants.
