# Engineering Workspace Implementation Plan

## Status

Planned product increment. This plan coordinates implementation of the Project
Design and Development Workspace across shared Core/application contracts and
all user-facing surfaces.

It intentionally supports parallel implementation by separate agents while
preserving one source of domain truth.

## Objective

Deliver an end-to-end workflow for both:

1. creating a new project from an idea through Foundation, Blueprint, scaffold,
   approval, creation, and verification;
2. opening an existing project through inspection, adoption readiness,
   assessment, recommendations, target-state options, and reviewed remediation.

Both flows converge into a Development Workspace for feature intent, architecture
impact, planning, implementation, verification, review, evidence, and memory.

## Architectural invariant

Every capability follows this direction:

```text
client surface
    ↓
versioned protocol / typed viewmodel contract
    ↓
shared application operation
    ↓
deterministic domain systems
```

Desktop must not invoke the human CLI and parse its output. CLI/TUI must not
reimplement project analysis or transaction logic. Core does not depend on
presentation clients.

## Workstream ownership

### Workstream A: Core, contracts, and daemon

Suitable for one implementation agent.

Primary ownership:

- protocol contracts and schema identifiers;
- validator boundaries;
- application operations;
- deterministic resolvers;
- plan digests, readiness, approval state, and capability checks;
- daemon handlers and typed client methods;
- fixtures and cross-surface contract tests.

### Workstream B: Desktop and CLI/TUI

Suitable for a separate implementation agent in parallel after each contract
slice is frozen.

Primary ownership:

- Desktop viewmodels and React/Tauri UX;
- CLI commands and machine/human rendering;
- interactive CLI/TUI navigation;
- accessibility and keyboard behavior;
- loading, cancellation, stale, unsupported, and error states;
- parity tests against canonical fixtures.

### Workstream C: Dogfooding and evidence

May be handled by a third agent or maintainer when useful.

Primary ownership:

- representative project fixtures;
- new-project dogfooding;
- existing-project retrofit dogfooding;
- capability-matrix verification;
- documentation truth reconciliation;
- release/readiness evidence.

No workstream may silently change another workstream's public contract. Contract
changes require explicit coordination and fixture updates.

## Capability state baseline

The evidence-backed capability matrix lives in
[`ENGINEERING_WORKSPACE_CAPABILITY_MATRIX.md`](ENGINEERING_WORKSPACE_CAPABILITY_MATRIX.md).
Revalidate that document against current `main` before each implementation phase.

The table below is a planning baseline only and may lag `main`.

| Capability                     | Core/App                      | Protocol                        | Daemon                     | CLI                 | Desktop                         | TUI                    | MCP                 | Status     |
| ------------------------------ | ----------------------------- | ------------------------------- | -------------------------- | ------------------- | ------------------------------- | ---------------------- | ------------------- | ---------- |
| Project inspect                | implemented                   | implemented                     | implemented                | implemented         | implemented                     | implemented/partial UX | implemented         | existing   |
| Doctor                         | implemented                   | implemented                     | implemented                | implemented         | implemented                     | implemented/partial UX | partial             | existing   |
| Diff                           | implemented                   | implemented                     | implemented                | implemented         | implemented                     | implemented            | partial             | existing   |
| Timeline                       | implemented                   | implemented                     | implemented                | implemented         | implemented                     | implemented            | implemented/partial | existing   |
| Existing-project adoption      | implemented                   | application contracts exist     | partial                    | implemented         | partial/review-oriented         | partial                | partial             | existing   |
| Engineering Quality            | implemented                   | implemented                     | implemented                | implemented         | viewmodels implemented          | viewmodels implemented | implemented         | existing   |
| Engineering Assessments        | implemented roadmap phases    | implemented canonical contracts | partial/implemented slices | partial/implemented | viewmodel direction implemented | viewmodel direction    | partial             | revalidate |
| Inception sessions             | planned                       | planned                         | planned                    | planned             | planned                         | planned                | planned             | gap        |
| Foundation Workshop            | planned                       | planned                         | planned                    | planned             | planned                         | planned                | planned             | gap        |
| Blueprint resolver             | planned                       | planned                         | planned                    | planned             | planned                         | planned                | planned             | gap        |
| Scaffold planner               | foundations only              | planned                         | planned                    | planned             | planned                         | planned                | planned             | gap        |
| Empty-root scaffold apply      | transaction foundations exist | planned                         | planned                    | planned             | planned                         | planned                | not first           | gap        |
| Feature intent / impact        | partial task/plan foundations | partial                         | partial                    | partial             | partial                         | partial                | partial             | gap        |
| Bounded coding-agent execution | harness/Neutron foundations   | partial                         | partial                    | partial             | future                          | future                 | future              | gated      |

The implementation must update this matrix when durable truth changes.

## Phase W0: Current-state reconciliation and contract map

### Work

- recheck `main`, open PRs, and recently merged PRs;
- reconcile Project State and Duty Watch;
- inventory exact existing application operations, protocol methods, CLI
  commands, Desktop/TUI viewmodels, and MCP tools;
