# Engineering Workspace Desktop, CLI, and TUI UX

## Status

Product UX specification for the Project Design and Development Workspace.

This document defines how shared Intentloom capabilities should appear through
Desktop and command-line surfaces. It does not authorize new domain behavior or
filesystem mutation. Every screen and command must consume shared application
and protocol contracts.

The UX is designed to work first for an individual developer and later compose
with the existing Enterprise Team Workspace, Responsibility and Approval Graph,
Inbox, team queue, and provider-verified review flows. Enterprise-only controls
must not appear as working capabilities before their contracts and runtime are
implemented.

## UX goals

The user should be able to understand five questions at any moment:

1. Which project or proposed project am I working with?
2. Which engineering perspective am I currently using?
3. What does Intentloom know, and how does it know it?
4. What decision or action is being proposed next?
5. Will that action change anything, and exactly what requires approval?

The interface should avoid forcing users to learn internal architecture terms
before they can start.

## First-run onboarding and engineering perspective

Before the first project workflow, Desktop may ask for a primary engineering
perspective. This selection is useful in local single-user mode and remains
compatible with future organization role mapping.

Candidate choices:

```text
Frontend Engineer
Backend Engineer
Full-stack / Product Engineer
Mobile Engineer
Desktop Engineer
QA / SDET
Platform / DevOps / SRE
Security Engineer
Data / ML Engineer
Engineering Manager
Tech Lead / Staff / Principal Engineer
Product Manager
Designer
Other / Custom
```

The selected perspective may influence:

- which Quality Pack concerns are emphasized first;
- which assessment modules are surfaced most prominently;
- suggested starter compositions and questions;
- workspace filters and default views;
- explanation vocabulary;
- relevant specialized-pack candidates.

It must not:

- grant filesystem, provider, network, merge, deploy, release, or publication
  permissions;
- silently activate organization responsibility mappings;
- make a user a required reviewer or approver;
- weaken canonical project rules;
- hide cross-functional findings that still affect the selected project.

A role/title is presentation and discipline context. Authorization and effective
responsibility come from explicit capability grants, provider policy, organization
configuration, and reviewed responsibility mappings.

Desktop should allow the perspective to be changed later from the user/workspace
settings without rewriting project intent.

## Home and project entry

Desktop starts with two primary project actions:

```text
[ Create New Project ]
[ Open Existing Project ]
```

Recent projects may appear below these actions, but a recent-project entry must
still resolve and confirm the current canonical root before project operations.

A local personal header may show:

```text
Vitalii
Frontend Engineer
Local workspace
```

The title is a selected perspective unless an organization context supplies a
verified mapped title. The UI must distinguish local preference from verified
organization responsibility.

The CLI offers equivalent explicit entry points through command families rather
than a different domain model.

## Desktop information architecture

### Local / individual mode

Recommended top-level navigation after a project is selected:

```text
Overview
Workspace
Foundation
Architecture
Plans & Tasks
Quality
Assessments
Diff & Review
Timeline
Memory
Extensions
Settings
```

### Organization-capable mode

When the future enterprise capability is actually available for the selected
organization, additional areas may appear:

```text
My Work
Team Queue
Work Graph
Responsibilities
Route Preview
Project Flow
Audit & Evidence
Organization Settings
```

These areas extend the local workspace. They do not replace project design,
quality, assessment, or development views.

The navigation must be capability-driven. Do not ship permanently disabled
enterprise menu items merely to advertise roadmap concepts.

