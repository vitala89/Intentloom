# Controlled Agent Learning and Procedural Memory

## Purpose

Intentloom should support a controlled learning loop for engineering agents without allowing model output, conversation history, or repeated behavior to become trusted project guidance automatically.

The goal is to preserve useful engineering experience across sessions while keeping canonical intent, accepted memory, executable skills, and generated observations separate, reviewable, versioned, and reversible.

This direction is informed by public agent systems such as Nous Research Hermes Agent, especially its bounded active memory, searchable session history, progressive skill loading, provider-neutral agent core, interruptible execution, and experience-derived skills. Intentloom adopts the architectural lessons, not Hermes product scope, implementation, branding, or conversation-first architecture.

## Product position

Hermes Agent is a ready-to-use general personal agent organized around a conversation and tool loop. Intentloom remains an engineering-intent framework and task/workflow runtime organized around explicit project scope, structured plans, evidence, validation, approval, and transactional application.

```text
Hermes-style product flow
conversation → model → tool → response

Intentloom flow
intent → task → plan → bounded execution → validation → evidence → reviewed learning
```

Controlled learning must therefore remain downstream of a completed or explicitly reviewed task. It cannot bypass policy, capability, approval, ownership, conformance, or transaction boundaries.

## Knowledge classes

Intentloom should distinguish at least four operational knowledge classes:

1. **Active context**: a small, budgeted set of project facts, current task state, permissions, unresolved critical findings, and selected policies that may be injected into a model session.
2. **Retrievable memory**: project-scoped decisions, prior task outcomes, validation results, errors, evidence, and session summaries that are searched on demand.
3. **Procedural memory**: versioned skills and workflows describing how to perform repeatable engineering procedures.
4. **Canonical intent and artifacts**: policies, schemas, ADRs, accepted plans, source-controlled documentation, and verified evidence that remain authoritative independently of model memory.

A transcript, model summary, external MCP result, or agent observation never becomes procedural or canonical knowledge merely because it was repeated or useful once.

## Progressive skill loading

Intentloom should avoid loading every skill into every model context. Skill discovery should use progressive disclosure:

### Level 1: catalog metadata

Always-small discovery data:

- stable identifier;
- name;
- short description;
- tags and supported roles;
- compatibility range;
- trust state;
- capability summary.

### Level 2: execution contract

Loaded when a skill is a plausible candidate:

- input and output schemas;
- required tools and capabilities;
- supported project profiles;
- permission requirements;
- expected validations;
- known limitations;
- version and provenance.

### Level 3: full procedure

Loaded only after explicit selection:

- complete instructions;
- examples;
- scripts or referenced artifacts;
- recovery behavior;
- evaluation fixtures;
- migration notes.

Selection should be explainable. The agent or planner should record why a skill was considered, selected, rejected, or unavailable.

## Experience-derived skill proposals

After a completed task, Intentloom may detect a repeatable procedure and prepare a skill proposal. It must not silently create or activate a trusted skill.

Candidate triggers include:

- a complex task required multiple validated steps;
- the same workaround or procedure appeared in more than one accepted task;
- the user corrected an incomplete or unsafe procedure;
- a previously selected skill required a stable improvement;
- a task produced a reusable sequence with clear inputs, outputs, permissions, and validation.

The lifecycle should be:

```text
completed task
→ pattern detection
→ draft skill proposal
→ provenance and risk review
→ evaluation
→ explicit approval
→ versioned active skill
→ later revision, deprecation, or rollback
```

Proposed lifecycle states:

- `proposed`;
- `under-review`;
- `approved`;
- `active`;
- `deprecated`;
- `archived`;
- `rejected`.

Every proposal should include:

- source task and evidence identifiers;
- author type, such as user, agent, imported, or bundled;
- confidence and uncertainty;
- exact requested capabilities;
- affected project profiles;
- expected validation commands or typed checks;
- privacy and data-handling impact;
- license and notice metadata for derived or imported material;
- compatibility range;
- rollback and supersession links.

## Skill evaluation and self-improvement boundaries

An existing skill may produce a proposed revision after use, but the currently active version remains unchanged until review succeeds.

A revision should be evaluated against:

- deterministic fixtures where possible;
- representative project profiles;
- expected tool selection;
- capability minimization;
- context and token cost;
- validation success;
- regression behavior;
- security and prompt-injection resistance;
- compatibility with the current Intentloom schema and runtime.

The system should preserve the previous version and support explicit rollback. Repeated local workarounds must not accumulate into an increasingly environment-specific skill without compatibility evidence.

## Searchable task and session history

