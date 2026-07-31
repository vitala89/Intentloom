# Architecture and Discipline Profiles Plan

## Status

Planned product increment linked to
`CONFIGURABLE_ENGINEERING_STANDARDS_PLAN.md`. This document defines a candidate
product model. It does not add a valid configuration field, CLI command, schema,
or protocol contract yet.

## Purpose

Intentloom should let a user describe not only how strictly code is written, but
also how a project is organized, where architectural boundaries exist, and which
engineering disciplines are involved.

A single flat architecture selector would be misleading. Feature-Sliced Design,
Domain-Driven Design, Clean Architecture, vertical slices, microfrontends,
modular monoliths, microservices, monorepos, and role-specific practices describe
different levels of a system. Some can be combined safely, some apply only to one
part of a project, and some conflict when assigned to the same deployable unit.

The product should therefore model architecture as a scoped composition of
compatible strategies rather than as one global label.

## Product model

The effective engineering configuration has five independent layers:

1. **Mandatory platform baseline**
   - security, ownership, explicit roots, evidence before mutation, approval,
     compatibility, provider neutrality, truthful reporting, and reversible
     writes;
   - cannot be disabled.
2. **Quality profile**
   - code-size budgets, complexity, test requirements, legacy ratchet, and
     exception policy;
   - examples: balanced, strict, legacy-ratchet, custom.
3. **Architecture strategy profile**
   - system topology, internal application architecture, frontend organization,
     repository topology, integration style, and data boundaries;
   - selected per project, workspace, package, application, bounded context, or
     path scope.
4. **Technology and domain packs**
   - TypeScript, Angular, React, Rust, Tauri 2, backend API, database, mobile,
     data, ML, cloud, accessibility, security-sensitive, and other technical
     guidance.
5. **Discipline perspectives**
   - frontend, backend, full-stack, mobile, desktop, QA, SDET, DevOps, SRE,
     platform, security, data, ML/AI, database, UX, accessibility, architecture,
     and technical documentation views.

No client implements these layers independently. CLI, daemon, MCP, Desktop, TUI,
and generated agent guidance resolve one canonical effective configuration
through shared application and protocol contracts.

## Architecture axes

Intentloom should not place every pattern in one mutually exclusive list. It
should organize choices along separate axes.

### 1. Solution topology

Describes deployable and operational boundaries.

Candidate strategies:

- single deployable monolith;
- modular monolith;
- microservices;
- serverless functions;
- event-driven distributed system;
- plugin or extension platform;
- edge or offline-first application;
- hybrid topology with explicitly scoped deployables.

One deployable unit normally has one primary topology. A larger solution may
contain several units with different topology profiles.

### 2. Internal application architecture

Describes dependency direction and use-case organization inside a deployable or
bounded context.

Candidate strategies:

- simple layered architecture;
- Clean Architecture;
- hexagonal or ports-and-adapters architecture;
- onion architecture;
- vertical-slice architecture;
- Domain-Driven Design, lightweight or full;
- CQRS;
- event sourcing;
- pipeline or staged processing;
- actor-oriented or message-driven internals.

These strategies may compose. For example, a modular monolith can use bounded
contexts, vertical slices, and ports-and-adapters inside each module.

### 3. Frontend organization

Describes how UI behavior, state, routes, features, and shared components are
partitioned.

Candidate strategies:

- feature-oriented modules;
- Feature-Sliced Design;
- domain-oriented frontend;
- route or page-oriented organization;
- component-driven architecture;
- design-system-first architecture;
- microfrontend composition;
- shell plus independently delivered feature applications;
- local-first client with synchronized domain state.

Feature-Sliced Design and microfrontends are not direct alternatives. One
microfrontend can use Feature-Sliced Design internally, while the system also
defines ownership, integration, routing, shared dependency, and deployment
boundaries between microfrontends.

### 4. Repository and workspace topology

Describes source ownership and build boundaries, not runtime architecture.

Candidate strategies:

- single-package repository;
- multi-package monorepo;
- Nx-style project graph and enforceable module boundaries;
- workspace with applications and shared libraries;
- polyrepo;
- generated SDK or contract repository;
- platform repository plus independent product consumers.

Repository topology must not be treated as proof of runtime architecture. A
monorepo may contain a monolith, microservices, microfrontends, libraries, or all
of them.

### 5. Integration and communication style

Candidate strategies:

