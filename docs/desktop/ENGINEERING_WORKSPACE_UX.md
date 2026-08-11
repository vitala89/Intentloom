# Engineering Workspace Desktop, CLI, and TUI UX

## Status

Product UX specification for the Project Design and Development Workspace.

This document defines how shared Intentloom capabilities should appear through
Desktop and command-line surfaces. It does not authorize new domain behavior or
filesystem mutation. Every screen and command must consume shared application
and protocol contracts.

## UX goals

The user should be able to understand four questions at any moment:

1. Which project or proposed project am I working with?
2. What does Intentloom know, and how does it know it?
3. What decision or action is being proposed next?
4. Will that action change anything, and exactly what requires approval?

The interface should avoid forcing users to learn internal architecture terms
before they can start.

## Home and project entry

Desktop starts with two primary actions:

```text
[ Create New Project ]
[ Open Existing Project ]
```

Recent projects may appear below these actions, but a recent-project entry must
still resolve and confirm the current canonical root before project operations.

The CLI offers equivalent explicit entry points through command families rather
than a different domain model.

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
- provider/model state when Neutron is used;
- offline/network state;
- session save/resume state.

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
Decisions
Open Questions
```

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
- current Foundation/Blueprint state if any.

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

Candidate top-level Desktop navigation:

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

The exact visible subset may depend on project capability state.

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

## Interactive CLI and TUI

A guided terminal experience should provide the same decision state as Desktop
without requiring graphics.

Candidate start:

```text
Intentloom

1. Create new project
2. Open existing project
3. Recent projects
4. Settings / diagnostics
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

## Initial Desktop release slice

The first workspace-oriented increment after the existing read-only Desktop
baseline should prioritize coherence over breadth:

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

Use already implemented assessment, quality, and graph capabilities before
inventing new analysis logic.

## UX acceptance criteria

- A first-time user can distinguish creating from opening a project immediately.
- The user always knows whether an operation is read-only or mutating.
- Existing-project analysis exposes evidence and uncertainty.
- New-project design progresses from problem to architecture rather than stack
  selection first.
- Desktop and CLI/TUI represent the same approvals, findings, assumptions, and
  capability state.
- Unimplemented roadmap concepts never masquerade as working buttons or commands.
- All visual graphs have accessible non-visual equivalents.
- A client can be implemented in parallel from frozen contracts without
  duplicating Core behavior.