# Project Inception and Scaffolding Plan

## Status

Planned product increment. The current documentation branch does not implement
new commands, schemas, provider calls, generators, dependency installation, or
project mutations.

Governing and related documents:

- `docs/concepts/PROJECT_INCEPTION_AND_BLUEPRINTS.md`;
- `docs/concepts/AI_MODEL_ROUTING_AND_EFFORT_PROFILES.md`;
- `docs/roadmap/ENGINEERING_CONFIGURATION_UX_PLAN.md`;
- `docs/roadmap/ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`;
- `docs/roadmap/PROJECT_BOOTSTRAP_GUARDIAN_AND_INTERACTIVE_CLI_PLAN.md`;
- `docs/roadmap/NEUTRON_RUNTIME_ROADMAP.md`;
- existing prepared-plan, ownership, transaction, extension, security, and
  evidence contracts.

## Objective

Deliver a guided new-project workflow where a user can describe a product or
library idea in normal language, answer focused follow-up questions, compare
architecture and tooling alternatives, approve a structured blueprint, preview
an exact scaffold plan, and create a verified project without silent network,
dependency, provider, or filesystem side effects.

## First vertical slice

The first supported scenario should be deliberately narrow:

```text
new empty directory
→ user describes a TypeScript library idea
→ Neutron asks bounded product and engineering questions
→ system proposes one package or a small pnpm workspace
→ user reviews a blueprint
→ system prepares an exact file plan
→ dry-run shows paths and contents summaries
→ explicit approval creates project-owned and managed files
→ deterministic verification runs
```

The first slice should not create a remote repository, install dependencies,
configure a cloud service, publish a package, or generate into a non-empty
existing project.

## Product workflow

### Step 1: Start

Candidate commands:

```bash
loom new
loom inception start
intentloom inception start --root PATH --idea-file idea.md --json
```

Required inputs:

- explicit target root;
- confirmation that the root is empty or absent;
- initial idea or problem statement;
- selected mode, provider, model, effort, network, and budget state when Neutron
  is used.

A deterministic template-only path may be offered without a model.

### Step 2: Discovery

Neutron asks typed questions until the minimum blueprint evidence is available.

Candidate operations:

```text
createInceptionSession
recordInceptionAnswer
listInceptionQuestions
summarizeInceptionState
identifyInceptionConflicts
```

The operation result distinguishes:

- confirmed requirements;
- preferences;
- assumptions;
- unresolved questions;
- conflicts;
- unsupported requests;
- decisions requiring human or specialist review.

### Step 3: Candidate generation

Candidate operation:

```text
proposeProjectBlueprints
```

It returns:

- one recommended candidate;
- at least one simpler candidate when possible;
- a more extensible candidate only when relevant;
- evidence and user answers used;
- assumptions and confidence;
- compatibility states;
- complexity and operational costs;
- required ADRs;
- deferred capabilities.

The model may draft explanations. Architecture compatibility and pack resolution
come from versioned deterministic components.

### Step 4: Compare and refine

Candidate commands:

```bash
loom blueprint show
loom blueprint compare minimal recommended
loom blueprint explain workspace-topology
loom blueprint set packages.core.frameworkNeutral true
loom blueprint validate
```

Every manual edit is revalidated. Invalid combinations fail closed and explain
which scopes or constraints conflict.

### Step 5: Approve blueprint

Blueprint approval records:

- exact blueprint digest;
- approver identity class, without pretending that a local username is an
  enterprise identity;
- approved target root;
- selected decisions and accepted assumptions;
- unresolved issues intentionally deferred;
- approval timestamp and expiry policy;
- provider/model/effort provenance for generated explanations.

Approval of the blueprint does not approve dependency installation or all future
project changes.

### Step 6: Prepare scaffold plan

Candidate operation:

```text
prepareProjectScaffold
```

The plan includes:

- directories and files;
- project-owned versus Intentloom-managed classification;
- template and pack source versions;
- normalized paths and collision checks;
- configuration and schema versions;
- proposed package manifests;
- proposed scripts;
- dependency list without automatic installation;
- proposed CI, hooks, remote, and provider actions as separate optional steps;
- verification checks;
- rollback behavior;
- plan identifier, digest, and expiry.

### Step 7: Preview

Candidate commands:

```bash
loom scaffold --dry-run
loom scaffold diff
intentloom scaffold --plan PLAN_ID --dry-run --json
```

Preview must show:

- every affected path;
- whether the path is created, modified, skipped, or conflicting;
- ownership classification;
- whether any step requires process, package-manager, Git, provider, or network
  capability;
- which steps are excluded from the current approval.

### Step 8: Apply exact scaffold

Candidate command:

```bash
loom scaffold --plan PLAN_ID
```

Before mutation, revalidate:

- target root identity and emptiness;
- current filesystem state;
- plan digest and expiry;
- selected blueprint digest;
- path and symlink safety;
- ownership and collision state;
- capability grant;
- template and pack integrity;
- current Intentloom version compatibility.

