# Neutron N5 — Executable Task Graph and Subagents Maintainer Brief

## Status

**Slice 1 implemented** in `@intentloom/application/neutron-scheduler` (graph
execution validation, deterministic scheduling classification/selection, pure
state transitions). **Slice 2 implemented** — `executeNeutronTaskNode` runs
exactly one scheduler-selected ready node through N3 → N2 → N4 under a
read-only capability clamp and returns an application-level result wrapping
N1 `NeutronSubagentResult`. **Slice 3 implemented** — local-first leases and
one bounded concurrent scheduling wave (`executeReadyNeutronTaskNodes`).
**N5 runtime milestone incomplete** — no retries, cancellation recovery, or
graph runner loop. **Slice 4+ not authorized** by this document alone.

Mutation routing remains deferred.

Evidence baseline: `origin/main` @ `957756e12c6de488a943f49735816eb6ac2e498a`
(2026-09-04; legitimate advancement over N5 handoff `279eacd` — Dependabot deps
only). N5 handoff merge: `279eacd4fddcd1a08f51e1b32b19e79eb6e1a94c` (#444).

Maintainer decision for this increment: **choose N5 before mutation routing**. N5 must
prove controlled scheduling and subagent execution using current read-only authority
boundaries.

Authoritative roadmap gate: [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md)
§N5.

---

## 1. Current baseline

| Item                             | Evidence                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Post-N4 handoff `main` SHA**   | `3b504d143146b95a1215529208d6ce75f565b2c2` (#442)                                              |
| **Legitimate later advancement** | `d28baf570a70a60ab536c10228a0de3f51e41e5e` (#433 deps only)                                    |
| **N4 Slice 1**                   | PR #439 @ `5d8c6e16427466e6b1627a0320f1d96a12c5dc43` — router + `inspect`                      |
| **N4 Slice 2**                   | PR #441 @ `e19d50edf3d2bb013f129c838725472c7195dd7a` — read-only catalog                       |
| **N3 runtime milestone**         | Complete (Slices 1–4); optional Slice 5 unauthorized                                           |
| **Routed read-only tools**       | `inspect`, `doctor`, `memorySearch`, `timeline`, `conformance`, `securityAudit`, `projectDiff` |

### N1–N4 capability summary

| Milestone | Package surface                                                                                                          | Role today                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **N1**    | `@intentloom/protocol/neutron-runtime`, `@intentloom/validator/neutron-runtime`, `prepareNeutronRuntimeContractSnapshot` | Versioned contracts: session, adapter, context bundle, tool envelope, **task graph**, **subagent result**, usage budget, runtime event |
| **N2**    | `@intentloom/application/neutron-n2` — `runNeutronN2ReadOnlyLoop`, `OllamaModelAdapter`                                  | One read-only model turn loop; fingerprint proof; `AbortSignal`; one in-flight turn per session                                        |
| **N3**    | `@intentloom/application/neutron-context-assembly` — `assembleNeutronContext`; N2 hook `prepareNeutronN2ModelPrompt`     | Deterministic context assembly with budget, provenance, profile/task/memory integration                                                |
| **N4**    | `@intentloom/application/neutron-tool-router` — `routeNeutronToolInvocation`                                             | Fail-closed capability-scoped routing over seven read-only tools; no parallel execution path                                           |

---

## 2. Existing foundations inventory

### 2.1 Task graph contracts (N1 — schema only, no scheduler)

**Location:** `packages/protocol/src/neutron-runtime.ts`,
`packages/validator/src/neutron-runtime-records.ts`

| Field / concept                              | Current state                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **URN**                                      | `urn:intentloom:schema:neutron-task-graph:1`                                                        |
| **`NeutronTaskGraph`**                       | `root`, `sessionId`, `nodes[]`                                                                      |
| **`NeutronTaskNode`**                        | `taskId`, `parentId`, `dependencies[]`, `role`, `requiredCapabilities[]`, `state`, `expectedOutput` |
| **Lifecycle states (`NEUTRON_TASK_STATES`)** | `pending`, `ready`, `running`, `blocked`, `cancelled`, `timed-out`, `failed`, `completed`           |
| **Budget / retry on node**                   | **Not present** in N1 node schema — N5 adds scheduler metadata additively                           |
| **Validator**                                | `validateNeutronTaskGraph`, `validateNode` — shape only; no cycle or dependency semantics           |
| **Fixture**                                  | `tests/fixtures/neutron-runtime/contract-snapshot.v1.json` — single completed node                  |
| **Execution**                                | **None** — graph is contract snapshot, not a running scheduler                                      |

**Gap:** N5 must add graph validation (references, cycles, dependency semantics) and
scheduler-owned state transitions without renaming N1 states.

### 2.2 Subagent records (persisted orchestration foundation)

**Two related but distinct records:**

#### A. Legacy persisted task records

**Location:** `packages/application/src/index.ts` — `spawnNeutronSubagentTask`,
`getNeutronSubagentTask`, `listNeutronSubagentTasks`

| Aspect                  | Evidence                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| **Protocol type**       | `NeutronSubagentTaskRecord` (`schemaVersion: "1"`)                         |
| **Roles**               | `research`, `arch-checker`, `test-runner`, `conformance-auditor`, `custom` |
| **Statuses**            | `pending`, `running`, `completed`, `failed`                                |
| **Persistence**         | `.aif/neutron/subagents/{taskId}.json`                                     |
| **Parent relationship** | **None** — flat records, no graph linkage                                  |
| **Current behavior**    | Stub: spawn writes `completed` immediately with synthetic `resultOutput`   |
| **CLI**                 | `intentloom neutron subagent spawn                                         | list`, `intentloom neutron sync` |
| **Tests**               | `tests/neutron-orchestration.test.ts`                                      |

#### B. N1 subagent execution result envelope

**Location:** `packages/protocol/src/neutron-runtime.ts`

| Field                         | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `taskId`, `sessionId`, `root` | Binding                                |
| `status`                      | `completed` \| `failed` \| `cancelled` |
| `outputDigest`                | `sha256:…` over normalized output      |
| `mutationAttempted`           | Must be `false`                        |

**Gap:** N5 bridges graph nodes → subagent execution → enriched `NeutronSubagentResult`
with provenance, usage, tool envelopes, and attempts. Legacy `NeutronSubagentTaskRecord`
remains the CLI-facing persistence shape until a migration slice is justified.

### 2.3 Checkpoints (L5 — separate from Neutron task graph)

**Location:** `packages/application/src/index.ts`

| Operation                                  | Persists to                         | States           |
| ------------------------------------------ | ----------------------------------- | ---------------- |
| `createTaskCheckpoint`                     | `.aif/memory/checkpoints/{id}.json` | initial `active` |
| `pauseTask`                                | same                                | `paused`         |
| `cancelTask`                               | same                                | `cancelled`      |
| `redirectTask`                             | same                                | `redirected`     |
| `resumeTask`                               | same                                | `resumed`        |
| `deleteTaskCheckpoint`                     | removes file                        | —                |
| `listTaskCheckpoints`, `getTaskCheckpoint` | read                                | —                |

**N3 integration:** `assembleNeutronContext` reads latest checkpoint by `taskId` for
context excerpts (`neutron-context-state-collectors.ts`). N3 never mutates checkpoints.

**N5 relationship:** Checkpoints are **user/task orchestration state**, not scheduler
lease state. N5 may **read** checkpoint metadata for stale detection when a graph node
references `taskId`, but must not conflate `TaskCheckpoint.state` with
`NeutronTaskState`. Scheduler lifecycle persistence lives under
`.aif/neutron/scheduler/` (proposed below).

### 2.4 Delegation and capability clamping

**Location:** `delegateTaskRole` in `packages/application/src/index.ts`

| Aspect                     | Behavior                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input**                  | `DelegationRequest` with `profileName`, `role`, optional `requestedCapabilities`                                                            |
| **Profile lookup**         | `getProfile` — throws if missing                                                                                                            |
| **Role validation**        | Role must be in `profile.activeRoles`                                                                                                       |
| **Read-only enforcement**  | `context-scout` and `reviewer` force `readOnly: true`; cannot request `readOnly: false`                                                     |
| **Effective capabilities** | Intersection/clamp: `readOnly`, `allowedPaths`, `allowedTools`, `maxBudget`, `allowNetwork`                                                 |
| **Persistence**            | `.aif/memory/delegations/{delegationId}.json`                                                                                               |
| **N4 reuse**               | `AgentRoleCapabilities` passed to `routeNeutronToolInvocation`; N4 requires `readOnly: true`, `allowNetwork: false`, tool in `allowedTools` |

**N5 effective grant formula:**

```text
effectiveCapabilities =
  sessionCapabilities
  ∩ profileCapabilities(profileName)
  ∩ delegationResult.effectiveCapabilities   (when delegateTaskRole used)
  ∩ nodeRequiredCapabilities(requiredCapabilities)
  ∩ readOnlyCatalogConstraint              (N5 initial: all nodes read-only)
```

N5 must call `delegateTaskRole` (or equivalent pure clamp function extracted from it)
before node execution; never inherit parent capabilities implicitly.

### 2.5 Neutron runtime session

**Location:** `packages/protocol/src/neutron-runtime.ts`, N2 loop

| Aspect                   | Evidence                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Session states**       | `created`, `discussing`, `inspecting`, `planning`, `cancelled`, `timed-out`, `failed`, `completed` |
| **`mutationAllowed`**    | Always `false` in N1–N4                                                                            |
| **N2 concurrency guard** | `inFlightSessions` Set — one in-flight N2 turn per `sessionId`                                     |
| **Cancellation**         | `AbortSignal` checked in N2 and N4 authorization                                                   |
| **Fingerprint proof**    | N2 compares before/after project fingerprint; throws on mutation                                   |
| **Timeout**              | N4: per-invocation `timeoutMs`, optional `deadlineMs`; session `timed-out` blocks tools            |

N5 session coordination extends this: graph-level cancellation must propagate to
child node `AbortSignal`, N2 turns, and N4 tool calls.

### 2.6 N4 router boundary (subagents must reuse, not bypass)

**Location:** `packages/application/src/neutron-tool-router.ts`

Subagent tool execution path:

```text
scheduler node worker
→ build NeutronToolInvocation + NeutronRuntimeSession + AgentRoleCapabilities
→ routeNeutronToolInvocation({ dispatch: createNeutronReadOnlyDispatch(fs) })
→ existing application operation
```

**Forbidden:** Direct calls to `inspectProject`, `doctorProject`, etc. from scheduler
workers bypassing `routeNeutronToolInvocation`. **Forbidden:** A second tool registry
or shell dispatch for subagents.

Checks already enforced: root/session binding, active session lifecycle, deadline,
`AbortSignal`, read-only tool definition, capability clamp, result byte limits,
normalized error envelopes.

### 2.7 Workspace synchronization

**Location:** `syncLocalWorkspaceState` in `packages/application/src/index.ts`

| Aspect                  | Evidence                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| **Shared project root** | Yes — all subagents share the selected `root`                      |
| **Isolation**           | Metadata only under `.aif/neutron/subagents/`; no git worktrees    |
| **Fingerprint**         | Uses `inspectProject` readiness + doctor findings + security score |
| **Read-only N5**        | No worktree or mutation-isolation machinery                        |

Stale detection compares scheduler-start fingerprint vs pre-execution fingerprint.

---

## 3. N5 definition — precise objective

**N5** extends persisted Neutron subagent foundations into a **deterministic,
bounded, cancellable execution scheduler** that coordinates **already-authorized**
N2/N3/N4 capabilities across a **validated task dependency graph**.

### What N5 is

| Layer                           | N5 responsibility                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Persisted task graph**        | Validate structure, dependencies, roles; persist scheduler state                                                              |
| **Scheduler**                   | Deterministic ready-node selection, concurrency limits, leases, retries, cancellation propagation — **outside model weights** |
| **Worker / subagent execution** | Per-node: capability clamp → N3 context → N2 model turn → N4 tools → structured result                                        |
| **Model turns**                 | N2 adapter boundary; one bounded turn sequence per node (reuse N2 loop composition)                                           |
| **Routed tool execution**       | N4 only; same path as parent                                                                                                  |
| **Task result aggregation**     | Deterministic parent merge from graph order, not completion timing                                                            |
| **Checkpoints**                 | Read for stale context; scheduler writes separate execution records                                                           |
| **Mutation approval**           | **Out of scope** — no Apply, no write tools, no project bytes changed                                                         |

### What N5 is not

- Autonomous mutation or mutation routing
- Generic shell or parallel tool execution path
- Model-as-scheduler (the model may propose graphs via future APIs; the scheduler
  executes validated graphs deterministically)
- Desktop UI (N6)
- New provider support
- Replacement of L5 checkpoints or legacy subagent CLI (initial slices compose alongside)

### N5 exit gate

Deterministic multi-task fixtures prove: dependency handling, cancellation, timeout
recovery, budget enforcement, provenance, stable aggregation, and **no hidden
background mutation** (project fingerprint unchanged under read-only roles).

---

## 4. Runtime ownership decision

### Option A — Continue in `@intentloom/application` (recommended for N5 Slice 1–3)

**Pros:**

- N1–N4 already live in application subpaths (`neutron-n2`, `neutron-context-assembly`,
  `neutron-tool-router`); N5 composes them directly
- No new package consumer exists yet (Desktop N6 deferred)
- Roadmap: dedicated package only when contract **and real consumer** justify boundary
- Tests already inject `FileSystem` through application APIs
- Dependency direction preserved: application → protocol/validator, not reverse

**Cons:**

- `packages/application/src/index.ts` is already oversized; N5 modules must **not** land
  in the monolith — dedicated `neutron-scheduler-*.ts` modules with ≤250-line budget
- Risk of orchestration monolith if slices skip extraction

### Option B — Introduce `packages/neutron-runtime` (deferred)

**Pros:**

- Clean boundary for execution-session coordination named in roadmap decomposition
- Future Desktop/daemon consumer could depend on runtime without full application surface
- Enforces dependency direction earlier

**Cons:**

- No second consumer yet; would duplicate or re-export N2/N3/N4 composition boundaries
- Violates "introduce only when justified" without N6 or daemon RPC consumer
- Large migration cost for existing test imports

### Decision

**Option A for N5 foundation slices.** Extract cohesive modules under
`packages/application/src/neutron-scheduler-*.ts` and export via
`@intentloom/application/neutron-scheduler` subpath.

**Re-evaluate Option B** when N6 Desktop Neutron Workspace needs a runtime consumer or
when scheduler modules exceed sustainable file count (>6 production modules or repeated
cross-package import pressure from `apps/desktop`).

**Do not create `packages/neutron-runtime` in N5 Slice 1.**

---

## 5. Task-node state machine

Reuse **`NEUTRON_TASK_STATES`** verbatim. Do not invent `succeeded` (use `completed`),
`paused` (use `blocked` with scheduler pause reason metadata), or `stale` (transition to
`failed` with `stale-state` error code in result metadata).

| State       | Meaning                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------- |
| `pending`   | Registered; dependencies not yet satisfied                                                |
| `ready`     | All dependencies terminal-success; eligible for scheduling                                |
| `running`   | Lease held; worker executing N3/N2/N4                                                     |
| `blocked`   | Dependency failed/cancelled, budget exhausted awaiting parent decision, or explicit pause |
| `cancelled` | Cancel propagated or node explicitly cancelled                                            |
| `timed-out` | Node, lease, or model/tool deadline exceeded                                              |
| `failed`    | Non-retryable error or retries exhausted (includes stale-state rejection)                 |
| `completed` | Terminal success; result persisted                                                        |

### Transitions

| From                          | To          | Trigger                                  | Persisted evidence                             | Cancel behavior                | Dependency effect                                  |
| ----------------------------- | ----------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| `pending`                     | `ready`     | All deps `completed`                     | `readyAt`, dep snapshot digest                 | —                              | —                                                  |
| `pending`                     | `blocked`   | Any dep `failed`/`cancelled`/`timed-out` | `blockedReason: dependency-{state}`            | —                              | Blocks descendants to `blocked`                    |
| `pending`                     | `cancelled` | Session/node cancel before start         | `cancelledAt`, `cancelSource`                  | Immediate                      | Propagate block to dependents                      |
| `ready`                       | `running`   | Lease acquired, worker started           | `leaseId`, `attempt`, `startedAt`              | Pre-start cancel → `cancelled` | —                                                  |
| `ready`                       | `cancelled` | Cancel while queued                      | `cancelledAt`                                  | —                              | Dependents → `blocked` or `cancelled` per policy   |
| `running`                     | `completed` | Worker success                           | `NeutronSubagentResult`, usage, tool envelopes | —                              | Unblock dependents → evaluate `ready`              |
| `running`                     | `failed`    | Non-retryable error                      | Normalized error, attempts                     | Abort in-flight work           | Dependents → `blocked`                             |
| `running`                     | `timed-out` | Deadline/lease expiry                    | Timeout kind metadata                          | Abort in-flight                | Dependents → `blocked`; may retry if policy allows |
| `running`                     | `cancelled` | Cancel during execution                  | `cancelledAt`                                  | **AbortSignal** to N2/N4       | Dependents → `blocked`/`cancelled`                 |
| `running`                     | `ready`     | Retryable failure, attempts remain       | Increment `attempt`, clear lease               | —                              | —                                                  |
| `failed`/`completed`/terminal | —           | No outbound transitions                  | Final result immutable                         | —                              | —                                                  |

**Scheduler pause** (maintainer cancel of scheduling without cancelling session): moves
`ready` → `blocked` with `blockedReason: scheduler-paused`; resume re-evaluates deps.

---

## 6. Dependency semantics

Graph validation runs **before any execution** (`validateNeutronTaskGraphForExecution`).

| Case                        | Semantics                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Zero dependencies**       | Node may reach `ready` immediately after graph activation                                                      |
| **Multiple dependencies**   | **All** must reach `completed` before `ready`                                                                  |
| **Dependency success**      | Dependent transitions `pending` → `ready` (deterministic batch)                                                |
| **Dependency failure**      | Dependent → `blocked` with reason; never auto-run                                                              |
| **Cancelled dependency**    | Dependent → `blocked` or `cancelled` (config: default `blocked` with cancel cascade optional)                  |
| **Timed-out dependency**    | Treat as failure → `blocked` downstream                                                                        |
| **Stale dependency result** | If dep completed but fingerprint/provenance stale flag set → dependent → `failed` at schedule time             |
| **Cyclic graph**            | **Reject at validation** with `validation-failed` / cycle path in error                                        |
| **Missing dependency ID**   | Reject at validation                                                                                           |
| **Duplicate taskId**        | Reject at validation                                                                                           |
| **parentId**                | Provenance and aggregation ordering only; **not** an execution dependency unless also listed in `dependencies` |

**Deterministic cycle detection:** DFS with nodes sorted by `taskId` (code-point order);
first cycle found is reported in stable order.

---

## 7. Runnable-node selection and concurrency

### Ready selection (deterministic)

When capacity available, select runnable nodes in order:

1. Nodes in state `ready` with valid lease slot
2. Sort by: (a) optional explicit `priority` if added to scheduler metadata — lower
   number first; (b) **`taskId` code-point ascending** (default when no priority)
3. Never use filesystem order, completion timing, or model output for ordering

### Concurrency limits

| Source                                    | Default                                                                                  | Maximum                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| **Scheduler option `maxConcurrentNodes`** | `1`                                                                                      | `4` (hard cap for N5 initial) |
| **Session / profile `maxBudget`**         | May further restrict parallel token use                                                  | —                             |
| **Per-parent limit**                      | Default: unlimited within global cap; optional `maxConcurrentChildren` on graph metadata | 2                             |
| **Per-role limit**                        | Optional map `role → maxConcurrent`                                                      | 1 for same role initially     |

**When capacity opens:** Re-run ready selection on next scheduler tick; fill slots in
deterministic order. No `Promise.all` over unbounded ready set.

**Conservative default:** `maxConcurrentNodes: 1` for Slice 1–2 tests; concurrency
slice proves cap at 2–4 with fixtures.

---

## 8. Execution leases and heartbeats

Local-first, single daemon/process assumption. No distributed consensus.

| Concept                            | Definition                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| **Lease owner ID**                 | `{sessionId}:{taskId}:{attempt}`                                                  |
| **Acquisition**                    | Atomic write of lease record; fails if unexpired lease exists                     |
| **Lease TTL**                      | Default `nodeTimeoutMs` or `120_000` ms, whichever is smaller                     |
| **Heartbeat**                      | Worker renews lease every `ttl/3` while `running`                                 |
| **Expiry**                         | If heartbeat missing at TTL → node → `timed-out`, lease cleared, retry if allowed |
| **Lost worker recovery**           | On scheduler tick, expired lease → `timed-out` → retry or `failed`                |
| **Duplicate execution prevention** | Second acquirer gets `lease-held`; must not enter N2/N4                           |

**Persistence:** `.aif/neutron/scheduler/leases/{leaseId}.json`

---

## 9. Retry and timeout model

### Retry policy

| Failure class                                        | Retryable | Notes                    |
| ---------------------------------------------------- | --------- | ------------------------ |
| `permission-denied`, `capability-denied`             | **No**    | Clamp error              |
| `validation-failed`, `root-mismatch`, invalid schema | **No**    |                          |
| `unsupported-tool`                                   | **No**    |                          |
| `cancelled`                                          | **No**    |                          |
| `budget-exceeded`                                    | **No**    |                          |
| `timeout` (transient provider)                       | **Yes**   | Max attempts default `2` |
| `operation-failed` (transient)                       | **Yes**   | Bounded                  |
| Worker interruption / expired lease                  | **Yes**   | If attempts remain       |

**Defaults:** `maxAttempts: 2` (initial attempt + 1 retry). Scheduler metadata per node
may lower, not raise above graph-level `maxAttempts` cap (default `3` absolute max).

### Timeout layers (do not collapse)

| Layer                         | Owner                                  | Default                  |
| ----------------------------- | -------------------------------------- | ------------------------ |
| **Model turn timeout**        | N2 adapter / node worker               | `60_000` ms              |
| **Tool invocation timeout**   | N4 `invocation.timeoutMs`              | `30_000` ms              |
| **Node execution timeout**    | Scheduler worker wraps full N3+N2+N4   | `120_000` ms             |
| **Lease timeout**             | Scheduler                              | ≤ node execution timeout |
| **Scheduler/session timeout** | Graph-level optional `graphDeadlineMs` | unset = no graph timeout |

Interaction: inner timeouts fire first; node worker maps to normalized
`NeutronErrorCode`; cancellation aborts all layers via shared `AbortSignal`.

---

## 10. Cancellation propagation

| Scope                    | Behavior                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Cancel one node**      | If `pending`/`ready` → `cancelled`; if `running` → abort signal + `cancelled`; dependents → `blocked` |
| **Cancel parent node**   | Optional cascade to child nodes (default: cancel children)                                            |
| **Cancel whole session** | All non-terminal nodes → `cancelled`; session state → `cancelled`; no new leases                      |
| **Cancelled dependency** | Dependents blocked/cancelled per §6                                                                   |
| **Running child**        | `AbortSignal` checked before N3, before each N2 turn, passed to N4                                    |
| **Queued children**      | Never start; transition to `cancelled` on session cancel                                              |

**AbortSignal flow:**

```text
scheduleCancel(sessionId | taskId)
→ set session/node cancel flag + AbortController.abort()
→ scheduler tick skips cancelled ready nodes
→ running worker catches abort → normalized cancelled result
→ N2 executeTurn(signal) + N4 routeNeutronToolInvocation(signal)
→ retry loop checks signal before retry
```

**Guarantee:** After session cancel completes scheduler drain, no in-flight N2/N4 for
that session. Tests assert zero tool operations after cancel acknowledgment.

---

## 11. Context and token budgets

Reuse **`NeutronUsageBudget`** and N3 `assembleNeutronContext` limits.

| Budget                       | Source                                             | Exhaustion behavior                                                     |
| ---------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| **Per-node context tokens**  | Node metadata `maxContextTokens` or default `4000` | Node → `failed`, `budget-exceeded`                                      |
| **Per-node model I/O**       | Accumulate from N2 adapter usage                   | Same                                                                    |
| **Whole-graph token budget** | Graph metadata `graphTokenBudget` optional         | Remaining nodes → `blocked`; running node completes or fails per policy |
| **Tool result bytes**        | N4 `NEUTRON_TOOL_MAX_RESULT_BYTES`                 | Normalized `budget-exceeded`                                            |
| **Graph node count**         | Validation cap default `32` nodes                  | Reject at validation                                                    |

**Accounting:** After each node, merge usage into graph accumulator persisted at
`.aif/neutron/scheduler/sessions/{sessionId}/usage.json`. Failures are auditable in
result provenance.

---

## 12. Role and capability clamp

Every node execution:

1. Resolve `profileName` from graph/session metadata (required when role ≠ default)
2. Call `delegateTaskRole` or pure `clampCapabilitiesForNode(parent, profile, node)`
3. Pass result `effectiveCapabilities` to N4 and N3 (`role` filter)
4. Verify `requiredCapabilities` ⊆ granted tools/capabilities
5. Force `readOnly: true`, `allowNetwork: false` for N5 initial implementation

**Child cannot exceed parent:** `effectiveChild = intersect(parentEffective, …)` when
parent node executed with known grant; root session starts from session baseline
(read-only catalog only).

---

## 13. Read-only guarantee

**Allowed tools:** the seven N4 read-only tools only.

**Forbidden for any child/subagent:**

- Write / Apply / memory mutation / checkpoint mutation via model tools
- Generic shell / git mutation
- Direct application mutation operations

**Allowed scheduler persistence (not project mutation):**

- Task state, lease, heartbeat, attempt count, result metadata, cancellation flags under
  `.aif/neutron/scheduler/`
- Legacy subagent record updates under `.aif/neutron/subagents/`

**Proof:** Project fingerprint (N2-style) before graph start and after graph terminal;
must match for read-only roles. Existing `runNeutronN2ReadOnlyLoop` fingerprint check
reused per node.

---

## 14. Parent-child provenance

Extend **`NeutronSubagentResult`** additively (Slice 5) or wrap in application
`NeutronNodeExecutionRecord` (preferred initially to avoid protocol bump):

| Field                            | Source                     |
| -------------------------------- | -------------------------- |
| `graphId` / session graph digest | Scheduler                  |
| `nodeId` (`taskId`)              | Graph node                 |
| `parentNodeId`                   | `parentId`                 |
| `sessionId`, `root`              | Session                    |
| `role`, `profileName`            | Node + delegation          |
| `providerKind`, `modelId`        | N2 adapter capability      |
| `contextBundleProvenance`        | N3 source IDs + digests    |
| `toolsInvoked`                   | N4 envelope invocation IDs |
| `attempts`, timing               | Scheduler lease records    |
| `finalState`                     | `NeutronTaskState`         |
| `childResultDigests`             | Aggregation slice          |

Do not persist chain-of-thought or raw model hidden reasoning.

---

## 15. Result contract and deterministic aggregation

### Node result

Prefer wrapping existing **`NeutronSubagentResult`** with scheduler envelope:

```typescript
interface NeutronNodeExecutionResult {
  readonly subagent: NeutronSubagentResult;
  readonly taskState: NeutronTaskState;
  readonly usage: NeutronUsageBudget;
  readonly toolEnvelopes: readonly NeutronToolEnvelope[];
  readonly provenance: NeutronNodeProvenance;
  readonly attempts: number;
  readonly warnings: readonly string[];
}
```

### Parent aggregation

| Input                         | Rule                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Child ordering**            | Sort by `taskId` ascending (graph structure order)                                                                             |
| **Successful children**       | Include output digest + summary in parent payload                                                                              |
| **Failed/cancelled children** | Include status + error code; do not omit                                                                                       |
| **Partial graph**             | Parent may `completed` with `warnings` if policy allows partial success; default: parent `failed` if any required child failed |
| **Concatenation**             | Never order by `completedAt` timestamp                                                                                         |

---

## 16. Stale-state detection

| Stale kind                       | Detection                                               | Action                                |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| **Project fingerprint changed**  | Compare scheduler-start vs pre-node fingerprint         | Node → `failed`, stale reason         |
| **Checkpoint changed**           | `updatedAt` or checksum vs context assembly snapshot    | Reject or re-assemble once; then fail |
| **Workspace sync stale**         | `syncLocalWorkspaceState.syncedAt` older than threshold | Warning or block                      |
| **Parent state changed**         | Parent not terminal when child completes                | Child result flagged invalid          |
| **Lease expired**                | §8                                                      | `timed-out` path                      |
| **Profile/capabilities changed** | Re-delegate before run; mismatch → fail                 | No silent widen                       |

Reuse `createdSnapshotChecksum` from checkpoints and N2 fingerprint helpers.

---

## 17. Persistence and crash recovery

### Allowed persistence layout

```text
.aif/neutron/scheduler/
  graphs/{graphExecutionId}.json      # graph + node states
  leases/{leaseId}.json
  sessions/{sessionId}/usage.json
  results/{taskId}.json               # NeutronNodeExecutionResult
```

### Recovery on process restart

| Situation                         | Recovery                                                               |
| --------------------------------- | ---------------------------------------------------------------------- |
| `running` + valid unexpired lease | **Ambiguous** — treat as expired after TTL; do not assume worker alive |
| Expired lease                     | → `timed-out`, retry if policy allows                                  |
| `completed` + result file         | Idempotent; do not re-execute                                          |
| Partial attempt (no result)       | Increment attempt or fail deterministically                            |

**Guarantee statement:** At-most-once node execution per `{taskId, attempt}` under
single-process scheduler. **Not** exactly-once across crashes. Retries may produce
duplicate model calls; dedupe by attempt ID in provenance.

---

## 18. Proposed runtime flow

```text
User / parent API
  → validate graph (cycles, refs, caps)
  → persist graph execution record (all nodes pending)
  → scheduler tick loop
      → select ready nodes (deterministic order, concurrency cap)
      → acquire lease
      → clamp capabilities (delegateTaskRole)
      → fingerprint check (stale gate)
      → assembleNeutronContext (N3)
      → runNeutronN2ReadOnlyLoop or deterministic test worker (N2)
          → routeNeutronToolInvocation (N4) for each tool call
      → persist NeutronNodeExecutionResult
      → release lease; update node state
      → propagate dependency releases
  → aggregate parent results (deterministic)
  → terminal graph state + fingerprint proof
```

The **scheduler tick** is pure TypeScript control flow (testable with fake clock and
injected workers). The **model** never selects execution order.

---

## 19. Scheduler API (minimal)

Application subpath `@intentloom/application/neutron-scheduler`:

| Operation                                     | Purpose                                                         |
| --------------------------------------------- | --------------------------------------------------------------- |
| `validateNeutronTaskGraphForExecution(graph)` | Pre-flight validation                                           |
| `createGraphExecution(input)`                 | Persist initial execution record                                |
| `tickGraphExecution(executionId, options)`    | Run one scheduler step (ready select + start workers up to cap) |
| `cancelGraphExecution(executionId, scope)`    | Cancel session/node                                             |
| `getGraphExecutionStatus(executionId)`        | Inspect states                                                  |
| `recoverGraphExecution(executionId)`          | Post-crash lease cleanup + resume tick                          |

**First vertical slice:** `validateNeutronTaskGraphForExecution` +
`selectReadyNodes` + pure state transition functions — **no model execution**.

---

## 20. N2/N3/N4 reuse (mandatory composition)

| Milestone | N5 usage                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| **N3**    | `assembleNeutronContext` per node with `taskId`, `profileName`, `role`                                                  |
| **N2**    | `runNeutronN2ReadOnlyLoop` with `createNeutronReadOnlyDispatch(fs)` as `runTool`; or slim deterministic worker in tests |
| **N4**    | All tools via `routeNeutronToolInvocation`                                                                              |

N5 modules **must not** duplicate context assembly, adapter protocol, or authorization
logic.

---

## 21. Threat analysis

| Threat                            | Mitigation                                                               |
| --------------------------------- | ------------------------------------------------------------------------ |
| Task amplification                | Graph node cap; session node budget; validation rejects oversized graphs |
| Runaway concurrency               | Hard cap `maxConcurrentNodes ≤ 4`; default 1                             |
| Infinite retry                    | `maxAttempts` absolute cap; non-retryable error taxonomy                 |
| Child capability escalation       | Intersect clamp; N4 read-only enforcement                                |
| Stale authorization               | Re-delegate before each run; fingerprint gate                            |
| Cancelled work continuing         | AbortSignal + session cancel drain + tests                               |
| Duplicate execution               | Lease acquire fails closed                                               |
| Cross-project context             | Root binding on every layer (N1 contract rule)                           |
| Cross-profile memory              | N3 `projectId` isolation unchanged                                       |
| Malicious parent task             | Graph validation; capability clamp; no shell                             |
| Tool-call loops                   | N2 loop bounded turns per node; tool count cap per node                  |
| Budget exhaustion                 | Normalized `budget-exceeded`; graph budget stops scheduling              |
| Result injection between children | Signed digests; aggregation from persisted results only                  |

---

## 22. Implementation slices

### Slice 1 — Graph validation and deterministic scheduling core

| Item            | Detail                                                                                                                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**      | **Implemented** on `@intentloom/application/neutron-scheduler`                                                                                                                                                                                                                                                         |
| **Objective**   | Validate graphs; deterministic ready selection; pure state transitions                                                                                                                                                                                                                                                 |
| **Modules**     | `neutron-scheduler-validate.ts`, `neutron-scheduler-select.ts`, `neutron-scheduler-transitions.ts`, `neutron-scheduler-errors.ts`, `neutron-scheduler-sort.ts`                                                                                                                                                         |
| **APIs**        | `validateNeutronTaskGraphForExecution`, `planNeutronTaskScheduling`, `selectReadyNodes`, `validateNeutronTaskStateTransition`, `applyNeutronTaskStateTransition`                                                                                                                                                       |
| **Reused APIs** | `validateNeutronTaskGraph`, `NEUTRON_TASK_STATES`                                                                                                                                                                                                                                                                      |
| **Tests**       | `tests/neutron-n5-task-graph.test.ts`, `tests/neutron-n5-scheduling.test.ts`                                                                                                                                                                                                                                           |
| **Decisions**   | `parentId` is provenance only; duplicate dependency IDs rejected; ready order is `taskId` code-point ascending; `priority` deferred; scheduling classification (`ready`/`waiting`/`blocked`) is separate from protocol node state; default `maxConcurrency` 1, hard cap 4; cycle paths reported in DFS discovery order |
| **Risks**       | Confusion with L5 checkpoints — document separation                                                                                                                                                                                                                                                                    |
| **Non-goals**   | Model execution, N3 assembly, N4 tool calls, persistence, leases, retry loops, concurrency workers                                                                                                                                                                                                                     |
| **Exit gate**   | Pure functions prove ready order and transitions on fixture graphs (**met**)                                                                                                                                                                                                                                           |

### Slice 2 — Single-worker node execution (N3/N2/N4 composition)

| Item            | Detail                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Objective**   | Execute one ready node through full read-only stack                                                    |
| **Modules**     | `neutron-scheduler-worker.ts`, `neutron-scheduler-execute.ts`                                          |
| **Reused APIs** | `assembleNeutronContext`, `runNeutronN2ReadOnlyLoop`, `routeNeutronToolInvocation`, `delegateTaskRole` |
| **Tests**       | `tests/neutron-n5-scheduler-execute.test.ts` — deterministic adapter, fingerprint unchanged            |
| **Risks**       | N2 in-flight session guard vs graph concurrency — use distinct session IDs per node                    |
| **Non-goals**   | Parallel nodes, retries                                                                                |
| **Exit gate**   | Single-node linear graph executes with provenance + no mutation                                        |

### Slice 3 — Leases and bounded concurrency

| Item          | Detail                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| **Objective** | Lease acquire/renew/expire; `maxConcurrentNodes`                          |
| **Modules**   | `neutron-scheduler-lease.ts`, persistence under `.aif/neutron/scheduler/` |
| **Tests**     | `tests/neutron-n5-scheduler-lease.test.ts`, concurrency cap fixtures      |
| **Exit gate** | No duplicate active lease; cap enforced deterministically                 |

### Slice 4 — Retry, cancellation, timeout recovery

| Item          | Detail                                                              |
| ------------- | ------------------------------------------------------------------- |
| **Objective** | Bounded retries; cancel propagation; layered timeouts               |
| **Tests**     | `tests/neutron-n5-scheduler-cancel.test.ts`, retry/timeout fixtures |
| **Exit gate** | Cancel mid-run aborts N2/N4; retries respect taxonomy               |

### Slice 5 — Aggregation, stale-state, provenance enrichment

| Item          | Detail                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| **Objective** | Deterministic parent aggregation; fingerprint stale gate; full provenance record |
| **Tests**     | `tests/neutron-n5-scheduler-aggregate.test.ts`, stale fingerprint fixtures       |
| **Exit gate** | Multi-node graph completes with stable aggregation; stale project rejected       |

---

## 23. First recommended implementation slice

**Exactly one:** **Slice 1 — Graph validation and deterministic scheduling core.**

Rationale: Smallest testable increment without concurrent model execution; confirms
dependency semantics and state machine against existing N1 types; unblocks all later
slices.

**Authorization requested after brief merge:** explicit maintainer sign-off for N5
Slice 1 only.

---

## 24. Test strategy

| Category         | Cases                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Graph**        | Linear chain, diamond, independent tasks, cycle rejection, failed/cancelled/timed-out dependency |
| **Scheduling**   | Deterministic ready order, concurrency cap, no duplicate execution                               |
| **Lease**        | Acquire, renew, expire, recovery                                                                 |
| **Retry**        | Retryable vs non-retryable, max attempts                                                         |
| **Cancellation** | Node, parent, session, propagation to N2/N4                                                      |
| **Budget**       | Per-node limit, graph limit, exhaustion                                                          |
| **Capabilities** | Parent/child clamp, read-only child, denied tool                                                 |
| **Stale state**  | Fingerprint, profile, checkpoint change                                                          |
| **Aggregation**  | Deterministic ordering, partial failure, cancellation                                            |
| **Safety**       | Project bytes unchanged (`MemoryFileSystem` + fingerprint)                                       |

All tests use injected `FileSystem`, fake clock, and deterministic model adapter — no
live Ollama required for scheduler proofs.

---

## 25. Performance considerations

| Concern                 | N5 initial bound                                                          |
| ----------------------- | ------------------------------------------------------------------------- |
| Graph size              | ≤32 nodes default validation cap                                          |
| Runnable nodes per tick | ≤4                                                                        |
| Scheduler tick          | O(n log n) sort on ready set; n ≤32                                       |
| Persisted writes        | One lease + one state file per transition; batch where safe               |
| Context/model cost      | Dominates; scheduler overhead must stay <5% of node wall time in fixtures |

No queues, worker pools, or external services until evidence requires them.

---

## 26. Module boundaries (file-size planning)

| Module                             | Responsibility                    | Target lines |
| ---------------------------------- | --------------------------------- | ------------ |
| `neutron-scheduler-validate.ts`    | Graph validation, cycle detection | ≤200         |
| `neutron-scheduler-select.ts`      | Ready selection ordering          | ≤120         |
| `neutron-scheduler-transitions.ts` | Pure state machine                | ≤200         |
| `neutron-scheduler-lease.ts`       | Lease acquire/renew/expire        | ≤200         |
| `neutron-scheduler-worker.ts`      | N3/N2/N4 node worker              | ≤250         |
| `neutron-scheduler-execute.ts`     | Tick loop orchestration           | ≤250         |
| `neutron-scheduler-aggregate.ts`   | Parent result merge               | ≤180         |
| `neutron-scheduler-persist.ts`     | `.aif/neutron/scheduler/` I/O     | ≤200         |

No monolithic `neutron-scheduler.ts`. Extract before any file exceeds 300 effective
lines.

---

## 27. Acceptance criteria (N5 milestone)

- [ ] Deterministic graph scheduling with stable ready order
- [ ] Dependency correctness including failure/cancel propagation
- [ ] Bounded concurrency with configurable cap (default 1, max 4)
- [ ] No duplicate active lease for same node
- [ ] Bounded retries with non-retryable taxonomy enforced
- [ ] Cancellation propagates to N2 model turns and N4 tools
- [ ] Timeout recovery per layered timeout model
- [ ] Context/token budgets enforced and auditable
- [ ] Child capability clamp ⊆ parent/session/profile/node
- [ ] Parent-child provenance on every node result
- [ ] Stable aggregation order by `taskId`
- [ ] Stale-state rejection (fingerprint, profile, checkpoint)
- [ ] Project fingerprint unchanged under read-only roles
- [ ] `pnpm verify` green; cross-platform compatible

---

## 28. Mutation-routing decision

**MUTATION ROUTING REMAINS DEFERRED.**

N5 must not design around write tools or Apply. Mutation routing requires separate
maintainer authorization after N5 exit gate evidence exists:

- Deterministic scheduler under test
- Cancellation and capability clamp proven
- Stale-state rejection proven
- Task provenance and audit history complete
- Bounded retries and no duplicate execution proven
- Read-only fingerprint proofs on multi-node fixtures

Scheduling alone is **not** sufficient justification for mutation routing.

---

## 29. Open decisions

| #   | Decision                                                          | Recommendation                                                    | Blocker for |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| 1   | Add `priority` field to scheduler metadata vs `taskId`-only order | **Deferred** — Slice 1 uses `taskId` code-point ascending only    | Slice 2+    |
| 2   | Unify `NeutronSubagentTaskRecord` with graph node persistence     | Keep separate; link by `taskId` in Slice 2                        | Slice 2     |
| 3   | Protocol bump for enriched `NeutronSubagentResult`                | Application wrapper first; protocol additive in Slice 5 if needed | Slice 5     |
| 4   | Graph-level partial success policy                                | Default strict: any child fail → parent fail                      | Slice 5     |
| 5   | When to introduce `packages/neutron-runtime`                      | Re-evaluate at N6 Desktop consumer                                | N6          |

---

## 30. Recommendation

**READY FOR N5 SLICE 4 AUTHORIZATION** — Slice 3 leases and one bounded
scheduling wave are implemented; explicit maintainer authorization required
before retries, cancellation recovery, or a graph runner loop.

---

## 31. Slice 2 implementation record

Evidence baseline: `origin/main` @ `6a5c17aee9f9ae04b38f6df4d497a8503d44f410`
(N5 Slice 1 handoff #446). Explicit maintainer authorization covered Slice 2
only.

| Decision                 | Record                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Execution API**        | `executeNeutronTaskNode` on `@intentloom/application/neutron-scheduler`                                                                                                                                      |
| **Inputs**               | graph, taskId, active session, projectId, model adapter, filesystem, session capabilities, fingerprint, optional profile/signal/budget                                                                       |
| **Outputs**              | in-memory result: updated graph/node, N1 `NeutronSubagentResult`, attempt `1`, capabilities, N3 context/usage, N4 tool envelope, N2 adapter, fingerprints, normalized error                                  |
| **N3/N2/N4 composition** | N2 `runNeutronN2ReadOnlyLoop` calls `assembleNeutronContext` via the existing pre-turn hook; model tool calls go through `routeNeutronToolInvocation`                                                        |
| **Node objective**       | N1 `expectedOutput` is the only evidence-backed intent field; it is the N2 prompt and N3 query                                                                                                               |
| **Role / capability**    | `resolveNeutronNodeCapabilities` intersects session, optional profile grant, parent `requiredCapabilities`, node `requiredCapabilities`, and the N4 read-only catalog; `readOnly=true`, `allowNetwork=false` |
| **State transitions**    | pending→ready when classified ready, then ready→running; success running→completed; failure running→failed; cancel→cancelled; timeout→timed-out                                                              |
| **Result contract**      | N1 `NeutronSubagentResult` reused unchanged (`completed`/`failed`/`cancelled`; timed-out nodes map subagent status to `failed`); richer audit fields stay on the application wrapper (brief §29 #3)          |
| **Errors**               | scheduling/not-runnable fail closed with `executed: false` and no provider call; post-start failures return `executed: true` with one attempt and a staged error                                             |
| **No persistence**       | no `.aif/neutron/scheduler/` writes                                                                                                                                                                          |
| **No retry**             | `attempt = 1`; provider/tool/context failures terminate the node                                                                                                                                             |
| **No concurrency**       | one operation executes one requested ready node; capacity forced to 1; a running peer blocks start                                                                                                           |

`delegateTaskRole` is not called: it writes delegation files. Clamp is pure.

---

## 32. Slice 3 implementation record

Evidence baseline: `origin/main` @ `1165d044f461ddbaf90297aa74b1be13c11982ed`
(N5 Slice 2 handoff #448). Explicit maintainer authorization covered Slice 3
only.

| Decision                 | Record                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Batch API**            | `executeReadyNeutronTaskNodes` on `@intentloom/application/neutron-scheduler` — one scheduling wave, not a graph runner                                                                                 |
| **Admission**            | Reuses Slice 1 `planNeutronTaskScheduling`; `taskId` code-point ascending; `availableCapacity = maxConcurrency - runningCount`; default 1, hard cap 4                                                   |
| **Lease identity**       | `{sessionId}:{taskId}:{attempt}`; default attempt `1`; attempt is not incremented                                                                                                                       |
| **Owner**                | Injectable `ownerId`; default `scheduler:{sessionId}`; renewal and release require the current owner                                                                                                    |
| **TTL / heartbeat**      | Default TTL `min(nodeTimeoutMs, 120_000)` ms (120s when unset); renew every `ttl/3`; injected clock; no leftover timers after the wave                                                                  |
| **Acquisition**          | Atomic-enough local acquire via in-process lock + `.aif/neutron/scheduler/leases/{urlencoded(leaseId)}.json`; active/released → `lease-held`; expired → `lease-expired` (no silent re-acquire or retry) |
| **Release**              | Owner release on completion, failure, and cancellation; released records remain for audit                                                                                                               |
| **Ordering**             | Acquire sequentially in admitted `taskId` order, then execute concurrently; outcomes sorted by `taskId` regardless of completion order                                                                  |
| **Slice 2 reuse**        | Each admitted node calls `executeNeutronTaskNode` with `allowConcurrentPeers`; distinct N3/N2/N4 capability clamps; N2 in-flight key is `sessionId + taskId`                                            |
| **State transitions**    | Lease acquired before `ready → running`; Slice 2 owns running → terminal; failed lease acquire does not mark the node running                                                                           |
| **Persistence boundary** | Scheduler lease metadata under `.aif/neutron/scheduler/leases/` only; project source fingerprint must ignore that prefix                                                                                |
| **No retry**             | Expired lease is fail-closed; caller decides; no attempt increment, backoff, or retry queue                                                                                                             |
| **No graph runner**      | One call executes at most `availableCapacity` ready nodes and stops                                                                                                                                     |
| **Mutation routing**     | Remains deferred                                                                                                                                                                                        |

Clock, lease, heartbeat, and batch modules stay in `@intentloom/application`.
No protocol version bump.
