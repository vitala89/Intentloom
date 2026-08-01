# Project Inception and Blueprints

## Status

Candidate product direction. This document defines how Intentloom and Neutron
should help a user move from a product idea to an approved, reviewable project
blueprint and a safe scaffolding plan.

It does not add a public CLI command, schema, provider integration, generator,
dependency installation flow, or mutation permission by itself.

## Purpose

Intentloom should support two distinct project entry points:

1. **Existing project adoption**
   - inspect an existing repository;
   - classify current tools, architecture, instructions, skills, ownership, and
     drift;
   - propose a non-destructive adoption plan.
2. **New project inception**
   - begin from a user-supplied idea or problem statement;
   - ask focused follow-up questions;
   - identify goals, constraints, assumptions, and unresolved risks;
   - compare architecture and tooling alternatives;
   - produce an approved project blueprint;
   - prepare an exact, reviewable scaffolding plan.

The new-project flow is not a generic template picker. It is a structured product
and engineering discovery workflow.

## Product position

The intended experience is:

```text
idea or problem statement
→ adaptive discovery interview
→ goals, users, constraints, and assumptions
→ candidate product and architecture options
→ trade-off comparison
→ recommended blueprint
→ explicit user review and decisions
→ exact scaffold plan and diff
→ explicit approval
→ transactional project creation
→ verification and recorded evidence
```

Neutron may explain, summarize, compare, and ask questions. Deterministic
validators, compatibility resolvers, policy rules, capability checks, ownership,
and transactions remain outside the model.

## Fit with existing Intentloom foundations

The direction composes existing platform concepts rather than creating another
agent or configuration system:

- Agent Workspace `Discuss`, `Inspect`, `Plan`, `Review`, and approved `Apply`
  modes;
- Neutron provider-neutral model runtime and bounded context;
- architecture and discipline profiles;
- engineering configuration Recommended, Guided, Expert, and Import modes;
- canonical policies, workflows, skills, templates, and technology packs;
- prepared plans, explicit approval, revalidation, transaction, and rollback;
- Project Guardian and canonical `.aif/` workspace;
- managed extension provenance, compatibility, license, integrity, and
  capability review;
- Desktop, TUI, CLI, MCP, daemon, and agent clients over shared application
  operations.

Project Inception should call the same architecture resolver, pack resolver,
validator, planner, transaction, and evidence operations that other clients use.

## Core concepts

### Inception session

A project-scoped or proposed-project-scoped conversation that records:

- the original idea;
- user answers;
- unanswered questions;
- assumptions;
- candidate decisions;
- rejected alternatives;
- selected blueprint;
- provider, model, effort, tools, skills, and context provenance;
- review and approval state.

An inception session is not itself an approved project configuration.

### Problem statement

A concise description of the problem, intended users, current alternatives, and
why a new project may be useful.

A weak statement such as “build something like TanStack” should trigger
clarification rather than immediate scaffolding.

### Discovery question

A structured question with:

- stable question identifier;
- category;
- reason for asking;
- possible answer shape;
- whether the answer is required or optional;
- which recommendations it may affect;
- current answer and provenance;
- confidence and remaining ambiguity.

The model may phrase questions conversationally, but the underlying question and
answer record should be typed and versioned.

### Constraint

A reviewed requirement that limits valid solutions, for example:

- browser and Node.js support;
- framework neutrality;
- local-first operation;
- independent package publication;
- data residency;
- accessibility level;
- security sensitivity;
- offline support;
- bundle-size budget;
- release cadence;
- team ownership;
- compatibility commitments.

### Assumption

A proposition used because verified information is unavailable. Assumptions must
remain visible and must not be presented as facts.

### Candidate architecture

A scoped composition of solution topology, internal architecture, frontend
organization, workspace topology, integration, data strategy, technology packs,
and discipline perspectives.

Candidates must include both benefits and introduced costs.

### Project blueprint

The approved, provider-neutral description of what should be created. A blueprint
may include:

- product name and summary;
- target users and primary use cases;
- explicit non-goals;
- supported platforms and runtimes;
- project type and repository topology;
- applications, libraries, packages, services, crates, and data domains;
- public API and compatibility strategy;
- architecture per scope;
- selected technology and specialized packs;
- quality profile and measurable budgets;
- security, privacy, accessibility, testing, documentation, release, and
  observability requirements;
- team and ownership assumptions;
- required ADRs;
- phased delivery plan;
- deferred capabilities;
- open questions and accepted risks.

