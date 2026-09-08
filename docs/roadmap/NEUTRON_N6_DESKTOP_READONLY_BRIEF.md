# Neutron N6 — Desktop Neutron Workspace (Read-Only Maintainer Brief)

## Status

**Slice 1 implemented** (daemon Neutron session RPC + Desktop read-only session
shell). Slices 2–5 are **not authorized**. `mutationAllowed` remains `false`.
Streaming and daemon event push remain unavailable.

N1–N5 read-only runtime is complete in `@intentloom/application` and
`@intentloom/protocol`. Mutation-routing **Slice 1 contracts** exist. Desktop
v0.6 already ships an authenticated daemon adapter and Agent Workspace. Slice 1
adds named Neutron session RPCs and a Desktop Neutron view. Daemon event
streaming remains unavailable.

This brief designs the first official Desktop experience over those existing
typed boundaries. The first N6 milestone remains **read-only**.

Evidence baseline: `origin/main` @
`ee3ec5bbfdb829cc94a0228aa17fd7cd6b0349d4` (2026-09-07; mutation-routing Slice 1
handoff #465). Tracked tree clean at brief start.

Authoritative roadmap gate: [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md)
§N6.

Related:

- [`NEUTRON_N3_CONTEXT_ASSEMBLY_BRIEF.md`](NEUTRON_N3_CONTEXT_ASSEMBLY_BRIEF.md)
- [`NEUTRON_N5_EXECUTABLE_TASK_GRAPH_BRIEF.md`](NEUTRON_N5_EXECUTABLE_TASK_GRAPH_BRIEF.md)
- [`NEUTRON_MUTATION_ROUTING_BRIEF.md`](NEUTRON_MUTATION_ROUTING_BRIEF.md)
- [`ADR-0042`](../decisions/ADR-0042-desktop-stack-and-daemon-distribution.md)
- [`ADR-0053`](../decisions/ADR-0053-approved-apply-transactional-mutation.md)
- [`ADR-0055`](../decisions/ADR-0055-neutron-n2-first-model-adapter.md)

---

## 0. Decision summary (for the next grant)

| Decision                   | Verdict                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| First implementation slice | **N6 Slice 1 — daemon Neutron session RPC + Desktop read-only session shell**                                                     |
| Layout                     | New **Neutron** view **inside existing Agent Workspace** (reuse, not a second app)                                                |
| Runtime package            | **Keep Neutron runtime in `@intentloom/application`**                                                                             |
| Optional N3 Slice 5        | **Not required** for N6 if session RPC returns assembled context                                                                  |
| Streaming                  | **Do not invent.** Current Ollama adapter is request/response (`stream: false`)                                                   |
| Progress                   | N1 events exist; daemon is request/response only — Slice 1 may complete on RPC return; later slices add a thin notify/poll bridge |
| Apply                      | **Unavailable** for the entire N6 read-only milestone                                                                             |
| Mutation / N6 sequencing   | **N6 Slice 1 first.** Mutation Slice 2 may later proceed in parallel under file ownership in §27                                  |
| Next grant                 | **Explicit maintainer authorization required** (do not assume N6 Slice 2)                                                         |

---

## 1. Current baseline

| Item                            | Evidence                                                                    |
| ------------------------------- | --------------------------------------------------------------------------- |
| `HEAD` / `main` / `origin/main` | `ee3ec5bbfdb829cc94a0228aa17fd7cd6b0349d4`                                  |
| Tracked tree                    | Clean. Unrelated untracked `.commit-msg-*` / `.pr-body-*` scratch preserved |
| Mutation Slice 1                | PR #464 merge `431d1ed8`; handoff #465 is current `main`                    |
| `mutationAllowed`               | Literal `false` on `NeutronRuntimeSession`                                  |
| Neutron daemon RPCs             | Slice 1: create/get/cancel/turn.execute                                     |
| Desktop Neutron UI              | Slice 1: Neutron workspace view (read-only session shell)                   |
| Desktop Apply                   | `ApprovedApplyModal` is real UI; `App.tsx` **stubs** success without daemon |

---

## 2. Why N6 now

Read-only contract gates named in the runtime roadmap are satisfied:

- N1 session/adapter/context/tool/graph/usage/event contracts
- N2 `OllamaModelAdapter` + `runNeutronN2ReadOnlyLoop`
- N3 `assembleNeutronContext` + N2 pre-turn hook (optional CLI/daemon Slice 5 still unauthorized)
- N4 seven read-only tools behind `routeNeutronToolInvocation`
- N5 scheduler, one-wave execution, retry/cancel/timeout, aggregation, stale-state, provenance
- Mutation Slice 1 proposal/approval/preflight **types** only

Desktop already validates the daemon path for inspect/doctor/diff/timeline. The
missing work is **exposure**, not a second runtime.

---

## 3. N6 objective

Make Neutron visible and operable through the official Desktop adapter:

```text
project
→ Neutron session
→ task / discussion
→ context
→ model turn
→ tool activity
→ subagent / task graph progress
→ evidence / provenance
→ result / review
```

No source mutation. No fake Apply. No Desktop-to-model networking. No generic
shell. No Desktop import of `@intentloom/application`.

---

## 4. Architecture invariant

Desktop remains an adapter:

```text
Desktop UI
→ typed desktopClient
→ Tauri command allowlist
→ authenticated local daemon
→ versioned JSON-RPC
→ @intentloom/application Neutron runtime
→ model adapter / N3 / N4 / N5
```

Forbidden:

- Desktop → Ollama (or any provider) directly
- Desktop → duplicate application/scheduler/tool-router logic
- Desktop → shell or arbitrary filesystem (folder dialog only, as today)
- Webview fetch to the public internet (CSP / ADR-0042)

Rust stays transport, window, dialog, and daemon lifecycle
(`.cursor/rules/architecture-boundaries.mdc`).

---

## 5. Current Desktop architecture

### 5.1 Frontend

| Area          | Current fact                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack         | React 19 + TypeScript in `apps/desktop`, Tauri 2 webview, design system under `src/design/` (ADR-0044)                                                                                                                      |
| Shell         | Single-window `App.tsx` (497 physical lines — **already oversized**; do not grow it) + `WorkspaceContent.tsx` (291)                                                                                                         |
| Navigation    | `WorkspaceView` union in `workspace-navigation.ts` — no router library                                                                                                                                                      |
| Views         | Overview, Open existing project, Adoption preview, Feature intent, Bounded execution, Continuous loop, New project, Foundation workshop, Inspect, Doctor, Diff review, Timeline, Settings, External specialized pack review |
| State         | Local React state in `App.tsx` plus focused hooks (`use-desktop-connect`, `use-desktop-doctor`, operation lifecycle). **No React Query / Redux / Zustand**                                                                  |
| Data          | `desktopClient` (`desktop-client.ts` + `desktop-client-facade.ts`) invokes named Tauri commands; composed feature methods for foundation/adoption/packs                                                                     |
| Errors        | `DesktopBridgeError` codes mapped by `desktop-bridge-status.ts` to `WorkspaceInspectStatus`: `idle`, `loading`, `ready`, `stale`, `invalid-root`, `disconnected`, `protocol-mismatch`, `error`                              |
| Notifications | Status copy + inline messages; no toast framework required for N6                                                                                                                                                           |

### 5.2 Backend / Tauri

Named commands in `commands.rs` (not a generic RPC hole):

- `get_daemon_info`
- `select_project_root` (native folder dialog)
- `inspect_project` / `run_doctor` / `preview_project_diff` / `load_project_timeline`
- `invoke_inception_request` / `invoke_foundation_request`
- `invoke_specialized_pack_preview_request` / `invoke_specialized_pack_activate_request`

Daemon spawn/connect lives in `daemon_runtime.rs` / `daemon_launch.rs` /
`daemon_transport.rs`. Protocol version is injected at the bridge
(`PROTOCOL_VERSION`). Method allowlists are explicit match arms
(`method_allowlist.rs`) — **no wildcards**. New Neutron methods need new arms.

`intentloom.project.approvedApply.v1` is allowlisted as a method **name** in
tests/docs; production Desktop **does not** invoke it (Apply is stubbed in
`App.tsx`).

### 5.3 Existing Agent Workspace reuse

Reuse these surfaces; do **not** design a second Workspace:

| Surface                                    | Reuse for N6                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| Project root header / `ConfirmRootChange`  | Always-visible root; stale/switch confirmation                 |
| Inspect / Doctor views + `desktopClient`   | Deep links and N4 tool result presentation (later slices)      |
| Diff review + `DiffViewer`                 | Project-diff tool output; future proposal paths (display only) |
| Timeline + `TimelineEvent`                 | N4 `timeline` tool; session activity list                      |
| `EvidenceBadge` / `ProvenanceDetail`       | Context/provenance panel                                       |
| `StatusChip` / `EmptyState` / `Modal`      | Session, tool, and graph states                                |
| `CodeBlock` / `FilePath`                   | Bounded excerpts and path lists                                |
| Settings / diagnostics                     | Provider connection **status** (not a second Ollama console)   |
| Command palette / `command-registry`       | “Open Neutron”, Cancel (later)                                 |
| `DesktopPanelRegistry`                     | Optional inspector/dock for evidence/activity                  |
| Foundation/inception conversation patterns | Prompt + transcript chrome — not their domain RPCs             |
| `ApprovedApplyModal`                       | **Do not reuse as N6 Apply.** See §6                           |

Recommendation: add `WorkspaceView` value `"Neutron"` and a dedicated
`NeutronWorkspace` module tree. Do **not** add a separate Desktop route or
window.

---

## 6. Current Apply stub (must stay disabled in read-only N6)

Verified in `apps/desktop/src/App.tsx` (`onApprovePlan`):

1. User can open `ApprovedApplyModal` with a plan digest and changed paths.
2. Primary button injects `["atomic-commit-approval"]`.
3. Handler **does not** call `intentloom.project.approvedApply.v1`.
4. After 600 ms it fabricates `applied: true`, empty diagnostics, and rollback
   files with `previousContent: "// previous snapshot content"`.

What is fake:

- Mutation itself
- Gate result (`passed: true`, `safeNextAction: "action-applied-successfully"`)
- Rollback evidence

What must remain unavailable during all N6 read-only slices:

- Approve & Apply in the Neutron view
- Any control that claims files were written
- Wiring the stub into Neutron session results
- Enabling `mutationAllowed`

What later replaces it (mutation workstream, **not** this brief):

- Render `NeutronMutationProposal` (wraps `ApprovedApplyPlan`)
- Host-issued `NeutronMutationApproval` (Slice 1 contracts already exist)
- Slice 2 semantic preflight (diagnostics only)
- Slice 3+ real `executeApprovedApplyPlan` via daemon

Read-only N6 must not create the impression that mutation occurred. If Agent
Workspace Apply remains reachable from other views, it stays a **known
pre-existing stub** and is out of N6 Slice 1 scope to “fix,” but Neutron UI
must never call it or display stub success as Neutron output.

---

## 7. Provider / model UX

Display `NeutronAdapterCapability` (N1), not an Ollama-only console:

| Field          | Source                                                             |
| -------------- | ------------------------------------------------------------------ |
| Provider kind  | `providerKind`: `ollama` \| `deterministic-test` \| `unconfigured` |
| Model ID       | `modelId`                                                          |
| Local / remote | Derive: loopback Ollama = local; never silently switch to hosted   |
| Network mode   | `networkMode`: `offline` \| `explicit-egress`                      |
| Data handling  | `dataHandling`: `ephemeral` \| `retained`                          |
| Streaming      | `supportsStreaming` (currently **false** on Ollama adapter)        |
| Tool calls     | `supportsToolCalls`                                                |
| Connection     | Daemon health + adapter reachability (distinct errors)             |
| Unavailable    | `adapter-unconfigured`, connection refused, missing model          |

First implementation may only configure the current Ollama adapter. Copy must
stay provider-neutral (“Local model service unavailable”), not “Ollama died,”
unless the configured `providerKind` is `ollama`.

Do not silently fall back to a remote provider.

---

## 8. Session lifecycle UX

Use **N1 `NEUTRON_SESSION_STATES` only**. Do not invent `running` / `active` /
`idle` as protocol states.

| Protocol state | User meaning                       | Prompt | Start                  | Cancel | New task |
| -------------- | ---------------------------------- | ------ | ---------------------- | ------ | -------- |
| `created`      | Session bound to root; no turn yet | on     | on (if provider ready) | off    | n/a      |
| `discussing`   | Model turn in discuss              | off    | off                    | on     | off      |
| `inspecting`   | Inspect-oriented turn              | off    | off                    | on     | off      |
| `planning`     | Plan-oriented turn                 | off    | off                    | on     | off      |
| `completed`    | Last turn finished                 | on     | on                     | off    | on       |
| `cancelled`    | Runtime acknowledged cancel        | on     | on                     | off    | on       |
| `timed-out`    | Timeout                            | on     | on                     | off    | on       |
| `failed`       | Normalized error                   | on     | on                     | off    | on       |

**UI-only** (not protocol states):

- **Connecting** — Desktop daemon connect (`WorkspaceInspectStatus`)
- **Cancelling** — host sent cancel; session state not yet `cancelled`. No
  optimistic `cancelled`. Disable a second cancel until ack or timeout.
- **Provider starting** — daemon up, adapter not ready

Map the prompt’s informal “running” to
`discussing | inspecting | planning`. Map “idle” to `created | completed`.
Map “error” to `failed` plus infrastructure statuses from §20.

---

## 9. Project / root UX

Every Neutron surface shows:

- selected project identity
- canonical root
- `sessionId` + `projectId` from `NeutronRuntimeSession`
- session-to-root binding

Rules:

- Changing root requires `ConfirmRootChange` and **ends** the current session
  (no hidden reuse).
- N5 stale `project` kind → warning + result `accepted: false` (see §16).
- Desktop `stale_root` / `invalid-root` remain infrastructure statuses.
- Cross-project memory/session reuse is already forbidden in N3; UI must not
  imply otherwise.

---

## 10. Main workspace layout

**Recommended approach:** Neutron tab/view **inside** Agent Workspace.

Rejected:

- Dedicated second Desktop app/window (duplicates daemon/root chrome)
- Stuffing Neutron into Inspect (Inspect is a project operation, not a session)

First production layout (desktop-primary):

```text
┌ Session header: root · provider/model · network · read-only · session state ┐
├ Conversation / task input                                                    ┤
├ Result (default)          │ Activity (tools) │ Evidence (collapsed)          ┤
└ Footer: usage · cancel · capability summary                                  ┘
```

Slices 3+ may add a graph region **above** activity or as a collapsible third
panel. Do not put conversation, full graph, full evidence, and raw JSON on one
unscoped screen.

Constrained width: stack result → activity → evidence; collapse side panels;
graph falls back to a list (see §30).

---

## 11. Conversation / task input

User-visible fields only:

- request text
- optional task title
- optional profile / role from `NEUTRON_DELEGATED_AGENT_ROLES` (read-only
  clamp; no autonomy sliders)
- implicit project context (root already selected)
- provider/model identity (display; change only via existing Settings if a
  contract already exists — do not invent a provider marketplace)

Do not expose protocol JSON, `argumentsJson`, approval tokens, or
`mutationAllowed` toggles.

Slice 1: one prompt → one read-only turn. Multi-turn transcript can reuse
chat chrome later without new autonomy controls.

---

## 12. Context UX (N3)

`NeutronContextBundle` + `NeutronContextSource`:

Show by default: count of included/excluded sources, estimated tokens, budget
flag, secret-exclusion **count** (paths only, never file bodies).

Progressive disclosure per source:

- source type / `kind` (`inspect`, `memory`, `skill`, `policy`, `evidence`, `task`)
- trust class (`project`, `catalog`, `user`, `derived`)
- path or source identity
- included vs `exclusionReason`
- loading level when `kind === "skill"`
- provenance string
- content digest (developer detail)

Do not dump the assembled prompt. Do not show secret file contents. Do not
treat model text as a context source.

---

## 13. Skills UX

If the bundle lists skills: name, `loadingLevel`
(`catalog` | `contract` | `procedure`), provenance/rationale when present.

N6 first slices: **read-only visibility only**. No activate / propose / rollback
skill UX.

---

## 14. Tool activity UX (N4)

Seven tools: `inspect`, `doctor`, `memorySearch`, `timeline`, `conformance`,
`securityAudit`, `projectDiff`.

Each activity row:

- tool name (human label + stable id)
- state: running / completed / failed / capability-denied
- bounded input summary (not raw `argumentsJson` by default)
- structured output summary (viewmodels already used by Inspect/Doctor/Diff
  where the same operation exists)
- duration if the later event/envelope exposes it; otherwise omit
- `NeutronErrorCode` when failed

Developer detail: envelope JSON. Default UI must not be a JSON dump.

Capability-denied is first-class, not a generic failure.

---

## 15. Tool security visibility

Persistent chrome (not Settings-only):

- **Read-only session** badge (`mutationAllowed: false`)
- Allowed tools list (the seven)
- **Mutation not authorized**
- **No generic shell**

This is authoritative UI state from the session contract, not model wording.

---

## 16. Task graph / subagent UX (N5)

Node states are `NEUTRON_TASK_STATES`:

`pending`, `ready`, `running`, `blocked`, `cancelled`, `timed-out`, `failed`,
`completed`.

Graph outcome statuses are `NEUTRON_GRAPH_STATUSES`:

`completed`, `failed`, `cancelled`, `timed-out`, `incomplete`, `stale`.

Do not add “AI thinking.” `running` is enough.

Per node / subagent show:

- `taskId`, title / `expectedOutput`
- `role`, `requiredCapabilities` (effective clamp)
- parent / dependencies
- attempt count (max **2** — N5 Slice 4)
- current state
- model/provider when the node result carries it
- tools used
- result digest / summary
- error
- provenance (parent-child, attempts, tool payload digests)

Hide chain-of-thought. Model prose is never a node-state source.

Concurrency: N5 wave cap is **1–4**. Show `runningCount / capacity` when a wave
is active. Do not offer “spawn N agents.”

---

## 17. Retry / cancellation UX

Retries: keep **Attempt 1** visible after Attempt 2 succeeds (failed/timed-out
reason + Attempt 2 state). Do not collapse history.

Cancellation:

- Cancel current node/task where the runtime supports it
- Cancel session
- UI **Cancelling** until `NeutronRuntimeEvent.kind === "cancellation"` **and**
  session/node state is `cancelled`
- Desktop today discards in-flight inspect results on `AbortSignal` while the
  daemon may finish (`desktop-client.ts`). Neutron cancel must be **runtime
  acknowledged**, not client-discard-as-success

No fake cancellation.

---

## 18. Stale-state UX

N5 `detectNeutronGraphStaleness` kinds: `project`, `checkpoint`, `profile`.

UI:

- banner: result **not accepted** (`accepted: false`, `rerunAttempted: false`)
- which kind(s) mismatched (expected vs current fingerprints — not raw secrets)
- required action: refresh / re-plan (user-initiated)

Do **not** auto-rerun (type-level `rerunAttempted: false`).

---

## 19. Result / evidence / provenance UX

Final result uses graph/session outcome, **not** “the model said OK”:

| Outcome                              | Presentation                                  |
| ------------------------------------ | --------------------------------------------- |
| `completed`                          | Summary + evidence; still not “verified ship” |
| `incomplete`                         | Partial nodes; no success chrome              |
| `failed` / `timed-out` / `cancelled` | Error-first                                   |
| `stale`                              | Warning-first; not accepted                   |

Show: summary, evidence links, provenance, tools, attempts, usage, affected
scope **only if** a `NeutronMutationProposal` exists (display; no Apply).

Evidence panel sections (progressive):

1. Context sources
2. Capabilities / read-only tools
3. Model / provider
4. Tool calls
5. Task graph
6. Attempts
7. Fingerprints / verification state
8. Developer JSON

---

## 20. Error / offline UX

Normalize into two classes:

**Infrastructure** (Desktop/daemon/provider):

| Condition                       | Existing or N1 signal                   | User action                                   |
| ------------------------------- | --------------------------------------- | --------------------------------------------- |
| Daemon unavailable              | `disconnected`, `authentication_failed` | Connect / restart Desktop daemon              |
| Incompatible protocol           | `protocol-mismatch`                     | Update Desktop / daemon together              |
| Invalid / stale root            | `invalid-root`, `stale_root`            | Re-select project                             |
| Provider unavailable / starting | `adapter-unconfigured` + local service  | Start local model service; no remote fallback |
| Model missing                   | adapter/model error                     | Configure `modelId`                           |

**Task** (Neutron `NEUTRON_ERROR_CODES`):

`validation-failed`, `root-mismatch`, `unsupported-tool`, `cancelled`,
`timeout`, `budget-exceeded`, `network-forbidden`, `capability-denied`,
`permission-denied`, `operation-failed`.

Do not render a task failure as “daemon crashed” or vice versa.

Offline/local-first (first provider = loopback Ollama):

| Daemon | Provider      | UI                                                          |
| ------ | ------------- | ----------------------------------------------------------- |
| up     | up            | Neutron enabled                                             |
| up     | down          | Session create may succeed; Start disabled + provider error |
| down   | any           | Neutron disabled; existing connect recovery                 |
| up     | model missing | Start disabled + model identity error                       |

---

## 21. Streaming and progress assessment

**Streaming:** `OllamaModelAdapter` sets `supportsStreaming: false` and posts
`stream: false`. `ModelTurnResult` is a completed turn. N1
`NeutronAdapterCapability.supportsStreaming` is the future flag.

Do **not** invent token streaming in N6 Slice 1. A later contract slice may add
streaming if an adapter actually supports it. Request/response is sufficient to
start N6.

**Progress:** `NeutronRuntimeEvent` kinds are `progress`, `cancellation`,
`timeout`, `error`. The daemon has **no** JSON-RPC notification / push surface
(handlers return request/response only). Desktop has no Neutron subscription.

Minimum later bridge (not Slice 1-blocking):

- preferred: daemon notifications → Tauri event → UI, **or**
- acceptable: `intentloom.neutron.session.get.v1` poll **only while** a turn is
  in flight (existing Desktop pattern for long RPC is still request/response)

Slice 1 may show `discussing|inspecting|planning` for the duration of one
`execute` RPC, then apply the returned snapshot. Tool/graph live updates wait
for the event bridge in Slice 2–3.

---

## 22. Daemon / protocol inventory

### Already stable (reuse, do not duplicate)

| RPC                                     | N6 use                                             |
| --------------------------------------- | -------------------------------------------------- |
| `intentloom.daemon.info.v1`             | Protocol/auth/version                              |
| `intentloom.project.inspect.v1`         | Existing Inspect; N4 inspect is the same domain op |
| `intentloom.project.doctor.v1`          | Doctor / N4 doctor                                 |
| `intentloom.project.diff.v1`            | Diff / N4 projectDiff                              |
| `intentloom.project.timeline.v1`        | Timeline / N4 timeline                             |
| `intentloom.memory.search.v1`           | N4 memorySearch (if Desktop later deep-links)      |
| `intentloom.security.audit.v1`          | N4 securityAudit                                   |
| `intentloom.engineering.conformance.v1` | N4 conformance                                     |
| `intentloom.session.get.v1`             | Existing non-Neutron session — **do not overload** |

### Requires thin Neutron exposure (new methods; reuse N1–N5 types)

Proposed names (implementation may adjust; keep `intentloom.neutron.*.v1`):

| Method                                                  | Purpose                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `intentloom.neutron.session.create.v1`                  | Bind root/project; return `NeutronRuntimeSession` + adapter capability |
| `intentloom.neutron.session.get.v1`                     | Status snapshot                                                        |
| `intentloom.neutron.session.cancel.v1`                  | Host cancel; wait for runtime ack                                      |
| `intentloom.neutron.turn.execute.v1`                    | One read-only N2 loop (Slice 1)                                        |
| later: `intentloom.neutron.graph.execute.v1` / `get.v1` | N5 reconcile result                                                    |
| later: notifications or `events.poll.v1`                | Progress                                                               |

Request/response wrappers live in protocol. Bodies **are** existing
`NeutronRuntimeSession`, `NeutronContextBundle`, `NeutronToolEnvelope`,
`NeutronGraphExecutionResult`, `NeutronUsageBudget`, `NeutronRuntimeEvent`.
No Desktop-specific domain schemas.

### Deferred mutation

| RPC                                   | Status                                           |
| ------------------------------------- | ------------------------------------------------ |
| `intentloom.project.approvedApply.v1` | Exists; Desktop stubbed; **out of N6 read-only** |
| Neutron mutation preflight / Apply    | Mutation Slice 2–5                               |

Do not add a second Apply endpoint for Desktop.

---

## 23. N3 optional Slice 5

N3 Slice 5 is CLI/daemon **assembly command** exposure. N6 does **not** need a
standalone `assembleNeutronContext` CLI if `turn.execute` / session snapshot
already returns the N3 bundle (or a summary + developer detail).

**This brief does not authorize N3 Slice 5.**

---

## 24. Protocol additions (minimum for read-only N6)

Slice 1:

- create / get / cancel / execute-turn request+response URNs
- validators (fail closed; unknown extras ignored per existing Neutron style)
- Desktop client parsers

Reuse N1 types. Do not fork session/tool/graph shapes for UI.

Later slices: graph get, event envelope, proposal **view** (already have
`NeutronMutationProposal`).

---

## 25. State management

Keep the current pattern:

- **Server/runtime state:** last daemon snapshot (session, adapter, result)
  in a `useNeutronSession` hook — single source, replace on RPC
- **Ephemeral UI:** panel collapsed, selected node, developer-detail open,
  draft prompt

Do **not** add a global state framework. Do not grow `App.tsx`; pass a small
props bag or a Neutron controller hook like `use-desktop-connect`.

---

## 26. Component architecture

Prefer new files under `apps/desktop/src/neutron/` (names illustrative):

| Module                          | Responsibility                   | Budget |
| ------------------------------- | -------------------------------- | ------ |
| `NeutronWorkspace.tsx`          | View composition only            | ≤250   |
| `NeutronSessionHeader.tsx`      | Root, provider, read-only, state | ≤200   |
| `NeutronTaskComposer.tsx`       | Prompt / start                   | ≤200   |
| `NeutronResultPanel.tsx`        | Outcome + summary                | ≤250   |
| `NeutronActivityPanel.tsx`      | Tool rows (Slice 2)              | ≤250   |
| `NeutronEvidencePanel.tsx`      | Provenance (Slice 4)             | ≤250   |
| `NeutronTaskGraph.tsx`          | Graph/list (Slice 3)             | ≤250   |
| `NeutronCapabilityBanner.tsx`   | Read-only / tools / no shell     | ≤120   |
| `neutron-session-controller.ts` | RPC + mapping                    | ≤250   |
| `desktop-client-neutron.ts`     | Client methods                   | ≤150   |

Reuse design-system primitives. Do not add a UI barrel. Do not grow
`App.tsx` (497) or `WorkspaceContent.tsx` (291) except a view-switch arm and
import.

Suggested names may change to match local conventions; the **boundary** is
mandatory.

---

## 27. File-size governance

N6 must follow `CODE_QUALITY_STANDARDS.md`: prefer ≤250 effective, review >300,
hard ≤400 / 700 physical without an approved exception.

`App.tsx` is already over 400. **N6 must not grow it materially.** Extract if a
touch is required.

---

## 28. Accessibility

Follow `REACT_BEST_PRACTICES.md` / `docs/desktop/A11Y_AUDIT.md`:

- keyboard: start, cancel, panel collapse, graph list fallback
- visible focus
- status via text + glyph (`StatusChip`), never color-only
- `aria-live` for session/tool/graph state changes
- `useId` for labeled fields
- focus return on modal dismiss
- `prefers-reduced-motion`: no looping graph animations

---

## 29. Responsive behavior

Desktop-primary. Minimum useful width: header wraps; side panels collapse;
graph becomes a vertical list. Do not design a phone layout.

---

## 30. Security / privacy

Never display:

- N3 secret file bodies (paths in `excludedSecretLikePaths` only)
- hidden chain-of-thought
- raw credentials / provider tokens
- unrestricted environment dumps

Provider credentials stay outside project metadata (N1
`credentialIsolation: "outside-project-metadata"`). Activity uses bounded
structured payloads.

---

## 31. Threat model

| Threat                                 | Mitigation                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| UI implies mutation when none occurred | No Apply in Neutron; `mutationAllowed: false` badge; never bind stub `applied: true` |
| Stale result shown as accepted         | `accepted` + stale kinds are authoritative; success chrome forbidden when `stale`    |
| Cross-project session display          | Session record includes root/`projectId`; root change ends session                   |
| Capability state hidden                | Persistent read-only / tool / no-shell chrome                                        |
| Model text impersonates tool/evidence  | Distinct components; tool cards only from `NeutronToolEnvelope`                      |
| Model text looks like approval         | No Approve control; ignore model `grantedApprovals`                                  |
| Secret leakage in context panel        | Paths + reasons only; no excerpt for excluded secret-like sources                    |
| Forged provider/tool status            | Render adapter/tool snapshots from daemon, not model prose                           |
| Cancel UI diverges from runtime        | Cancelling until ack; discard ≠ cancelled                                            |
| Daemon disconnect mid-run              | Infrastructure error; do not mark task `completed`                                   |
| Desktop calls Ollama                   | Allowlist + architecture tests; no webview network                                   |
| Stub Apply confusion                   | Neutron view never mounts `ApprovedApplyModal`                                       |

Specialist reviews at implementation: `aif-security-review` if auth/IPC
changes; keep capabilities least-privilege.

---

## 32. Testing strategy

### Component / unit

Session states, graph states, retry history, errors, stale banner, capability
badge, provider unavailable, cancel-pending vs cancelled.

### Integration

Fake daemon: create session, execute read-only turn, provider down, tool
activity, graph result, cancel ack, final snapshot. Reuse N2 fake `/api/chat`
**inside application tests**; Desktop tests speak JSON-RPC fixtures only.

### Security

- model text cannot render a tool card
- model text cannot render approval/Apply
- read-only badge stays on `mutationAllowed: false`
- Neutron client never calls `approvedApply` or the App stub

### E2E

One packaged or harnessed Desktop flow with fake provider and fake daemon: open
project → Neutron → see local provider/model → ask → result/evidence → **source
fingerprint unchanged**. No real network.

Mirror existing `tests/desktop-*.test.ts` and daemon contract tests.

---

## 33. Runtime package decision

N5 deferred `packages/neutron-runtime` until a real extra-package consumer.
Mutation Slice 1 kept routing in application.

Facts now:

- ~35 `neutron-*.ts` modules already live in `@intentloom/application`
- Desktop **must not** import application
- N6 consumer is **daemon + protocol**, same as Inspect/Doctor
- Extracting a package now is a migration, not an N6 Slice 1 need

**KEEP NEUTRON RUNTIME IN APPLICATION**

Revisit only if a second in-process host (not Desktop) cannot go through the
daemon. N6 Desktop is not that gate.

---

## 34. Mutation workstream relationship

Shared risk files: `packages/protocol/src/index.ts`, daemon dispatch tables,
`DUTY_WATCH.md` / `PROJECT_STATE.md` / runtime roadmap.

| Workstream       | Owns                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation Slice 2 | `neutron-mutation*` application/validator, N4 permission class, preflight engine, `tests/neutron-mutation*`                                                                   |
| N6 Slice 1       | new `intentloom.neutron.*` protocol wrappers, daemon handlers, Tauri allowlist arms, `apps/desktop/src/neutron/**`, `desktop-client-neutron.ts`, Desktop/daemon Neutron tests |

Do not edit `ApprovedApplyModal` / App stub in N6 Slice 1. Do not add Apply in
Mutation Slice 2.

---

## 35. First N6 implementation milestone (exactly one)

# N6 Slice 1 — Desktop read-only session shell + daemon contract exposure (implemented)

### Objective

One selected project can start a Neutron session over the authenticated daemon,
show provider/model identity, submit a user prompt, run **one** read-only model
turn (`runNeutronN2ReadOnlyLoop`), and show a basic result. Source fingerprint
unchanged.

### Reused APIs

`NeutronRuntimeSession`, `NeutronAdapterCapability`, `NeutronUsageBudget`,
`NeutronRuntimeEvent`, `runNeutronN2ReadOnlyLoop`, existing daemon auth/info,
Desktop connect/root chrome, design-system components.

### Likely files

- `packages/protocol/src/neutron-session-rpc.ts` (or equivalent wrappers)
- `packages/validator/src/neutron-session-rpc.ts`
- `packages/daemon/src/` Neutron handlers + tests
- `apps/desktop/src-tauri/src/method_allowlist.rs`, `commands.rs` (new arm only)
- `apps/desktop/src/desktop-client-neutron.ts`
- `apps/desktop/src/neutron/*`
- `workspace-navigation.ts` (add `"Neutron"`)
- `tests/daemon-neutron-session.test.ts`, `tests/desktop-neutron-session.test.ts`

### Tests

Create/get/cancel; execute turn with fake adapter; provider unconfigured;
protocol mismatch; fingerprint unchanged; no `approvedApply`; Desktop client
parse failures fail closed.

### Non-goals

Task graph visualization; tool activity panel; mutation proposal UI; Apply;
streaming; N3 Slice 5 CLI; `packages/neutron-runtime`; changing
`mutationAllowed`; P4l17; Mutation Slice 2–5.

### Exit gate

Packaged or CI Desktop path completes one fake-provider read-only turn via
daemon. Provider/model/root/session state visible. Cancel either disabled
(no in-flight ack yet) **or** acknowledged — do not ship discard-as-cancelled.
No Apply. `App.tsx` not materially grown. `pnpm verify` + Desktop CI.

---

## 36. Proposed N6 slices

Derived from **repo gaps** (no Neutron RPC/UI first; then activity; then N5
surfaces; then evidence polish; then proposal display after mutation gates).

### Slice 1 — session RPC + shell

See §35.

### Slice 2 — context + tool activity

**Objective:** Show N3 bundle summary and N4 tool rows from the same turn/graph
snapshot.

**Reuse:** context/tool types; existing Inspect/Doctor/Diff viewmodels for
summaries.

**Files:** `NeutronActivityPanel`, `NeutronEvidencePanel` (context section),
event bridge if needed for in-turn tools.

**Tests:** tool denied, secret paths listed not opened, model text ≠ tool card.

**Non-goals:** graph viz, Apply.

**Exit:** user can see what was read and which tools ran.

### Slice 3 — task graph, subagents, retry, cancel

**Objective:** Visualize `NeutronTaskGraph` / `NeutronGraphExecutionResult`;
attempts; concurrency 1–4; cancel ack.

**Reuse:** N5 aggregate/stale/provenance.

**Files:** `NeutronTaskGraph`, graph RPC get/execute.

**Tests:** all node states, retry history, stale, cancel.

**Non-goals:** mutation proposal, auto-rerun.

**Exit:** graph states match protocol; no “thinking” state.

### Slice 4 — evidence / provenance / result UX

**Objective:** Production-worthy result + evidence panel (usage, fingerprints,
warnings).

**Reuse:** `ProvenanceDetail`, usage budget, graph `accepted`.

**Tests:** stale vs completed chrome; budget-exceeded.

**Non-goals:** Apply.

**Exit:** N6 read-only exit criteria in §38 except mutation-proposal display.

### Slice 5 — mutation proposal / review UI (after mutation contract gates)

**Objective:** Render `NeutronMutationProposal` as **not authorized**; no
Approve/Apply unless a **later** grant.

**Reuse:** Slice 1 contracts; DiffViewer for paths.

**Non-goals:** Mutation Slice 3 Apply.

**Exit:** proposal visible; Apply impossible.

Do not start Slice 5 from N6 Slice 1 authorization.

---

## 37. First user-visible milestone

After Slice 1 (authorized later):

1. Open a local project in Desktop (existing flow).
2. Open **Neutron** in Agent Workspace.
3. See daemon-connected local provider and model id (or a clear unavailable
   state).
4. Type a task. Start one read-only run.
5. Wait for the turn (session state `discussing` / `inspecting` / `planning`).
6. See a result summary and that the session is read-only.
7. Source files / project fingerprint unchanged.

After later N6 slices: bounded context, tool activity, graph, evidence — still
no Apply.

---

## 38. N6 read-only exit gate

- Desktop uses authenticated daemon only
- No direct provider call from Desktop or Tauri
- Selected root explicit; no cross-project session reuse
- Model/provider/network/data-handling visible
- N3 context bounded and provenance visible
- N4 tools visible
- N5 task states visible
- Cancellation follows runtime acknowledgement
- Stale state visible and not auto-rerun
- Normalized infrastructure vs task errors
- Source fingerprint unchanged
- No mutation UI capable of Apply
- No fake success (including the existing stub not used as Neutron Apply)
- Cross-platform Desktop CI
- E2E fake-provider proof

---

## 39. Future mutation UX boundary (design only)

Extension points, **disabled** through N6 read-only:

```text
proposal → review → approval → Apply → verification → rollback
```

Design now without binding to unfinished Slice 2–5:

- Proposal panel props: `NeutronMutationProposal | null`
- Copy: **Mutation not authorized**
- Fields: proposal id, changed paths, plan digest, baseline digest, mutation
  class (`approved-transaction-apply`)
- Do **not** mount Approve/Apply, do not call preflight Apply, do not reuse
  the App stub

Interfaces that are safe to sketch: read-only panel + protocol types.
Interfaces that are **not** safe to implement: approval token entry, Apply
button, “applied successfully.”

---

## 40. Documentation / authorization

This file is the N6 canon. Implementation requires a **separate** maintainer
grant naming Slice 1.

Unauthorized from this brief: N6 implementation, Mutation Slice 2–5 Apply,
optional N3 Slice 5, P4l17, `packages/neutron-runtime`, changing
`mutationAllowed`.

---

## 41. Brief implementation record

| Item           | Value                                               |
| -------------- | --------------------------------------------------- |
| Brief baseline | `ee3ec5bbfdb829cc94a0228aa17fd7cd6b0349d4`          |
| Artifact       | `docs/roadmap/NEUTRON_N6_DESKTOP_READONLY_BRIEF.md` |
| Code changed   | None (brief-only record)                            |

---

## 42. Slice 1 implementation record

| Item              | Value                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Baseline          | `d08ba9411c44128b39d5ddb279ccd14114103ad2`                                                            |
| RPCs              | `intentloom.neutron.session.create.v1`, `.get.v1`, `.cancel.v1`, `intentloom.neutron.turn.execute.v1` |
| Desktop           | Neutron view in existing Agent Workspace; `desktopClient` → `invoke_neutron_request` → daemon         |
| Runtime           | `@intentloom/application/neutron-session` wrapping `runNeutronN2ReadOnlyLoop` plus existing N3/N4     |
| `mutationAllowed` | Literal `false`                                                                                       |
| Streaming         | Unavailable. No token stream and no daemon event push                                                 |
| Cancellation      | Runtime-acknowledged through `session.cancel.v1` aborting the in-flight N2 `AbortSignal`              |
| Apply             | Not invoked. Existing `ApprovedApplyModal` stub remains isolated                                      |
| Next gate         | Explicit maintainer authorization required. Do not assume N6 Slice 2                                  |
