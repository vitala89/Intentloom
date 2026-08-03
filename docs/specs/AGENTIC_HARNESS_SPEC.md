# Agentic Evaluation and Execution Harness Specification

## Status

Architecture accepted by
[ADR-0052](../decisions/ADR-0052-agentic-evaluation-and-execution-harness.md).
Phases H1-H4 are implemented on `main`: versioned contracts, the deterministic
runner and comparison engine, isolation adapters, and in-memory durable-state,
resume, and replay contracts. The bounded H5 increment adds provider-neutral
agent capabilities, fail-closed negotiation, normalized results, and an offline
fake adapter. The bounded H6 increment adds risk-triggered deterministic voting
contracts and aggregation for advisory generator, critic, and judge reviews.
Real provider adapters, model-backed roles, and public harness commands remain
unimplemented.

## Purpose

Define the provider-neutral contracts and safety boundaries for evaluating,
executing, comparing, inspecting, and replaying agentic workflows in Intentloom
and adopted user projects.

## Goals

- run the same versioned scenario against deterministic, agent, or model-backed
  adapters;
- apply hard pre- and post-execution gates outside model control;
- isolate dangerous execution behind explicit executor capabilities;
- capture bounded, redacted, replayable events and artifacts;
- compare baseline and protected configurations using the same scorers;
- expose disagreement, abstention, unsupported capability, and uncertainty;
- reuse one application operation across product surfaces;
- supply evidence gates for curated skills, managed extensions, and future
  mutating agent capabilities.

## Non-goals

- certifying that an agent or model is universally safe;
- replacing project tests, code review, threat modeling, or human approval;
- giving natural-language output authority over policy or mutation;
- installing a third-party harness, model SDK, container runtime, or plugin;
- executing an unrestricted shell on the developer host;
- treating policy checks as an OS sandbox;
- making multi-agent voting mandatory for low-risk deterministic work;
- sending source, prompts, traces, or scores to a hosted service implicitly.

## Architecture boundary

```text
product adapters
  -> canonical harness application operation
     -> scenario and policy control plane
        -> agent/model adapter
        -> executor adapter
        -> state and artifact store
        -> deterministic and advisory scorers
     -> manifest, scorecard, verdict, comparison, replay result
```

The control plane accepts dependencies and returns typed results. Providers,
executors, databases, UIs, and network clients stay outside its domain logic.

## Normative contracts

The contract phase must define versioned representations for:

- `HarnessScenario`: identity, objective, fixtures, capability requirements,
  policies, budgets, scorers, secrets policy, and expected outcomes;
- `HarnessRunRequest`: scenario reference, target identity, adapter selections,
  policy overrides, and explicit approvals;
- `HarnessRunManifest`: resolved versions, capabilities, digests, environment,
  budgets, timestamps, artifacts, and terminal status;
- `HarnessEvent`: ordered event identity, category, source, trust, parent, time,
  redacted payload reference, and digest;
- `HarnessArtifact`: media type, producer, trust, sensitivity, retention,
  location reference, size, and digest;
- `HarnessScore`: scorer identity/version, metric, value, evidence references,
  confidence or coverage, and deterministic/advisory class;
- `HarnessScorecard`: aggregate scores, gate results, disagreements, coverage,
  costs, and terminal verdict;
- `HarnessVerdict`: `passed`, `failed`, `needs-review`, `inconclusive`, or
  `unsupported`, with stable reasons;
- `HarnessComparison`: baseline and candidate identities, comparable metrics,
  regressions, improvements, and non-comparable reasons;
- `ExecutorCapabilities`: filesystem, process, environment, network, resource,
  snapshot, and cleanup guarantees;
- `AgentCapabilities`: tool calling, structured output, context, streaming,
  deterministic settings, cancellation, and usage reporting;
- `HarnessCheckpoint`: resumable state, completed stages, referenced artifacts,
  expiry, and manifest digest.

Natural-language model output is always data or advisory evidence. It cannot be
an approval, policy change, capability grant, or effect by itself.

## Event categories

Every event uses one primary category so authority is inspectable:

| Category      | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `observation` | A bounded fact collected from an environment or tool            |
| `data`        | Untrusted content supplied to a step                            |
| `advisory`    | A model, agent, heuristic, or reviewer recommendation           |
| `decision`    | A deterministic control-plane decision                          |
| `approval`    | Explicit human approval bound to scope, digest, and expiry      |
| `effect`      | An attempted or completed external side effect                  |
| `diagnostic`  | A warning, failure, coverage gap, or unsupported classification |

An adapter must not relabel advisory content as a decision, approval, or effect.

## Run lifecycle

1. Resolve and validate the scenario, target, policies, versions, and digests.
2. Negotiate agent and executor capabilities without broadening the request.
3. Apply deterministic preflight gates and resource budgets.
4. Provision a fresh execution environment or fail with explicit evidence.
5. Execute bounded steps while recording ordered events and usage.
6. Collect and redact artifacts before they enter durable state.
7. Apply deterministic post-processing and scorers.
8. Optionally run advisory model graders or adversarial roles.
9. Aggregate scores deterministically and emit a verdict.
10. Compare with an eligible baseline when requested.
11. Clean the execution environment and retain or purge state by policy.