- identify naming collisions with existing `workspace`, `proposal`, `plan`, and
  assessment contracts;
- define capability discovery entries for future Inception/Foundation/Blueprint
  surfaces.

### Exit gate

One reviewed capability map distinguishes implemented, partial, planned, and
blocked surfaces without relying on concept-document claims alone.

## Phase W1: Inception contracts

### Core agent

Define versioned, bounded contracts for:

- inception session;
- problem statement;
- question and answer;
- preference versus hard constraint;
- assumption;
- unresolved question;
- conflict;
- session summary and retention state.

Candidate operations:

```text
createInceptionSession
getInceptionSession
listInceptionQuestions
recordInceptionAnswer
summarizeInceptionState
identifyInceptionConflicts
```

No project-root mutation is allowed.

### Client agent

Using frozen fixtures:

- add CLI JSON/human renderers;
- add Desktop `New Project` shell and session-progress view;
- add accessible TUI representation;
- implement empty/loading/error/resume/delete states.

### Exit gate

A session can be created, resumed, inspected, exported, and deleted without
creating project files.

## Phase W2: Foundation Workshop

### Core agent

Implement typed Foundation state for:

- intent and problem framing;
- actors and workflows;
- domain and information model;
- quality scenarios;
- constraints;
- future change scenarios;
- risks and specialist-review requirements;
- decision horizons;
- readiness findings and status.

Readiness must be deterministic and versioned.

### Client agent

Implement:

- Foundation progress;
- adaptive question presentation;
- editable assumptions and constraints;
- future-change scenario selection;
- risks and readiness findings;
- text alternatives for every graph or visual map.

### Exit gate

Equivalent answers produce equivalent Foundation state in CLI JSON, daemon, and
Desktop/TUI fixtures.

## Phase W3: Neutron discovery integration

### Work

- connect one provider-neutral Neutron discovery loop;
- keep provider, model, effort, network mode, permissions, and budget visible;
- use typed read-only tools only;
- prohibit model-generated approval or hidden state changes;
- preserve questions, answers, assumptions, and provenance.

### Exit gate

A normal-language idea can reach a reviewed Foundation summary without project
mutation.

## Phase W4: Blueprint alternatives and resolver

### Core agent

Implement:

- minimal/recommended/extensible candidates;
- architecture compatibility resolution;
- technology and specialized-pack composition;
- quality profile resolution;
- complexity, reversibility, migration, and deferred-decision metadata;
- deterministic Blueprint digest;
- validation, editing, approval, and revocation.

### Client agent

Implement:

- side-by-side alternative comparison;
- architecture-map view plus accessible list form;
- decision explanations and evidence;
- Blueprint editing and validation;
- explicit approval UX.

### Exit gate

A reviewed Foundation produces stable, editable, approvable Blueprint
candidates with no filesystem mutation.

## Phase W5: CLI, daemon, and client parity

Freeze stable operation identifiers and machine-readable forms before scaffold
work expands.

Candidate CLI families:

```bash
intentloom inception ...
intentloom foundation ...
intentloom blueprint ...
```

Required:

- daemon capability discovery;
- typed request/response validation;
- bounded payloads;
- unsupported-method behavior;
- cancellation and stale-state semantics;
- client fixture parity.

### Exit gate

CLI JSON, daemon, Desktop viewmodels, and TUI consume one result model for each
implemented operation.

## Phase W6: Minimal scaffold planner

### First supported composition

One strict TypeScript library starter.

Plan must include:

- every path to create;
- ownership classification;
- template and pack versions;
- dependency proposals without installation;
- scripts proposed but not executed;
- verification checks;
- capability requirements;
- plan identifier, digest, expiry, and rollback boundary.

Candidate operations:

```text
prepareProjectScaffold
getProjectScaffoldPlan
compareProjectScaffoldPlan
validateProjectScaffoldPlan
```

### Client agent

Implement scaffold tree, diff, dependency proposal, permissions, and verification
preview in Desktop and CLI/TUI.

### Exit gate

The same Blueprint produces a deterministic side-effect-free scaffold plan.

## Phase W7: Transactional empty-root creation

### Core agent

Before apply, revalidate:

- target-root identity;
- absent/empty-root requirement;
- Blueprint digest;
- plan digest and expiry;
- path and symlink safety;
- template integrity;
- capability grant;
- current Intentloom compatibility.

Apply through the existing transaction boundary and verify final state.

### Client agent

Expose a separate explicit approval action and truthful transaction states.
Never merge dependency installation, Git initialization, remote creation, CI
provider actions, release, or publication into scaffold approval.

### Exit gate

A clean project can be created transactionally, cancellation before approval is
byte-for-byte safe, and failures report rollback truthfully.

## Phase W8: Library ecosystem starter and dogfooding

Add a pnpm workspace starter with optional Nx orchestration.

Representative shape:

