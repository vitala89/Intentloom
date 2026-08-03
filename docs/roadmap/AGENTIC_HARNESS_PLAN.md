# Agentic Evaluation and Execution Harness Development Plan

## Status

Phases H0-H4 are complete. The bounded H5 core is implemented with
provider-neutral capability negotiation, normalized adapter results, and an
offline fake consumer. Real network, local-model, and CLI-agent integrations
remain conditional on an approved consumer and adapter-specific review. The
bounded H6 deterministic voting core is implemented; H7-H9 remain planned.

## Outcome

Provide Intentloom and adopted projects with a reproducible, provider-neutral
way to evaluate agent procedures, enforce deterministic safety gates, execute
only through declared isolation boundaries, compare defenses, and inspect or
replay bounded evidence.

## Delivery principles

- evidence and deterministic gates before model judgment;
- control plane separate from providers, executors, storage, and product UIs;
- smallest useful interface with capabilities declared explicitly;
- read-only local execution before isolated mutation;
- one scenario and scorer contract for baseline and protected runs;
- state outside the target repository by default;
- uncertainty, disagreement, and unsupported states are first-class;
- no dependency, package, or abstraction without a demonstrated consumer;
- no mutation expansion before harness evidence passes its gate.

## Phase H0: Decision, threat boundary, and provenance

Status: complete in this documentation increment.

Scope:

- record current Intentloom controls and missing harness behavior;
- accept ADR-0052 and this implementation sequence;
- extend the project threat model;
- pin reference-project revisions, licenses, retained patterns, and caveats;
- distinguish policy evaluation from process isolation;
- preserve the active read-only evidence milestone.

Exit gate:

- no harness runtime or third-party dependency is introduced;
- architecture, specification, roadmap, threat model, and source ledger agree;
- no implemented capability is overstated.

## Phase H1: Versioned protocol contracts

Status: complete.

Scope:

- specify scenario, request, manifest, event, artifact, score, scorecard,
  verdict, comparison, checkpoint, and capability schemas;
- define stable errors, terminal states, redaction, budgets, retention, and
  compatibility rules;
- define the deep-module application interface and at least two consumers;
- choose package boundaries without expanding current oversized entry files;
- add schema validation, migrations, fixtures, and contract tests.

Exit gate:

- schemas reject authority confusion, unknown capabilities, invalid digests,
  unbounded artifacts, and incompatible comparisons;
- application and first two adapters share the same typed contract;
- no provider or executor name appears in canonical decision logic.

## Phase H2: Deterministic runner and comparison

Status: complete.

Scope:

- implement scenario resolution and deterministic stage orchestration;
- add fake agent, fake executor, in-memory state, and deterministic clock/ID
  adapters;
- add preflight/postflight gates, budgets, cancellation, and stable failures;
- produce normalized manifests, scorecards, and baseline comparisons;
- convert selected C4 curated-skill dogfooding cases into scenarios.

Exit gate:

- unchanged deterministic inputs produce equivalent normalized results;
- mandatory gate failure cannot be overridden;
- timeout, cancellation, crash, budget, and incomplete evidence cases are tested;
- baseline/protected comparison rejects incompatible inputs.

## Phase H3: Execution isolation adapters

Status: complete for the local-readonly, container abstraction, and fake
adapters. Product surfaces still expose no generic host shell.

Scope:

- implement `local-readonly` with fixed operations and accurate non-sandbox
  labeling;
- implement a container adapter with explicit mounts, environment allowlist,
  default-denied network, resource budgets, output limits, timeout, and cleanup;
- add executor capability negotiation and a shared conformance suite;
- test path, symlink, process, environment, network, and cleanup failures;
- evaluate WASM separately without promising adoption.

Exit gate:

- scenarios cannot exceed declared executor guarantees;
- target and host secrets are not inherited implicitly;
- fresh-environment and cleanup evidence passes on supported platforms;
- no generic host shell is exposed through Intentloom product surfaces.

## Phase H4: Durable state, tracing, resume, and replay

Status: complete for the provider-neutral state-store contract, in-memory
adapter, checkpoint resume validation, and deterministic event replay. A local
SQLite adapter remains a later real-consumer increment.

Scope:

- add an append-only event journal and content-addressed artifacts;
- add a local SQLite state adapter outside target repositories;
- implement checkpoint, resume, inspect, export, retention, and purge;
- bind state to project, scenario, policy, adapter, approval, and manifest digest;
- add replay that simulates or refuses effects instead of repeating them.

Exit gate:

- stale, expired, cross-project, and digest-mismatched resume attempts fail;
- secrets and prohibited paths do not enter durable artifacts;
- interrupted runs recover deterministically at supported checkpoints;
- project/full purge removes owned state and reports retained exceptions.

## Phase H5: Agent and model adapters

Status: bounded core complete. Versioned agent capability and request/result
contracts, fail-closed negotiation, result normalization, explicit data policy,
and the offline fake adapter are implemented. OpenAI-compatible, Anthropic,
local-model, and CLI-agent adapters remain deferred until each has an approved
real consumer and adapter-specific credential, network, and retention review.

