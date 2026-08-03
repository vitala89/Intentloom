# Foundation Workshop Implementation Plan

## Status

Implementation roadmap for the Foundation Workshop and Evolutionary
Architecture direction.

The plan strengthens Project Inception. It does not replace the existing
blueprint, architecture-profile, engineering-configuration, prepared-plan,
ownership, transaction, or evidence systems.

## Objective

Deliver a domain-neutral, shared application workflow where a user can describe
an idea in normal language, collaboratively establish the project foundation,
compare solution and architecture alternatives, test likely future changes,
approve a readiness result, and only then continue to scaffolding or
implementation.

The target flow is:

```text
start initiative
-> describe problem and desired outcome
-> identify users, actors, workflows, and domain concepts
-> capture constraints, quality scenarios, risks, and non-goals
-> select important future change scenarios
-> compare minimal, recommended, and extensible foundations
-> run deterministic compatibility and readiness checks
-> review assumptions, decisions, and accepted risks
-> approve foundation
-> produce blueprint and delivery roadmap
-> prepare exact scaffold or task plan
```

## Architectural rules

1. The Foundation Workshop is part of Project Inception, not a separate agent.
2. The workflow is domain-neutral and cannot assume a software implementation.
3. Users may answer in normal language without knowing architecture terminology.
4. Product, domain, quality, delivery, and architecture decisions remain separate
   typed records.
5. Model-generated content remains proposed until reviewed.
6. Readiness is determined by versioned rules and reviewed evidence.
7. Scaffold and implementation operations must enforce the readiness gate.
8. A prototype exception is explicit, bounded, and auditable.
9. Architecture recommendations prefer the smallest coherent option.
10. Future flexibility is justified by selected change scenarios, not fashion.
11. Foundation approval does not approve filesystem, network, dependency, Git,
    deployment, or publication actions.
12. CLI, Desktop, TUI, MCP, daemon, and Neutron consume shared application
    operations.

## First vertical slice

The first implementation should support a deliberately generic project idea.

```text
new initiative
-> one user problem statement
-> bounded adaptive questions
-> actors and primary workflow
-> domain concepts and source-of-truth notes
-> three quality scenarios
-> two important future change scenarios
-> minimal and recommended alternatives
-> deterministic readiness report
-> explicit foundation approval
-> exportable foundation brief
```

The first slice should not:

- generate source code;
- create a project root;
- install dependencies;
- provision infrastructure;
- call arbitrary external research services;
- claim production readiness from incomplete evidence;
- support every domain or architecture pattern.

## Candidate operations

### Workshop lifecycle

```text
createFoundationWorkshop
getFoundationWorkshop
listFoundationWorkshops
resumeFoundationWorkshop
archiveFoundationWorkshop
deleteFoundationWorkshop
exportFoundationWorkshop
```

### Discovery

```text
listFoundationQuestions
recordFoundationAnswer
classifyFoundationAnswer
summarizeFoundationUnderstanding
identifyFoundationConflicts
listFoundationOpenQuestions
```

### Domain and workflows

```text
proposeActors
proposeWorkflows
proposeDomainConcepts
recordSourceOfTruthBoundary
validateDomainVocabulary
```

### Quality and risk

```text
recordQualityScenario
recordFoundationConstraint
recordFoundationRisk
recordSpecialistReviewRequirement
```

### Change scenarios

```text
proposeChangeScenarios
recordChangeScenario
rankChangeScenarios
stressTestFoundationAlternative
```

### Alternatives and recommendation

```text
proposeFoundationAlternatives
compareFoundationAlternatives
explainFoundationRecommendation
selectFoundationAlternative
```

### Readiness and approval

```text
evaluateFoundationReadiness
prepareFoundationApproval
approveFoundation
revokeFoundationApproval
```

### Downstream integration

```text
createBlueprintFromFoundation
prepareScaffoldFromApprovedFoundation
resolveTaskAgainstFoundation
prepareFoundationChangePlan
```

## Candidate schemas

Public schemas require ADR and compatibility review.

Candidate artifacts:

```text
foundation-workshop.schema.json
foundation-question.schema.json
foundation-answer.schema.json
foundation-actor.schema.json
foundation-workflow.schema.json
foundation-domain-concept.schema.json
foundation-quality-scenario.schema.json
foundation-constraint.schema.json
foundation-risk.schema.json
foundation-change-scenario.schema.json
foundation-alternative.schema.json
foundation-stress-test.schema.json
foundation-decision-horizon.schema.json
foundation-readiness-report.schema.json
foundation-approval.schema.json
```