### Recommended Desktop shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Intentloom     Project: Kas Query       Frontend Engineer     Local │
├────────────────┬─────────────────────────────────────────────────────┤
│ Overview       │                                                     │
│ Workspace      │   Current project / selected surface                │
│ Foundation     │                                                     │
│ Architecture   │   evidence, plans, conversation, graph,             │
│ Plans & Tasks  │   assessment or review content                      │
│ Quality        │                                                     │
│ Assessments    │                                                     │
│ Diff & Review  │                                                     │
│ Timeline       │                                                     │
│ Memory         │                                                     │
│ Extensions     │                                                     │
│ Settings       │                                                     │
└────────────────┴─────────────────────────────────────────────────────┘
```

When enterprise context is available, the shell may add a `Team` group without
changing the project/application-operation boundary.

## Create New Project flow

### Desktop

Recommended progression:

```text
New Project
  -> Idea
  -> Foundation
  -> Alternatives
  -> Blueprint
  -> Scaffold Preview
  -> Approval
  -> Create
  -> Verify
  -> Workspace
```

### Idea

The first screen asks the user to describe the problem or product in normal
language. It should not lead with framework selection.

Show:

- current idea;
- project location candidate;
- selected engineering perspective;
- provider/model state when Neutron is used;
- offline/network state;
- session save/resume state.

The selected engineering perspective may alter the order or phrasing of
questions, but the project Foundation remains project truth rather than a
personal profile.

### Foundation

Use progressive sections rather than one long questionnaire:

```text
Problem & outcome
Users & workflows
Domain & information
Constraints
Quality
Future changes
Risks
Readiness
```

Each question may expose:

- why it matters;
- which decisions it affects;
- whether it is required;
- current answer;
- assumption or uncertainty state.

Desktop should show Foundation progress but must not imply that progress is a
quality score.

For team-created projects, a future organization-aware Foundation may also
record expected disciplines, ownership boundaries, review classes, and team
assumptions. These are project/organization artifacts, not permissions inferred
from the person running the wizard.

### Alternatives

Present material alternatives side by side when practical:

- minimal;
- recommended;
- extensible, only when justified.

Compare concrete trade-offs such as:

- complexity;
- dependency surface;
- public API impact;
- migration cost;
- operational cost;
- reversibility;
- compatibility with selected future-change scenarios.

Do not use unexplained numeric architecture scores.

### Blueprint

Blueprint review should combine a readable summary with structured editing.
Candidate tabs:

```text
Overview
Architecture
Packages / Apps
Quality
Security & Privacy
Testing
Release & Compatibility
Team / Disciplines (when applicable)
Decisions
Open Questions
```

The optional Team / Disciplines section may describe required engineering
concerns or future ownership scopes. It must not silently create real users,
provider teams, or permissions.

Every visual architecture view requires a list/tree alternative.

### Scaffold Preview

Before any write, show:

- exact target root;
- every path to create or modify;
- project-owned versus Intentloom-managed classification;
- proposed dependencies;
- proposed scripts;
- requested capabilities;
- verification steps;
- excluded follow-up actions;
- plan identity, freshness, and expiry.

Dependency installation, Git initialization, provider writes, publication, and
release must appear as separate future actions, not hidden scaffold steps.

## Open Existing Project flow

### Desktop

Recommended progression:

```text
Open Project
  -> Confirm Root
  -> Overview
  -> Scan / Inspect
  -> Architecture
  -> Quality
  -> Assessments
  -> Findings
  -> Technical Debt
  -> Recommendations
  -> Target State
  -> Plan Review