Cancellation, timeout, budget exhaustion, capability mismatch, adapter crash,
cleanup failure, and missing evidence are terminal states with stable reasons.
They must never be silently converted into `passed`.

## Deterministic gates and scoring

- Schema validation, path canonicalization, symlink checks, secret scanning,
  AST or parser checks, linters, type checks, tests, policy checks, budgets, and
  artifact digests run outside model control where available.
- Each score identifies whether it is deterministic or advisory.
- A failed mandatory deterministic gate forces `failed` or `needs-review`
  according to scenario policy; advisory consensus cannot override it.
- Missing required evidence produces `inconclusive`; missing required
  capability produces `unsupported`.
- Baseline comparison requires compatible scenario, fixture, scorer, and policy
  versions. Incompatible runs are reported, not coerced into a metric.
- Repeated deterministic-adapter runs must produce stable normalized manifests
  and scores after volatile fields are removed.

## Execution isolation

The initial executor ladder is:

1. `local-readonly`: bounded fixed operations with no project writes, generic
   shell, implicit network, or sandbox claim;
2. `container`: fresh filesystem/process namespace with explicit mounts,
   environment allowlist, default-denied network, resource limits, timeout,
   output bounds, and verified cleanup;
3. remote or specialized executors only after an adapter-specific threat,
   credential, retention, and deletion review;
4. WASM only after a feasibility study proves the required tool and filesystem
   semantics.

An executor declares guarantees. The control plane rejects a scenario whose
requirements exceed them. Host credentials are not inherited by default.

## State, trace, and replay

- Durable state lives outside the target repository unless an explicit export
  is requested.
- The first durable adapter is planned as local SQLite plus a content-addressed
  artifact directory; the domain contract does not depend on SQLite.
- Events are append-only and ordered within a run. Corrections append evidence
  instead of rewriting history.
- Checkpoints bind to the scenario, target, policy, adapter, and manifest digest.
- Resume revalidates current capabilities, target identity, approvals, and
  expiry before continuing.
- Replay never implies that external side effects are repeated. Effect replay
  requires an explicit simulation or a new approved run.
- Retention has bounded defaults and supports inspect, export, targeted purge,
  project purge, and full local purge.
- Secrets and disallowed paths are redacted before persistence and model use.

## Multi-agent and adversarial validation

Multi-agent execution is enabled only when scenario risk or evaluation utility
justifies its cost.

- Generator, critic, and judge roles have explicit capabilities and budgets.
- Critics should not receive hidden generator reasoning or another critic's
  conclusion unless the scenario is testing that interaction.
- At least one deterministic scorer remains independent of model consensus for
  security-sensitive scenarios.
- Aggregation is versioned and deterministic: quorum, weights, abstentions,
  ties, disagreement, and failure rules are data, not improvised prompts.
- Provider diversity is optional evidence, not proof of independence.
- Consensus with insufficient coverage returns `inconclusive` or
  `needs-review`.

## Initial scenario corpus

The first corpus must include positive and negative cases for:

- curated-skill routing false positives, false negatives, and excessive
  questioning;
- prompt injection in repository, provider, MCP, skill, and tool content;
- malicious MCP results and capability-confusion attempts;
- path traversal, symlink escape, and cross-project reads or writes;
- secret, identity, environment, and artifact exfiltration;
- memory poisoning, stale checkpoints, and cross-project state mixing;
- stale, changed, replayed, or scope-mismatched approvals;
- unauthorized command, network, publish, merge, release, or deployment effects;
- capability negotiation failure and unsafe fallback;
- critic collusion, identical blind spots, false consensus, and abstention;
- timeout, cancellation, budget exhaustion, crash, and cleanup failure.

## Product surfaces

Planned commands are:

```text
intentloom harness run
intentloom harness compare
intentloom harness score
intentloom harness inspect
intentloom harness replay
```

Command names are provisional until the protocol and CLI design gates are
accepted. MCP and UI surfaces begin read-only and expose the same application
results. No generic command-execution MCP tool is introduced.

## Exit criteria for runtime activation

- versioned schemas and migration rules are accepted;
- deterministic fake-adapter runs are reproducible across supported platforms;
- mandatory gates cannot be bypassed by agent or scorer output;
- path, secret, authority, budget, cancellation, and cleanup negative tests pass;
- local-readonly and container guarantees are described accurately and tested;
- resume and replay reject stale or mismatched state;
- baseline comparisons expose incompatibility and missing evidence;
- provider and executor adapters pass shared conformance suites;
- retention, export, and purge behavior is verified;
- CLI and application results are equivalent;
- no existing mutating surface is widened implicitly.

## Compatibility

The specification is additive and currently non-executable. Existing security
policy, approval, memory, skill, and provider-evidence contracts remain
authoritative until a later version explicitly composes them into harness
operations.
