# Configurable Engineering Standards Plan

## Status

Planned product increment. This document does not add a new valid configuration
field or CLI command yet. Schema, protocol, migration, security, and
compatibility work must land before any proposed examples become accepted
contracts.

The detailed multi-axis architecture and engineering-discipline model is defined
in `ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`.

## Problem

Intentloom can already select technology profiles and generate guidance for
multiple coding tools, but projects need an explicit, versioned way to choose:

- how strictly code is written and tested;
- how applications and packages are architected;
- which architecture applies to each project area;
- which technology and domain rules are active;
- which engineering disciplines should review or contribute to a task;
- how existing technical debt is reduced without a dangerous rewrite;
- how the same effective policy reaches CLI, MCP, Desktop, TUI, daemon, and
  generated agent instructions.

A flat list is not sufficient. SOLID is a design principle, Feature-Sliced Design
organizes frontend code, Domain-Driven Design defines domain boundaries,
microfrontends define delivery and integration boundaries, Nx describes a
workspace and dependency graph, and frontend, QA, SRE, or security describe
engineering perspectives. They must be modeled independently and composed with
explicit compatibility rules.

## Product decision

Add **Engineering Configuration Profiles** as a layered, provider-neutral
Intentloom capability.

The effective configuration has five layers:

1. **Mandatory platform baseline**
   - security, ownership, provider neutrality, explicit roots, evidence before
     mutation, human approval, compatibility, truthful reporting, and reversible
     writes;
   - cannot be disabled by any preset.
2. **Project quality profile**
   - maintainability principles, code budgets, complexity budgets, testing
     expectations, exception policy, and legacy migration mode;
   - examples: balanced, strict, legacy-ratchet, and custom.
3. **Architecture strategy profile**
   - solution topology, internal architecture, frontend organization, workspace
     topology, integration style, and data ownership;
   - selected by scope rather than forced globally.
4. **Technology and domain packs**
   - TypeScript, Angular, React, Rust, Tauri 2, backend API, database, mobile,
     data, ML, accessibility, security-sensitive, and future technical guidance.
5. **Discipline perspectives**
   - frontend, backend, full-stack, mobile, desktop, QA, SDET, DevOps, SRE,
     platform, security, data, ML/AI, database, UX, accessibility, architecture,
     and documentation views.

This does not conflict with Intentloom's current architecture. It strengthens the
canonical catalog and conformance model while keeping CLI, MCP, Desktop, TUI,
and daemon as clients over shared application and protocol contracts.

## Non-negotiable boundary

User choice may tune maintainability, architecture, testing, and task emphasis.
It must not disable:

- project-root containment;
- ownership and generated-file safety;
- transaction preview and rollback requirements;
- explicit approval for mutation;
- credential and secret protections;
- provider neutrality;
- compatibility and migration checks;
- truthful evidence and uncertainty reporting;
- the prohibition on hidden network, telemetry, shell, hook, or dependency
  installation behavior.

A preset named `relaxed` or `legacy` means gradual maintainability enforcement,
not relaxed security. A role such as `DevOps` or `security` does not grant
network, secret, deployment, merge, or release capabilities.

## Separation of concerns

Intentloom should keep these concepts distinct:

- **quality profile** answers how strict and testable the code should be;
- **architecture strategy** answers how responsibilities and dependencies are
  organized;
- **technology pack** answers which framework, language, platform, or technical
  constraints apply;
- **discipline perspective** answers which concerns should be emphasized for the
  current person, team, agent, or task;
- **capability policy** answers what operations are allowed;
- **approval policy** answers which human decision is required.

The user may combine compatible selections. Intentloom must not infer permissions
from roles or architecture labels.

## Candidate policy model

The accepted schema should represent stable rule and strategy IDs rather than
free-form prompt text. A future versioned contract may express concepts similar
to:

