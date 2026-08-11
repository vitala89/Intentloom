# Project Design and Development Workspace

## Status

Candidate product direction that composes existing Intentloom capabilities into
one end-to-end engineering workspace for both new and existing projects.

This document does not create new runtime authority by itself. It connects the
existing Project Inception, Foundation Workshop, project adoption, Engineering
Assessments, Agent Workspace, Neutron, Quality Packs, Checker Adapters, graph
providers, memory, planning, approval, transaction, CLI, TUI, daemon, MCP, and
Desktop directions.

## Product goal

Intentloom should support two equal project entry points:

```text
Create New Project                         Open Existing Project
        |                                          |
        v                                          v
Idea / problem statement                    Select explicit root
        |                                          |
Foundation Workshop                         Bounded inspection
        |                                          |
Blueprint alternatives                      Adoption readiness
        |                                          |
Approved blueprint                          Evidence + graph + quality
        |                                          |
Scaffold preview                            Engineering assessment
        |                                          |
Approved creation                           Findings + recommendations
        |                                          |
        +------------------+-----------------------+
                           |
                           v
                  Development Workspace
                           |
                           v
Feature intent -> impact -> plan -> implementation -> verify -> review
                           |
                           v
                  evidence + project memory
```

The Desktop, CLI, TUI, MCP, and future clients are presentation and orchestration
surfaces over shared application operations. They must not implement separate
project truth, architecture rules, assessment logic, ownership logic, or
filesystem mutation behavior.

## Entry mode A: Create New Project

The new-project path reuses Project Inception and the Foundation Workshop:

```text
idea
-> adaptive discovery
-> users, workflows, domain, constraints, quality, risks
-> future change scenarios
-> foundation alternatives
-> foundation readiness
-> project blueprint
-> exact scaffold plan
-> explicit approval
-> transactional project creation
-> deterministic verification
```

The first useful implementation should remain intentionally narrow and prove one
strong TypeScript library or workspace scenario before broader templates.

### Desktop experience

Candidate navigation:

1. `New Project`.
2. Describe the idea in normal language.
3. Review Neutron's current understanding.
4. Complete Foundation questions.
5. Compare minimal, recommended, and extensible alternatives.
6. Review Architecture Map, quality requirements, risks, and deferred decisions.
7. Approve a structured blueprint.
8. Preview every scaffolded path and proposed dependency.
9. Approve project creation.
10. Review verification evidence and enter the Development Workspace.

### CLI and TUI parity

Stable automation remains under the `intentloom` executable. Candidate command
families are:

```bash
intentloom inception ...
intentloom foundation ...
intentloom blueprint ...
intentloom scaffold ...
```

Interactive CLI/TUI flows may provide a guided experience, but they consume the
same contracts and never become a second implementation.

## Entry mode B: Open Existing Project

Opening an existing repository is not equivalent to new-project scaffolding.
The user selects one explicit project root and Intentloom first remains
read-only.

Canonical flow:

```text
select project root
-> inspect
-> adoption readiness
-> profile and specialized-pack detection
-> current architecture and dependency evidence
-> quality / checker / conformance evidence
-> engineering assessment
-> findings and technical debt projection
-> target-state alternatives
-> preserve / evolve / migrate recommendation
-> optional adoption proposal
-> optional reviewed remediation plan
-> explicit approval before any mutation
```

### Existing-project guarantees

- Existing files remain project-owned unless valid ownership metadata proves
  otherwise.
- Inspection and assessment do not silently mutate the repository.
- Repository structure is evidence, not proof of intended architecture.
- Missing or ambiguous evidence remains visible.
- AI interpretation cannot override deterministic evidence or policy.
- Recommendations do not imply permission to apply changes.
- Adoption and remediation use prepared plans, exact diffs, current-state
  revalidation, explicit approval, transaction, rollback, and verification.

### Retrofit Foundation

For an existing project, Foundation Workshop operates in retrofit mode:

```text
observed project
-> infer candidate current foundation from evidence
-> identify explicit and implicit decisions
-> ask only unresolved questions
-> compare declared and observed architecture
-> identify drift and accepted coupling
-> compare preserve / evolve / migrate options
-> approve target foundation when useful
-> produce bounded migration plans
```

This allows Intentloom to improve an existing project without imposing one
universal architecture style.

### Desktop experience

Candidate `Open Project` experience:

1. Select and confirm the canonical root.
2. Show a read-only project overview.
3. Run or refresh Inspect and Doctor.
4. Offer bounded analysis scopes: quick, standard, deep, or custom.
5. Show detected technology and specialized engineering packs for confirmation.
6. Build or load the architecture graph.
7. Show quality, conformance, checker, assessment, and evidence state.
8. Present findings with evidence links, severity, confidence, and priority.
9. Present technical debt and target-state alternatives.
10. Allow the user to choose `Keep`, `Improve`, `Adopt Intentloom`, or
    `Prepare Migration` paths.
11. Preview exact remediation or adoption plans before any write.

## Development Workspace

After a project exists or is opened, Intentloom should support an iterative
engineering loop rather than ending at project creation or assessment.

```text
feature request
-> intent clarification
-> affected-scope resolution
-> foundation and architecture impact
-> context assembly
-> implementation alternatives
-> reviewed task / implementation plan
-> delegated execution
-> deterministic tests and quality checks
-> diff and policy review
-> approved apply where applicable
-> evidence capture
-> project memory and next task
```

### Feature intent

A feature request should be recorded as structured intent including:

- requested outcome;
- affected users and workflows;
- acceptance criteria;
- constraints and non-goals;
- likely affected scopes;
- architecture and public-contract impact;
- quality, security, accessibility, performance, and migration concerns;
- assumptions and unresolved questions.