Every persisted schema should define:

- stable identifier;
- schema version;
- project or proposed-project identity;
- provenance and trust;
- size and count bounds;
- secret and personal-data handling;
- unknown-field behavior;
- migration policy;
- compatibility policy;
- deterministic fixtures.

## Readiness rules

The first readiness resolver should use explicit rule groups.

### Required understanding

- primary problem is recorded;
- at least one primary user or actor is identified;
- smallest useful outcome is recorded;
- first-release non-goals are visible;
- critical assumptions are visible.

### Required domain evidence

- primary workflow is represented;
- important states or lifecycle transitions are represented when applicable;
- source-of-truth ownership is known or explicitly unresolved;
- external dependencies are visible.

### Required quality evidence

- security and privacy sensitivity are classified;
- reliability and recovery expectations are classified;
- accessibility applicability is classified;
- offline, local-first, compatibility, and performance requirements are either
  recorded or explicitly not applicable.

### Required future-change evidence

- at least one strategically important or likely change scenario is reviewed;
- committed scenarios are supported or have an explicit migration plan;
- speculative scenarios do not force complexity without approval.

### Required decision evidence

- important alternatives are compared;
- the selected alternative has visible trade-offs;
- specialist reviews are resolved or block readiness;
- accepted risks have approval evidence;
- decision horizons are recorded for deferred choices.

### Blocking rules

- conflicting hard constraints;
- unknown sensitive-data boundary;
- unsupported committed runtime or delivery requirement;
- architecture alternative fails a committed change scenario without disclosure;
- missing legal, security, privacy, accessibility, or financial review where
  mandatory;
- no user confirmation of the selected foundation;
- stale or mismatched foundation identity.

## Prototype exception contract

A prototype exception should include:

```text
purpose
expectedLifetime
disposableOrEvolutionary
knownShortcuts
forbiddenDataClasses
forbiddenProductionUse
reviewTrigger
expiry
migrationOrDeletionExpectation
approvedBy
approvedAt
```

A prototype exception must not satisfy a normal production-readiness requirement.

## Suggested package boundaries

Do not create packages until contracts and consumers justify them.

Candidate future boundaries:

```text
packages/foundation-contracts/
packages/foundation-workshop/
packages/foundation-readiness/
packages/change-scenario-analysis/
packages/foundation-recommendation/
```

Dependencies should flow inward:

```text
CLI / Desktop / TUI / MCP / Neutron
                 |
          application operations
                 |
 foundation workshop / readiness / alternatives
                 |
 architecture / quality / discipline / packs
                 |
 validator / policy / evidence / approval / planner
```

The model adapter must not own readiness, approval, or persistence rules.

## Neutron integration

### Conversation behavior

Neutron should:

- ask one focused question or a small coherent group at a time;
- explain why a question matters when useful;
- avoid asking for already known information;
- allow `unknown`, `not applicable`, and `decide later`;
- distinguish hard constraints from preferences;
- summarize confirmed understanding before recommendations;
- identify contradictions without silently resolving them;
- stop questioning when the readiness rules have sufficient evidence.

### Recommendation behavior

Neutron should produce:

- a minimal foundation;
- a recommended foundation;
- an extensible alternative only when relevant;
- plain-language trade-offs;
- confidence and assumptions;
- change-scenario impact;
- migration implications;
- reasons not to select unnecessary complexity.

### Model effort defaults

Candidate defaults:

- simple clarification: `low`;
- normal discovery: `medium`;
- alternative generation: `medium`;
- final stress test and architecture comparison: `high`;
- deterministic readiness evaluation: no model required.

Effort never grants additional tools or approval.

## Candidate CLI

### Lifecycle

```bash
loom foundation start
loom foundation resume SESSION_ID
loom foundation list
loom foundation status SESSION_ID
loom foundation export SESSION_ID --format yaml
loom foundation archive SESSION_ID
loom foundation delete SESSION_ID
```

### Discovery

```bash
loom foundation questions
loom foundation answer QUESTION_ID
loom foundation understanding
loom foundation assumptions
loom foundation conflicts
```

### Domain and quality

