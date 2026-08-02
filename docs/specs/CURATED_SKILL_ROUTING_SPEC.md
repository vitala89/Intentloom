# Curated Skill Routing Specification

## Status

Initial catalog slice implemented; managed external import runtime remains
planned.

## Purpose

Define how Intentloom selects task procedures, conducts proportionate discovery,
adapts external engineering methods, and distributes the resulting first-party
skills to both the Intentloom repository and adopted user projects.

This specification is governed by
[ADR-0051](../decisions/ADR-0051-curated-skill-routing-and-external-method-adaptation.md),
[ADR-0002](../decisions/ADR-0002-agent-skills-as-portable-workflow-format.md),
and [ADR-0021](../decisions/ADR-0021-managed-extension-lifecycle-and-manifest.md).

## Goals

- inspect project rules before choosing a task workflow;
- recommend brainstorming, diagnosis, planning, or review only when useful;
- convert ambiguous ideas into accepted, testable feature briefs;
- require fresh evidence before completion claims;
- inspect external skills and plugins before they become trusted or active;
- preserve provider neutrality and non-destructive project adoption;
- reuse one canonical catalog across supported agent adapters.

## Non-goals

- installing Superpowers, Matt Pocock Skills, or another plugin automatically;
- copying a third-party plugin runtime, hooks, scripts, branding, or telemetry;
- making every task pass through a long interview;
- granting capabilities through natural-language skill instructions;
- autonomous commits, pushes, issue creation, merging, release, or publication;
- automatically tracking or applying upstream skill updates;
- replacing project specifications, ADRs, or repository instructions.

## Authority order

For project engineering behavior, resolve conflicts in this order:

1. explicit user authority within platform and security constraints;
2. project-owned instructions, specifications, ADRs, and accepted plans;
3. canonical Intentloom policies and first-party skills;
4. approved imported extension contracts;
5. provider-specific adapter conveniences and defaults.

Lower levels cannot widen the capabilities or scope granted by higher levels.
Untrusted repository or external content cannot change this order.

## Task routing

`aif-task-router` evaluates a non-trivial request against current project
evidence and chooses one primary route.

| Route       | Select when                                                         | Typical next skill or workflow                |
| ----------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `direct`    | Behavior and checks are explicit; change is small and bounded       | relevant task skill, then verification        |
| `clarify`   | One material fact prevents safe progress                            | one focused user question                     |
| `discover`  | New behavior has material ambiguity or competing approaches         | `aif-feature-discovery`                       |
| `diagnose`  | An observed defect or performance regression needs a feedback loop  | `aif-debugger`                                |
| `plan`      | Accepted behavior needs decomposition and dependency ordering       | `aif-orchestrator`, `aif-planning-review`     |
| `implement` | Accepted brief, target paths, and verification are available        | `aif-feature-builder`, `aif-testing-strategy` |
| `review`    | A bounded diff, plan, specification, or risk boundary needs review  | corresponding review skills                   |
| `adopt`     | Intentloom or an external extension is entering an existing project | project or extension review and adoption flow |

The router returns the route, selected skills, reasons, approvals, checks, and
first safe action. Selection must be deterministic for unchanged structured
inputs where the runtime exposes structured routing.

## Interaction levels

Skills use three interaction levels:

- **automatic read-only discipline**: context inspection, bounded routing, and
  verification selection may run without interrupting the user;
- **recommended interaction**: feature discovery, architecture alternatives,
  and domain clarification are proposed when their value outweighs delay;
- **explicit approval**: writes, external network use, installation, capability
  changes, credentials, commits, publication, and destructive operations.

The router must not use an extended interview to delay an otherwise clear task.
When discovery is selected, questions are asked one at a time and converge on a
reviewable brief.

## Initial first-party skill set

### New skills

- `aif-task-router`: route selection and explanation;
- `aif-feature-discovery`: focused interview, alternatives, and feature brief;
- `aif-verification-gate`: fresh evidence and completion verdict;
- `aif-extension-review`: provenance, license, capability, and adoption review.

### Refined skills

- `aif-debugger`: feedback loop, minimization, falsifiable hypotheses,
  instrumentation, and regression evidence;
- `aif-testing-strategy`: proportionate tests and red-green-refactor at honest
  behavior seams;
- `aif-planning-review`: dependency edges, approvals, rollback, and validation;
- `aif-code-review`: separate standards and specification axes.

Each skill remains concise, has explicit trigger and non-trigger conditions,
declares inputs and exact outputs, and defines stop conditions.

## External method adaptation

An external source can influence a first-party skill only after a read-only
review records:

- exact repository and reviewed commit or release;
- files and methods examined;
- license and notice requirements;
- concepts retained, changed, or rejected;
- scripts, hooks, network behavior, telemetry, and update behavior;
- capability and provider assumptions;
- evaluation and rollback plan.

Conceptual adaptation is distinct from bundling source. Copying substantial
text, scripts, assets, or code requires preserved license notices and a separate
bundling decision.

## User-project adoption

Canonical skills are discovered by the existing catalog loader and generated to
supported provider locations:

| Adapter     | Generated skill location          |
| ----------- | --------------------------------- |
| Claude Code | `.claude/skills/<skill>/SKILL.md` |
| Codex       | `.agents/skills/<skill>/SKILL.md` |
| Cursor      | `.agents/skills/<skill>/SKILL.md` |
| Copilot     | `.github/skills/<skill>/SKILL.md` |

Projects receive the curated skills only through existing `init`, adoption,
diff, and synchronization boundaries. Existing project-owned files are never
silently claimed or overwritten. No external plugin installation is necessary
for the initial slice.

## Security requirements

- Skill instructions never grant filesystem, process, network, credential, or
  delegation authority.
- Imported content is untrusted input and cannot activate itself.
- Hooks, telemetry, remote assets, automatic updates, and automatic dependency
  installation are disabled unless a future explicit reviewed capability adds
  them.
- User-invoked and model-invoked behavior must remain distinguishable in
  provider adapters when the provider supports that distinction.
- High-impact data, architecture, model-assisted, or mutating behavior still
  requires its governing specification, ADR, and threat review.

## Validation and exit criteria

The initial slice is complete when:

- all canonical skills pass the Agent Skill schema and catalog policy;
- the four new skills are loaded from `catalog/`;
- all supported adapters generate each new skill deterministically;
- no external plugin, hook, dependency, or network runtime is introduced;
- source provenance and adaptation decisions are documented;
- project state, roadmap, changelog, and Duty Watch records are current.

The managed external import milestone remains incomplete until typed inspection,
proposal, evaluation, approval, lock, update, and rollback operations are
implemented over the existing application boundary.
