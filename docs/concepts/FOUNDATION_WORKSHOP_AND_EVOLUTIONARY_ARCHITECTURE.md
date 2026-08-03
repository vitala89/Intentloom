# Foundation Workshop and Evolutionary Architecture

## Status

Candidate product direction that strengthens Project Inception with a mandatory,
domain-neutral foundation phase before scaffolding or implementation.

This document extends, but does not replace:

- `PROJECT_INCEPTION_AND_BLUEPRINTS.md`;
- `ENGINEERING_CONFIGURATION_UX_PLAN.md`;
- `ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`;
- `PROJECT_INCEPTION_AND_SCAFFOLDING_PLAN.md`;
- Neutron, Agent Workspace, prepared-plan, approval, ownership, transaction, and
  evidence contracts.

It does not add a public command, schema, provider integration, generator, or
mutation permission by itself.

## Purpose

Intentloom should help a user build the right foundation before code, files,
services, workflows, or other implementation artifacts are created.

The user may be building:

- a frontend, backend, full-stack, Desktop, mobile, data, AI, or embedded system;
- a library, CLI, platform, API, internal tool, or open-source ecosystem;
- a business process, research workflow, content system, operational service, or
  another non-software-first project;
- a new project or a major new initiative inside an existing project.

The user should not need architecture vocabulary. Neutron should translate normal
language into explicit product, domain, quality, risk, delivery, and architecture
decisions.

The intended sequence is:

```text
idea
-> shared understanding
-> domain and user discovery
-> goals, non-goals, constraints, and risks
-> important future change scenarios
-> alternative solution foundations
-> recommendation with trade-offs
-> foundation review and readiness gate
-> approved blueprint
-> scaffold or implementation plan
-> explicit approval
-> implementation
```

## Core rule

Intentloom must not treat a prompt such as “build my application” as sufficient
evidence for production scaffolding.

Before scaffold or coding, the system should normally require one of these
states:

- `foundation-ready`;
- `foundation-ready-with-accepted-risks`;
- `prototype-exception-approved`.

A blocked or materially incomplete foundation must not silently become an
implementation plan.

## Honest boundary

No architecture can guarantee every unknown future feature.

Intentloom should not promise that a foundation will make all future changes
cheap. It should instead optimize for:

- likely and important change scenarios;
- reversible decisions where uncertainty is high;
- explicit seams around unstable areas;
- clear ownership and contracts;
- migration paths for decisions that may change;
- the smallest architecture that satisfies current evidence;
- avoidance of both accidental rigidity and speculative complexity.

The goal is evolutionary architecture, not prediction of every future request.

## Foundation Workshop

The Foundation Workshop is a structured, resumable conversation between the
user and Neutron. It is part of Project Inception and is available through shared
application operations to CLI, Desktop, TUI, MCP, daemon, and future clients.

The workshop should be adaptive. It asks only questions that can materially
change a recommendation, readiness status, risk, or implementation boundary.

### Stage 1: Intent and problem framing

Establish:

- what the user wants to change in the world or in an existing workflow;
- who experiences the problem;
- what people do today;
- why current alternatives are insufficient;
- the smallest useful outcome;
- what success and failure would look like;
- what is explicitly outside the first release.

The system should distinguish:

- a requested solution;
- the underlying problem;
- assumptions about the problem;
- verified evidence;
- preferences;
- hard constraints.

### Stage 2: Users, actors, and workflows

Identify:

- primary and secondary users;
- administrators, operators, maintainers, contributors, and external actors;
- important user journeys;
- permissions and responsibilities;
- manual steps and automation opportunities;
- failure, recovery, and exception paths;
- accessibility and language needs.

For a non-technical user, Neutron should ask concrete questions such as:

- Who performs this action?
- What happens before and after it?
- What can go wrong?
- Who is allowed to see or change the result?
- Does the work need to continue without an internet connection?

### Stage 3: Domain and information model

Establish the concepts the project is responsible for:

- domain entities and important terminology;
- states and lifecycle transitions;
- ownership of information;
- source-of-truth boundaries;
- retention and deletion expectations;
- external systems and integrations;
- data quality and consistency needs;
- audit and provenance requirements.

The domain model should use the user’s language first. Technical storage choices
come later.

### Stage 4: Quality attributes

Capture measurable or scenario-based expectations for:

- security and privacy;
- accessibility;
- reliability and recovery;
- performance and responsiveness;
- scalability where evidence exists;
- offline and local-first operation;
- maintainability and onboarding;
- compatibility and public API stability;
- observability and supportability;
- portability and vendor dependence;
- cost and operational overhead.

The system should not invent exact traffic, latency, availability, or team-size
numbers. Unknown values remain explicit assumptions or open questions.

### Stage 5: Delivery and organizational constraints

Identify:

- current team size and experience;
- likely future ownership boundaries;
- release cadence;
- budget and deadline constraints;
- hosting, platform, legal, regulatory, and regional restrictions;
- required or forbidden technologies;
- open-source, internal, commercial, or hybrid distribution;
- support and maintenance expectations.

Architecture recommendations must fit the organization that will operate them.

## Future change scenarios

