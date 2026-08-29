# Neutron N3 — Context Assembly Maintainer Brief

## Status

Planning artifact only. **No N3 runtime implementation is authorized by this
document.** Implementation requires an explicit maintainer authorization for
the first approved slice after this brief is reviewed.

Evidence baseline: `origin/main` @ `e44fdc7` (post PR #422 reconciliation,
2026-08-30).

Authoritative roadmap gate: [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md)
§N3. Deferred without explicit authorization per
[`POST_W12_NEXT_INCREMENT_PLAN.md`](POST_W12_NEXT_INCREMENT_PLAN.md) and
[`ENGINEERING_WORKSPACE_CAPABILITY_MATRIX.md`](ENGINEERING_WORKSPACE_CAPABILITY_MATRIX.md).

---

## 1. Current baseline

| Item                               | Evidence                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| **Post-reconciliation `main` SHA** | `e44fdc7e82cd51bc784fd8c37e8b45038571d2c9` (PR #422 merged)                          |
| **CLI decomposition**              | P4l1–P4l16 complete; `command.ts` 171 physical / 167 effective (#421, #422)          |
| **Neutron N1**                     | Merged PR #317 @ `7d1dbd1` — versioned runtime contracts, validators, frozen fixture |
| **Neutron N2**                     | Merged PR #318 @ `89b6c1d` — Ollama loopback adapter + `runNeutronN2ReadOnlyLoop`    |
| **Model adapter boundary**         | ADR-0054, PR #254 — `@intentloom/application/model-adapter` subpath                  |
| **Bounded project context (M1)**   | `getBoundedProjectContext`, `intentloom context get` (P4l16)                         |
| **Skill discovery (L7)**           | `discoverSkills` with catalog/contract/procedure levels                              |
| **Memory (M1–M4)**                 | `searchPersistentMemory`, `listPersistentMemoryItems`, accepted lifecycle            |
| **Profiles / delegation (L6)**     | `getProfile`, `delegateTaskRole`                                                     |
| **Task state (L5)**                | `getTaskCheckpoint`, `getTaskSummary`, checkpoint lifecycle                          |
| **Semantic ranking (L8)**          | `rankProceduralMemory` (optional, provider-dependent)                                |

### Relevant current APIs

| API                                     | Package                                   | Role today                        |
| --------------------------------------- | ----------------------------------------- | --------------------------------- |
| `prepareNeutronRuntimeContractSnapshot` | `@intentloom/application/neutron-runtime` | N1 root-bound contract validation |
| `runNeutronN2ReadOnlyLoop`              | `@intentloom/application/neutron-n2-loop` | N2 inspect-only model loop        |
| `getBoundedProjectContext`              | `@intentloom/application`                 | M1 path-scoped file retrieval     |
| `discoverSkills`                        | `@intentloom/application`                 | Progressive skill selection       |
| `searchPersistentMemory`                | `@intentloom/application`                 | Accepted memory keyword search    |
| `rankProceduralMemory`                  | `@intentloom/application`                 | Procedural/semantic ranking       |
| `getProfile` / `delegateTaskRole`       | `@intentloom/application`                 | Role capability clamping          |
| `getTaskCheckpoint` / `getTaskSummary`  | `@intentloom/application`                 | Task-scoped state                 |
| `validateNeutronContextBundle`          | `@intentloom/validator/neutron-runtime`   | N1 bundle shape enforcement       |

### N1 baseline (implemented)

| Dimension              | State                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Purpose**            | Versioned, provider-neutral runtime contract snapshots                         |
| **Inputs**             | Caller-supplied `root` + frozen or constructed snapshot JSON                   |
| **Outputs**            | Validated `NeutronRuntimeContractSnapshot`                                     |
| **APIs**               | `NeutronContextBundle`, `NeutronUsageBudget`, tool/graph/subagent envelopes    |
| **Persisted state**    | None — validation only                                                         |
| **Read/write**         | Read-only validation; rejects `mutationAllowed !== false`                      |
| **Trust/security**     | N1 snapshots require `networkMode: "offline"`, `mutationAllowed: false`        |
| **CLI/Desktop/daemon** | No N1 execution surface                                                        |
| **Tests**              | `tests/neutron-runtime-contracts.test.ts`, fixture `contract-snapshot.v1.json` |
| **Limitations**        | `NeutronContextBundle` is schema-only; no live assembly engine                 |
| **Deferred**           | Dynamic assembly, provider execution, Desktop exposure                         |

### N2 baseline (implemented)

| Dimension              | State                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Purpose**            | One real provider (Ollama loopback) through one read-only inspect loop       |
| **Inputs**             | `root`, `sessionId`, `projectId`, `prompt`, configured `ModelAdapter`        |
| **Outputs**            | Session, adapter capability, tool envelope, response text, fingerprint proof |
| **APIs**               | `runNeutronN2ReadOnlyLoop`, `OllamaModelAdapter`                             |
| **Persisted state**    | None — ephemeral turn; no project writes                                     |
| **Read/write**         | Read-only; fingerprint before/after must match                               |
| **Trust/security**     | Loopback-only URL; one in-flight turn per session; inspect tool only         |
| **CLI/Desktop/daemon** | No model calls on any client surface (ADR-0055)                              |
| **Tests**              | `tests/neutron-n2-ollama.test.ts` with fake HTTP listener                    |
| **Limitations**        | Does **not** call context assembly; prompt goes to model without N3 bundle   |
| **Deferred**           | Context engine integration, additional tools, streaming, Desktop (N6)        |

---

## 2. N3 objective

**Neutron N3 Context assembly** is the application-layer operation that, for a
given Neutron runtime session bound to one project root, **deterministically
composes** canonical policy, bounded project files, accepted memory, selected
skills, task/checkpoint state, and role/profile constraints into a single
versioned **`NeutronContextBundle`** with full source provenance, trust
classification, budget accounting, and explicit exclusion reasons — **without
mutating project bytes, granting capabilities, or invoking a model**.

N3 is **not** `intentloom context get`. That CLI command (P4l16) exposes
`getBoundedProjectContext`, which performs a **flat, path-type-scoped file scan**
with secret filtering and token/item clamping. N3 **orchestrates** multiple
existing retrieval operations, maps their outputs into N1 `NeutronContextSource`
records, enforces cross-source priority and reserved budgets, and produces an
agent-ready bundle suitable for downstream N4 tool routing and N2/N6 model turns.

---

## 3. Existing capabilities reused

| Subsystem / API                        | How N3 uses it                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `getBoundedProjectContext`             | Mandatory source for canonical intent, ADRs, docs, ownership, evidence paths    |
| `discoverSkills`                       | Mandatory skill candidate selection at declared loading level                   |
| `searchPersistentMemory`               | Optional accepted-memory inclusion when `taskId`/`query` provided               |
| `getTaskCheckpoint` / `getTaskSummary` | Optional task-scoped context when `taskId` provided                             |
| `getProfile`                           | Mandatory when `profileName` provided; filters skills and annotates constraints |
| `delegateTaskRole`                     | **Not invoked** by N3; delegation is a separate mutating boundary (L6)          |
| `rankProceduralMemory`                 | Optional, **default off** in N3 v1 for determinism                              |
| `validateNeutronContextBundle`         | Output validation against N1 schema                                             |
| `NeutronUsageBudget`                   | Token accounting envelope linked to assembly result                             |
| `TrustClass` (protocol)                | Maps into N1 `NeutronContextSource.trustClass` via explicit mapping table       |
| Secret path patterns (M1)              | Reused from `getBoundedProjectContext`; never duplicated                        |

---

## 4. Explicit non-goals

N3 does **not**:

- invoke `ModelAdapter`, Ollama, or any hosted provider;
- execute tools (inspect, doctor, apply, etc.) — that is N4;
- mutate project files, memory items, checkpoints, profiles, or delegations;
- auto-activate skills or write skill proposals;
- grant capabilities because a profile, skill, or role appears in the bundle;
- replace `getBoundedProjectContext` or change `context get` CLI semantics;
- add Desktop, TUI, MCP, or daemon RPC surfaces in the first slice;
- perform cross-project or cross-profile memory retrieval;
- silently promote `agent-generated` or `user-supplied` content to
  `canonical-policy`;
- persist assembled bundles to disk (unless a later ADR requires audit artifacts);
- implement semantic ranking as a default path (optional flag only);
- introduce `packages/neutron-runtime` or grow root package barrels;
- start P4l17, W13, or any post-decomposition CLI extract.

---

## 5. Proposed architecture

### Owning layer

| Layer                                                  | Responsibility                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **`@intentloom/protocol/neutron-runtime`**             | Extend assembly **request** type; keep `NeutronContextBundle` URN stable |
| **`@intentloom/validator/neutron-runtime`**            | Validate request + assembled bundle                                      |
| **`@intentloom/application/neutron-context-assembly`** | New subpath; orchestration only                                          |
| **CLI / daemon / Desktop**                             | Deferred after application API stabilizes                                |

No new package until N4+ consumer count justifies it (same rule as N1/N2).

### Input contract (proposed)

```typescript
interface AssembleNeutronContextInput {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly taskId?: string;
  readonly query?: string;
  readonly profileName?: string;
  readonly role?: DelegatedAgentRole;
  readonly skillLevel?: SkillLoadingLevel; // default "catalog"
  readonly maxTokens?: number; // default 4000, same as M1
  readonly maxItems?: number; // default 20
  readonly sourceTypes?: readonly ContextSourceType[];
  readonly includeMemory?: boolean; // default true when query/taskId set
  readonly semanticRanking?: boolean; // default false (determinism)
}
```

Validation: root non-empty, sessionId matches N1 session conventions, profile
must exist when `profileName` is set, role must be in profile's `activeRoles`
when both are set.

### Orchestration

```text
AssembleNeutronContextInput
  → validate root/session/profile/role
  → collect mandatory policy/context (getBoundedProjectContext)
  → collect skills (discoverSkills with profile role/pack filters)
  → collect optional memory (searchPersistentMemory, projectId-scoped)
  → collect optional task (getTaskCheckpoint / getTaskSummary)
  → map each candidate → NeutronContextSource (+ exclusion reasons)
  → apply priority ordering + reserved budgets + deterministic truncation
  → validateNeutronContextBundle + NeutronUsageBudget
  → AssembleNeutronContextResult
```

Each collector is a pure read through existing application APIs with injected
`FileSystem`. No direct filesystem walks outside those APIs.

### Output contract

Primary output: **`NeutronContextBundle`** (existing N1 URN
`urn:intentloom:schema:neutron-context-bundle:1`).

Secondary output (application wrapper, not a new protocol URN in slice 1):

```typescript
interface AssembleNeutronContextResult {
  readonly bundle: NeutronContextBundle;
  readonly usage: NeutronUsageBudget;
  readonly warnings: readonly string[];
}
```

### Adapters

| Surface                | N3 v1 recommendation                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Application API        | **Yes** — first vertical slice                                                                                |
| Unit/integration tests | **Yes**                                                                                                       |
| CLI                    | **No** — `context get` already covers bounded retrieval; add `neutron context assemble` only after API freeze |
| Daemon RPC             | **No** — N4 tool router will need stable bundle shape first                                                   |
| Desktop                | **No** — N6 Neutron Workspace                                                                                 |
| MCP                    | **No**                                                                                                        |

---

## 6. Context sources

Priority order (lower number = included first; truncation removes from bottom):

| #   | Source                       | Inclusion rule                                                                                                 | Priority                | Trust / provenance                                                                | Budget impact                                       | Fallback                    |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| 1   | **Canonical policy**         | Always: `docs/specs/*`, `docs/decisions/*` via `getBoundedProjectContext` with `sourceTypes: ["intent","adr"]` | 1 (reserved 25% tokens) | `trustClass: project`, `kind: policy`, provenance `intentloom.context.bounded.v1` | Counts toward shared token/item budget              | Blocking if root missing    |
| 2   | **Project ownership state**  | Always: `PROJECT_STATE.md`, `DUTY_WATCH.md` when present                                                       | 2 (reserved 10%)        | `kind: policy`, trust mapped from M1 `canonical-policy` / `verified-evidence`     | Reserved slice                                      | Warning if unreadable       |
| 3   | **Profile constraints**      | When `profileName` set: include profile metadata as `kind: policy` source, not full capability grant           | 3                       | `kind: policy`, provenance `intentloom.profile.v1`                                | Fixed catalog-cost estimate                         | Blocking if profile missing |
| 4   | **Task intent / checkpoint** | When `taskId` set: latest checkpoint + task summary                                                            | 4                       | `kind: task`, trust from record                                                   | Per-item token estimate                             | Warning if task missing     |
| 5   | **Selected skills**          | `discoverSkills` at requested level; filter by profile role/pack                                               | 5                       | `kind: skill`, trust from skill metadata                                          | Uses skill `contextCost.*`                          | Empty skills → warning      |
| 6   | **Bounded documentation**    | Remaining `getBoundedProjectContext` docs/ownership/evidence                                                   | 6                       | `kind: inspect` or `evidence`                                                     | Shared budget                                       | Skip unreadable             |
| 7   | **Accepted memory**          | When `includeMemory` and `query`/`taskId`: `searchPersistentMemory`                                            | 7                       | `kind: memory`, trust from item classification                                    | Shared budget                                       | Warning if none found       |
| 8   | **Semantic rank hints**      | Only when `semanticRanking: true`                                                                              | 8 (optional)            | `kind: derived`, provenance includes provider id                                  | Does not consume file-content budget; metadata only | Fallback: omit rank sources |

### Explicitly out of scope for N3

| Source                              | Reason                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| Live `inspectProject` output        | Tool execution belongs to N2/N4 loops, not pre-turn assembly |
| Workspace/inception session state   | Different product boundary; no stable Neutron coupling       |
| Engineering assessments live output | No daemon/CLI transport; deferred                            |
| Delegation records (mutating)       | N3 reads profile; does not create delegations                |
| Model transcripts                   | Ephemeral per ADR-0055                                       |
| Cross-project memory                | Forbidden by memory security model                           |

### Deferred to N4+

| Source                              | Stage |
| ----------------------------------- | ----- |
| Tool-router-selected evidence fetch | N4    |
| Subagent workspace sync records     | N5    |
| NeutronBench fixture overlays       | N7    |

---

## 7. Budget model

Reuse M1 defaults and semantics (`maxTokens` default 4000, `maxItems` default 20).

### Token budget

| Rule                    | Behavior                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Global cap**          | `input.maxTokens ?? 4000`                                                                                      |
| **Reserved slices**     | Policy (intent+ADR): min 25% until filled or exhausted; ownership docs: min 10%                                |
| **Per-source estimate** | Reuse M1 `tokenCount` (ceil(bytes/4)) and skill `contextCost.*`                                                |
| **Truncation**          | Deterministic: sort excluded candidates by priority desc, drop lowest priority first                           |
| **Overflow**            | Set `usage.limitExceeded: true`; include `warnings` entry; still return partial bundle                         |
| **Empty context**       | Valid result with zero included sources and warning (not blocking)                                             |
| **Hard vs soft**        | Reserved slices are **soft**: if canonical files exceed reserved slice, they may consume more rather than fail |

### Item budget

| Rule           | Behavior                                                |
| -------------- | ------------------------------------------------------- |
| **Global cap** | `input.maxItems ?? 20`                                  |
| **Counting**   | Each included `NeutronContextSource` counts as one item |
| **Skills**     | One source per selected skill at chosen loading level   |
| **Memory**     | One source per accepted memory item                     |

### Deterministic ordering

1. Collect candidates from each subsystem in fixed source order (§6 table).
2. Within a subsystem, preserve API sort order:
   - `getBoundedProjectContext`: filesystem list order (stable for `createMemoryFileSystem`; document that production relies on sorted normalized paths — **implementation must sort paths lexicographically** to match test determinism).
   - `discoverSkills`: already sorts skill IDs.
   - `searchPersistentMemory`: score desc, then `id` localeCompare.
3. Tie-break excluded sources by `sourceId` lexicographic ascending in provenance output.
4. JSON serialization: stable key order via `JSON.stringify` on validated objects.

### Semantic ranking boundary

When `semanticRanking: true`, ranking scores may be non-deterministic across
providers. N3 must:

- keep ranked items in a separate optional `derived` source group;
- never reorder mandatory policy sources based on semantic scores;
- record provider id in provenance;
- default `semanticRanking: false` in all exit-gate fixtures.

---

## 8. Trust / security model

### Provenance

Every `NeutronContextSource` must include:

- `sourceId` — stable deterministic id;
- `kind` — N1 enum (`inspect`, `memory`, `skill`, `policy`, `evidence`, `task`);
- `trustClass` — N1 enum (`project`, `catalog`, `user`, `derived`);
- `provenance` — dotted operation id (e.g. `intentloom.context.bounded.v1`);
- `included` — boolean;
- `exclusionReason` — when `included: false`.

Map protocol `TrustClass` → N1 trustClass:

| Protocol `TrustClass` | N1 `trustClass` |
| --------------------- | --------------- |
| `canonical-policy`    | `project`       |
| `verified-evidence`   | `project`       |
| `user-supplied`       | `user`          |
| `agent-generated`     | `derived`       |

Catalog skills use `catalog`. Never map `agent-generated` → `project`.

### Capabilities

N3 is **context preparation only**:

| Authority                 | N3                                                          |
| ------------------------- | ----------------------------------------------------------- |
| Filesystem read (project) | Yes, via existing read-only APIs                            |
| Filesystem write          | **No**                                                      |
| Network                   | **No**                                                      |
| Secrets                   | Excluded via M1 patterns + bundle `excludedSecretLikePaths` |
| Process execution         | **No**                                                      |
| Tool invocation           | **No**                                                      |
| Capability grant          | **No** — profile appears as metadata, not authorization     |

### No-mutation boundary

Same invariant as N2: assembly must not change project fingerprint. Tests must
compare filesystem digest before/after assembly.

---

## 9. Failure / degraded behavior

| Condition                              | Class        | Behavior                                              |
| -------------------------------------- | ------------ | ----------------------------------------------------- |
| Invalid/missing `root`                 | **Blocking** | Throw validation error                                |
| Invalid `sessionId`                    | **Blocking** | Throw validation error                                |
| `profileName` set but profile missing  | **Blocking** | Throw `Profile not found` (reuse application error)   |
| `role` not in profile `activeRoles`    | **Blocking** | Throw validation error                                |
| `taskId` set but no checkpoint/summary | **Warning**  | Omit task sources; continue                           |
| Memory search returns empty            | **Warning**  | Continue                                              |
| Skill discovery rejects all skills     | **Warning**  | Bundle with zero skill sources                        |
| Budget exhausted with policy remaining | **Warning**  | Include partial policy; `limitExceeded: true`         |
| Unreadable file in bounded context     | **Warning**  | Skip item (existing M1 behavior)                      |
| Semantic provider unavailable          | **Fallback** | Omit derived rank sources; warning                    |
| Malformed skill catalog file           | **Warning**  | Skip skill; record in decisions → exclusion           |
| Secret-like path detected              | **Excluded** | Listed in `excludedSecretLikePaths`; never in payload |

Reuse `ProtocolValidationError` / application `Error` patterns; do not invent a
parallel error taxonomy for N3 v1.

---

## 10. Output contract

### `NeutronContextBundle` (N1 URN, populated by N3)

| Field                     | N3 population                                      |
| ------------------------- | -------------------------------------------------- |
| `schemaVersion`           | `urn:intentloom:schema:neutron-context-bundle:1`   |
| `root`                    | Input root                                         |
| `sessionId`               | Input sessionId                                    |
| `estimatedTokens`         | Sum of included source estimates                   |
| `sources`                 | Full inclusion/exclusion audit trail               |
| `excludedSecretLikePaths` | Union of M1 secret exclusions + explicit path list |

### Implementation decision requiring explicit approval (slice 1 PR)

Whether to add **optional payload digests** to `NeutronContextSource`:

```typescript
// Proposed optional fields — not in N1 fixture today
readonly contentDigest?: string;  // sha256 of normalized excerpt
readonly path?: string;           // project-relative when applicable
readonly loadingLevel?: SkillLoadingLevel;
```

**Recommendation:** add optional fields in a backward-compatible validator
extension; frozen N1 fixture remains valid without them. Full text payloads
stay **out of** the bundle; consumers fetch via existing read APIs using
`sourceId` / path.

### `NeutronUsageBudget`

| Field                          | N3 population                  |
| ------------------------------ | ------------------------------ |
| `contextTokens`                | `bundle.estimatedTokens`       |
| `tokenBudget`                  | `input.maxTokens ?? 4000`      |
| `limitExceeded`                | true when truncation occurred  |
| `inputTokens` / `outputTokens` | `0` in assembly-only operation |

---

## 11. Consumer / handoff

```text
N3 assembleNeutronContext
  → NeutronContextBundle + NeutronUsageBudget
  → N4 tool router (selects tools within profile/capability envelope)
  → N2/N6 model turn (adapter receives bundle metadata + tool results)
  → N5 task graph / subagents (session-scoped revalidation)
```

| Question                         | Answer                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| **What object does N3 produce?** | Validated `NeutronContextBundle` + usage record                                      |
| **Who consumes it?**             | N4 tool router; N2 loop (future integration); N6 Desktop review panel                |
| **What can consumers trust?**    | Included sources passed validator + read-only APIs; trustClass/provenance            |
| **What must be revalidated?**    | Root, session, profile, role, cancellation state before each model turn or tool call |
| **Who authorizes execution?**    | N4 for tools; existing approval/transaction boundaries for mutation                  |

N3 stops before autonomous execution. Model turns remain read-only until N6+
explicit gates.

---

## 12. Minimal implementation sequence

Recommended bounded slices (labels are recommendations, not accepted roadmap
phases):

### Slice 1 — Contract + validator extension

| Item             | Detail                                                                   |
| ---------------- | ------------------------------------------------------------------------ |
| **Scope**        | `AssembleNeutronContextInput`, optional source fields, validator updates |
| **Packages**     | `protocol/neutron-runtime`, `validator/neutron-runtime`                  |
| **Dependencies** | N1 merged                                                                |
| **Tests**        | Request validation, backward-compatible bundle fixture                   |
| **Non-goals**    | Assembly engine, CLI                                                     |
| **Review risk**  | Low — schema-only                                                        |

### Slice 2 — Deterministic assembly core

| Item             | Detail                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| **Scope**        | `assembleNeutronContext` orchestrator, policy + bounded context + skills     |
| **Packages**     | `application/neutron-context-assembly`, `application/neutron-context-budget` |
| **Dependencies** | Slice 1                                                                      |
| **Tests**        | Frozen fixture projects, determinism, secret exclusion, budget truncation    |
| **Non-goals**    | Memory, task, semantic ranking                                               |
| **Review risk**  | Medium — core logic                                                          |

### Slice 3 — Memory + task integration

| Item            | Detail                                                         |
| --------------- | -------------------------------------------------------------- |
| **Scope**       | Accepted memory, checkpoint/summary sources, profile filtering |
| **Packages**    | extend assembly modules                                        |
| **Tests**       | projectId isolation, profile missing, task missing warnings    |
| **Non-goals**   | Semantic ranking default                                       |
| **Review risk** | Medium — trust boundaries                                      |

### Slice 4 — N2 integration hook (read-only)

| Item            | Detail                                                            |
| --------------- | ----------------------------------------------------------------- |
| **Scope**       | Optional pre-turn assembly call inside `runNeutronN2ReadOnlyLoop` |
| **Tests**       | N2 loop receives bundle metadata; still no project mutation       |
| **Non-goals**   | Desktop, daemon RPC                                               |
| **Review risk** | Medium — touches N2 path                                          |

### Slice 5 — CLI/daemon exposure (optional, post-N4)

| Item          | Detail                                    |
| ------------- | ----------------------------------------- |
| **Scope**     | Only if a real caller exists beyond tests |
| **Non-goals** | Desktop UI                                |

### Module file plan (maintainability)

| Module                          | Responsibility                        | Target effective SLOC |
| ------------------------------- | ------------------------------------- | --------------------- |
| `neutron-context-assembly.ts`   | Public `assembleNeutronContext`       | ≤200                  |
| `neutron-context-collectors.ts` | Source-specific collectors            | ≤250                  |
| `neutron-context-budget.ts`     | Priority, reserved slices, truncation | ≤150                  |
| `neutron-context-trust.ts`      | TrustClass mapping, provenance ids    | ≤80                   |

Do not create a monolithic `context-assembly.ts` >400 lines.

---

## 13. Test plan

| Layer                       | Required tests                                                        |
| --------------------------- | --------------------------------------------------------------------- |
| **Validator**               | Invalid input, optional new fields, N1 fixture backward compatibility |
| **Unit — budget**           | Reserved slices, truncation order, limitExceeded flag                 |
| **Unit — trust**            | Mapping table, agent-generated never promoted                         |
| **Integration — assembly**  | Multi-source fixture project with skills, memory, task, profile       |
| **Integration — secrets**   | `.env`, `.pem`, `.git` never appear; listed in exclusions             |
| **Integration — isolation** | Wrong `projectId` excludes memory items                               |
| **Determinism**             | Same input + filesystem → byte-stable JSON bundle                     |
| **Degraded**                | Missing task, empty memory, budget overflow → warnings not throws     |
| **Fingerprint**             | Project bytes unchanged after assembly                                |
| **N2 hook (slice 4)**       | Loop still passes fingerprint check                                   |
| **CLI/daemon**              | Only when slice 5 authorized                                          |

Fixtures: extend `tests/fixtures/neutron-runtime/` with
`context-assembly-project.v1/` tree.

---

## 14. Acceptance criteria

N3 is complete when:

1. `assembleNeutronContext` returns a validated `NeutronContextBundle` for
   deterministic fixture projects.
2. Equivalent state produces stable source selection and ordering across
   platforms.
3. Token and item budgets enforce truncation with `limitExceeded` accuracy.
4. Canonical policy sources receive priority over documentation and memory.
5. Secret-like paths never appear in included sources.
6. Accepted memory respects `projectId` scoping.
7. Profile/role constraints filter skills; missing profile fails closed.
8. No project filesystem mutation during assembly.
9. No provider-specific imports in core assembly modules.
10. `pnpm verify` green including new tests.
11. All new production files ≤250 effective SLOC or documented exception.
12. No root barrel growth — subpath exports only.

---

## 15. Risks / open decisions

| #   | Decision                                                    | Recommendation                                 | Needs maintainer sign-off?     |
| --- | ----------------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| 1   | Optional `contentDigest` / `path` on `NeutronContextSource` | Add backward-compat optional fields in slice 1 | **Yes** — schema change        |
| 2   | Default `semanticRanking`                                   | `false`; opt-in only                           | No — brief resolves            |
| 3   | First consumer surface                                      | Application API + tests only                   | No — matches N2 pattern        |
| 4   | Persist assembled bundles                                   | Do not persist in N3                           | No — brief resolves            |
| 5   | Sort order for bounded context paths                        | Lexicographic normalize in N3 collector        | No — implementation detail     |
| 6   | N2 integration timing                                       | Slice 4 after core assembly proven             | No — sequencing recommendation |

---

## 16. Recommendation

**READY FOR IMPLEMENTATION AUTHORIZATION**

for **Slice 1 (contract + validator extension)** and **Slice 2 (deterministic
assembly core)** after maintainer acknowledges schema optional-field decision (#1).

Slices 3–5 require separate authorization checkpoints after each slice merges.

**Do not start implementation** until the maintainer explicitly authorizes
Slice 1 in `DUTY_WATCH.md` or a direct instruction.

---

## References

- [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md) §N3
- [`POST_W12_NEXT_INCREMENT_PLAN.md`](POST_W12_NEXT_INCREMENT_PLAN.md)
- [ADR-0054 Model Adapter boundary](../decisions/ADR-0054-model-adapter-boundary-and-provider-contract.md)
- [ADR-0055 Neutron N2 first adapter](../decisions/ADR-0055-neutron-n2-first-model-adapter.md)
- [`PERSISTENT_AGENT_MEMORY.md`](../concepts/PERSISTENT_AGENT_MEMORY.md)
- [`NEUTRON_MODEL_STRATEGY.md`](../concepts/NEUTRON_MODEL_STRATEGY.md)
- PR #317 (N1), PR #318 (N2), PR #421/#422 (CLI decomposition)
- `packages/application/src/index.ts` — `getBoundedProjectContext`, `discoverSkills`
- `packages/protocol/src/neutron-runtime.ts` — `NeutronContextBundle`
- `tests/memory-security-m1.test.ts`, `tests/neutron-runtime-contracts.test.ts`
