# Engineering Workspace Principles

## Purpose

These principles govern implementation of the Project Design and Development
Workspace across Core, application operations, daemon, CLI, Desktop, TUI, MCP,
Neutron, and future clients.

They extend existing engineering, Foundation-first, assessment, extension,
security, ownership, and transaction governance. They do not weaken any existing
safety boundary.

## 1. Two equal entry points

Intentloom supports both:

- creating a new project from an idea;
- opening and improving an existing project.

Neither path is treated as a secondary compatibility mode.

New projects go through Foundation, Blueprint, scaffold review, approval, and
verification. Existing projects go through bounded inspection, evidence,
assessment, target-state options, and reviewed adoption or remediation.

## 2. Existing code is evidence, not intent

Folder names, dependencies, imports, framework choices, and current architecture
are evidence of the present system. They do not automatically establish the
project's intended architecture.

Intentloom must distinguish observed state, declared intent, inferred intent,
assumptions, and approved target state.

## 3. Inspect and assess before improving

For an existing project, the default sequence is read-only:

```text
inspect -> evidence -> graph -> quality -> assessment -> recommendation
```

A recommendation is not a mutation plan, and a finding is not write authority.

## 4. Foundation before normal production scaffolding

A normal new-project flow should not treat a single prompt as sufficient
production evidence.

Intentloom should establish enough information about users, workflows, domain,
constraints, quality, risks, and likely change scenarios to reach an explicit
Foundation readiness state before normal scaffolding.

Prototype exceptions remain possible but must be explicit and reviewable.

## 5. One source of domain truth

Core and application operations own canonical behavior. CLI, Desktop, TUI, MCP,
and agent clients are adapters over shared operations and contracts.

Clients must not create independent implementations of:

- repository inspection;
- architecture rules;
- quality and assessment logic;
- ownership;
- approval semantics;
- transaction behavior;
- rollback;
- project memory trust.

Desktop must not parse human CLI output as an internal API.

## 6. Contract-first parallel development

Separate agents may develop Core and client surfaces in parallel only through a
shared, versioned contract baseline.

A Core agent may own protocol, schemas, validators, application operations,
daemon methods, and fixtures.

A Desktop/CLI/TUI agent may own presentation, interaction, accessibility,
viewmodels, and client-state behavior.

When runtime implementation is not ready, clients use exact versioned fixtures or
mock protocol responses. They must not invent domain semantics that later become
accidental contracts.

## 7. Capability parity is explicit

Every major workflow should track whether it exists in Core/Application,
Protocol, Daemon, CLI, Desktop, TUI, MCP, and Neutron.

A design mock, roadmap phase, disabled button, or concept document does not count
as an implemented capability.

Where possible, documented state should be checked against capability discovery,
fixtures, tests, or code rather than maintained only by prose.

## 8. Read-only means read-only

Inspection, Doctor, evidence collection, architecture analysis, assessment, and
review modes must not create or modify project-owned files unless the operation
is explicitly documented as changing Intentloom-local workspace state.

Read-only claims require tests or evidence appropriate to the operation.

## 9. Mutation requires a prepared plan

Every project mutation follows:

```text
prepare
-> exact affected paths and effects
-> review
-> explicit approval
-> current-state revalidation
-> apply or reject
-> verification
-> rollback evidence where applicable
```

Model output, prompt text, previous broad consent, external MCP output, or the
mere existence of a finding never counts as approval.

## 10. Side effects stay separate

Project file creation does not silently imply:

- dependency installation;
- package-manager execution;
- Git initialization or commit;
- remote repository creation;
- provider writes;
- CI account configuration;
- cloud activation;
- package publication;
- release or deployment.

Each requires a separate reviewed capability and plan where implemented.

## 11. AI proposes, deterministic systems decide boundaries

Neutron and configured coding agents may:

- ask questions;
- explain evidence;
- compare alternatives;
- draft Foundation and Blueprint content;
- propose plans;
- execute within an explicitly granted bounded capability when that future gate
  is implemented.

They do not own:

- project-root authority;
- ownership decisions;
- schema validation;
- architecture and quality policy authority;
- readiness rules;
- plan identity;
- approval state;
- permission expansion;
- transaction and rollback truth.

## 12. Architecture is project-relative

Intentloom must not universally prefer Clean Architecture, DDD, Feature-Sliced
Design, Hexagonal Architecture, modular monoliths, microservices,
microfrontends, Nx, or another style.

The selected or approved project intent determines which architecture rules are
relevant. Recommendations should include trade-offs and migration consequences.

## 13. Preserve uncertainty

Unknown, ambiguous, conflicting, stale, unsupported, and insufficient evidence
are valid states.

Intentloom must not convert uncertainty into false precision merely to produce a
clean recommendation or complete UI.

## 14. Improvement options, not forced rewrites

For existing projects, recommendations should normally distinguish:

- preserve current design;
- make a local improvement;
- evolve architecture incrementally;
- migrate toward a target state;
- defer with an explicit seam or migration path.

A large rewrite should not be the default response to architectural debt.

## 15. Quality and architecture feedback continues after creation

Foundation and Blueprint are not one-time documents that become irrelevant after
scaffolding.

Future feature plans should resolve against approved intent, observed
architecture, current quality rules, assessments, accepted debt, and project
memory. Conflicts should be surfaced before implementation when possible.

## 16. Project memory is reviewed knowledge

Accepted decisions, resolved findings, migration choices, and reviewed summaries
may become project memory through existing provenance and review rules.

Raw model output or transient conversation does not silently become canonical
project knowledge.

## 17. Accessibility and non-visual parity are product requirements

Desktop visual maps and comparisons require equivalent textual or list-based
representations. TUI and CLI must preserve material decisions, findings,
assumptions, approvals, and errors even when they cannot reproduce a visual
layout.

## 18. Client ergonomics do not weaken security

A smoother Desktop or interactive CLI flow does not justify:

- hidden credentials;
- unrestricted filesystem access;
- generic shell execution;
- silent network calls;
- persistent broad permissions;
- skipped stale-state checks;
- model self-approval.

## 19. Dogfood both entry modes

Major workspace milestones should be exercised against:

- at least one real new project created through Intentloom;
- at least one existing project opened, inspected, assessed, and taken to a
  reviewed improvement plan.

Fixture coverage is required but does not replace real dogfooding evidence.

## 20. Prefer incremental, reviewable PRs

Workspace implementation should be divided by contract and capability slices.
Do not mix broad Core, Desktop, CLI, mutation, provider, and release work into one
unreviewable change.

Every meaningful phase follows repository branch, commit, testing, Duty Watch,
and Project State governance.