- in-process typed calls;
- request-response APIs;
- asynchronous messages and events;
- command and query separation;
- local IPC;
- shared protocol contracts;
- batch or data-pipeline exchange;
- offline synchronization;
- plugin capability contracts.

The selected style should define timeout, cancellation, retries, idempotency,
versioning, schema ownership, error semantics, and observability requirements.

### 6. Data architecture

Candidate strategies:

- shared relational database with module ownership;
- database per service;
- event-carried state transfer;
- CQRS read models;
- append-only event store;
- local-first database with synchronization;
- analytical warehouse or lakehouse;
- vector, graph, document, time-series, or search projections;
- privacy-separated data domains.

Intentloom should require explicit data ownership and migration rules rather than
selecting a database architecture from framework detection alone.

## Scoped architecture selections

Architecture should be assignable to a scope. Candidate scope types:

- repository;
- workspace project;
- application;
- package or crate;
- bounded context;
- feature area;
- directory or path pattern;
- deployable unit;
- runtime process;
- data domain.

A project may therefore express a composition similar to:

```yaml
architecture:
  solution:
    topology: modular-monolith
    repository: nx-monorepo
  scopes:
    - id: web-frontend
      paths:
        - apps/web/**
      strategies:
        frontend: feature-sliced
        internal: vertical-slices
      technologyPacks:
        - typescript
        - angular
        - accessibility
    - id: public-api
      paths:
        - apps/api/**
      strategies:
        internal: hexagonal
        domain: ddd-lite
        integration: request-response
      technologyPacks:
        - backend-api
        - database
    - id: desktop
      paths:
        - apps/desktop/**
      strategies:
        client: thin-client
        integration: local-ipc
      technologyPacks:
        - typescript
        - rust
        - tauri-2
```

This is illustrative only and is not valid configuration until accepted schemas
and migrations define the contract.

## Compatibility and composition rules

Every architecture strategy must declare:

- stable strategy ID and semantic version;
- axis and permitted scope types;
- required and forbidden companion strategies;
- compatible technology and domain packs;
- assumptions and trade-offs;
- dependency and ownership rules;
- deterministic checks where available;
- migration guidance;
- source references and last-reviewed date.

The resolver should classify combinations as:

- `compatible`;
- `compatible-with-constraints`;
- `redundant`;
- `ambiguous`;
- `conflicting`;
- `unsupported`;
- `requires-architecture-decision`.

Examples:

- Feature-Sliced Design plus microfrontends is compatible with constraints when
  microfrontend ownership and cross-application imports are explicit.
- DDD plus vertical slices is compatible when use cases stay inside bounded
  context ownership.
- Clean Architecture plus framework-specific UI organization is compatible when
  framework dependencies remain at the edge.
- A modular monolith and microservices may coexist at solution level, but they
  cannot both be the primary topology of the same deployable unit.
- Event sourcing should require explicit event schema, versioning, replay,
  retention, privacy, and migration decisions rather than being enabled as a
  cosmetic preset.
- Microfrontends should not be recommended only because a repository has many
  frontend packages. Team ownership, independent delivery, operational cost, and
  integration boundaries must justify the choice.

## Architecture selection workflow

Intentloom should guide rather than silently decide.

```text
inspect repository evidence
→ identify applications, packages, deployables, and likely domains
→ propose architecture scopes with confidence and evidence
→ user confirms or edits each scope
→ select primary strategies and optional modifiers
→ resolve compatibility and constraints
→ explain trade-offs and required decisions
→ preview generated guidance and conformance rules
→ user approves
→ write transactionally
```

High-impact strategies such as microservices, microfrontends, event sourcing,
shared-database changes, or polyrepo migration must require an explicit
architecture decision record. Detection evidence can inform the proposal, but it
must not authorize a migration.

## Discipline perspectives

Architecture defines system boundaries. A discipline perspective defines which
parts of the effective policy are emphasized for a person, agent, task, or team.
It must not fork the architecture or create conflicting sources of truth.

Candidate first-party discipline perspectives:

### Frontend engineer

- UI composition, state boundaries, routing, data fetching, performance,
  accessibility, design-system use, browser security, and frontend testing;
- Feature-Sliced, domain-oriented, component-driven, and microfrontend guidance
  when selected by the project architecture.

### Backend engineer

- use cases, APIs, domain boundaries, persistence, messaging, transactions,
  idempotency, failure semantics, observability, and integration tests.

### Full-stack engineer

