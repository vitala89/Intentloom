# Neutron Runtime Roadmap

## Purpose

Neutron is the provider-neutral engineering-agent runtime behind Intentloom. It
is not currently presented as a foundation model, a hidden autonomous coding
service, or a replacement for the existing application, protocol, daemon, CLI,
MCP, transaction, memory, security, and evidence layers.

The runtime coordinates those existing layers into one visible and reviewable
agent execution flow:

```text
User or client
→ Neutron Runtime
→ model adapter
→ bounded context and skill selection
→ capability-scoped typed tools
→ Intentloom application operations
→ evidence, review, approval, and transaction boundaries
```

The first objective is to make the implemented Neutron foundations executable
through a real provider adapter and a read-only Desktop flow. Custom model
training remains downstream of runtime evidence and NeutronBench results.

## Verified starting inventory

The following foundations already exist in `main` and must be reused rather
than reimplemented inside a second agent core:

- project-scoped Agent Workspace conversations and Discuss, Inspect, Plan,
  Review, and approved transactional Apply operations;
- bounded project context, accepted persistent memory, deterministic retrieval,
  optional semantic ranking, retention, export, deletion, and redaction;
- progressive skill discovery at catalog, contract, and procedure levels;
- skill proposal, evaluation, approval, activation, deprecation, supersession,
  and rollback boundaries;
- task checkpoint, pause, cancellation, redirect, and resume operations;
- role-aware delegation and capability clamping;
- Neutron subagent task records and local workspace synchronization;
- authenticated local daemon and versioned protocol support for second clients;
- deterministic evidence, conformance, security, sandbox, and transaction
  operations.

These components form the platform foundation. They do not yet prove a complete
production model-execution loop, provider routing, concurrent subagent
scheduler, or benchmarked local model.

## Architectural invariants

Every Neutron increment must preserve the following rules:

1. Intentloom application operations remain the canonical domain boundary.
2. Desktop, TUI, CLI, MCP, IDE, and Neutron are adapters over shared typed
   operations, not independent implementations.
3. Model output, repeated success, external evidence, schedules, and subagent
   results never count as mutation approval.
4. No generic shell, unrestricted file access, hidden network access, implicit
   telemetry, or silent dependency installation is introduced.
5. Project root, session, role, capability, permission, provenance, and current
   state are explicit and revalidated.
6. Provider, model, version, network mode, data-handling mode, tools, skills,
   permissions, and affected files remain visible to the user.
7. Safety enforcement lives outside model weights and prompts.
8. Local and read-only behavior precedes remote or mutating behavior.
9. Benchmark evidence precedes fine-tuning, preference optimization,
   reinforcement learning, distillation, or foundation-model claims.

## Target runtime decomposition

### Neutron Runtime

Owns execution-session coordination, task state, model turns, tool routing,
subagent scheduling, checkpoints, cancellation, aggregation, and final result
construction. It must not duplicate project-domain logic already implemented in
`@intentloom/application`.

A dedicated package such as `packages/neutron-runtime` may be introduced only
when the runtime contract and at least one real consumer justify the boundary.
Until then, contracts may evolve through the existing protocol and application
packages.

### Model Adapter Boundary

Normalizes hosted and local model providers behind one versioned contract.
Required capabilities include:

- provider and model identity;
- capability discovery;
- streaming responses;
- structured tool calls;
- cancellation and timeouts;
- normalized errors;
- context and output limits;
- usage accounting;
- explicit network and data-handling disclosure;
- credential isolation outside project metadata.

### Context Engine

Builds bounded, provenance-preserving context from:

- canonical intent and policies;
- current project inspection;
- accepted project memory;
- selected skills and execution contracts;
- verified evidence;
- the current task and user-supplied information.

The engine must enforce context budgets, trust classification, secret filtering,
and source-level provenance. It must not send an unbounded repository dump to a
model.

### Tool Router

Exposes narrow typed tools rather than generic command execution. Every
invocation is checked against the selected root, session, role, capabilities,
permissions, input schema, output schema, timeout, cancellation state, result
limits, and audit requirements.

### Planner and Task Graph

Represents work as a structured dependency graph. Each node records at least:

- stable task identifier;
- parent and dependency identifiers;
- assigned role;
- required capabilities;
- expected output contract;
- lifecycle state;
- evidence and provenance;
- retry and cancellation policy;
- context, token, and execution budgets.

### Evaluator

Evaluates both the proposed result and the execution process. It checks context
selection, skill and tool choice, policy adherence, permission scope,
evidence-grounded claims, affected-file scope, tests, security findings,
rollback awareness, and regression status.

## Delivery stages

## N1. Runtime contracts

**Status:** implemented on `feat/neutron-n1-runtime-contracts`. Contracts,
validators, deterministic fixtures, and documentation only. No provider
execution, daemon RPC, Desktop model calls, or new package.