```yaml
schemaVersion: "1"
qualityProfile: balanced
quality:
  principles:
    - solid
    - clean-boundaries
    - composition-over-inheritance
    - kiss
    - yagni
  codeBudgets:
    sourceFile:
      preferredLines: 250
      hardLines: 400
    testFile:
      preferredLines: 400
      hardLines: 700
    function:
      preferredLines: 40
      hardLines: 80
      preferredComplexity: 10
      reviewComplexity: 15
      preferredMaxNesting: 3
  testing:
    behaviorChangesRequireTests: true
    bugFixesRequireRegressionTests: true
    boundaryContractTests: true
  legacy:
    mode: ratchet
    oversizedFilesMayGrow: false
architecture:
  solution:
    topology: modular-monolith
    repository: nx-monorepo
  scopes:
    - id: web
      paths:
        - apps/web/**
      strategies:
        frontend: feature-sliced
        internal: vertical-slices
      technologyPacks:
        - typescript
        - angular
        - accessibility
    - id: api
      paths:
        - apps/api/**
      strategies:
        internal: hexagonal
        domain: ddd-lite
      technologyPacks:
        - backend-api
        - database
disciplines:
  project:
    - frontend
    - backend
    - qa
    - devops
    - security
exceptions:
  requireReason: true
  requireReviewTrigger: true
```

This example is illustrative only. It is not valid in `.aif/config.yaml` until an
accepted schema and migration define its location and compatibility rules.

## Quality presets

### Balanced

Default for established projects. Uses maintainability targets, hard upper
limits, required behavior tests, and a ratchet for existing oversized files.

### Strict

For greenfield or high-assurance work. Uses lower budgets, stronger complexity
checks, selective strict lints, and no new exceptions without explicit approval.

### Legacy ratchet

For mature repositories with existing debt. Existing violations are baselined,
may not worsen, and are reduced incrementally when touched. New files follow the
balanced limits.

### Custom

Starts from a named preset and records explicit overrides. Custom values cannot
bypass the mandatory platform baseline.

## Scoped architecture strategies

Architecture is not one global dropdown. Different parts of a solution may use
compatible strategies at different levels.

Examples:

- an Angular frontend may use Feature-Sliced Design and vertical slices;
- a backend may use a modular monolith, DDD-lite, and hexagonal boundaries;
- a Tauri Desktop application may remain a thin client over typed local IPC;
- a monorepo may contain microservices, microfrontends, libraries, and local
  applications without making those runtime architectures equivalent;
- one microfrontend may use Feature-Sliced Design internally;
- a larger solution may combine a modular monolith with separately deployed
  services, provided each deployable has one explicit primary topology.

Each architecture strategy must declare its axis, allowed scopes, compatibility,
constraints, required decisions, deterministic checks, trade-offs, and migration
guidance. High-impact selections such as microservices, microfrontends, event
sourcing, shared-database changes, or polyrepo migration require an explicit
architecture decision record.

See `ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md` for the complete candidate
model, conflict states, architecture axes, examples, client surfaces, and
acceptance criteria.

## Technology and domain pack requirements

Each pack must include:

- a stable pack ID and semantic version;
- supported language, framework, platform, and tool compatibility ranges;
- canonical rule IDs with severity and rationale;
- primary-source references and a last-reviewed date;
- deterministic generated guidance;
- optional deterministic checks;
- known conflicts and precedence rules;
- migration notes for changed or removed rules;
- tests proving equivalent resolution across supported clients.

Candidate first-party packs:

- `typescript`
- `frontend`
- `angular`
- `react`
- `rust`
- `tauri-2`
- `backend-api`
- `database`
- `mobile`
- `testing`
- `accessibility`
- `security-sensitive`
- `data-engineering`
- `ml-ai`
- `devops`
- `sre`

External packs may be supported through the managed-extension lifecycle. They
must not be silently downloaded, executed, or trusted.

## Discipline perspectives

A discipline perspective filters and prioritizes relevant guidance. It does not
create a second architecture or policy source.

Candidate first-party perspectives:

- frontend engineer;
- backend engineer;
- full-stack engineer;
- mobile engineer;
- desktop engineer;
- QA engineer;
- SDET or test automation engineer;
- DevOps engineer;
- SRE engineer;
- platform engineer;
- security or AppSec engineer;
- data engineer;
- ML or AI engineer;
- database engineer;
- UX, UI, and accessibility engineer;
- software architect or technical lead;
- technical writer or developer advocate.

A task may activate several perspectives. For example, a Desktop authentication
change may require frontend, desktop, backend, security, QA, and accessibility
views over the same architecture scopes.

Intentloom should distinguish project disciplines, task disciplines, agent role,
and approval role. None of these labels grants capabilities automatically.

## Resolution workflow