Scope:

- implement capability negotiation independent of provider names;
- add an OpenAI-compatible adapter, Anthropic adapter, local-model adapter, and
  CLI-agent adapters only when each has a real test consumer;
- normalize structured output, tool calls, cancellation, errors, and usage;
- require explicit credentials, network policy, retention disclosure, and
  redaction for remote providers;
- add provider conformance fixtures and unsupported-capability behavior.

Exit gate:

- provider substitution does not change canonical permissions or scoring rules;
- missing capabilities never broaden permissions or silently downgrade safety;
- credentials remain outside project state and results;
- offline deterministic runs remain fully functional.

## Phase H6: Adversarial validation and deterministic voting

Status: bounded deterministic aggregation core complete. Role execution through
model/provider adapters remains deferred.

Scope:

- add risk-triggered generator, critic, and judge roles;
- define independent-context policies and leakage tests;
- define versioned quorum, weight, abstention, tie, disagreement, and failure
  aggregation;
- add risk, token, time, and monetary budgets;
- expose false consensus and insufficient coverage in scorecards.

Exit gate:

- identical blind spots and colluding outputs do not produce an unqualified pass;
- deterministic failures remain authoritative;
- disagreement and abstention are preserved end to end;
- multi-agent execution can be disabled without breaking core evaluation.

## Phase H7: Security and product scenario corpus

Status: bounded seed implemented on `feat/harness-scenario-corpus`; expansion
and certification remain planned.

Scope:

- version positive, negative, regression, and adversarial scenarios;
- cover skill routing, external skills, MCP, memory, provider evidence,
  approvals, paths, secrets, tools, networks, state, and reviewer consensus;
- add baseline/protected comparisons for each security control;
- record coverage, unsupported cases, and platform limitations;
- keep synthetic benchmarks distinct from production certification.

The initial seed is executable through the existing deterministic runner. It
validates case identity, safe fixture references, expected terminal statuses,
and diagnostic expectations while keeping raw execution events out of the
corpus evaluation result. It is not a public command or provider benchmark.

Exit gate:

- every active security invariant has scenario coverage or a recorded gap;
- corpus changes are reviewed like protocol changes;
- results identify scenario and scorer versions and remain reproducible;
- no score is marketed as universal safety or compliance certification.

## Phase H8: Product surfaces and parity

Status: planned; depends on stable H2/H4 operations.

Scope:

- expose provisional `harness run`, `compare`, `score`, `inspect`, and `replay`
  commands through the canonical application operation;
- add read-only daemon/MCP/TUI/Desktop/Neutron views as real consumers justify;
- keep effectful execution behind explicit CLI or reviewed product approvals;
- add structured output, documentation, accessibility, and equivalence tests.

Exit gate:

- all surfaces return equivalent manifests, scores, verdicts, and errors;
- MCP has no generic shell, generic write, or implicit execution tool;
- UI and CLI distinguish planned, running, canceled, failed, inconclusive, and
  completed states;
- replay and inspect remain read-only.

## Phase H9: Adoption gate and production hardening

Status: future; depends on H1-H8 evidence.

Scope:

- make relevant harness suites mandatory before managed external skill
  activation and broader agent/MCP mutation;
- add cross-platform CI matrices, performance budgets, migration and retention
  drills, and adapter compatibility policy;
- document supported guarantees and unsupported environments;
- complete independent security and release-readiness reviews.

Exit gate:

- managed imports cannot activate without required scorecards and approval;
- mutation candidates fail closed on missing or stale harness evidence;
- rollback, purge, migration, and disaster-recovery exercises pass;
- release claims match measured guarantees.

## Dependencies and ordering

```text
read-only evidence hardening
  -> curated skills C4 scenario design
     -> H1 contracts
        -> H2 deterministic runner
           -> H3 isolation
           -> H4 state/replay
              -> H5 adapters
                 -> H6 adversarial validation
        -> H7 corpus grows continuously
           -> H8 product surfaces
              -> H9 adoption and mutation gate
```

H3 and H4 may proceed in parallel only after H2 contracts are stable. H8 can
begin with read-only inspect/score views, but no effectful surface precedes H3
and explicit approval design.

## Explicitly deferred

- hosted control plane or mandatory cloud state;
- marketplace or background scenario/adapter updates;
- hidden telemetry or training-data contribution;
- automatic dependency, container-runtime, hook, or provider installation;
- unrestricted subagents or generic shell tools;
- autonomous commits, pushes, merges, releases, publishing, or deployment;
- fine-tuning or reinforcement learning before benchmark evidence;
- WASM support without a feasibility and compatibility result.

## Next first action

Define the smallest read-only H8 `inspect`/`replay` consumer and its CLI/MCP
parity boundary. Keep public command exposure, provider execution, and mutation
separate until their own consumer and approval gates are satisfied.
