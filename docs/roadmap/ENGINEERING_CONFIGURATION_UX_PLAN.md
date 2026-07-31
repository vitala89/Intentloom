# Engineering Configuration UX Plan

## Status

Planned user experience for the quality, architecture, technology-pack, and
discipline capabilities defined in:

- `CONFIGURABLE_ENGINEERING_STANDARDS_PLAN.md`;
- `ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`;
- `SPECIALIZED_ENGINEERING_PACKS_PLAN.md`.

This document does not add a runtime, schema, CLI, Desktop, or protocol contract.

## Problem

A powerful architecture catalog can easily become an unusable wall of terms.
Many users know what they are building but do not know whether they need vertical
slices, DDD, microfrontends, CQRS, a modular monolith, or another named pattern.
Other users are experienced architects and need precise control over every scope.

Intentloom should support both without hiding consequences or making a complex
architecture the default.

## Product principles

1. Start with the user's problem, not a pattern name.
2. Prefer the simplest architecture that satisfies current evidence and goals.
3. Separate recommendation from selection and selection from permission.
4. Explain operational and migration cost, not only benefits.
5. Allow different architecture scopes in one solution.
6. Make uncertainty visible.
7. Use progressive disclosure.
8. Never auto-apply a high-impact topology or data-boundary change.
9. Preserve an expert path without forcing expert complexity on every user.
10. Keep CLI, Desktop, TUI, daemon, MCP, and generated guidance equivalent.

## Experience modes

### Recommended mode

For users who want a safe default.

Intentloom inspects bounded project evidence and asks a small number of concrete
questions. It produces one primary recommendation, simpler alternatives, and
reasons not to select more complex strategies.

Recommended mode should show:

- detected project areas and confidence;
- proposed quality preset;
- proposed architecture per scope;
- proposed technology packs;
- likely discipline perspectives;
- important trade-offs;
- unresolved questions;
- required ADRs;
- a preview with no writes.

It must not silently enable microservices, microfrontends, event sourcing, CQRS,
polyrepo, or external packs.

### Guided mode

For users who want to shape the decision without configuring every rule.

A wizard asks about concrete constraints:

- number of applications and deployable units;
- current and expected team ownership;
- need for independent deployment;
- rate of change in different domains;
- offline or local-first requirements;
- data ownership and privacy boundaries;
- external integrations;
- reliability and recovery expectations;
- release cadence;
- platform targets;
- legacy constraints;
- regulatory or security sensitivity;
- expected scale only when evidence exists.

Answers map to architecture constraints, not directly to fashionable pattern
names. The result still requires user confirmation.

### Expert mode

For architects and experienced teams.

Expert mode provides direct access to:

- architecture axes;
- path, package, application, deployable, bounded-context, and data scopes;
- primary strategies and modifiers;
- compatibility constraints;
- quality budgets;
- discipline composition;
- required reviews;
- exceptions and migration ratchets;
- versioned organization profiles.

Expert mode does not bypass validation, security, preview, approval, or rollback.

### Import existing decisions

Users should be able to import or map existing ADRs, architecture documents,
module-boundary configuration, and project-owned instructions.

Import remains proposal-based. Intentloom must not interpret document headings or
folder names as proof that the architecture is actually enforced.

## Recommendation inputs

Architecture recommendations should consider evidence and user goals together.

Candidate evidence:

- applications, packages, crates, and project graph;
- build and deployment definitions;
- public protocols and APIs;
- data stores and migrations;
- current import boundaries;
- local IPC or network integrations;
- ownership and generated-file metadata;
- tests and compatibility contracts;
- existing ADRs and explicitly mapped architecture documentation.

Candidate goals:

- faster feature delivery;
- independent team ownership;
- independent deployment;
- offline operation;
- stronger safety or auditability;
- simpler onboarding;
- controlled legacy migration;
- reusable platform capabilities;
- low operational overhead;
- cross-platform delivery;
- stable public contracts.

The system should not recommend architecture from repository size, file count,
or framework detection alone.

## Architecture complexity budget

Intentloom should show the cost introduced by a strategy.

Candidate cost dimensions:

- number of deployables;
- operational ownership;
- CI and release complexity;
- distributed failure modes;
- data consistency complexity;
- observability requirements;
- local development complexity;
- testing and environment cost;
- migration cost;
- team coordination;
- security surface;
- compatibility commitments.

A recommendation should explain both what the strategy solves and what new work
it creates.

Example:

```text
Microfrontends may support independent frontend ownership and deployment.
They also introduce shell integration, routing, shared dependency, versioning,
observability, test-environment, and user-experience consistency costs.
Current evidence shows one team and one deployment pipeline, so a modular
frontend is recommended first.
```

## Starter configurations

Starter configurations are editable compositions, not universal best practices.

### Simple product

- balanced quality profile;
- one deployable application;
- feature-oriented organization;
- explicit application and infrastructure boundaries;
- frontend, backend, and QA perspectives as applicable.