```text
packages/core
packages/react
packages/testing
examples/vanilla-basic
examples/react-basic
```

Prove:

- framework-neutral core;
- inward dependency direction;
- public exports only from examples;
- isolated package install tests;
- declaration resolution;
- bundle and quality budgets;
- Nx optional and local-first;
- no hidden Nx Cloud dependency.

Dogfood a real Intentloom-created framework or library project and record the
evidence.

## Phase W9: Existing-project Workspace integration

This phase composes already implemented inspection, adoption, graph, quality,
assessment, and remediation foundations into one user flow.

### Core agent

Revalidate and fill only missing application/protocol gaps for:

```text
Open root
-> Inspect
-> Adoption readiness
-> Specialized-pack detection
-> Graph
-> Quality / checker / conformance
-> Assessment
-> Findings
-> Debt map
-> Target-state options
-> Remediation plan
```

Do not create a second assessment or adoption engine.

### Client agent

Implement Desktop `Open Project` experience:

- project overview and freshness;
- scan/analysis scope selection;
- detected technology confirmation;
- architecture and dependency views;
- findings with evidence drill-down;
- technical-debt and recommendation views;
- preserve/evolve/migrate choices;
- adoption/remediation preview.

CLI/TUI expose equivalent structured state.

### Exit gate

One existing project can be opened, assessed, and taken to a reviewed
remediation plan without project mutation.

## Phase W10: Feature intent and architecture impact

Define a structured feature-development entry point for projects already inside
the workspace.

Candidate operations:

```text
createFeatureIntent
resolveAffectedScope
analyzeArchitectureImpact
prepareImplementationAlternatives
prepareImplementationPlan
```

Inputs should resolve against:

- Foundation and Blueprint;
- observed graph;
- quality/specialized packs;
- current assessments and accepted debt;
- public API and package boundaries;
- project memory and decisions.

### Exit gate

A feature request produces an explainable impact and reviewed plan before code
changes begin.

## Phase W11: Bounded implementation execution

This is a separate security and capability gate.

Reuse Neutron, delegation, harness, checkpoints, planning, and transaction
foundations. Do not expose unrestricted shell or arbitrary filesystem access.

Required sequence:

```text
approved implementation plan
-> explicit execution capability
-> bounded task execution
-> checkpoints
-> tests / checkers / architecture checks
-> diff review
-> approval
-> apply
-> verification evidence
```

### Exit gate

One bounded coding-agent task can be executed and verified without widening its
approved root, paths, commands, network, or mutation capabilities.

## Phase W12: Continuous development loop

Complete the feedback cycle:

```text
implementation evidence
-> assessment refresh
-> resolved/new findings
-> project memory proposal
-> reviewed memory update
-> next feature
```

Historical comparison must distinguish changed code from changed policy,
changed evidence, and changed model interpretation.

## Parallel PR strategy

Do not put the whole workspace into one branch.

For each phase where parallel work is useful:

1. Core agent opens a contract/application PR or freezes fixtures on a dedicated
   branch.
2. Client agent branches from the agreed contract baseline or consumes exact
   versioned fixtures.
3. Client work does not alter domain semantics to make the UI easier.
4. Integration PR updates parity tests and documentation.
5. Durable changes update `DUTY_WATCH.md`; current truth changes update
   `PROJECT_STATE.md`.

Example naming:

```text
feat/workspace-w1-inception-contracts
feat/workspace-w1-client-surfaces
feat/workspace-w2-foundation-core
feat/workspace-w2-foundation-desktop-cli
```

Branches should follow repository governance and avoid agent/tool/model prefixes.

## Verification expectations

Use the strongest applicable repository checks, including:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm verify
pnpm verify:staged
git diff --check
```

Desktop changes additionally require applicable frontend, accessibility, Rust,
Tauri, packaging, and cross-platform checks defined by the Desktop architecture.

Contract phases require deterministic fixtures and parity checks. Mutating
phases additionally require adversarial path, stale-plan, cancellation, rollback,
and no-hidden-side-effect tests.

## Initial public workspace gate

The first useful public Project Design and Development Workspace should require:

- one complete TypeScript new-project path;
- one complete existing-project read-only assessment path;
- one provider-neutral Inception/Foundation model contract;
- Blueprint review and approval;
- exact scaffold preview and transactional empty-root creation;
- CLI JSON and Desktop parity;
- no hidden dependency installation, network, Git/provider write, or
  publication;
- cross-platform deterministic fixtures;
- one real new-project dogfood and one existing-project retrofit dogfood;
- current capability and release documentation.

Bounded coding-agent execution may remain a later gate if its permission and
threat-model requirements are not complete.

## Non-goals

- building a second IDE;
- unrestricted terminal emulation;
- autonomous commits, pushes, PRs, merges, releases, deployments, or package
  publication;
- generating arbitrary production systems from one prompt;
- forcing Nx, one architecture, one framework, or one model provider;
- duplicating existing assessment, quality, graph, adoption, memory, or
  transaction engines.