```text
inspect repository evidence
→ detect applications, packages, deployables, and likely domains
→ propose quality, architecture, technology, and discipline selections
→ show confidence, assumptions, trade-offs, and conflicts
→ user confirms or edits scopes
→ resolve one effective configuration
→ preview generated guidance and conformance rules
→ validate compatibility
→ user approves
→ write transactionally
→ doctor and conformance checks
```

The system may recommend a simpler architecture when evidence does not justify a
complex option. It must not silently choose or migrate to microservices,
microfrontends, event sourcing, CQRS, or polyrepo.

## CLI experience

Candidate quality commands:

```bash
intentloom standards init --profile balanced
intentloom standards show --effective
intentloom standards check --root .
intentloom standards explain source-file-hard-limit
intentloom standards diff --profile strict
```

Candidate architecture and discipline commands:

```bash
intentloom architecture detect --root .
intentloom architecture init --interactive
intentloom architecture show --effective
intentloom architecture validate
intentloom architecture explain feature-sliced
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

The CLI must return versioned structured results. Human output is rendered from
the same result used by Desktop, TUI, daemon, and MCP.

## Desktop experience

Add **Engineering Standards** and **Architecture Map** areas to project onboarding
and Settings.

The first read-only slices should provide:

- quality preset selection and effective-policy preview;
- detected applications, packages, deployables, and data domains;
- architecture scopes as a tree or graph;
- primary strategies and modifiers for each scope;
- active technology packs and discipline perspectives;
- code-size, complexity, and testing requirements;
- legacy-ratchet state;
- compatibility conflicts and unresolved decisions;
- dependency-direction and ownership findings;
- proposed exceptions with reason and review trigger;
- a task-specific policy preview;
- a diff before any configuration or generated guidance is written.

Desktop must not implement a second resolver. It consumes the same application
operation and protocol result as CLI and MCP.

## MCP surface

The first MCP increments are read-only.

Candidate resources:

```text
intentloom://standards/catalog
intentloom://standards/effective
intentloom://standards/findings
intentloom://standards/domain-packs
intentloom://architecture/catalog
intentloom://architecture/effective
intentloom://architecture/scopes
intentloom://architecture/findings
intentloom://disciplines/catalog
```

Candidate tools:

```text
intentloom_engineering_standards_show
intentloom_engineering_standards_check
intentloom_engineering_standard_explain
intentloom_engineering_standards_diff
intentloom_architecture_detect
intentloom_architecture_show
intentloom_architecture_validate
intentloom_architecture_explain
intentloom_architecture_diff
intentloom_task_profile_resolve
```

MCP resources provide context, tools perform bounded typed operations, and
prompts provide user-invoked workflow templates. No MCP tool may expose arbitrary
file reads, shell execution, unrestricted CLI invocation, hidden network access,
or direct mutation.

An external documentation MCP may be configured later as an optional evidence
source. Intentloom must record its identity, version, network state, trust class,
and provenance. External text is untrusted context, not an automatically enforced
rule.

## Deterministic checks

The first checker should focus on facts that can be measured without an LLM:

- formatted physical file lines;
- function and method lines where the parser supports the language;
- cyclomatic complexity where deterministic tooling is available;
- import and package dependency direction;
- forbidden cross-layer and cross-context imports;
- dependency cycles;
- package or crate boundary violations;
- frontend layer or slice import direction;
- microfrontend direct cross-application imports;
- transport handlers containing domain behavior;
- shared data structures without declared ownership;
- missing versioned contracts or boundary tests;
- presence of changed-behavior tests when evidence can be established;
- Rust format and selected Clippy results;
- Tauri capability, permission, command, and scope inventory;
- explicit exception validity and expiry.

AI may explain findings, compare trade-offs, or propose a decomposition plan, but
the finding itself must retain deterministic evidence, scope, and rule
provenance. Folder names alone are not proof of an architecture.

## Existing-code migration

Intentloom itself already contains oversized implementation modules, especially
`packages/application/src/index.ts`. Enabling a strict repository-wide hard
failure immediately would create a large unsafe rewrite and contradict the
principle of evidence-driven incremental change.

Use a ratchet:

1. inventory current violations;
2. store a reviewed baseline with rule IDs and measured values;
3. reject new violations;
4. reject growth of existing violations;
5. require extraction or a reviewed exception when an oversized module is
   meaningfully changed;
6. remove baseline entries as modules are decomposed;
7. start decomposition with files that mix public contracts, orchestration,
   filesystem effects, protocol validation, and unrelated feature areas.

Architecture adoption should use a similar path:

1. detect current boundaries and uncertainty;
2. record the current architecture without pretending it is ideal;
3. select target scopes and compatible strategies;
4. define dependency and ownership rules;
5. add conformance in warning mode;
6. prevent new violations;
7. migrate one bounded area at a time;
8. require explicit review for topology or data-boundary changes.

The first Intentloom decomposition candidate is
`packages/application/src/index.ts`. Split it incrementally into cohesive
application operations and public contract modules while preserving the package's
current import contract through deliberate exports and compatibility tests.

## Delivery phases

### Phase 1: decisions and schemas

- accept an ADR for the layered engineering configuration model;
- accept an ADR for multi-axis, scoped architecture composition;
- define quality, strategy, scope, compatibility, technology-pack, discipline,
  exception, finding, and effective-policy schemas;
- define configuration location and migration from current schema version 1;
- define precedence, inheritance, and conflict semantics;
- threat-model external packs and documentation sources.

### Phase 2: canonical resolver

- add first-party quality presets;
- add initial technology, architecture, and discipline catalogs;
- implement deterministic inheritance, scope, override, conflict, and
  compatibility resolution;
- add golden fixtures for balanced, strict, legacy, custom, and mixed-architecture
  projects.

### Phase 3: read-only detection and conformance

- inventory current repository quality and architecture violations;
- implement the baseline and ratchet model;
- detect applications, packages, deployables, and likely domains without
  executing project code;
- add deterministic size, dependency, scope, exception, Rust, Tauri, and
  integration-boundary checks;
- produce machine-readable findings with evidence and remediation.

### Phase 4: CLI and generated guidance

- add read-only quality and architecture `show`, `check`, `validate`, `explain`,
  and `diff` operations;
- add reviewed initialization and scoped configuration planning;
- generate effective, path-scoped agent guidance without vendor-specific meaning
  in the canonical catalog.

### Phase 5: MCP and daemon

- expose accepted read-only operations through versioned daemon and MCP
  contracts;
- prove CLI, daemon, and MCP result equivalence;
- resolve task-specific discipline perspectives without granting capabilities.

### Phase 6: Desktop and TUI

- add quality selection, Architecture Map, discipline views, findings,
  exceptions, and migration progress;
- preserve preview, approval, and transactional application boundaries.

### Phase 7: optional assisted remediation

- add bounded decomposition, architecture migration, and test-plan proposals;
- keep edits behind prepared-plan identity, current-state revalidation, explicit
  approval, transaction safety, and rollback;
- do not add autonomous refactoring, repository splitting, service creation,
  deployment, merging, release, or publishing.

## Acceptance criteria

The increment is complete when:

- one user-owned, versioned configuration resolves deterministically;
- quality, architecture, technology, and discipline choices remain separate but
  compose into one effective policy;
- architecture choices are scoped rather than forced globally;
- conflicts, constraints, and required architecture decisions are explicit;
- a task can activate multiple discipline perspectives without duplicating the
  architecture source of truth;
- the same effective result is visible through CLI, daemon, MCP, Desktop, TUI,
  and generated instructions;
- supported adapters generate equivalent guidance from the same canonical rules;
- new and changed files are checked against code budgets;
- existing debt uses a non-growing baseline and can be reduced incrementally;
- architecture findings are evidence-based and scope-aware;
- exceptions are explicit, reviewable, scoped, and expiring or trigger-based;
- security and mutation boundaries cannot be disabled by a profile, strategy,
  pack, or role;
- all write paths remain previewed, validated, approved, transactional, and
  reversible.

## Non-goals

This increment does not:

- claim that one architecture is correct for every project;
- put every design principle, architecture, framework, and role into one flat
  selector;
- recommend microservices or microfrontends from repository size alone;
- treat folder names as proof of architecture;
- equate a developer role with authorization;
- require interfaces, repositories, services, or classes for their own sake;
- enforce code-coverage percentages as a substitute for useful tests;
- rewrite all existing large files or project boundaries at once;
- use an LLM as the source of truth for measurable findings;
- silently connect to documentation MCP servers;
- allow arbitrary shell, filesystem, network, or project mutation;
- make Desktop, CLI, MCP, daemon, TUI, or agents separate policy engines.
