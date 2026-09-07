# Neutron Mutation Routing — Maintainer Brief

## Status

**Planning only.** This brief does not authorize implementation.

N1–N5 read-only runtime is complete on `main`. Mutation routing, write tools,
generic shell, N6 Desktop Neutron Workspace, optional N3 Slice 5, and P4l17
remain unauthorized until a later explicit maintainer grant.

Evidence baseline: `origin/main` @
`f2a363e2dc53b12390c09b2e1a6dd8815eb692a5` (2026-09-07). N5 Slice 5 merge
`7a6e07c27ffd35bb679803611ede3dfdfcf25a00` (#453). N5 handoff merge / current
`main` `f2a363e2dc53b12390c09b2e1a6dd8815eb692a5` (#454).

Authoritative roadmap gate:
[`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md) §N5–§N6 and this
brief.

---

## 1. Current baseline

| Item | Evidence |
| --- | --- |
| **Current `main` SHA** | `f2a363e2dc53b12390c09b2e1a6dd8815eb692a5` (`main` == `origin/main`) |
| **N5 Slice 5** | PR #453 head `a6819a49fe3cf1adbda93ea835d96fdf1decfc52`, merge `7a6e07c` |
| **N5 handoff** | PR #454 head `502629ffe7e5256a5fa4ad3b15b37c4760747240` |
| **N1–N5** | Runtime contracts, model adapter, context assembly, read-only tool router, executable task graph |
| **`mutationAllowed`** | N1 `NeutronRuntimeSession.mutationAllowed` is typed `false`; validator rejects any other value |
| **N4 catalog** | `inspect`, `doctor`, `memorySearch`, `timeline`, `conformance`, `securityAudit`, `projectDiff` |
| **Mutation implementation** | Unauthorized |

### Capability summary used by this brief

| Surface | Role today |
| --- | --- |
| **N4** | Fail-closed read-only router. `definition.readOnly !== true` → `mutation-forbidden`. Capabilities must be `readOnly: true` and `allowNetwork: false`. |
| **N5** | One-wave scheduler with leases, retry, cancellation, stale project/checkpoint/profile detection, provenance. No Apply. |
| **ADR-0053** | Approved Apply gate + `executeApprovedApplyPlan` → `synchronizeGeneratedFiles`. |
| **Daemon** | `intentloom.project.approvedApply.v1` exists; handler is optional and currently unwired in Desktop spawn. |
| **Desktop** | `ApprovedApplyModal` can request `["atomic-commit-approval"]`; App apply path is a **client stub** that fabricates success and does not call the daemon. |

---

## 2. Mutation-routing definition

Mutation routing is **not** “the model writes files.”

It is:

```text
model / N5 subagent
  → typed mutation proposal (no bytes written)
  → affected-scope + policy/capability checks
  → review artifact
  → host-issued explicit human approval (bound record)
  → N4 mutation-class route for one already-approved transaction
  → canonical executeApprovedApplyPlan
  → synchronizeGeneratedFiles
  → verification + evidence + rollback metadata
```

**Invariant (unchanged):** model output, repeated success, subagent results,
schedules, tool requests, or a model-supplied `approved: true` /
`grantedApprovals` array never constitute mutation approval.

The router must never hand the model `writeFile`, `rm`, `mkdir`, `chmod`,
arbitrary rename, unrestricted patch, shell, git, or dependency installation.

---

## 3. Existing mutation foundations

Implementation and tests are authoritative. Do not invent a second transaction
engine.

### 3.1 Diff / proposal

| Primitive | Location | Mutation? |
| --- | --- | --- |
| `diffProject` | `@intentloom/application`; N4 `projectDiff`; daemon `intentloom.project.diff.v1` | No. `applied: false`; contents omitted in N4. |
| `inspectProject` / `doctorProject` | Application + N4 | No. Doctor `dryRun: true` in N4. |
| Agent Workspace Plan | `promoteWorkspaceConversationToProposal` → `.aif/proposals/<id>.json` | No. |
| Agent Workspace Review | `reviewWorkspaceProposal` | No. |
| Existing-project adoption plan | `planProjectAdoption` / `adoptProject` proposal | No until apply. |
| `ApprovedApplyPlan` | `packages/protocol/src/approved-apply.ts` | Schema only: `planDigest`, `projectStateDigest`, `targetRoot`, `changedPaths`, optional `expiresAt`. |

**Change representation for Neutron Apply:** `ApprovedApplyPlan` + the
`GeneratedFile[]` payload consumed by `executeApprovedApplyPlan`. N4
`projectDiff` stays read-only and must not become Apply.

### 3.2 Transaction / apply engines (do not replace)

| Engine | API | What it writes | Use for Neutron? |
| --- | --- | --- | --- |
| **Generated-file transaction** | `synchronizeGeneratedFiles` | Planned generated/metadata bytes; collision/path checks; staged write; rollback on failure; post-write consistency | **Yes — inner writer** for Approved Apply |
| **Approved Apply** | `evaluateApprovedApplyPlan` + `executeApprovedApplyPlan` | Gate then sync; rollback evidence of previous bytes | **Yes — canonical Neutron Apply** (ADR-0053) |
| **Adoption apply** | `applyProjectAdoption` | Duty-watch/governance pack `create` ops + journal | **No.** Wrong artifact set ([desktop pre-apply review](DESKTOP_ADOPTION_PRE_APPLY_SECURITY_REVIEW.md)). |
| **Workspace apply** | `applyWorkspaceProposal` | Requires non-empty `approvedBy`, then calls `adoptProject` | **Not** general file mutation. Human-approval *pattern* only. |
| **Scaffold** | `applyProjectScaffold` / `rollbackProjectScaffold` | Inception/foundation scaffolds | **No.** |

Daemon method `intentloom.project.approvedApply.v1` already types
`ApprovedApplyRequest` → `ApprovedApplyExecutionResult`. Rust allowlist
includes the method. Production Desktop does not currently inject
`options.approvedApply`.

### 3.3 Approval infrastructure

| Record | Binding | Gap for Neutron |
| --- | --- | --- |
| `ApprovedApplyRequest.grantedApprovals` | String list; gate requires `"atomic-commit-approval"` | **Spoofable** if the model or a tool argument supplies the list. Not a bound token. |
| `ExistingProjectAdoptionApproval` | `approvalId`, `approvalDigest`, `approvalToken`, `root`, `planDigest`, `projectFingerprint`, `approvalValidUntil`, source `local-interactive` | Stronger pattern. `approved: true` is host-written, not model-written. Not wired to Neutron. |
| Workspace `approvedBy` | Non-empty string | Identity string only; no digest/expiry/scope. |
| Desktop modal | Host click injects `["atomic-commit-approval"]` | Correct *injection locus*; current App success path is fake. |

**Reuse:** host-issued bound approval (adoption-approval shape) + Approved
Apply plan/request/result. **Do not** accept model-controlled
`grantedApprovals`.

### 3.4 Evidence / verification / rollback

| Primitive | Evidence |
| --- | --- |
| Sync transaction result | `status`, created/updated/unchanged paths, `rollbackCompleted`, `rollbackFailures`, post-write consistency (`docs/reference/GENERATED_FILES.md`) |
| Approved Apply result | `applied`, `gateResult`, optional `rollbackEvidence` (`planDigest`, `targetRoot`, previous bytes or `null` for creates) |
| N5 provenance | Parent/child, attempt, capability, N3, N4 digests (`neutron-scheduler-provenance.ts`) |
| N5 stale | Project fingerprint, checkpoint authority, profile fingerprint (`detectNeutronGraphStaleness`); `rerunAttempted: false` |
| Doctor / diff / conformance / security | Existing N4 read-only tools after Apply |
| Desktop stub rollback | Placeholder `"// previous snapshot content"` — **not** evidence |

### 3.5 Path / sandbox

| Control | Current strength |
| --- | --- |
| N4 `trustedRoot` | Session root equality; rejects `..` in tool `root`. No `realpath`. |
| N4 session bind | Invocation `root`/`sessionId` must match session. |
| Sync `noncanonicalPathPlan` | Rejects non-canonical generated paths before write. |
| Sync pre-replace | Comment: revalidate to narrow symlink substitution races. |
| Inspection | `inspection-root-symlink` diagnostic exists on inspect, not on N4 mutate (there is no N4 mutate). |
| Extension lock / scaffold | `realpath` / reject symlinked roots. |

Mutation raises the cost of N4’s string-equality root check. Slice work must
reuse sync/canonicalization and add Neutron preflight `realpath` containment
before Apply.

---

## 4. Proposal vs execution authority

Two distinct classes. The model cannot self-grant Apply.

### 4.1 Proposal capability (non-mutating)

Allows a role to:

- describe a bounded change;
- emit a structured `ApprovedApplyPlan` (digest, baseline fingerprint, root,
  changed paths, expiry);
- identify affected files;
- request that the host create a review/transaction record.

Does **not** write project bytes. May be an N5 task output or a future
read-adjacent tool (`proposePatch` / `createTransaction`) that only persists
a proposal under `.aif/` if a later slice explicitly adds that store.
Initial recommendation: **proposal is structured N5/task output + host
materialization**, not a filesystem tool.

### 4.2 Apply capability (mutating)

Allows the **host** to execute one already-approved
`ApprovedApplyRequest` through `executeApprovedApplyPlan`.

- Not granted to any `NEUTRON_DELEGATED_AGENT_ROLES` value.
- Not granted because a parent task or model tool-call asked for it.
- N4 exposes at most **one** mutation-class operation initially:
  `applyApprovedTransaction`.
- Payload is a host-held approval reference + plan digest, not file bytes
  invented at Apply time.

---

## 5. Approval contract

Do not accept generic `approved: true` from model-controlled input.

### 5.1 Required binding (Neutron approval record)

Host-issued after explicit human Approve. Fields (canonical names may match
adoption approval where they already exist):

| Bind | Why |
| --- | --- |
| `approvalId` / `approvalDigest` / `approvalToken` | Unforgeable host secret; digest covers the bound facts |
| `root` / `projectId` / `sessionId` | Session and project containment |
| `graphId` / `taskId` (optional but recommended) | N5 provenance |
| `transactionId` / `planDigest` | Exact proposal |
| `changedPaths` | Affected-file scope |
| `expectedMutationType` | e.g. `approved-apply-generated-sync` |
| `capabilityScope` | Profile/delegation clamp snapshot |
| `projectStateDigest` / N5 project fingerprint | Baseline |
| `checkpoint` / `profile` fingerprints when present | N5 stale dimensions |
| `approvedAt` / `approvalValidUntil` | Expiry |
| `approvingActor` / `approvalSource: local-interactive` | Human, not model |

The Apply path receives this record from Desktop/CLI/daemon session state,
**never** from tool `argumentsJson`.

### 5.2 Protocol gap

`NeutronRuntimeSession.mutationAllowed` is a literal `false` in protocol and
validator. Enabling session-level mutation **requires a versioned contract
change** (additive session field and/or new approval schema URN). This docs
task does not change protocol.

**Recommendation:** keep session `mutationAllowed: false` for all model-facing
snapshots. Apply authority lives on a **host approval record**, not on flipping
the session boolean from model-visible state. If a later slice needs a session
flag for UI, it must be host-authored and still insufficient without the bound
approval.

`grantedApprovals: ["atomic-commit-approval"]` remains the inner Approved Apply
gate string. Only the host adapter may attach it after validating the Neutron
approval record.

---

## 6. Stale-state / TOCTOU

Approval at state A must not apply against state B.

`evaluateApprovedApplyPlan` compares `projectStateDigest` **only when**
`currentProjectStateDigest` is passed. Expiry is optional. The engine does
**not** compare `filesToApply` to `changedPaths`.

### 6.1 Mandatory Apply preflight (fail closed)

Revalidate all of:

1. Project fingerprint / `projectStateDigest` (required, not optional).
2. N5 `detectNeutronGraphStaleness` when the proposal came from a graph
   (project, checkpoint, profile). No automatic rerun.
3. `planDigest` matches stored immutable proposal.
4. Approval token valid, unconsumed, unexpired, same root/session.
5. Effective capabilities still match approval `capabilityScope`.
6. Session/task not cancelled; no terminal session state.
7. `filesToApply` paths ⊆ approved `changedPaths` (set equality or strict
   subset per atomic policy; initial: **exact set**).
8. Canonical root containment (`realpath` under selected root).
9. No other active mutation transaction on the project.

On any mismatch: **fail closed**. Require re-review and a new approval.
No automatic mutation against stale assumptions.

---

## 7. Capability model

Effective mutation authority:

```text
host approval
  ∩ session root/sessionId
  ∩ profile.allowedCapabilities
  ∩ delegation.effectiveCapabilities
  ∩ task/node requiredCapabilities
  ∩ transaction changedPaths
```

`AgentRoleCapabilities` today: `readOnly`, `allowedPaths`, `allowedTools`,
`maxBudget`, `allowNetwork`. There is no `mutationAllowed` on the role
object.

### 7.1 Existing delegated roles

`context-scout`, `feature-builder`, `test-engineer`, `reviewer`,
`release-analyst`.

Do not invent `executor`.

| Role | Propose | Approve | Apply |
| --- | --- | --- | --- |
| `context-scout` | No | No | No |
| `test-engineer` | No | No | No |
| `release-analyst` | No | No | No |
| `reviewer` | No (review artifact only) | No — human only for initial slices | No |
| `feature-builder` | Yes, if profile/task grant proposal class | No | No |
| Human / Desktop / CLI host | Materialize review | **Yes** | **Yes** (after approval) |

Read-only profiles (`readOnly: true`) cannot Apply. A child cannot gain
proposal or Apply authority because a parent requested it.
`delegateTaskRole` remains an intersect, never a union.

---

## 8. N4 integration

Keep the seven read-only definitions unchanged (`readOnly: true`,
`rejectMutationFlags`, `trustedRoot`).

### 8.1 Additive mutation class

- New tool name **not** in `NEUTRON_READ_ONLY_TOOLS` (requires protocol
  union extension in the same slice that adds the tool — not Slice 1 if
  Slice 1 is contracts-only).
- `readOnly: false` / `mutating: true`.
- Authorization: reject unless host approval record is present; **do not**
  use today’s `assertReadOnlyTool` global ban without a new branch.
- Do not require `capabilities.readOnly === true` for the mutation tool;
  require a distinct permission class and still forbid `allowNetwork`.
- Do not convert `projectDiff` into Apply.

Initial mutation catalog: **one** operation,
`applyApprovedTransaction`.

No `proposePatch` tool in the first Apply-capable slice if proposal stays
N5-structured output. If a later slice adds proposal persistence, that tool
stays `readOnly: true` with respect to the project tree (or writes only a
reviewed `.aif` proposal path under a typed capability — separately
authorized).

---

## 9. N5 integration

Compose N5; do not bypass it.

- A node may **propose** under proposal capability and finish `completed`
  with a proposal digest in the subagent result.
- Graph aggregation remains observational. `completed` ≠ approved.
- Scheduler must **stop at the review boundary**. No node Apply.
- Leases stay per attempt; they do not serialize project mutation (see §14).
- `detectNeutronGraphStaleness` + `reconcileNeutronTaskGraphExecution` run
  before Apply when the proposal is graph-linked.
- Provenance must record proposer task/attempt, model/provider, tool
  envelopes, approval id, plan digest, apply result.
- Retry of a **proposal** node follows existing N5 retry rules.
- Retry of **Apply** is forbidden after mutation may have started (§14).

---

## 10. Tool design and prohibitions

Initial mutation routing operates only on canonical Approved Apply /
`GeneratedFile` structures.

**Forbidden** unless a future separately reviewed typed capability exists:

`writeFile`, `rm`, `mkdir`, `chmod`, arbitrary rename, unrestricted patch,
shell, git command, dependency installation, generic MCP write.

Conceptual names (`proposePatch`, `createTransaction`,
`stageApprovedChanges`) map onto existing APIs; they are not a new writer.

---

## 11. Affected-file scope

Approval binds `changedPaths`.

Test: approved `A.ts` + `B.ts`; execution touches `C.ts` → reject the
**entire** transaction (`synchronizeGeneratedFiles` is already all-or-nothing
at the plan gate for collisions/paths; Neutron preflight must fail before
write).

No silent partial widening. `allowedPaths` on the profile further intersects
the approved set.

**Implementation gap:** `executeApprovedApplyPlan` does not check
`filesToApply ⊆ plan.changedPaths`. `applyBoundedExecutionChange` checks
`outsideApprovedPaths` *before* calling the engine. Neutron must enforce
this in the mutation preflight (and should close the engine gap in the same
implementation milestone).

---

## 12. Root containment

Reuse N4 session-root equality **and** raise it:

- reject `..`, absolute roots ≠ session root, sibling projects;
- `realpath` selected root and every apply path; reject symlink escape;
- reuse `noncanonicalPathPlan` / sync symlink revalidation.

A containment bug at mutation severity is a security defect, not a UX miss.

---

## 13. Transaction atomicity

**Proven today** (`synchronizeGeneratedFiles` + tests / generated-files
docs):

- Pre-write collision, ownership, and path-security failures **do not enter**
  the transaction.
- In-transaction failure attempts rollback of written destinations.
- Success requires post-write byte/checksum consistency.
- Incomplete rollback adds `transaction-rollback-incomplete` and listed
  project-relative paths; success is never reported.

**Not proven / do not claim:**

- Cross-process crash-safe journal for Approved Apply (adoption journal is a
  different engine and is written after success).
- Desktop stub Apply atomicity (it does not write).
- `executeApprovedApplyPlan` attaching rollback evidence on **failed** sync
  (current code omits `rollbackEvidence` when `status !== "success"`).

Initial Neutron Apply is **staged then commit** via the existing sync
engine: atomic relative to that engine’s rollback, **best-effort** if
rollback is incomplete. Recovery evidence is the transaction diagnostics +
any captured previous bytes.

---

## 14. Cancellation, expiry, replay, concurrency, retry

### Cancellation

| When | Required behavior |
| --- | --- |
| Before approval | Drop/cancel proposal; no write. |
| After approval, before Apply | Invalidate approval; no write. |
| During transaction | Follow sync cancellation/rollback; no detached background Apply. |
| During verification | Mutation already committed; record verification failure; do not silently roll back unless the user requests authorized rollback. |

N5 session/node cancel already blocks new admission. Apply must observe the
same `AbortSignal` / session `cancelled` state.

### Expiry

`ApprovedApplyPlan.expiresAt` is optional. Neutron approval **must** have
`approvalValidUntil`. Expired → no Apply, fresh review. Model cannot refresh
approval.

Recommend a short bound (implementation default: ≤ 30 minutes, or the
existing adoption `approvalValidUntil` policy if reused). Session timeout
already fails N4 tools.

### Replay / idempotency

No consumed-approval store exists today. Second Apply of the same approval
must **fail** (one-shot) unless the transaction layer later proves safe
idempotency for identical bytes + digest.

Stale baseline after a successful Apply will also fail closed (fingerprint
changed). That is not a substitute for consumption tracking (replay against a
restored tree would otherwise succeed).

### Concurrent mutation

N5 leases serialize **task attempts**, not project files.

`executeApprovedApplyPlan` has no project lock.

**Initial rule:** one active mutation transaction per project. Concurrent
approved transactions on the same or independent files wait or fail closed.
Finer-grained locking is out of scope until the transaction layer proves it.

### Retry

- Failed **preflight** (no write started): host may retry preflight.
- **No automatic N5 retry** of Apply after mutation may have started.
- Partial/failed transaction: reconcile (`rollbackCompleted` /
  `transaction-rollback-incomplete`) before any new Apply.
- N5 `maxAttempts` 2 must not wrap the mutation tool.

---

## 15. Verification after mutation

A successful write is not sufficient.

After `applied: true`, run **typed** existing operations only (no arbitrary
commands):

1. Result fingerprint ≠ baseline (or equals expected post-apply digest if
   supplied).
2. Affected paths ⊆ approved set (diff/doctor change list).
3. Optional `diffProject` vs approved plan (bounded, same as N4).
4. Optional `doctorProject` (read-only).
5. Conformance / security list only if the approval listed them.

The model may receive structured verification evidence. It does not decide
that an unauthorized write was acceptable. Policy stays outside the model.

---

## 16. Rollback

Prefer the existing sync + Approved Apply rollback evidence. Do not add a
second backup system.

| Question | Answer from current code |
| --- | --- |
| Snapshot before Apply? | Per-file previous bytes captured in `executeApprovedApplyPlan` *before* sync; plus sync’s own staging backups. |
| Restore affected files? | Sync rollback on failure; `rollbackEvidence` on **success** for later human revert. |
| Automatic rollback on mid-transaction failure? | Yes, via sync; incomplete rollback is evidenced, not silent. |
| User rollback after successful Apply? | Evidence exists; no Neutron-authorized “rollback tool” yet. Future slice: host-only revert using `rollbackEvidence`, same approval class. |
| Who authorizes rollback? | Human/host, same as Apply. Model cannot roll back to hide a write. |

Close the gap where failed sync omits `rollbackEvidence` so operators can
still see captured previous bytes.

---

## 17. Provenance / audit

Every mutation must answer:

| Question | Source |
| --- | --- |
| Who approved? | Approval `approvingActor` / source |
| Project / session / task? | Session + N5 node |
| Model / provider? | N2 adapter capability on the proposing attempt |
| Proposal digest / files / baseline? | Plan + fingerprints |
| Transaction / capabilities? | Apply request + clamp snapshot |
| When approved / applied? | Approval + execution timestamps |
| What changed? | Sync path lists + rollback evidence |
| Verification? | Typed post-apply results |
| Rollback available/performed? | Evidence + transaction diagnostics |

No hidden reasoning. N5 provenance digests stay; Apply adds approval and
transaction digests.

---

## 18. Protocol / daemon implications

Existing daemon method is sufficient **transport** for Apply:
`intentloom.project.approvedApply.v1`.

Still required before Desktop N6 can render a real loop:

| Artifact | Action |
| --- | --- |
| Neutron approval schema + validator | New (Slice 1) |
| Proposal / review viewmodel | New or reuse adoption viewmodel fields |
| Session `mutationAllowed` | Keep `false` for model snapshots; do not treat as Apply grant |
| `NEUTRON_READ_ONLY_TOOLS` | Unchanged until the Apply tool slice |
| Apply result | Reuse `ApprovedApplyExecutionResult` |
| Paths | Project-relative only; no loose command strings |

Do not expose filesystem commands. Desktop must call the daemon, not a
webview stub.

---

## 19. N6 Desktop implications (do not implement)

N6 is unauthorized. The mutation **contract** N6 will need:

- proposed changes, affected files, diff;
- role/capabilities, provider/model, tools used;
- stale warning, approval scope, Approve / Reject;
- Apply state, verification, rollback availability.

Roadmap §N6 first milestone is still **read-only** Neutron (session, inspect,
plan, evidence). Approved Apply is a “separate threat-reviewed stage.”

Desktop today: allowlisted `approvedApply` RPC; modal injects the inner
approval string; **Apply is stubbed in `App.tsx`**. N6 must not ship that
stub as a mutation path.

---

## 20. `packages/neutron-runtime` decision

N5 deferred the package until an N6 consumer or cross-package pressure.
Re-evaluation:

| Fact | Implication |
| --- | --- |
| 22 `neutron-scheduler-*.ts` modules | File-count trigger from the N5 brief is already exceeded |
| Canonical Apply lives in `@intentloom/application` | `approved-apply-engine`, `synchronizeGeneratedFiles` |
| Desktop must not import `@intentloom/application` | Already true; Desktop uses protocol + daemon |
| Daemon already has Approved Apply RPC | No new package needed to carry mutation |
| Creating a runtime package now | Large migration; mixes scheduler + transaction writer |

**Decision: keep mutation routing in `@intentloom/application`**
(`neutron-mutation-*.ts` modules + existing approved-apply files). **Do not**
create `packages/neutron-runtime` during mutation slices.

**Re-introduce the package at the N6 boundary** only if Desktop needs a
runtime-shaped client that is not the daemon protocol. Mutation routing is
not that justification.

---

## 21. Threat model

| Threat | Mitigation |
| --- | --- |
| Prompt injection asks the model to write | No write tools; Apply not in model catalog; proposal ≠ approval |
| Capability escalation | Intersect clamp; child cannot widen; read-only roles denied |
| Approval spoofing | Host-issued token/digest; ignore model `grantedApprovals` / `approved` |
| Approval replay | Consume approval; one-shot Apply |
| Stale approval | Mandatory fingerprint + N5 stale + expiry |
| Affected-file widening | Exact/subset path check before write; fail whole transaction |
| Path traversal | N4 `..` + session root + sync noncanonical paths |
| Symlink escape | `realpath` preflight; sync symlink revalidation |
| Transaction tampering | Immutable plan digest; Apply by reference |
| Partial write | Existing sync rollback; evidence on incomplete rollback |
| Duplicate Apply | Consumed approval + changed baseline |
| Retry after partial write | No automatic Apply retry; reconcile first |
| Concurrent conflicting Apply | One active mutation per project |
| Cancelled Apply continuing | Abort + session cancel; no background Apply |
| Malicious model patch | Human review of exact paths/bytes; digest bind |
| Dependency/script injection | No install/shell tools |
| Secret exfiltration via mutation | N3 secret-like path exclusion; approval still required for any write |
| Tampered verification | Typed existing ops only; host displays raw results |
| Rollback failure | `transaction-rollback-incomplete` + listed paths; no success |

---

## 22. Implementation slices (not authorized)

Derived from gaps above. Docs-only this PR.

### Slice 1 — contracts and validators only (first implementation slice)

Neutron approval / proposal / Apply-preflight schemas and validators.
Session snapshots remain `mutationAllowed: false`. No router mutation tool.
No Apply. Unblocks N6 from inventing a second DTO.

### Slice 2 — router authorization + approved-transaction preflight, no Apply

Mutation permission class; preflight (stale, scope, root, approval) returns
diagnostics only.

### Slice 3 — single approved transaction Apply

`applyApprovedTransaction` → `executeApprovedApplyPlan` →
`synchronizeGeneratedFiles`. Host injects approval. Engine
`changedPaths` enforcement + mandatory digest. Project mutation lock.
No N5 automatic retry.

### Slice 4 — verification + rollback evidence

Post-apply typed doctor/diff/fingerprint; failed-sync rollback evidence;
consumed-approval persistence.

### Slice 5 — N5 proposal/review integration

Feature-builder proposal in graph results; stop at review; provenance
includes approval/apply; no node-level Apply.

---

## 23. First recommended implementation slice

**Slice 1 — mutation/approval contracts + validators only.**

Rationale: protocol and approval binding are the unsafe gaps
(`mutationAllowed` literal false; spoofable `grantedApprovals`; optional
digest). Wiring Apply before those contracts would repeat the Desktop stub
failure mode (UI “success” without a bound token).

---

## 24. Mutation-routing exit gates

- No Apply without explicit valid host approval
- Approval bound to exact transaction/proposal digest
- Stale baseline rejects Apply
- Affected scope cannot widen
- Root + symlink containment
- Read-only roles denied
- Approval not improperly replayable
- Cancellation respected; no detached Apply
- Concurrent conflict: one active mutation per project
- Apply uses `executeApprovedApplyPlan` / `synchronizeGeneratedFiles` only
- No generic filesystem write or shell
- Post-apply typed verification
- Evidence/provenance complete
- Rollback behavior proven (including incomplete rollback diagnostics)
- Deterministic fixtures; cross-platform CI; full `pnpm verify`

---

## 25. N6 sequencing

**N6 READ-ONLY MAY BEGIN IN PARALLEL AFTER Slice 1 contracts.**

Evidence:

- Roadmap §N6 first Desktop Neutron flow is read-only and already has N1–N5
  contracts.
- Mutation Apply UI is a later threat-reviewed stage.
- Slice 1 prevents Desktop from inventing a second approval/plan DTO.
- Full mutation slices are not required to render discuss/inspect/plan.

Do not begin N6 in this task. Do not treat the current Approved Apply stub as
the N6 Apply path.

Alternative rejected: defer all Desktop until mutation complete — that blocks
the documented read-only Neutron Workspace for no containment benefit.
Alternative rejected: start N6 before Slice 1 — Desktop would fork schemas.

---

## 26. Human-in-the-loop

Initial mutation routing requires explicit human approval. No “auto-approve
after tests pass.” Future policy automation needs a separate authorization.

---

## 27. Open decisions (non-blocking for Slice 1)

| # | Decision | Recommendation | Blocker for |
| --- | --- | --- | --- |
| 1 | Flip `NeutronRuntimeSession.mutationAllowed` | Keep `false` on model-facing sessions; host approval is the grant | Slice 3 |
| 2 | Persist proposals under `.aif/` vs in-memory review | In-memory / daemon-held until Slice 5 | Slice 5 |
| 3 | `packages/neutron-runtime` | Keep in application; revisit at N6 | N6 |
| 4 | User rollback tool after success | Host-only, Slice 4+ | Slice 4 |
| 5 | Exact vs subset `changedPaths` | Exact set for Slice 3 | Slice 3 |

---

## 28. Recommendation

**READY FOR MUTATION ROUTING SLICE 1 AUTHORIZATION**

Do not start Slice 2–5, N6, optional N3 Slice 5, generic shell, or P4l17
without a new explicit grant.

---

## 29. Explicit non-goals (this brief)

- Implementing mutation routing or write tools
- Generic shell
- Changing project bytes through Neutron
- N6 Desktop implementation
- Optional N3 Slice 5
- Returning to P4l
- Creating `packages/neutron-runtime`
- Auto-approval policies