```

### Project Overview

Show only verified or explicitly unknown state:

- project root;
- detected profile;
- Intentloom adoption state;
- supported adapters;
- detected specialized-pack candidates;
- last inspection freshness;
- graph availability;
- quality and assessment availability;
- current Foundation/Blueprint state if any;
- selected personal engineering perspective;
- organization/team context only when explicitly connected and verified.

Unknown values display `Not evaluated`, `Unavailable`, or an equivalent explicit
state rather than `Healthy`.

### Scan and analysis action

The primary action should make scope and side effects clear.

Candidate choices:

```text
Quick scan
Standard assessment
Deep assessment
Custom scope
```

Before execution, show whether the selected profile may use:

- existing repository evidence;
- local Git evidence;
- graph providers;
- checker execution;
- external provider evidence;
- AI interpretation.

Read-only execution remains visibly read-only.

### Detected technology and packs

Detected frameworks, runtimes, engineering disciplines, and specialized packs
are candidates, not silent activation.

Show:

- detected item;
- evidence path or reason;
- confidence/ambiguity where supported;
- compatibility state;
- confirmation requirement.

### Architecture

Candidate views:

- project/package graph;
- dependency directions;
- cycles and boundary findings;
- declared versus observed architecture;
- affected-scope exploration.

Every finding must lead to supporting evidence rather than only explanatory
prose.

### Quality and Assessments

Quality shows canonical pack/checker/conformance state. Assessments compose that
state into project-level findings and recommendations.

A selected engineering perspective may provide a convenience filter such as
`Relevant to Frontend`, but it must never erase project-wide findings.

Do not merge all diagnostics into one undifferentiated error list.

Finding detail should include:

- source finding/reference;
- severity;
- confidence;
- evidence quality;
- priority when available;
- affected scope;
- evidence references;
- rule/policy source;
- impact;
- recommendation options;
- remediation complexity;
- provenance and freshness.

### Technical Debt and Target State

Technical Debt is a projection, not a universal score.

The user should be able to explore:

- categories;
- dependency order;
- blockers;
- accepted debt;
- deferred work;
- remediation complexity;
- target-state alternatives.

For architecture changes, offer explicit paths such as:

```text
Keep current design
Local improvement
Incremental evolution
Migration plan
Update Foundation
```

### Adoption and remediation

Existing-project adoption and remediation remain separate concepts.

`Adopt Intentloom` configures Intentloom metadata and safe generated guidance.
It must not imply that architectural recommendations are automatically applied.

`Prepare remediation` creates a reviewable plan. It must not mutate project code
until the separate approval and transaction gates are satisfied.

## Development Workspace UX

After creation or opening, the project workspace should support repeated feature
work.

### Workspace conversation

The conversation area should keep the current mode visible:

```text
Discuss
Inspect
Plan
Review
Apply
```

`Apply` appears only when the required capability exists and the separate
security gate is satisfied.

The user should also see:

- selected project;
- selected engineering perspective;
- provider/model when applicable;
- effort profile;
- network state;
- permission/capability scope;
- current task/plan;
- stale-state warnings.

### Feature request flow

A feature request should progress through:

```text
Request
-> Clarify
-> Impact
-> Alternatives
-> Plan
-> Execute when allowed
-> Verify
-> Diff Review
-> Evidence
```

Architecture impact should be visible before execution when meaningful.

For organization-connected projects, future impact analysis may additionally
show affected responsibilities and anticipated review classes, for example:

```text
Affected scopes
  apps/web/checkout
  packages/payments-contract

Engineering concerns
  frontend
  backend contract
  accessibility

Future route preview
  frontend technical review
  payments contract review
  QA validation
```

Route preview remains separate from actual review requests and provider writes.

## Future Enterprise Team Workspace composition

The enterprise capability is already specified separately by the Responsibility
and Approval Graph and Enterprise Team Workflow roadmap. This UX reserves a
clean composition point without moving enterprise authorization into the local
Desktop client.

### My Work

Future `My Work` shows actions routed to the current verified subject, such as:

```text
Review requested       PR #421
QA validation          TASK-183
Architecture consult   ADR-044
Policy exception       CASE-019
```

Each item must explain:

- what changed;
- project and affected scope;
- requested action;
- why this user/team was selected;
- verified and missing evidence;
- provider/source state;
- whether the action is local-only or external.

### Team Queue

Future `Team Queue` emphasizes workflow state rather than individual activity
volume:

```text
3 reviews waiting
2 QA validations
1 unresolved owner
1 blocked cross-team dependency
```

It must not show productivity rankings, commit leaderboards, or developer scores.

### Work Graph

Future Work Graph connects distinct cases:

```text
Product Brief
     ↓
Architecture Decision
     ↓
Implementation Task
     ↓
Code Change / Pull Request
     ↓
CI + QA + Design + Security evidence
     ↓
Provider Approval
     ↓
Merge
     ↓