Define versioned schemas and validators for:

- runtime session and lifecycle states;
- model adapter capabilities and configuration;
- context bundle and source provenance;
- tool invocation and result envelopes;
- task graph and task-node state;
- subagent execution result;
- usage and budget records;
- progress, cancellation, timeout, and normalized errors.

Exit gate: contracts are deterministic, validated, root-bound, provider-neutral,
and reusable by daemon, Desktop, TUI, CLI, and tests without parsing human
output. Met by `prepareNeutronRuntimeContractSnapshot` and
`tests/neutron-runtime-contracts.test.ts` against
`tests/fixtures/neutron-runtime/contract-snapshot.v1.json`. N1 snapshots
require `networkMode: "offline"` and `mutationAllowed: false`.

## N2. First real model adapter

Implement one provider end to end before adding several providers. The selected
adapter must support one complete read-only loop:

```text
client
→ Neutron session
→ model request
→ typed tool request
→ Intentloom application operation
→ structured tool result
→ model response
```

The first adapter decision is [ADR-0055](../decisions/ADR-0055-neutron-n2-first-model-adapter.md):
Ollama on an explicit loopback URL. Implementation is
`OllamaModelAdapter` plus `runNeutronN2ReadOnlyLoop`. Desktop must not
call models in N2.

Exit gate: one explicitly configured provider can discuss and inspect one
selected project through bounded typed tools while all project files remain
byte-for-byte unchanged. Met by `tests/neutron-n2-ollama.test.ts` against a
fake loopback `/api/chat` and `inspectProject`.

## N3. Context assembly

**Maintainer brief:** [`NEUTRON_N3_CONTEXT_ASSEMBLY_BRIEF.md`](NEUTRON_N3_CONTEXT_ASSEMBLY_BRIEF.md)
(evidence baseline `a2a821a`, 2026-08-31). **Slice 1** (contract + validator
extension) and **Slice 2** (deterministic assembly core via
`assembleNeutronContext`) and **Slice 3** (memory + task + profile
integration) and **Slice 4** (N2 pre-turn hook feeding assembled context into
`runNeutronN2ReadOnlyLoop`) are implemented. **N3 runtime milestone is
complete** for application/test surfaces. Optional Slice 5 (CLI/daemon
exposure) requires separate authorization. **N4 Slice 1** (tool-router
foundation with one read-only `inspect` tool) and **N4 Slice 2** (read-only
catalog expansion behind the same router) are implemented. Mutation routing,
N5, Desktop model UI, and optional N3 Slice 5 remain unauthorized.

Combine bounded project context, accepted memory, progressive skill discovery,
canonical policy, current task data, and verified evidence into one budgeted
context bundle.

Required evidence includes:

- selected and rejected context sources;
- trust class and provenance for every included source;
- estimated and observed context usage;
- excluded secret-like paths;
- selected skill loading level and rationale.

Exit gate: deterministic fixtures prove that equivalent state produces stable
selection, secrets are excluded, budgets are enforced, and unrelated project
memory cannot cross project or profile boundaries.

## N4. Capability-scoped tool router

Add the runtime tool-routing boundary over existing application operations.
Initial tools remain read-only and may include project inspection, bounded
context, memory search, doctor, diff, timeline, conformance, and security
inspection where stable daemon contracts exist.

**Slice 1 (implemented):** foundation router with typed tool registration,
invocation validation, root/session/capability/permission checks,
timeout/cancellation/expiry gating, normalized auditable errors, and one
read-only `inspect` tool routed to existing `inspectProject`. Mutation tools
and generic shell remain deferred.

**Slice 2 (implemented):** expand the read-only catalog behind the same
`routeNeutronToolInvocation()` pipeline. Registered tools: `inspect`,
`doctor`, `memorySearch`, `timeline`, `conformance`, `securityAudit`,
`projectDiff`. Each tool is a registry definition/adapter over existing
application operations (`inspectProject`, `doctorProject`,
`searchPersistentMemory`, `timelineProject`,
`evaluateProjectEngineeringConformance`, `listSecurityFindings`,
`diffProject`). No mutation routing, no generic shell, no N5.

The N4 read-only tool-router exit gate is met: unsupported, over-scoped,
out-of-root, expired, cancelled, or schema-invalid requests fail closed and
produce normalized auditable errors. Capability, root/session, result bounds,
and fingerprint proofs cover the catalog.

**Next bounded slice:** mutation routing requires separate authorization; do
not start N5, Desktop model UI, optional N3 Slice 5, or P4l17.

## N5. Executable task graph and subagents

Extend the existing Neutron subagent records from persisted orchestration
foundation into a controlled execution scheduler with:

- dependency ordering;
- concurrency limits;
- execution leases or heartbeats;
- context and token budgets;
- bounded retries;
- cancellation propagation;
- parent-child provenance;
- deterministic result aggregation;
- stale task and workspace-state detection.