- frontend-backend contract ownership, end-to-end flows, schema compatibility,
  shared validation, and prevention of domain duplication across clients and
  servers.

### Mobile engineer

- platform lifecycle, offline state, navigation, device permissions, secure
  storage, synchronization, battery and network constraints, and mobile UI
  testing.

### Desktop engineer

- native-webview boundaries, IPC, capabilities, packaging, update security,
  operating-system integration, resource use, and cross-platform tests.

### QA engineer

- acceptance criteria, exploratory risk, test design, traceability, regression
  scope, environment evidence, and release verification.

### SDET or test automation engineer

- test architecture, fixtures, deterministic environments, contract tests,
  integration suites, end-to-end reliability, flake control, and test tooling
  boundaries.

### DevOps engineer

- build, deployment, environment configuration, supply chain, infrastructure
  change review, rollback, secrets, and delivery automation.

### SRE engineer

- service-level objectives, availability, capacity, observability, incident
  response, resilience tests, error budgets, and operational readiness.

### Platform engineer

- paved roads, developer experience, reusable platform contracts, tenancy,
  policy enforcement, service catalogs, and internal product boundaries.

### Security or AppSec engineer

- threat models, trust boundaries, least privilege, dependency and supply-chain
  risk, secret handling, security tests, vulnerability lifecycle, and audit
  evidence.

### Data engineer

- ingestion, transformations, schemas, lineage, quality checks, orchestration,
  storage lifecycle, privacy, and reproducibility.

### ML or AI engineer

- dataset provenance, evaluation, prompt and model versioning, retrieval,
  inference boundaries, safety, monitoring, reproducibility, and human approval
  for high-impact actions.

### Database engineer

- schema ownership, migrations, indexing, query plans, backup, recovery,
  replication, retention, and data-access boundaries.

### UX, UI, and accessibility engineer

- information architecture, interaction states, design tokens, consistency,
  inclusive design, keyboard and assistive-technology behavior, and usability
  evidence.

### Software architect or technical lead

- context mapping, dependency direction, trade-off records, compatibility,
  cross-team ownership, migration sequencing, and architecture conformance.

### Technical writer or developer advocate

- user journeys, conceptual accuracy, examples, migration guidance, API
  discoverability, documentation testing, and version alignment.

A task may activate multiple perspectives. For example, a Tauri authentication
feature may need frontend, desktop, backend, security, QA, and accessibility
perspectives over the same architecture configuration.

## Role assignment model

Intentloom should distinguish:

- **project disciplines**, which describe teams responsible for the system;
- **task disciplines**, which describe perspectives required for one change;
- **agent role**, which limits what an agent should analyze or propose;
- **approval role**, which identifies required human review, without granting
  identity or permissions automatically.

Selecting a discipline must not grant filesystem, network, deployment, secret,
merge, or release capabilities. Capabilities remain explicit and separate from
role labels.

## Task planning behavior

Before implementation, an agent should resolve:

1. affected architecture scopes;
2. active quality profile;
3. applicable technology and domain packs;
4. required discipline perspectives;
5. dependency and ownership rules;
6. mandatory tests, reviews, and documentation;
7. unresolved architecture decisions;
8. whether the requested change crosses a deployable, bounded context, data,
   security, or team ownership boundary.

The generated task plan should explain why each profile applies. It should not
paste every rule into every task.

## CLI experience

Candidate commands:

```bash
intentloom architecture detect --root .
intentloom architecture init --interactive
intentloom architecture show --effective
intentloom architecture explain feature-sliced
intentloom architecture validate
intentloom architecture diff
intentloom disciplines list
intentloom disciplines plan --for frontend,qa,security
```

Candidate scoped selection:

```bash
intentloom architecture set \
  --scope apps/web/** \
  --frontend feature-sliced \
  --internal vertical-slices \
  --dry-run
```

All mutations must use the existing preview, validation, approval, transaction,
and rollback boundary.

## Desktop and TUI experience

Add an **Architecture Map** next to Engineering Standards.

The UI should show:

- detected applications, packages, deployables, and data domains;
- architecture scopes as a tree or graph;
- primary strategies and modifiers for each scope;
- compatibility, conflicts, and unresolved decisions;
- active technology packs and discipline perspectives;
- dependency-direction findings;
- ownership and allowed integration paths;
- an effective-policy preview for a selected file or task;
- migration progress and legacy exceptions;
- a diff before any configuration or generated guidance is written.