```bash
loom foundation actors
loom foundation workflows
loom foundation domain
loom foundation quality
loom foundation constraints
loom foundation risks
```

### Change scenarios and alternatives

```bash
loom foundation scenarios
loom foundation scenario add
loom foundation alternatives
loom foundation compare OPTION_A OPTION_B
loom foundation stress-test OPTION_ID
loom foundation explain DECISION_ID
```

### Readiness and approval

```bash
loom foundation review
loom foundation approve --plan FOUNDATION_PLAN_ID
loom foundation revoke FOUNDATION_ID
```

### Downstream

```bash
loom blueprint prepare --foundation FOUNDATION_ID
loom scaffold prepare --foundation FOUNDATION_ID
loom task plan --foundation FOUNDATION_ID
```

Stable automation forms should use `intentloom ... --json`.

## Desktop workflow

### Entry points

- New Project;
- New Initiative in Existing Project;
- Retrofit Existing Architecture;
- Resume Foundation Workshop.

### Main steps

1. Idea and problem.
2. Users and actors.
3. Workflows and domain.
4. Quality and constraints.
5. Future changes.
6. Foundation alternatives.
7. Architecture and capability map.
8. Risks and specialist reviews.
9. Readiness report.
10. Approval and next steps.

### Required views

- progress and readiness summary;
- conversational Neutron panel;
- structured answers and assumptions;
- actor and workflow list or map;
- domain vocabulary and source-of-truth view;
- quality-scenario editor;
- change-scenario selector and stress-test results;
- side-by-side alternative comparison;
- architecture map;
- risk and specialist-review queue;
- readiness findings;
- foundation diff and approval preview.

Every graph requires an accessible tree, list, or text equivalent.

## TUI, MCP, and daemon parity

All clients should receive the same structured result for:

- workshop state;
- questions and answers;
- actors, workflows, and domain concepts;
- constraints and quality scenarios;
- alternatives and stress tests;
- readiness findings;
- approval state.

MCP tools should be typed and bounded. External agents may propose answers or
alternatives but cannot mark readiness or approve a foundation.

## Existing-project retrofit

Retrofit mode should:

1. inspect current repository and project evidence;
2. infer candidate current boundaries with confidence;
3. import mapped ADRs and project-owned documentation;
4. identify drift and contradictions;
5. ask only unresolved questions;
6. compare preserve, evolve, and migrate alternatives;
7. approve a target foundation;
8. produce bounded migration plans.

Current structure is evidence, not canonical intent.

## Task integration

For each future task:

```text
user request
-> resolve relevant foundation scopes and decisions
-> identify compatible path
-> detect conflicts and stale assumptions
-> propose local implementation, migration, or foundation update
-> require foundation-change approval when needed
-> prepare task plan
```

A task may proceed without changing the foundation when it fits the approved
boundaries. It must not silently bypass them.

## Delivery phases

### F0. Inventory and architecture decisions

- map existing Project Inception, architecture, quality, discipline, memory, and
  approval contracts;
- define terminology and identity;
- define user-local versus project-visible storage;
- define readiness authority;
- define prototype-exception semantics;
- define relation to Blueprint approval.

Exit gate:

- no duplicate inception or memory system is proposed;
- readiness, approval, ownership, and storage boundaries are accepted.

### F1. Versioned foundation contracts

- workshop, question, answer, actor, workflow, domain, quality, constraint, risk,
  change-scenario, alternative, readiness, and approval contracts;
- validators and deterministic fixtures;
- export without project mutation.

Exit gate:

- a model-free fixture can create, validate, and export a foundation record.

### F2. Deterministic discovery state machine

- question dependency graph;
- required versus optional evidence;
- conflict detection;
- unknown and deferred answers;
- bounded adaptive ordering;
- readiness-progress calculation.

Exit gate:

- identical answers produce stable state and question ordering.

### F3. Neutron Foundation Workshop

- provider-neutral conversation loop;
- bounded context;
- answer classification proposals;
- shared-understanding summaries;
- visible model, effort, network, and cost state.

Exit gate:

- a non-technical idea reaches a reviewed foundation summary without mutation.

### F4. Domain, quality, and change scenarios

- actor and workflow proposals;
- domain vocabulary and source-of-truth records;
- quality scenarios;
- future change scenarios and decision horizons;
- specialist-review requirements.

Exit gate:

- a fixture can distinguish required-now flexibility from deferred migration.