Before architecture selection, Intentloom should ask which future changes are
likely, costly, strategically important, or difficult to reverse.

Candidate scenarios include:

- adding a second frontend or native mobile client;
- supporting offline use or synchronization;
- adding a second tenant, organization, country, or language;
- introducing billing, subscriptions, or marketplace behavior;
- adding new roles and permission boundaries;
- integrating with another provider or legacy system;
- replacing a database, model provider, framework, or UI shell;
- publishing a stable public API or plugin system;
- splitting ownership across teams;
- separating a deployable service;
- increasing audit, privacy, or regulatory requirements;
- migrating existing data;
- adding automation or AI-assisted behavior;
- changing from local-only to hosted, or from hosted to local-first.

Each scenario should record:

- likelihood: `unlikely`, `possible`, `likely`, or `committed`;
- impact if unsupported;
- earliest plausible horizon without false precision;
- architectural areas affected;
- whether support is required now or only a migration path is required;
- evidence and confidence.

## Change-scenario stress test

Candidate foundations should be tested against selected change scenarios.

For each candidate, show:

- what changes remain local;
- which contracts or modules are affected;
- whether data migration is required;
- whether a new deployable or runtime is required;
- operational and security consequences;
- expected migration difficulty;
- decisions that become irreversible or expensive;
- which future flexibility would be paid for now.

The stress test must not reward maximum abstraction. A simpler architecture may
win when the added flexibility is speculative or expensive.

## Decision horizons

Every important decision should be classified as one of:

- `decide-now`: implementation cannot safely proceed without it;
- `default-now-revisit-later`: use a reversible default and define a review
  trigger;
- `defer-with-seam`: postpone the decision but preserve an explicit boundary;
- `defer-with-migration-path`: postpone it and record the likely migration;
- `accepted-coupling`: intentionally accept a constraint for simplicity;
- `specialist-review-required`: legal, security, accessibility, data, finance,
  or another specialist decision is needed.

This prevents both premature decisions and hidden architectural debt.

## Foundation alternatives

For material decisions, Intentloom should provide:

1. a minimal viable foundation;
2. a recommended foundation;
3. a more extensible foundation only when evidence justifies it.

Each alternative should include:

- product and domain fit;
- architecture topology and boundaries;
- technology choices where relevant;
- assumptions;
- strengths;
- introduced complexity;
- operational cost;
- security and privacy impact;
- change-scenario results;
- migration and reversibility;
- deferred decisions;
- confidence and evidence.

The recommended option is not selected automatically.

## Foundation artifacts

The workshop may produce the following reviewable artifacts:

```text
.aif/
└── inception/
    └── foundation/
        ├── foundation-brief.yaml
        ├── actors-and-workflows.yaml
        ├── domain-model.yaml
        ├── quality-scenarios.yaml
        ├── constraints.yaml
        ├── change-scenarios.yaml
        ├── alternatives.yaml
        ├── architecture-map.yaml
        ├── decision-horizons.yaml
        ├── risks.yaml
        ├── delivery-roadmap.yaml
        └── readiness-report.yaml
```

Candidate ownership:

- user goals, answers, constraints, accepted decisions, and approved foundation
  remain user-owned intent;
- generated recommendations and reports remain proposals until reviewed;
- provider credentials, raw private prompts, and sensitive transcripts remain in
  user-local storage;
- generated machine reports become Intentloom-managed only through valid
  ownership metadata.

The exact format requires schemas and migration policy before becoming a public
contract.

## Foundation Readiness Gate

A deterministic readiness resolver should evaluate whether implementation may
proceed.

Candidate states:

- `blocked`: critical conflicts, missing authority, or unsupported requirements;
- `incomplete`: important discovery areas are unanswered;
- `provisional`: enough information exists for a prototype, but not for a normal
  production foundation;
- `foundation-ready`: required decisions and risks are reviewed;
- `foundation-ready-with-accepted-risks`: explicit risks remain and have approval;
- `prototype-exception-approved`: the user knowingly chooses a disposable or
  exploratory implementation.

Candidate blocking findings include:

- unclear primary problem or user;
- conflicting hard constraints;
- undefined sensitive-data handling;
- unresolved identity or permission model where required;
- no ownership for critical data or operations;
- an architecture candidate that cannot satisfy a committed change scenario;
- unsupported runtime or deployment requirements;
- missing legal or specialist review for a regulated capability;
- a scaffold that would make an explicitly required migration impossible without
  disclosure.

Readiness is not a model opinion. Neutron may explain findings, but versioned
rules and reviewed evidence determine the state.

## Prototype exception

Users may intentionally choose a prototype or experiment.

The exception flow must record:

- prototype purpose;
- expected lifetime;
- disposable versus evolutionary intent;
- known shortcuts;
- data and security restrictions;
- forbidden production use;
- review or expiry trigger;
- migration or deletion expectation.

Prototype mode must not be presented as production-ready architecture.

## Relationship to implementation

Once the foundation is approved:

```text
approved foundation
-> project blueprint
-> phased delivery roadmap
-> exact scaffold plan
-> implementation task plans
-> tests and fitness functions
-> current-state revalidation
-> explicit approval
-> transactional apply
```