The first UI slice should remain read-only. Editing can follow only after schema,
resolver, validation, and transactional planning are stable.

## MCP surface

Candidate read-only resources:

```text
intentloom://architecture/catalog
intentloom://architecture/effective
intentloom://architecture/scopes
intentloom://architecture/findings
intentloom://disciplines/catalog
```

Candidate read-only tools:

```text
intentloom_architecture_detect
intentloom_architecture_show
intentloom_architecture_validate
intentloom_architecture_explain
intentloom_architecture_diff
intentloom_task_profile_resolve
```

No MCP tool may choose or apply a high-impact architecture migration without an
explicit reviewed plan and human approval.

## Deterministic conformance candidates

Initial checks may include:

- forbidden cross-layer imports;
- imports crossing bounded contexts without declared contracts;
- dependency cycles;
- package or crate boundary violations;
- frontend layer or slice import direction;
- microfrontend direct cross-application imports;
- backend transport handlers containing domain rules;
- shared database tables without declared ownership;
- commands or events without versioned contracts;
- missing contract tests at integration boundaries;
- Tauri commands outside the native allowlist;
- infrastructure or deployment changes without required evidence;
- architecture exceptions without an owner and review trigger.

Checks must report evidence and scope. They must not claim that a project uses DDD,
Clean Architecture, or Feature-Sliced Design merely because directories have
matching names.

## Custom organization profiles

Teams should be able to create versioned organization profiles that compose:

- one quality preset;
- architecture strategies and compatibility constraints;
- technology and domain packs;
- discipline perspectives;
- required reviews;
- approved exceptions and migrations;
- local naming and documentation conventions.

Organization profiles must inherit the mandatory platform baseline and remain
portable across supported coding agents. External profiles use the managed
extension lifecycle and are never silently downloaded or executed.

## Delivery phases

### Phase A: architecture vocabulary and ADR

- accept an ADR for multi-axis, scoped architecture composition;
- define strategy, scope, compatibility, discipline, and effective-profile
  schemas;
- define precedence, inheritance, and conflict semantics;
- threat-model external strategy and organization packs.

### Phase B: detection and read-only model

- inventory applications, packages, deployables, data stores, and current
  boundaries without executing project code;
- produce evidence-backed proposals with confidence and uncertainty;
- add read-only architecture and discipline resolution.

### Phase C: first-party strategy packs

- add layered, clean-boundaries, vertical-slices, DDD-lite,
  feature-oriented-frontend, Feature-Sliced Design, modular-monolith,
  microfrontend, local-IPC, and monorepo boundary packs;
- define compatibility fixtures and example projects.

### Phase D: conformance

- implement deterministic import, dependency, scope, contract, ownership, and
  exception checks;
- support legacy baselines and non-growing migration ratchets.

### Phase E: clients and generated guidance

- expose equivalent CLI, daemon, MCP, Desktop, and TUI results;
- generate scoped instructions for supported coding agents;
- prove that selecting a file or task resolves only relevant guidance.

### Phase F: reviewed migration assistance

- propose bounded architecture migrations and decomposition plans;
- require ADR, impact analysis, test plan, current-state revalidation, explicit
  approval, transaction safety, and rollback;
- do not autonomously restructure, split repositories, create services, deploy,
  merge, or release.

## Acceptance criteria

The feature is complete when:

- architecture choices are modeled on independent axes rather than one flat
  selector;
- different project areas can use different compatible strategies;
- conflicts and required decisions are explicit;
- quality, architecture, technology, and discipline profiles resolve into one
  deterministic effective policy;
- a task can activate multiple discipline perspectives without duplicating the
  architecture source of truth;
- CLI, daemon, MCP, Desktop, TUI, and generated instructions are equivalent;
- high-impact topology changes require explicit human decisions;
- architecture findings are evidence-based and scope-aware;
- legacy projects can adopt the model incrementally;
- security and mutation invariants cannot be disabled by any architecture or
  discipline selection.

## Non-goals

This feature does not:

- choose one universal architecture for every project;
- recommend microservices or microfrontends from repository size alone;
- treat folder names as proof of architecture;
- equate a developer role with authorization;
- force every discipline pack into every task;
- create separate policy engines for Desktop, CLI, MCP, or agents;
- rewrite existing projects automatically;
- allow architecture preferences to weaken security, ownership, compatibility,
  or approval boundaries.