Intentloom should support project-scoped retrieval across structured records rather than relying on raw chat replay.

Initial deterministic retrieval may use SQLite FTS5 or an equivalent local full-text index over bounded summaries and metadata. Vector or semantic ranking remains optional derived state.

Searchable records may include:

- tasks and plans;
- accepted decisions;
- changed paths;
- validation and conformance results;
- errors and recovery actions;
- commits, reviews, releases, and evidence cases;
- skills used and skill proposals produced;
- session summaries and unresolved work.

A result should return structured references, not only matching prose:

```json
{
  "taskId": "task_98",
  "summary": "Resolved stale context cache invalidation",
  "paths": ["packages/context-engine/src/cache.ts"],
  "decisionIds": ["ADR-014"],
  "skillIds": ["context-cache-diagnostics@1.1.0"],
  "validation": "passed",
  "trust": "verified-evidence"
}
```

Every result must remain bound to the selected project, trust class, retention policy, and context budget.

## Agent profiles and isolation

A future runtime may support named local profiles with separate provider settings, credentials, skills, memory, sessions, policies, and budgets. Profiles must not weaken the selected-project boundary.

Examples may include:

- personal;
- work;
- open-source;
- restricted-ci;
- project-maintainer.

Cross-profile or cross-project retrieval is denied by default and requires an explicit operation-scoped grant.

## Interrupt, pause, and redirect

Long-running agent work should be interruptible without discarding structured state.

Future task operations may include:

- pause a task at a safe boundary;
- cancel pending tool execution;
- redirect goals or constraints;
- recompute affected plan steps;
- resume from a validated checkpoint.

A redirect must invalidate stale prepared plans, permissions, context packs, or approvals when their identity or assumptions change.

## Runtime and surface boundaries

CLI, MCP, daemon, TUI, desktop, IDE adapters, and consumer applications should use the same application operations and records.

No surface may implement an independent memory or skill-learning authority. A desktop or chat interface may display and prepare proposals, but acceptance, activation, update, deprecation, and rollback must use typed operations with the same policy and transaction behavior.

## Security and privacy requirements

- no automatic learning from private repositories, prompts, or sessions without explicit project policy;
- no hidden upload, telemetry, model training contribution, or external embedding call;
- secrets and excluded paths must be removed before indexing or proposal generation;
- untrusted source text, issue content, external MCP results, and model output cannot grant capabilities or create accepted memory;
- skill scripts and executable plugins require a higher trust and review level than instruction-only skills;
- imported skills require source, version, integrity, license, notice, and capability review;
- every activation and update must be reversible and auditable;
- context and retrieval budgets must be deterministic;
- deletion, retention, export, and supersession behavior must be visible.

## Delivery sequence

1. Extend the memory schema with active, retrievable, procedural, and canonical knowledge classes.
2. Add deterministic task and session summary storage with project-scoped full-text retrieval.
3. Define progressive skill metadata and selection contracts.
4. Add read-only skill discovery with selection explanations and context-budget accounting.
5. Define skill proposal, review, evaluation, approval, activation, supersession, deprecation, and rollback schemas.
6. Generate proposals only from completed, evidence-backed tasks and keep them inactive by default.
7. Add evaluation fixtures and regression gates for proposed skill revisions.
8. Expose equivalent structured operations through CLI, MCP, daemon, TUI, desktop, and Neutron.
9. Add optional semantic ranking only after deterministic retrieval benchmarks and privacy review.
10. Consider profile isolation, parallel subagents, remote execution, and background scheduling only as separate later decisions.

## First milestone exit criteria

- unchanged project state produces deterministic skill discovery and history-search results;
- full skill instructions are loaded only after selection;
- every selected skill includes provenance, version, trust, capability, and selection explanation;
- a completed task may create an inactive proposal but cannot activate or modify a skill automatically;
- untrusted content cannot become accepted memory or active procedural knowledge without explicit approval;
- previous skill versions remain available for rollback;
- project and profile isolation tests prevent accidental cross-scope retrieval;
- cancellation or redirect leaves project files unchanged and invalidates stale approval state;
- retrieval and progressive loading demonstrate a measured context reduction on documented fixtures.

## Non-goals for the first milestone

- cloning Hermes Agent or another general personal assistant;
- conversation-first orchestration;
- unrestricted self-modifying prompts or skills;
- autonomous activation of learned procedures;
- loading all skills or all session history into every prompt;
- global memory shared across unrelated projects;
- autonomous commits, pull requests, merges, releases, deployments, or publication;
- mandatory vector databases, hosted memory, or one model provider;
- hidden background agents or scheduled mutation.