Every future task should resolve against the approved foundation. If a requested
feature conflicts with it, Intentloom should:

1. identify the conflict;
2. show the affected decision or boundary;
3. propose local, migration, and foundation-update options;
4. require a reviewed foundation change when needed;
5. avoid silently bypassing the architecture.

The foundation is versioned intent, not an immutable constitution. It may evolve
through explicit decisions and evidence.

## Architecture fitness functions

Where practical, an approved foundation should define deterministic checks for:

- dependency directions;
- forbidden imports or module coupling;
- package and service boundaries;
- public API compatibility;
- schema and migration rules;
- security and privacy policies;
- accessibility requirements;
- performance and bundle budgets;
- test and coverage expectations;
- release and support constraints;
- data ownership and integration contracts.

Fitness functions detect drift. They do not replace architecture review.

## Candidate CLI experience

```bash
loom foundation start
loom foundation resume SESSION_ID
loom foundation status
loom foundation questions
loom foundation actors
loom foundation domain
loom foundation quality
loom foundation constraints
loom foundation scenarios
loom foundation alternatives
loom foundation stress-test OPTION_ID
loom foundation risks
loom foundation review
loom foundation approve --plan FOUNDATION_PLAN_ID
loom foundation export --format yaml
```

Project creation should expose the gate clearly:

```bash
loom new
loom scaffold prepare --foundation FOUNDATION_ID
loom scaffold --dry-run
```

A scaffold request without sufficient foundation evidence should return a
structured readiness result, not silently invent missing decisions.

Stable automation forms should use `intentloom ... --json`.

## Candidate interactive commands

```text
/foundation
/foundation status
/foundation questions
/foundation scenarios
/foundation alternatives
/foundation stress-test OPTION_ID
/foundation review
/foundation approve
```

## Desktop experience

Candidate flow:

1. Create or open an initiative.
2. Describe the idea in normal language.
3. Review Neutron’s understanding.
4. Work through adaptive product, domain, quality, risk, and delivery questions.
5. Review actors, workflows, domain concepts, and source-of-truth boundaries.
6. Select important future change scenarios.
7. Compare minimal, recommended, and extensible foundations.
8. Inspect the Architecture Map and change-scenario impact view.
9. Resolve conflicts, specialist reviews, assumptions, and accepted risks.
10. Review the Foundation Readiness Report.
11. Approve the foundation.
12. Continue to Blueprint and Scaffold Preview.

The Desktop should include:

- a Foundation progress view;
- question rationale and affected decisions;
- editable assumptions and constraints;
- actor and workflow map;
- domain and capability map;
- architecture alternative comparison;
- change-scenario stress-test view;
- risk and decision-horizon view;
- readiness findings;
- accessible list and text alternatives to every visual graph.

## TUI and MCP parity

TUI, MCP, daemon, and future clients should consume the same typed application
operations and readiness result.

A visual graph may be omitted, but no decision, conflict, assumption, scenario,
or approval state may be lost.

## Neutron responsibilities

Neutron may:

- conduct the conversation;
- ask adaptive questions;
- translate non-technical answers into candidate constraints;
- summarize the shared understanding;
- propose domain concepts, scenarios, alternatives, and explanations;
- explain trade-offs and readiness findings;
- draft foundation artifacts for review.

Neutron must not:

- claim uncertain assumptions as facts;
- select an architecture without user review;
- manufacture scale or compliance requirements;
- use a technology trend as sufficient evidence;
- treat more layers, packages, services, or abstractions as automatically better;
- approve its own foundation;
- widen permissions or mutate the project because effort is `high`;
- bypass deterministic readiness, plan, or transaction checks.

## Existing-project use

For an existing project, the same workshop may operate in retrofit mode:

```text
inspect current project
-> infer candidate current foundation from evidence
-> map existing decisions and drift
-> ask only unresolved questions
-> compare preserve, evolve, and migrate options
-> approve a target foundation
-> create bounded migration plans
```

Existing code and folder structure are evidence, not proof of intended
architecture.

## Success criteria

The first useful increment proves that:

- a non-technical user can describe an idea and reach a structured foundation;
- the system asks only decision-relevant questions;
- problem, users, domain, workflows, quality, risks, and delivery constraints are
  represented separately;
- important future changes are evaluated without speculative overengineering;
- alternatives include trade-offs, migration cost, and confidence;
- unresolved assumptions and conflicts remain visible;
- readiness is deterministic and reviewable;
- scaffold and implementation cannot silently bypass the foundation gate;
- CLI, Desktop, TUI, MCP, daemon, and Neutron expose equivalent state;
- future tasks can detect and explain conflicts with the approved foundation;
- approved foundations can evolve through explicit versioned decisions.

## Non-goals

This direction does not promise:

- prediction of every future feature;
- a universally optimal architecture;
- replacement of product, domain, architecture, security, legal, or accessibility
  specialists;
- mandatory complex architecture;
- exhaustive questionnaires;
- automatic market validation;
- autonomous cloud provisioning;
- automatic dependency installation;
- automatic production approval;
- an immutable architecture that can never change;
- generation of a production system from one prompt.