# Curated Skill Adaptation and Routing Plan

## Status

Phases C1-C3 implemented in the canonical catalog. Phases C4-C7 remain planned
and do not supersede the active read-only evidence hardening milestone.

## Outcome

Make Intentloom able to recommend and distribute proportionate engineering
procedures for its own development and for adopted user projects, while keeping
external skill and plugin ecosystems optional, pinned, inspectable, and unable
to override project authority.

## Delivery principles

- curate methods, do not depend on a third-party workflow owner;
- project context before task procedure;
- smallest useful route before ceremony;
- questions before speculative implementation;
- verification evidence before completion claims;
- instruction-only skills before executable plugins;
- read-only inspection before installation or update;
- explicit approval before capabilities or external side effects;
- one canonical catalog and generated provider derivatives;
- evaluation and rollback before activation.

## Phase C1: Source and architecture decision

Status: complete in this increment.

Scope:

- review Superpowers and Matt Pocock Skills as method sources;
- pin the reviewed repository commits;
- record licenses, retained concepts, rejected mechanics, and residual risks;
- accept the curated-first-party decision in ADR-0051;
- define the authority order and non-goals.

Exit gate:

- no external plugin is installed or made a runtime dependency;
- provenance is exact enough to reproduce the review;
- telemetry, hooks, automatic updates, commits, and broad delegation remain out
  of the canonical adaptation.

## Phase C2: Core routing and discovery skills

Status: complete in this increment.

Scope:

- add `aif-task-router`;
- add `aif-feature-discovery`;
- add `aif-verification-gate`;
- add `aif-extension-review`;
- add the canonical skill-routing policy;
- refine idea-to-feature and bug-fix workflows.

Exit gate:

- every skill declares trigger, non-trigger, inputs, outputs, and stop conditions;
- clear bounded tasks do not require extended discovery;
- ambiguous or high-risk feature work produces a reviewable brief before code;
- extension review cannot install or activate its subject;
- verification cannot claim success without fresh evidence.

## Phase C3: Existing skill refinement

Status: complete in this increment.

Scope:

- enrich debugging with a feedback-loop and hypothesis discipline;
- make red-green-refactor proportionate to the available test seam;
- review plans for dependency edges, rollback, approval, and evidence;
- keep standards and specification review axes separate.

Exit gate:

- refined skills remain provider-neutral and within catalog size budgets;
- diagnosis-only requests do not authorize fixes;
- code review remains read-only;
- testing guidance does not impose false or meaningless red phases.

## Phase C4: Adapter and adoption evidence

Status: complete for deterministic scenario fixtures and corpus seed.

Scope:

- dogfood generated curated skills in a minimal project, a TypeScript project,
  and a mature existing project;
- measure routing usefulness, false triggers, missed triggers, interview length,
  context cost, and task outcomes;
- express the three dogfooding cases as candidate `HarnessScenario` fixtures and
  retain scenario, adapter, policy, and scorer provenance;
- verify Claude, Codex, Cursor, and Copilot discovery behavior;
- document provider differences for user-only versus model-invoked skills;
- evaluate whether generated root guidance needs a versioned routing summary.

Exit gate:

- all four adapters expose the same canonical procedures;
- unchanged inputs produce stable generation and zero second-sync diff;
- project-owned guidance wins in conflict fixtures;
- no provider requires a hidden hook or user-level configuration change;
- false-positive discovery and router overhead are measured, not assumed.
- evidence can be replayed by the deterministic harness runner after Phase H2
  without changing the canonical skill behavior.

## Phase C5: Structured routing contract

Status: complete for versioned TaskRouteDecision protocol contract and application operation.

Scope:

- define a versioned `TaskRouteDecision` protocol schema;
- expose deterministic route candidates, selection reasons, interaction level,
  required approvals, and expected validations;
- reuse the operation across CLI, MCP, daemon, TUI, Desktop, and Neutron;
- persist only bounded project-scoped decision evidence when policy permits.

Exit gate:

- equivalent structured inputs produce equivalent route candidates;
- model interpretation is labeled and cannot alter deterministic permissions;
- route selection can be inspected, exported, and deleted;
- no client becomes an independent routing authority.
- routing evidence can be scored by H2 without model output changing
  deterministic permissions.

## Phase C6: Managed external skill import

Status: complete for normalization and safety proposal contract.

Scope:

- inspect a local or explicitly fetched external skill artifact;
- normalize source, version, digest, license, notices, capabilities, entry points,
  and provider extensions;
- prepare an inactive skill proposal through the existing controlled-learning
  lifecycle;
- evaluate prompt injection, tool selection, capability minimization, context
  cost, failure recovery, and compatibility;
- activate only after explicit approval and transactional lock update;
- support update comparison, deprecation, removal, and rollback.

Exit gate:

- unpinned `latest` content cannot become active;
- a capability, publisher, license, source, or integrity change blocks update
  until reviewed;
- instruction-only and executable extensions use distinct risk gates;
- rejection and removal preserve project-owned files;
- previous active versions remain recoverable.
- required security scenarios pass for the exact proposed source, digest,
  capabilities, and policy before activation.

## Phase C7: Optional provider plugin bridges

Status: future; no implementation authorization.

Scope:

- consider referencing an already installed provider plugin when it offers a
  capability unavailable through portable Agent Skills;
- declare the bridge as adapter-owned and optional;
- require user-visible network, update, hook, and telemetry settings;
- preserve the first-party catalog as the fallback.

Exit gate:

- the bridge has a real consumer and documented advantage over curated skills;
- disabling it leaves core task routing functional;
- no provider-specific plugin becomes required for Intentloom adoption;
- installation and update remain explicit managed-extension transactions.

## Evaluation matrix

Each curated or imported skill should be evaluated against:

- correct trigger and non-trigger selection;
- alignment with project specifications and ADRs;
- capability minimization and approval behavior;
- context cost and interaction burden;
- quality of acceptance criteria and test seams;
- failure recovery and stop conditions;
- prompt-injection and malicious-instruction resistance;
- compatibility across supported adapters;
- truthful verification and completion reporting.

## Explicitly deferred

- marketplace or remote registry discovery;
- background plugin update checks;
- automatic skill activation from repeated behavior;
- cross-project skill learning;
- hidden telemetry or training-data contribution;
- automatic issue creation, commits, pushes, merges, releases, or publication;
- unrestricted subagent execution or generic shell access.

## Next first action

Run Phase C4 dogfooding with the generated four-skill addition in the minimal
and TypeScript fixtures, then record false-trigger and interaction-cost evidence
as candidate harness scenarios before proposing a structured routing protocol.
The active read-only evidence hardening gate still completes first.