A blueprint remains user-owned intent. Generated adapter output may derive from
it, but ownership of the blueprint must not be silently claimed by a tool.

### Scaffold plan

An exact prepared mutation containing:

- target root;
- directories and files to create;
- files to modify, if explicitly allowed;
- template, pack, and generator versions;
- source and integrity evidence;
- package manager operations proposed separately;
- commands that would be required;
- requested capabilities;
- expected generated and project-owned classifications;
- verification steps;
- rollback boundary;
- plan identifier, digest, and expiry.

A scaffold plan is not approval and must not execute automatically.

## Discovery interview

### Start from the problem, not the stack

The first questions should establish:

- What problem should the project solve?
- Who experiences that problem?
- What do users do today?
- Why are existing tools insufficient?
- What is the smallest useful first outcome?
- What would make the first release successful?
- What should explicitly not be built yet?

Only after the product boundary is understood should Neutron recommend a stack.

### Adaptive questioning

The interview should ask only questions that can materially change a decision.
It should not show a fixed wall of architecture terminology.

Candidate categories:

1. **Product and users**
   - intended audience;
   - core workflow;
   - open-source, internal, commercial, or hybrid distribution;
   - expected adoption and contribution model.
2. **Runtime and platforms**
   - browser, Node.js, edge, backend, Desktop, mobile, embedded, or mixed;
   - supported operating systems and runtimes;
   - offline and local-first requirements.
3. **Public contracts**
   - API stability;
   - package publication;
   - plugin or adapter model;
   - compatibility and deprecation policy.
4. **Architecture and boundaries**
   - applications and deployables;
   - independent team ownership;
   - data ownership;
   - framework-neutral core;
   - integration and extension boundaries.
5. **Quality and operations**
   - testing levels;
   - performance and bundle budgets;
   - observability;
   - release cadence;
   - support policy.
6. **Security and privacy**
   - secrets, personal data, regulated data, network access, sandboxing, and
     supply-chain sensitivity.
7. **Team and delivery**
   - current team size and skills;
   - expected contributors;
   - ownership and review model;
   - delivery phases and deadlines.
8. **Tooling preferences and constraints**
   - package manager;
   - workspace tooling;
   - CI provider;
   - existing organizational standards;
   - tools that are required, forbidden, or optional.

### Question quality rules

Neutron should:

- explain why a question matters when it is not obvious;
- avoid repeating already answered questions;
- allow “unknown” and record the uncertainty;
- distinguish preference from hard constraint;
- summarize confirmed understanding before recommendations;
- ask for confirmation when two answers conflict;
- stop questioning when enough evidence exists for a safe first blueprint;
- avoid manufacturing precision about scale, traffic, team size, or deadlines.

## Recommendation behavior

### Compare before recommending

For important decisions, show at least:

- the recommended option;
- a simpler option;
- a more extensible or complex option when relevant;
- costs, risks, and migration implications;
- evidence and answers used;
- assumptions and confidence;
- reasons not to choose fashionable complexity.

### Prefer the smallest coherent first release

For a user proposing a broad library ecosystem, Neutron should normally narrow
the first milestone to one strong core use case and one proven consumer.

Example:

```text
Long-term vision:
  framework-neutral state and data toolkit

Recommended first release:
  core package
  React adapter
  testing utilities

Deferred:
  Angular, Vue, Solid, Svelte adapters
  devtools
  persistence plugins
  hosted services
```

### Deterministic and model responsibilities

Deterministic components should own:

- architecture compatibility states;
- schema validation;
- pack compatibility;
- path and ownership safety;
- supported runtime ranges;
- policy requirements;
- plan identity and digest;
- mutation and rollback.

The model may own:

- conversational clarification;
- readable summaries;
- option explanation;
- requirement synthesis;
- proposing questions and alternatives;
- drafting the blueprint for review.

Model output must not silently become a selected architecture, capability grant,
dependency installation, or approved plan.

## Library ecosystem scenario

A candidate “TanStack-like” project may resolve to a package-based TypeScript
monorepo with a framework-neutral core.

Example blueprint shape:

```text
project: Kas State
product: framework-neutral reactive state engine
workspace: pnpm workspaces + Nx
packages:
  - @kas-state/core
  - @kas-state/react
  - @kas-state/testing
examples:
  - vanilla-basic
  - react-basic
later:
  - devtools
  - framework adapters
  - persistence plugins
```

Candidate architecture rules:

- `core` cannot import framework adapters;
- adapters depend inward on stable core contracts;
- examples consume public exports rather than internal source paths;
- package exports are explicit;
- public API changes are reviewed;
- package tarballs are installed and tested in isolated consumers;
- bundle-size and type-resolution budgets are recorded;
- releases include changelog and compatibility evidence.

This is a candidate starter composition, not a mandatory template.

## Blueprint storage

A future project may store reviewed inception artifacts under the canonical
workspace:

```text
.aif/
└── inception/
    ├── idea.md
    ├── discovery.yaml
    ├── assumptions.yaml
    ├── alternatives.yaml
    ├── blueprint.yaml
    ├── decisions/
    └── scaffold-plans/
```

Ownership candidates:

- idea, discovery answers, assumptions, blueprint, and decisions are user-owned;
- generated scaffold plans and machine reports are Intentloom-managed only when
  valid ownership metadata establishes that state;
- provider credentials, private model configuration, raw prompts, and sensitive
  session content remain outside version-controlled project metadata unless the
  user explicitly exports a reviewed artifact.

The persisted format requires schemas and migration policy before becoming a
public contract.

## Candidate CLI experience

```bash
loom new
loom inception start
loom inception resume SESSION_ID
loom inception status
loom inception questions
loom blueprint show
loom blueprint explain DECISION_ID
loom blueprint compare OPTION_A OPTION_B
loom blueprint validate
loom blueprint approve --plan BLUEPRINT_PLAN_ID
loom scaffold --dry-run
loom scaffold --plan SCAFFOLD_PLAN_ID
loom verify
```

Non-interactive candidates:

```bash
intentloom inception start --idea-file idea.md --json
intentloom blueprint validate --file blueprint.yaml --json
intentloom scaffold --blueprint blueprint.yaml --dry-run --json
```

The canonical `intentloom` executable remains suitable for automation. `loom`
may provide the shorter interactive entry point after its compatibility decision
and packaged-install evidence are complete.

## Desktop and TUI experience

Candidate Desktop steps:

1. Create Project.
2. Describe the idea.
3. Review Neutron’s current understanding.
4. Answer focused discovery questions.
5. Compare product and architecture alternatives.
6. Review the Architecture Map and package or application graph.
7. Review quality, security, testing, release, and documentation requirements.
8. Approve the blueprint.
9. Preview the exact scaffold plan.
10. Approve creation and review verification evidence.

The TUI should expose equivalent structured state without requiring the visual
graph.

## Safe scaffolding boundary

The first implementation should support only:

- a new empty directory; or
- an explicitly selected empty project root.

A non-empty existing repository should use inspection and adoption instead of
being treated as a new project.

Scaffolding must not silently:

- overwrite files;
- initialize or push a remote repository;
- create provider credentials;
- install dependencies;
- execute downloaded code;
- enable Nx Cloud or another hosted service;
- add Git hooks;
- create releases or publish packages;
- choose a license on behalf of the user;
- accept legal terms;
- grant model or extension capabilities.

Dependency installation, Git initialization, remote creation, CI setup, and
provider writes must be separate reviewed actions.

## Starter compositions

Candidate first-party starter compositions may include:

- TypeScript library;
- multi-package library ecosystem;
- web product;
- full-stack product;
- local-first Desktop product;
- CLI and developer tool;
- backend service or modular monolith;
- data or AI product;
- mobile product;
- extension or plugin ecosystem.

A starter composition is a versioned editable blueprint seed, not a universal
best practice.

## Success criteria

The first useful Project Inception milestone proves that:

- a user can describe an idea without knowing architecture terminology;
- Neutron asks bounded, relevant follow-up questions;
- answers, assumptions, and unresolved questions remain visible;
- the system compares options and recommends the simplest coherent first
  architecture;
- the user can edit and approve a structured blueprint;
- a scaffold dry-run lists exact paths, templates, dependencies, capabilities,
  tests, and rollback behavior;
- cancellation leaves the target root unchanged;
- no provider, model, or generated answer counts as approval;
- equivalent CLI, Desktop, TUI, MCP, and daemon clients consume one structured
  operation result.

## Non-goals

Project Inception does not initially provide:

- a guarantee that an AI recommendation is the best business decision;
- autonomous market research;
- autonomous dependency installation;
- arbitrary shell execution;
- silent network access;
- automatic cloud accounts or infrastructure;
- automatic repository creation or push;
- automatic legal or license decisions;
- a requirement to configure every architecture axis;
- unrestricted generation into a non-empty repository;
- a replacement for human product, architecture, security, or legal review.