Release / Deployment
```

The original provider remains authoritative for provider-owned review, merge,
release, and deployment state.

### Responsibility Map

Future Responsibility Map may display:

- team and subject;
- scope;
- responsibility type;
- engineering discipline;
- source and trust state;
- delegate and expiry;
- conflicts and unresolved slots.

Human title and effective responsibility must be shown separately.

## Command-line model

The stable `intentloom` command remains the machine-readable and expert
interface. Interactive command UX may be added without changing canonical
operation semantics.

### Existing project commands already available

Examples include:

```bash
intentloom inspect --root PATH --json
intentloom doctor --root PATH --json
intentloom adopt --root PATH --dry-run --json
intentloom diff --root PATH
intentloom timeline --root PATH --json
intentloom conformance ...
intentloom workspace ...
intentloom neutron ...
```

Exact current command availability remains defined by the CLI reference and
release state, not by this future-looking UX document.

### Candidate personal perspective commands

The exact naming requires contract review. A future local profile surface may
support concepts such as:

```bash
intentloom profile show --effective --json
intentloom profile perspective set frontend
intentloom profile perspective set backend
intentloom profile perspective set fullstack
```

This selection is presentation/discipline context only. It must not grant
organization responsibility or execution capability.

If existing `profile` contracts already represent a different agent concept, a
new namespace or explicit field must be chosen rather than overloading the
current command ambiguously.

### Candidate new-project command families

```bash
intentloom inception start --root PATH --idea-file idea.md --json
intentloom inception status SESSION_ID --json
intentloom inception questions SESSION_ID --json

intentloom foundation status SESSION_ID --json
intentloom foundation alternatives SESSION_ID --json
intentloom foundation approve --plan PLAN_ID --json

intentloom blueprint show --session SESSION_ID --json
intentloom blueprint compare minimal recommended --json
intentloom blueprint validate --file blueprint.yaml --json
intentloom blueprint approve --plan PLAN_ID --json

intentloom scaffold prepare --blueprint blueprint.yaml --json
intentloom scaffold diff --plan PLAN_ID
intentloom scaffold apply --plan PLAN_ID --json
intentloom scaffold verify --root PATH --json
```

These commands are candidates until their contracts and implementation are
merged. Help output must not advertise unimplemented commands as current.

### Candidate development commands

```bash
intentloom feature create ...
intentloom impact analyze ...
intentloom implementation plan ...
```

Naming requires compatibility review before becoming public CLI contract.
Existing `plan`, `proposal`, `workspace`, `task`, and Neutron vocabulary must be
checked first to avoid overlapping commands.

### Future enterprise command families

These remain future capability candidates and are not part of the first local
Engineering Workspace increment:

```bash
intentloom org inspect --json
intentloom org responsibilities show --effective --json
intentloom work case show CASE_ID --json
intentloom work graph CASE_ID --json
intentloom route preview CASE_ID --json
intentloom route explain ACTION_ID --json
intentloom inbox list --json
intentloom team queue --team TEAM_ID --json
```

Provider writes such as requesting reviewers or sending notifications require
separate prepare/preview/approve/revalidate/apply contracts.

## Interactive CLI and TUI

A guided terminal experience should provide the same decision state as Desktop
without requiring graphics.

### First run

```text
Intentloom

Engineering perspective
> Frontend Engineer
  Backend Engineer
  Full-stack / Product Engineer
  QA / SDET
  Platform / DevOps / SRE
  Other

This changes relevance and presentation, not permissions.
```

### Start screen

```text
Intentloom
Perspective: Frontend Engineer
Mode: Local

1. Create new project
2. Open existing project
3. Recent projects
4. Workspace
5. Settings / diagnostics
```

When a future verified organization context exists, the TUI may additionally
expose `My Work` and `Team Queue` from the same enterprise application results.

### Project TUI navigation

Candidate navigation:

```text
[Overview] [Workspace] [Foundation] [Architecture]
[Plans] [Quality] [Assessments] [Diff] [Timeline] [Memory]
```

For an existing project, a concise assessment summary may look like:

```text
Project: checkout-web
Perspective: Frontend Engineer
Assessment: standard, read-only