Apply through the existing transaction boundary. A recoverable failure restores
the previous empty or partially-existing target state. Incomplete rollback is
reported truthfully with exact project-relative paths.

### Step 9: Optional reviewed follow-ups

Separate plans may propose:

- initialize local Git;
- install dependencies;
- run package-manager scripts;
- enable local Git hooks;
- configure CI files;
- create a GitHub or GitLab repository;
- push a branch;
- add provider variables;
- enable Nx Cloud or another external service;
- publish an initial package.

None of these actions are implied by scaffold approval.

## Candidate commands

### Sessions

```bash
loom inception start
loom inception resume SESSION_ID
loom inception list
loom inception status SESSION_ID
loom inception export SESSION_ID --format markdown
loom inception delete SESSION_ID
```

### Questions and answers

```bash
loom inception questions
loom inception answer QUESTION_ID
loom inception assumptions
loom inception conflicts
```

### Blueprints

```bash
loom blueprint show
loom blueprint alternatives
loom blueprint compare OPTION_A OPTION_B
loom blueprint explain DECISION_ID
loom blueprint edit
loom blueprint validate
loom blueprint approve --plan BLUEPRINT_PLAN_ID
loom blueprint export --format yaml
```

### Scaffolding

```bash
loom scaffold prepare
loom scaffold --dry-run
loom scaffold diff
loom scaffold --plan PLAN_ID
loom scaffold verify
```

### Model selection

```bash
loom new --model PROVIDER/MODEL --effort medium
loom inception resume SESSION_ID --model-profile balanced
loom blueprint compare minimal extensible --effort high
```

The same commands need stable `intentloom ... --json` forms for automation.

## Candidate schemas

Schema creation requires separate ADR and compatibility review. Candidate
artifacts:

```text
inception-session.schema.json
inception-question.schema.json
inception-answer.schema.json
project-constraint.schema.json
project-assumption.schema.json
project-blueprint.schema.json
blueprint-alternative.schema.json
blueprint-approval.schema.json
scaffold-template-manifest.schema.json
scaffold-plan.schema.json
scaffold-verification.schema.json
```

Every persisted schema needs:

- stable identifier;
- schema version;
- migration policy;
- unknown-field behavior;
- compatibility statement;
- size and count limits;
- redaction and secret rules;
- deterministic fixtures.

## Suggested package boundaries

Do not create packages until contracts and consumers justify them. Candidate
future boundaries:

```text
packages/inception-contracts/
packages/inception/
packages/blueprint-resolver/
packages/scaffolding/
packages/scaffold-templates/
```

Dependencies should flow inward:

```text
CLI / Desktop / TUI / MCP / Neutron
                 ↓
          application operations
                 ↓
inception / architecture / packs / planner
                 ↓
validator / ownership / transaction / security
```

Scaffolding must not call the human CLI and parse output.

## Template and pack governance

A scaffold template or starter composition must declare:

- stable identifier and version;
- publisher and source;
- license and notices;
- integrity digest;
- supported Intentloom and schema versions;
- supported runtimes and platforms;
- files it may create;
- variables and validation rules;
- dependencies it proposes;
- scripts it proposes;
- capabilities required;
- update and migration policy;
- verification contract.

Third-party templates use the managed extension lifecycle. Intentloom must not
copy or redistribute code beyond license permissions.

## First-party starter sequence

Implement starter compositions in this order:

1. **Minimal TypeScript library**
   - one package;
   - strict TypeScript;
   - unit tests;
   - explicit exports;
   - package verification.
2. **TypeScript library workspace**
   - pnpm workspaces;
   - optional Nx workspace orchestration;
   - core and one adapter package;
   - examples;
   - release and API compatibility plan.
3. **CLI or developer tool**
   - package plus executable;
   - cross-platform behavior;
   - packed-runtime tests.
4. **Web product**
   - application, shared libraries, tests, accessibility, and deployment plan.
5. **Local-first Desktop product**
   - frontend plus Tauri or another reviewed native shell;
   - local IPC and capability model.
6. **Data or AI product**
   - data and model provenance;
   - evaluation and privacy requirements.

Each starter is optional and editable.

## Library ecosystem acceptance fixture

Create a deterministic fixture representing a new state-management library:

```text
packages/core
packages/react
packages/testing
examples/vanilla-basic
examples/react-basic
```

The fixture should prove:

- core has no framework dependency;
- adapters depend inward on core;
- examples use public package exports;
- public API is explicit;
- package tarballs pass isolated install tests;
- type declarations resolve under supported module modes;
- bundle-size budgets are reported;
- Nx, when selected, is an orchestration layer over pnpm rather than a hidden
  hosted dependency;
- cancelling before approval leaves the root unchanged.

## Neutron integration

### Initial mode

Use `Discuss` and `Plan` with read-only typed tools. The model may:

- ask questions;
- summarize requirements;
- propose alternatives;
- draft blueprint content;
- explain trade-offs.

### Later reviewed apply

Scaffold application requires:

- approved blueprint;
- exact prepared plan;
- visible paths and capabilities;
- current-state revalidation;
- transaction and rollback;
- deterministic post-write verification.

### Effort defaults

Candidate defaults:

- discovery questions: `medium`;
- simple blueprint summary: `low`;
- normal architecture recommendation: `medium`;
- final alternative comparison: `high`;
- security-sensitive or public API design: `high`;
- deterministic scaffold validation: no model required.

## Nx integration for generated projects

When a user selects Nx for a new project, the blueprint must distinguish:

- pnpm workspace ownership of packages and dependencies;
- Nx project graph and task orchestration;
- local cache policy;
- optional affected CI;
- optional module-boundary rules;
- optional generators;
- optional release tooling;
- disabled Nx Cloud unless explicitly selected and approved.

The generated project should not require an Nx-hosted account for local use.

## Verification strategy

### Contract tests

- schema validation;
- deterministic question ordering;
- answer and assumption classification;
- candidate compatibility;
- blueprint digest stability;
- plan expiry and stale-state rejection.

### Safety tests

- non-empty root rejection;
- symlink-root and path-escape rejection;
- collision detection;
- no network in offline mode;
- no package-manager execution during scaffold-only apply;
- no secret persistence;
- rollback and incomplete rollback reporting.

### Template tests

- deterministic generated bytes;
- exact source and integrity evidence;
- package manifest validity;
- TypeScript build and test;
- isolated package installation;
- public export and declaration verification;
- cross-platform path fixtures.

### Client parity

CLI, Desktop, TUI, MCP, daemon, and Neutron should return equivalent structured
state for the same session, blueprint, and plan.

## Delivery phases

### I0. Decisions and threat model

- approve terminology and ownership;
- define empty-root semantics;
- define session retention and deletion;
- define model/provider boundaries;
- define template legal and security requirements;
- define package-manager, Git, and provider side-effect separation.

Exit gate: no unresolved authority, ownership, or secret-storage ambiguity.

### I1. Read-only inception contracts

- session, question, answer, constraint, assumption, and alternative contracts;
- deterministic fixtures;
- no provider required.

Exit gate: a structured session can be created and exported without writes to a
project root.

### I2. Neutron discovery loop

- one real provider adapter through the Neutron runtime;
- bounded context;
- adaptive questions;
- visible provider, model, effort, network, and budgets.

Exit gate: one idea reaches a reviewed requirement summary without project
mutation.

### I3. Blueprint resolver

- architecture, pack, quality, discipline, and complexity integration;
- alternative comparison;
- validation and deterministic digest.

Exit gate: the same reviewed answers produce a stable blueprint and findings.

### I4. Blueprint storage and review

- user-owned blueprint artifact;
- export, import, edit, validate, approve, and revoke;
- schema migrations.

Exit gate: blueprint approval is explicit and separate from scaffold approval.

### I5. Minimal scaffold planner

- one first-party TypeScript library starter;
- exact path plan;
- no dependency installation;
- dry-run and diff.

Exit gate: the plan is deterministic and side-effect free.

### I6. Transactional scaffold apply

- empty-root revalidation;
- transactional file creation;
- ownership metadata;
- rollback and post-write verification.

Exit gate: failure never reports false success and cancellation is byte-for-byte
safe.

### I7. Library workspace starter

- pnpm workspace;
- optional Nx selection;
- core, adapter, testing, and examples;
- package-quality tools and isolated installs.

Exit gate: generated workspace passes declared verification on supported
platforms.

### I8. Reviewed dependency and Git actions

- package-manager install plan;
- local Git initialization plan;
- optional hooks and CI plan;
- separate capabilities and approvals.

Exit gate: no command runs outside the exact approved allowlist and working root.

### I9. Desktop and TUI product flow

- full guided experience;
- equivalent accessible non-visual representation;
- session resume and deletion;
- blueprint and scaffold diff review.

Exit gate: clients consume one application contract and can cancel safely.

### I10. Third-party starter ecosystem

- managed template extensions;
- provenance, license, integrity, capability, compatibility, update, and removal
  lifecycle.

Exit gate: third-party templates cannot bypass the same plan and transaction
boundary.

## Initial release gate

The first public Project Inception release should require:

- one provider-neutral session contract;
- one real Neutron provider adapter or a clearly documented deterministic
  model-free path;
- one TypeScript library starter;
- `low`, `medium`, and `high` effort selection where the provider supports or
  visibly maps it;
- exact blueprint and scaffold plan review;
- no hidden network or dependency installation;
- cross-platform deterministic fixtures;
- cancellation and rollback evidence;
- CLI JSON compatibility statement;
- migration and support documentation.

## Non-goals for the first increment

- generating arbitrary production systems from one prompt;
- automatic market validation;
- autonomous cloud provisioning;
- creating or pushing remote repositories;
- choosing licenses without user review;
- automatic payment or provider account setup;
- mutating an existing non-empty repository;
- silent model fallback;
- automatic dependency installation;
- autonomous commits, pull requests, releases, deployments, or publication.