A prompt alone is not an implementation plan.

### Architecture impact

Before implementation, Intentloom should compare the request with:

- approved Foundation and Blueprint;
- observed Architecture Graph;
- Quality Packs and specialized packs;
- public APIs and package boundaries;
- current findings and accepted debt;
- project memory and previous decisions.

If the request conflicts with approved intent, Intentloom should explain the
conflict and offer local change, migration, or foundation-update options rather
than silently bypassing the architecture.

### Implementation and review

Neutron or another configured coding agent may help execute an approved task,
but deterministic Intentloom systems remain authoritative for:

- capability and project-root boundaries;
- ownership;
- plan identity and digest;
- architecture and quality rules;
- checker execution boundaries;
- exact affected paths;
- approval state;
- transactional mutation and rollback;
- verification evidence.

The agent may reason, propose, edit within granted scope, and explain failures.
It cannot approve its own plan or silently widen permissions.

## Shared surface model

The required dependency direction is:

```text
Desktop / CLI / TUI / MCP / Agent clients
                  |
                  v
          versioned protocol contracts
                  |
                  v
          application operations
                  |
                  v
inception / foundation / assessment / planning / quality / graph
                  |
                  v
 validator / ownership / security / transaction / evidence
```

Presentation clients may compose operations into workflows. They must not parse
human CLI output to obtain domain state.

## Parallel development model

Intentloom should explicitly support multiple implementation agents working in
parallel without creating competing logic.

### Core and contracts agent

Owns:

- protocol and schema contracts;
- validators;
- application operations;
- deterministic resolvers;
- daemon RPC methods where required;
- fixtures and cross-surface contract tests.

Must not own:

- Desktop layout or styling;
- CLI/TUI human rendering beyond required adapter contracts;
- duplicated client-specific business rules.

### Desktop and CLI/TUI agent

Owns:

- Desktop viewmodels and accessible UI;
- CLI/TUI interaction and rendering;
- command routing and client state;
- loading, empty, stale, error, cancellation, and review UX;
- client parity tests.

Must not own:

- independent repository scanners;
- independent assessment, architecture, ownership, or transaction engines;
- parsing human CLI output inside Desktop;
- direct project mutation outside approved application operations.

### Integration rule

Parallel agents may start once a contract slice is frozen. If UI work must begin
before runtime completion, it uses versioned fixtures or mock protocol responses
matching the proposed contract. Runtime and UI branches then converge through
contract tests rather than ad-hoc integration.

## Canonical capability matrix

Every major workflow should track availability across:

```text
Core / Application / Protocol / Daemon / CLI / Desktop / TUI / MCP / Neutron
```

The matrix distinguishes:

- `implemented`;
- `partial`;
- `planned`;
- `not applicable`;
- `blocked`.

A UI must not imply that a capability exists merely because a concept document
or design frame exists.

Where practical, matrix claims should be derived from or checked against
capability discovery and contract tests to reduce documentation drift.

## Workspace information architecture

Candidate Desktop top-level areas:

```text
Projects
Workspace
Foundation
Architecture
Plans & Tasks
Quality
Assessments
Technical Debt
Diff & Review
Timeline
Memory
Extensions
Settings
```

The UI may progressively disclose these areas. A new user should not be forced
to understand all Intentloom terminology before starting.

## Safety and authority boundaries

- Every operation is scoped to an explicit project or proposed-project root.
- Read-only flows remain read-only.
- New-project creation targets an absent or explicitly approved empty root in
  the first slice.
- Existing non-empty projects use inspection, adoption, assessment, and reviewed
  remediation rather than new-project scaffolding.
- Network, process execution, package installation, Git writes, provider writes,
  publication, and deployment remain separately permissioned capabilities.
- Model output, external MCP output, or a prior broad approval never counts as
  approval for a new mutation.
- Stale plans are rejected after relevant project, intent, permission, or digest
  changes.
- Exact diff, provenance, tests, policy impact, rollback behavior, and requested
  capabilities remain visible before mutation.

## Initial product increments

The recommended sequence is:

1. Reconcile current capability state and freeze workspace terminology.
2. Implement read-only inception and foundation contracts.
3. Add one Neutron discovery loop.
4. Implement Blueprint resolver and approval.
5. Expose CLI JSON and daemon protocol parity.
6. Build Desktop/TUI Foundation and Blueprint UX in parallel from frozen
   contracts.
7. Implement deterministic scaffold planning for one TypeScript library starter.
8. Add transactional empty-root creation and verification.
9. Add TypeScript library-workspace starter and dogfood a real framework project.
10. Strengthen existing-project assessment and target-state workflow in Desktop.
11. Add feature-intent and architecture-impact planning.
12. Add bounded coding-agent execution and verification only after its separate
    permission and threat-model gates.

## Success criteria

The direction is useful when:

- a user can create a new project from an idea without knowing architecture
  terminology;
- a user can open an existing project, inspect and assess it without mutation,
  and receive evidence-backed improvement options;
- Desktop and CLI/TUI show equivalent canonical state;
- one project can move from Foundation to Blueprint to scaffold and then into
  feature development;
- one existing project can move from inspection to findings to a reviewed
  remediation plan;
- multiple implementation agents can develop Core and client surfaces in
  parallel without duplicating domain logic;
- every mutating step remains explicit, reviewable, revalidated, and
  transactional.

## Non-goals

This direction does not initially create:

- a replacement for an IDE or general terminal;
- unrestricted autonomous repository mutation;
- one-click production generation from a prompt;
- automatic dependency installation or remote repository creation;
- a universal architecture style;
- hidden cloud execution or mandatory accounts;
- employee scoring or developer surveillance;
- a second implementation of existing assessment, quality, graph, memory, or
  transaction systems.