Architecture     4 findings
Testing          7 findings
Maintainability 12 findings
Accessibility    3 findings
Performance      insufficient evidence

> Open findings
  View architecture
  View recommendations
  Prepare remediation plan
```

Keyboard-first requirements:

- explicit selection and cancellation;
- non-color status indicators;
- readable tables and lists;
- large-result paging/filtering;
- accessible diff presentation;
- no loss of assumptions, findings, approvals, or errors compared with Desktop.

The TUI must consume structured operations and never scrape ordinary CLI text.

## Client state model

Every long-running client flow should handle at least:

- idle;
- loading/running;
- success;
- empty;
- stale;
- cancelled;
- timed out;
- disconnected;
- unsupported capability;
- invalid project root;
- validation failure;
- permission denied;
- approval required;
- plan expired;
- internal failure with safe diagnostics.

A UI must distinguish a cancelled operation from a hidden still-running mutation.

## Capability-driven UI rules

Every significant surface should resolve one of these states:

```text
available-now
available-read-only
available-with-approval
configured-but-unavailable
future-not-implemented
unsupported-for-project
```

Only implemented states become normal interactive controls. Roadmap-only
capabilities may be documented or shown in development builds, but they must not
look like operational product actions in release builds.

The Desktop, CLI help, and TUI should derive availability from shared capability
information rather than independent hardcoded assumptions whenever possible.

## Parallel client implementation

Desktop and CLI/TUI work may begin against frozen fixtures before a runtime PR is
merged.

Rules:

1. Fixtures use the exact proposed versioned contract.
2. Mock state includes failure, stale, unsupported, and cancellation cases, not
   only happy paths.
3. Client code contains no fallback domain logic.
4. Integration replaces fixture transport, not view semantics.
5. Contract parity tests compare the same canonical result across surfaces.
6. Role/perspective fixtures distinguish personal presentation context from
   organization responsibility and authorization.
7. Enterprise navigation fixtures remain separate from the initial local
   workspace acceptance fixture.

## Initial Desktop release slice

The first workspace-oriented increment after the existing read-only Desktop
baseline should prioritize coherence over breadth.

### Personal setup

```text
Select engineering perspective
-> Local workspace
```

This is optional personalization and can be skipped or changed later.

### New project

```text
Create New
-> Inception
-> Foundation
-> Blueprint review
```

Initially this may remain read-only with respect to the target project until the
scaffold transaction gate is implemented.

### Existing project

```text
Open Existing
-> Inspect
-> Quality / Assessment overview
-> Findings
-> Recommendation / target-state review
```

Use already implemented assessment, quality, graph, and specialized-pack
capabilities before inventing new analysis logic.

### Explicitly deferred from the first slice

```text
Organization setup
My Work
Team Queue
Responsibility Map
External review requests
Slack / Teams / email notifications
Provider-side merge / release / deployment actions
```

The local UX and contracts should leave composition points for these capabilities
without making them dependencies of the first workspace release.

## UX acceptance criteria

- A first-time user can distinguish creating from opening a project immediately.
- A user can select or skip an engineering perspective and understands that it
  does not grant permissions.
- The user always knows whether an operation is read-only or mutating.
- Existing-project analysis exposes evidence and uncertainty.
- New-project design progresses from problem to architecture rather than stack
  selection first.
- Desktop and CLI/TUI represent the same approvals, findings, assumptions,
  capability state, and personal perspective semantics.
- Organization title, responsibility, authorization, and selected personal
  perspective are never silently conflated.
- Enterprise surfaces compose with the same project/workspace model but remain
  hidden until their capability exists.
- Unimplemented roadmap concepts never masquerade as working buttons or commands.
- All visual graphs have accessible non-visual equivalents.
- A client can be implemented in parallel from frozen contracts without
  duplicating Core behavior.