### Growing modular product

- balanced or strict quality profile;
- modular monolith or well-bounded applications;
- domain or vertical slices;
- contract tests at boundaries;
- legacy ratchet where needed.

### Enterprise monorepo

- scoped applications and libraries;
- enforceable dependency graph;
- domain ownership;
- platform and developer-experience perspectives;
- independent deployables only where justified.

### Local-first Desktop product

- Desktop as a client over shared application and protocol contracts;
- local IPC;
- explicit native capabilities;
- offline and synchronization rules;
- Desktop, frontend, Rust, security, QA, and accessibility perspectives.

### Distributed service platform

- explicit service and data ownership;
- versioned APIs or events;
- SRE, platform, security, backend, QA, and release perspectives;
- observability and failure-mode requirements;
- ADR required before topology changes.

### AI and data product

- dataset and retrieval provenance;
- evaluation and model-version contracts;
- deterministic policy and approval layers;
- data, ML/AI, backend, security, privacy, QA, and MLOps perspectives;
- no automatic production deployment from model or role selection.

## Architecture comparison

The UI and CLI should compare candidate strategies using the same structured
result.

For each candidate show:

- suitable problems;
- unsuitable conditions;
- required capabilities and team maturity;
- compatible and conflicting strategies;
- introduced costs;
- required tests and evidence;
- migration difficulty;
- reversibility;
- security impact;
- decision status;
- source and version of the strategy pack.

Users should be able to ask:

- Why is this recommended?
- Why not the simpler option?
- Why not microservices?
- Can these two strategies be combined?
- Which scope does this affect?
- What must change to adopt it?
- Which tests and reviewers become required?
- What remains unchanged?

## Scope editor

The Architecture Map should let users select a scope and view only its effective
configuration.

Candidate scope interactions:

- select an application, package, crate, bounded context, feature, deployable, or
  data domain;
- see inherited and local strategies;
- add a modifier;
- compare alternatives;
- view compatibility findings;
- preview generated instructions;
- view required disciplines and reviews;
- view exceptions and migration progress.

Overlapping path scopes must be detected. Precedence must be explicit and
machine-readable.

## Task-specific experience

When a user starts a task, Intentloom should resolve the smallest relevant set of
rules.

Candidate flow:

```text
user describes task
→ affected paths and architecture scopes are identified
→ relevant quality, architecture, technology, and discipline profiles resolve
→ missing decisions or conflicts are shown
→ focused task plan and tests are proposed
→ capabilities and approvals are checked separately
```

The agent should not receive every project rule when only a small subset applies.

## Explainability and confidence

Every recommendation should include:

- evidence used;
- evidence excluded;
- confidence;
- assumptions;
- unresolved questions;
- alternatives;
- reasons for rejecting incompatible choices;
- whether a human architecture decision is required.

AI-generated explanation may improve readability, but compatibility status and
measurable findings must come from versioned deterministic contracts.

## CLI sketch

```bash
intentloom configure recommend --root .
intentloom configure guided
intentloom configure expert
intentloom configure compare modular-monolith microservices
intentloom configure explain --scope apps/web/**
intentloom configure preview
intentloom configure apply --plan PLAN_ID
```

`apply` is a future reviewed mutation and must use prepared-plan identity,
current-state revalidation, explicit approval, transaction safety, and rollback.

## Desktop sketch

Candidate onboarding steps:

1. Select project.
2. Review detected applications and boundaries.
3. Choose Recommended, Guided, Expert, or Import mode.
4. Review quality profile.
5. Review Architecture Map.
6. Review technology and specialized packs.
7. Review project and task disciplines.
8. Resolve conflicts and required decisions.
9. Preview effective configuration and generated guidance.
10. Approve a transactional plan.

The user can leave architecture unconfigured and continue with only the mandatory
baseline and a quality profile.

## Accessibility

The architecture experience must not depend only on a visual graph.

Provide:

- keyboard navigation;
- list and tree alternatives;
- text descriptions for relationships;
- non-color conflict indicators;
- stable focus behavior;
- screen-reader labels;
- exportable structured and Markdown summaries.

## Acceptance criteria

The UX increment is complete when:

- a new user can obtain a safe recommendation without understanding every
  architecture term;
- an expert can configure scoped architecture directly;
- recommendations show costs, alternatives, evidence, and confidence;
- complex strategies are never the unexplained default;
- task-specific guidance remains focused;
- architecture, role, capability, ownership, and approval remain separate;
- visual and non-visual representations are equivalent;
- all clients consume one structured resolver result;
- no write occurs before preview, validation, and approval.

## Non-goals

This experience does not:

- hide architecture decisions behind an AI answer;
- guarantee that a recommendation is correct without human review;
- force architecture configuration during onboarding;
- require advanced terminology in Recommended mode;
- make a visual graph the only usable interface;
- treat organization size as proof that microservices or microfrontends are
  needed;
- bypass security or transaction boundaries in Expert mode.