### F5. Alternatives and stress testing

- minimal, recommended, and optional extensible alternatives;
- architecture and pack resolver integration;
- change-scenario impact analysis;
- trade-off, cost, reversibility, and migration results.

Exit gate:

- the resolver does not prefer added complexity without evidence.

### F6. Foundation Readiness Gate

- deterministic rule groups;
- blocked, incomplete, provisional, ready, ready-with-risks, and prototype
  exception states;
- accepted-risk and specialist-review evidence;
- stale identity and current-state rejection.

Exit gate:

- scaffold preparation fails closed when readiness is insufficient.

### F7. Foundation storage and approval

- user-owned artifacts;
- private transcript separation;
- import, export, edit, approve, revoke, and migration;
- approval digest and expiry;
- audit events.

Exit gate:

- approval is exact, revocable, and separate from mutation approval.

### F8. CLI and JSON surface

- lifecycle, discovery, scenarios, alternatives, stress-test, review, and approval
  commands;
- stable exit codes;
- machine-readable output;
- no hidden provider or filesystem action.

Exit gate:

- the full read-only workflow operates through packaged CLI on supported
  platforms.

### F9. Desktop and TUI experience

- guided workshop;
- structured editors;
- architecture and change-scenario views;
- readiness report;
- accessible alternatives;
- resume, archive, and deletion.

Exit gate:

- Desktop and TUI consume the same application contracts as CLI.

### F10. Blueprint, scaffold, and task integration

- create Blueprint from an approved foundation;
- enforce foundation identity in scaffold plans;
- resolve tasks against foundation scopes;
- prepare explicit foundation-change plans;
- record fitness functions and evidence.

Exit gate:

- neither scaffold nor task apply can silently bypass the foundation gate.

### F11. Retrofit mode

- project evidence mapping;
- current-foundation inference;
- drift analysis;
- preserve, evolve, and migrate alternatives;
- migration-plan integration.

Exit gate:

- existing project files remain project-owned and no inferred decision becomes
  canonical without review.

### F12. Security, benchmarks, and release gates

- prompt-injection and memory-poisoning fixtures;
- secret and personal-data redaction;
- denial-of-service bounds for questions and artifacts;
- deterministic readiness tests;
- recommendation quality benchmarks;
- client parity and cross-platform tests;
- migration and support documentation.

Exit gate:

- security, compatibility, and release evidence is complete for the supported
  increment.

## Verification strategy

### Contract tests

- schema validation;
- question dependency and ordering;
- answer classification;
- conflict detection;
- stable readiness results;
- approval digest and expiry;
- migration behavior.

### Recommendation fixtures

- simple single-user tool;
- growing web product;
- local-first Desktop product;
- multi-package library;
- regulated-data workflow;
- non-software operational workflow;
- existing project retrofit.

Fixtures should prove that the same pattern is not recommended for every case.

### Change-scenario fixtures

- future mobile client;
- multi-tenancy;
- offline synchronization;
- public API publication;
- team split;
- provider replacement;
- data migration;
- increased privacy requirements.

### Safety tests

- no scaffold before readiness;
- no prototype exception without explicit approval;
- no model self-approval;
- no hidden network request;
- no secret persistence;
- no inferred compliance claim;
- no stale foundation reuse;
- no mutation from read-only workshop operations.

### Client parity

CLI, Desktop, TUI, MCP, daemon, and Neutron should return equivalent structured
state and readiness for the same fixture.

## Initial release gate

The first public Foundation Workshop increment should require:

- one provider-neutral workshop contract;
- one deterministic discovery state machine;
- one real Neutron provider adapter or a documented model-free path;
- domain-neutral questions and artifacts;
- minimal and recommended alternatives;
- at least one change-scenario stress test;
- deterministic readiness report;
- explicit foundation approval;
- enforced scaffold gate;
- CLI JSON surface;
- cross-platform fixtures;
- retention, deletion, migration, and support documentation.

## Non-goals for the first increment

- predicting every future requirement;
- automatic market validation;
- autonomous specialist approval;
- automatic code generation from an incomplete idea;
- mandatory microservices, DDD, event sourcing, Nx, or another pattern;
- automatic cloud provisioning;
- dependency installation;
- arbitrary shell execution;
- autonomous commits, pull requests, releases, deployments, or publication;
- replacing human accountability for product and architecture decisions.