No subagent receives authority beyond its assigned role and capability grant.
Read-only roles remain unable to produce direct mutations.

Exit gate: deterministic multi-task fixtures prove dependency handling,
cancellation, timeout recovery, budget enforcement, provenance, and stable
aggregation without hidden background mutation.

## N6. Desktop Neutron Workspace

Integrate the runtime with the official Desktop application after the v0.6
read-only project slice and shared client contracts are stable.

The first Neutron Desktop flow is:

```text
Select project
→ start Neutron session
→ select provider and model
→ discuss requirement
→ inspect project
→ inspect used context and tools
→ generate a structured plan
→ review delegated tasks and evidence
```

The interface displays:

- selected project root;
- provider, model, and model version;
- network and data-handling state;
- active skills and loading levels;
- tools and granted capabilities;
- task graph and subagents;
- context and usage information;
- evidence and provenance;
- generated plans and artifacts.

The first Desktop milestone remains read-only. Approved Apply is a separate
threat-reviewed stage and must reuse the existing prepared-plan transaction
boundary.

Exit gate: a packaged Desktop client completes the read-only Neutron flow over
the authenticated daemon, handles disconnect and cancellation explicitly, and
closes without changing project bytes.

## N7. NeutronBench

Create a reproducible benchmark and fixture runner before model tuning.
NeutronBench records at least:

- provider and model identity;
- model and runtime version;
- prompt, skill, policy, and tool-set versions;
- project fixture and selected permissions;
- context and token budgets;
- result, safety, and efficiency metrics.

Initial benchmark categories:

- project inspection accuracy;
- architecture and policy adherence;
- context and skill selection;
- tool selection and structured invocation;
- evidence-grounded claims;
- safe planning and affected-file precision;
- test strategy and test success;
- conformance and security behavior;
- rollback awareness;
- prompt-injection resistance;
- project and profile isolation;
- stale-plan and stale-state rejection;
- long-horizon task completion;
- context, latency, and token efficiency.

Exit gate: benchmark runs are reproducible from versioned fixtures and can
compare providers or runtime changes without treating subjective model output as
an approval or release gate by itself.

## N8. Neutron Local

Add one explicit local-model adapter using a compatible existing open-weight
model and a supported local runtime. The adapter must use the same tools,
permissions, context engine, memory, task graph, evaluator, and NeutronBench as
hosted providers.

Model and runtime selection requires current license, attribution, hardware,
context-window, tool-calling, security, and distribution review.

Exit gate: one documented local configuration completes selected NeutronBench
categories and the Desktop read-only flow with transparent resource and quality
limitations.

## N9. Controlled optimization

Only after N1 through N8 provide reproducible evidence may the project consider:

- prompt and context-routing optimization;
- skill and tool-contract improvements;
- provider or model routing;
- supervised fine-tuning;
- LoRA or QLoRA;
- preference optimization;
- distillation;
- bounded reinforcement learning.

Every experiment requires licensed and provenance-complete data, explicit user
consent for any private contribution, isolated evaluation, regression and safety
checks, and a measurable NeutronBench improvement over the unchanged base model.

Training a foundation model from scratch is not part of this roadmap. Such work
requires a separate business case, dataset-governance program, infrastructure
plan, safety review, legal review, and sustained ML staffing.

## Relationship to Desktop v0.6

Desktop v0.6 remains the active product milestone. Neutron work must not delay
the initial packaged read-only flow:

```text
Select project → Inspect → Doctor → Diff → Timeline
```

The recommended sequencing is:

1. complete the Desktop stack, distribution, and client-contract work;
2. deliver the stable read-only Desktop project slice;
3. implement N1 through N4 behind the same daemon and protocol boundaries;
4. expose the first read-only Neutron Workspace in Desktop;
5. add executable subagent scheduling and NeutronBench;
6. consider Approved Apply, local models, and tuning only through separate gates.

This ordering lets Desktop validate the runtime with real user flows while
preventing an unfinished agent layer from expanding the v0.6 release scope.

## Explicit non-goals for the first runtime milestone

- foundation-model claims;
- autonomous commits, pull requests, merges, releases, deployments, or package
  publication;
- unrestricted shell execution or arbitrary CLI routing;
- hidden provider selection, networking, telemetry, or training collection;
- direct mutation authority for models or subagents;
- cross-project or cross-profile memory retrieval;
- automatic skill activation or self-modification;
- hosted multi-tenant agent services;
- external MCP mutation authority;
- silent local-model downloads or dependency installation.

## First implementation action

After the Desktop v0.6 stack and client-contract baseline is accepted, create a
new implementation branch for N1 and an ADR for the first provider adapter. The
first runtime pull request should contain contracts, validators, deterministic
fixtures, and documentation only. Provider execution follows in a separate,
reviewable pull request after the contract diff is accepted.
