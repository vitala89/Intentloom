# Neutron Mutation Slice 3 — Security Readiness Review

Historical status (2026-09-13): **NO-GO** for Mutation Routing Slice 3
(Single Approved Transaction Apply) on pre-2.5 contracts.

Later: Slice 2.5 (PR #494) and Slice 3 Apply (PR #497, merge
`816b0ccacafc62c8a1e13a4dbdb452a4cd70a392`) implemented the documented
blockers. Slice 3.1 (PR #500, merge
`cb93edb3f66d90d2522514ae4e9b0725796a0e46`) replaced Slice 3's in-process
memory authority with a host-controlled durable store so restart cannot
make a used approval look unused. This review remains the evidence record
of why unmodified Slice 2 Apply was unsafe. Do not treat it as current
Apply authorization state.

Date: 2026-09-13.

This document is an evidence-backed security readiness gate. It does **not**
implement Apply, write tools, approval storage, mutation locks, Desktop Apply
UI, or `mutationAllowed` changes.

## Decision

**MUTATION SLICE 3 SECURITY REVIEW: NO-GO**

Slice 1 contracts and Slice 2 semantic preflight are a necessary host
authorization boundary. They are **not** a safe basis for the first real
project write. Two mandatory blockers are proven in current implementation:

1. **Approved transaction content is not bound.** `planDigest` and
   `proposalDigest` do not cover generated file bytes. The same approved path
   set can be applied with different payload bytes.
2. **Canonical Apply widens the write set.** `executeApprovedApplyPlan` →
   `synchronizeGeneratedFiles` always appends `.aif/manifest.lock.json` and
   `.aif/source-map.json`, and does not compare `filesToApply` with
   `changedPaths`.

Smallest next authorized slice (design only here; do not start it from this
review): **Mutation Slice 2.5 — content-bound review artifact and
declared-path Apply contract.** See §21.

---

## 1. Current baseline

| Item                       | Evidence                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **Expected `main`**        | `34aed286cb81c2c8c034e2dc2fe70b4788e59fd4`                                                      |
| **Actual `origin/main`**   | `34aed286cb81c2c8c034e2dc2fe70b4788e59fd4` (matches expected; no legitimate advancement)        |
| **Latest merge**           | PR #482 N6 Slice 5 binding-hardening handoff                                                    |
| **Mutation Slice 1**       | Protocol/validator proposal, approval, preflight types                                          |
| **Mutation Slice 2**       | `preflightNeutronMutation` semantic authorization; zero writes                                  |
| **N6 Slice 5**             | Read-only proposal review (paths + digests). No Approve/Apply. **Mutation not authorized** copy |
| **`mutationAllowed`**      | Literal `false` on `NeutronRuntimeSession`; validator and Desktop parse reject any other value  |
| **N4 catalog**             | Seven read-only tools. `assertReadOnlyTool` denies `readOnly !== true`                          |
| **Tracked tree at review** | Clean `main` at the SHA above                                                                   |

Implementation and tests are authoritative. Roadmap prose that assumed Slice 3
could wrap Approved Apply unchanged is superseded by this review.

---

## 2. Existing canonical primitives

### 2.1 Neutron mutation contracts (Slice 1)

| Primitive                 | Location                                                                               | What it binds today                                                                                         | Apply authority |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| `NeutronMutationProposal` | `packages/protocol/src/neutron-mutation.ts`                                            | Identity + wrapped `ApprovedApplyPlan` (paths, opaque `planDigest`, baseline digest, root, optional expiry) | None            |
| `proposalDigest`          | `digestNeutronMutationProposal` in `packages/validator/src/neutron-mutation-digest.ts` | Canonical JSON of proposal facts **including the opaque `planDigest` string**, not file bytes               | None            |
| `NeutronMutationApproval` | `packages/protocol/src/neutron-mutation-approval.ts`                                   | Host record: token `approved:<proposalDigest>`, digest of unsigned facts, paths, baseline, expiry, source   | Host-held only  |
| Preflight request/result  | same protocol module                                                                   | Structural envelope. No `filesToApply`. No consumption state                                                | None            |

Proposal validators reject `approved`, `mutationAllowed`, `grantedApprovals`,
`approvalToken`, and related authority keys. Approval validators reject
`grantedApprovals` and model grant flags. Token format is
`approved:<proposalDigest>` (deterministic binding string, **not** a
high-entropy secret).

### 2.2 Slice 2 semantic preflight

`preflightNeutronMutation` (`packages/application/src/neutron-mutation-preflight.ts`)
returns `eligible` or `rejected`. Modules do not import
`executeApprovedApplyPlan` or `synchronizeGeneratedFiles`. Eligible preflight
leaves project fingerprint and target bytes unchanged
(`tests/neutron-mutation-preflight.test.ts`).

Authorization (`neutron-mutation-authorization.ts`):

- `kind: "host"` + `approved-transaction-apply` only.
- `kind: "model"`, `kind: "role"`, `kind: "grantedApprovals"` denied.
- `roleCapabilities.readOnly === true` denied.
- any `delegatedRole` denied.
- `classifyNeutronMutationRoute` always reports `applyAuthorized: false`.

Semantic checks that **do** exist: cancellation / `AbortSignal`, identity
(session/project/task/graph), `mutationAllowed === false`, expiry, proposal
digest recompute, token format, planDigest equality, live project-state
digest, exact path-array equality between proposal plan and approval,
canonical `realpath` root, per-path containment, injected
`isApprovalConsumed`.

Semantic checks that **do not** exist in Slice 2:

- payload / `GeneratedFile[]` presence or digest
- `filesToApply` vs `changedPaths`
- N5 `detectNeutronGraphStaleness` (checkpoint/profile)
- approval `capabilityScope` snapshot (field does not exist)
- lock **acquisition** (`NeutronMutationLockObserver` is observational;
  `observeNeutronMutationLock` is never called from preflight)
- durable consumption

### 2.3 Approved Apply engine (ADR-0053)

| Function                    | File                                                | Authorization model                                    | Path/content binding                                      |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `evaluateApprovedApplyPlan` | `packages/application/src/approved-apply-gate.ts`   | `grantedApprovals` includes `"atomic-commit-approval"` | Optional expiry; **optional** `currentProjectStateDigest` |
| `executeApprovedApplyPlan`  | `packages/application/src/approved-apply-engine.ts` | Calls the gate, then sync                              | Does **not** compare `filesToApply` to `changedPaths`     |
| `validateApprovedApplyPlan` | `packages/validator/src/approved-apply.ts`          | `planDigest` is any non-empty string                   | No canonical digest function                              |

`ApprovedApplyPlan` fields: `planDigest`, `projectStateDigest`, `targetRoot`,
`changedPaths`, optional `expiresAt`. No file bytes, checksums, or payload
digest.

### 2.4 Generated-file transaction

`synchronizeGeneratedFiles` (`packages/application/src/index.ts`) is the inner
writer for Approved Apply. Proven behavior (see
[`GENERATED_FILES.md`](../reference/GENERATED_FILES.md) and tests):

- Pre-write collision and `noncanonicalPathPlan` fail without entering the
  write loop.
- Checksums on input files are **recomputed** from `file.content`
  (`checksum(file.content)`), so a caller checksum is not an integrity check.
- Transaction file set is `normalized` **plus** `.aif/manifest.lock.json` and
  `.aif/source-map.json`.
- Each replacement runs `safeDestination` (symlink + `realpath` under root).
- Handled failure attempts in-memory rollback; incomplete rollback is
  `transaction-rollback-incomplete`.
- No `AbortSignal`. No durable crash journal. `FileSystem.write` is not
  rename-atomic.

This engine is the Intentloom **generated-file adoption** writer, not a
general declared-path patch writer.

### 2.5 Project lock

| Lock                           | Scope                  | Semantics                                                                                 | Neutron use today      |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| `withCanonicalProjectRootLock` | `resolve(root)` string | In-process queue; re-entrant for same async context; **no timeout**; lost on process exit | Adoption / some daemon |
| `NeutronMutationLockObserver`  | `projectId` + `root`   | Optional `isProjectMutationActive` observation only                                       | Unused by preflight    |

N5 leases serialize task attempts, not project files.

### 2.6 Replay / consumption

`neutronMutationApprovalIsConsumed` returns `false` when no checker is
injected. There is no durable Neutron approval store. Adoption Apply uses
fingerprint/`already-applied` rather than a consumed-token database; that
pattern is **not** sufficient for Neutron (restored trees would replay).

### 2.7 N6 / Desktop

N6 Slice 5 binds a structured `NeutronMutationProposal` onto the session
viewmodel from graph `expectedOutput` seeds (paths + opaque digests). Desktop
shows paths via `DiffViewer` (**paths only**), digests, and **Mutation not
authorized**. Forbidden authority fields are rejected. `ApprovedApplyModal` is
not used on the Neutron path.

`apps/desktop/src/App.tsx` still fabricates `applied: true` for the legacy
Approved Apply modal without calling the daemon. Neutron tests assert Neutron
sources do not import that modal. The stub must not become Neutron success
(§16).

### 2.8 N4

`NEUTRON_READ_ONLY_TOOLS` is a closed union. Tool invocation validation
requires a name in that union. `assertReadOnlyTool` throws
`mutation-forbidden` if `definition.readOnly !== true`. There is no
`applyApprovedTransaction` tool.

---

## 3. Threat model

### 3.1 Approval spoofing

| Threat                            | Current control                                                                           | Residual / Slice 3 requirement                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Model sends `approved: true`      | Proposal/approval validators reject the key; preflight ignores it                         | Keep; never treat as Apply                                          |
| Model supplies `grantedApprovals` | Neutron authorization `kind: "grantedApprovals"` → `invalid-approval`                     | Inner Approved Apply gate **still** treats the string as sufficient |
| Model invents `approvalId`        | Digest must match canonical unsigned facts; host must not accept model JSON as the record | Host-held store; never from `argumentsJson`                         |
| Replay of a prior approval        | Injected checker only; default is not consumed                                            | Durable state machine required                                      |
| Copy token from logs/UI           | Token is `approved:<proposalDigest>`; proposalDigest is already review-visible            | Token is not a secret; host-held record is the control              |
| Alter approval after issuance     | `approvalDigest` covers unsigned facts including token                                    | Store must persist canonical record; reject mutation of facts       |
| Approval expires before write     | Slice 2 checks `approvalValidUntil` and optional plan `expiresAt`                         | Repeat immediately before first write                               |

**Conclusion:** Only a **host-held, bound** `NeutronMutationApproval` may
authorize Apply. Cryptographic MAC is not present; unforgeability is
**architectural** (never accept model-controlled approval JSON), not a keyed
signature. `grantedApprovals: ["atomic-commit-approval"]` must be attached
only inside a trusted host adapter after Neutron approval validation. The
canonical gate must not be reachable from model or tool arguments.

### 3.2 TOCTOU (preflight → first write)

Slice 2 comments already state that eligible preflight does not close TOCTOU.

| Change between preflight and first write | Detection if checks are repeated under lock                       |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Project file / fingerprint change        | Recompute `projectStateDigest` / Neutron fingerprint; fail closed |
| Path or parent becomes symlink           | Repeat containment + inner `safeDestination`                      |
| Root realpath changes                    | Repeat canonical root equality                                    |
| Approval expires                         | Repeat `now >= approvalValidUntil`                                |
| Approval consumed elsewhere              | Durable claim/consume                                             |
| Cancellation                             | `AbortSignal` + session state before first write                  |
| Capability / graph stale                 | Bind capability snapshot in approval; N5 stale when graph-backed  |
| Second mutation transaction              | Exclusive project lock                                            |

Eligible preflight **must not** be cached as Apply authority.

### 3.3 Path scope widening

| Threat                                  | Evidence now                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Extra path in `filesToApply`            | Engine does not compare payload paths to `changedPaths`                                           |
| Normalized alias / `a/../b` / slash mix | Slice 1 `canonicalizeNeutronMutationPaths` + `normalizeStoredPath`; not applied to `filesToApply` |
| Duplicate aliases                       | Proposal/approval reject duplicates; payload unchecked                                            |
| Symlink escape                          | Slice 2 containment + sync `safeDestination`; not a single check                                  |
| Case-fold collision                     | `storedPathCollisionKey` lowercases generated destinations; Neutron equality is code-point exact  |
| Generated transaction undeclared files  | **Proven:** sync always writes lock + source-map                                                  |

**Atomic policy for Slice 3 (after the blocker is fixed):** actual write path
set **===** approved `changedPaths` set. No silent subset. No extra metadata
paths unless those exact paths were in the approved set **and** were part of
the reviewed artifact.

### 3.4 Replay

| Scenario                                   | Current outcome                         | Required                                      |
| ------------------------------------------ | --------------------------------------- | --------------------------------------------- |
| Same approval twice                        | Second succeeds unless checker injected | Fail `approval-consumed` / `approval-claimed` |
| Concurrent same transaction                | No lock; two writers possible           | Exclusive lock + claim                        |
| Crash after write before consume persisted | Replay possible against restored tree   | Durable claim-before-write or crash = unknown |
| Cross-process race                         | In-memory lock is process-local         | One daemon writer per project; fail closed    |
| Retry after timeout                        | No Apply path yet                       | No automatic retry after mutation start       |
| Duplicate RPC                              | Idempotency not defined                 | Same as replay: claim then execute            |

Fingerprint change after success is **not** a substitute for consumption.

### 3.5 Concurrency

Two Apply operations for the same project must not overlap.

**Canonical lock:** exclusive, keyed by **canonical project root realpath**
(not caller `projectId` alone, not `transactionId`). `transactionId` /
`approvalId` identify the work held **inside** that lock.

One active mutation transaction per project. Conflict is fail-closed with a
deterministic error after a short wait-or-reject deadline (do not wait
forever). `withCanonicalProjectRootLock` today queues without timeout and
keys `resolve(root)` rather than `realpath`. Slice 3 must not reuse it
unchanged.

### 3.6 Partial write / crash

| Event                             | Canonical sync behavior                                    | Slice 3 may claim                      | Must wait for Slice 4 / later |
| --------------------------------- | ---------------------------------------------------------- | -------------------------------------- | ----------------------------- |
| Crash after first file write      | No journal; torn tree possible                             | Unknown mutation state; no success     | Crash-safe recovery           |
| Write succeeds, RPC response lost | Bytes may be committed                                     | Unknown until reconcile; no auto-retry | Durable apply receipt         |
| Rollback partially fails          | `transaction-rollback-incomplete` + paths                  | Not applied; recovery required         | Operator revert tool          |
| Verification never runs           | Success today is post-write checksum of generated metadata | Slice 4 typed doctor/diff              | Slice 4                       |
| Daemon disconnect mid-transaction | Same as crash                                              | Unknown                                | Slice 4                       |

Slice 3, if later authorized, may only claim **handled-error rollback** of
the declared path set, matching Desktop adoption’s honest bound. It must not
claim crash-atomicity.

### 3.7 Approval token secrecy

Audit of current surfaces:

| Surface                            | Raw token present?                                      |
| ---------------------------------- | ------------------------------------------------------- |
| Protocol approval schema           | Yes, host record field                                  |
| Preflight result                   | No (`approvalId` + `proposalDigest` only)               |
| `neutronMutationOutcomeLeaksToken` | Tested false on rejection diagnostics                   |
| Desktop N6 proposal parse          | `approvalToken` is a forbidden proposal key             |
| N6 proposal panel                  | Digests/paths; no token UI                              |
| `evaluateApprovedApplyPlan`        | Diagnostics may include `planDigest`, not Neutron token |
| Duty Watch / this review           | Must not paste live tokens; format description only     |

Hard rule: raw token never crosses to model-visible, UI, log, diagnostics, or
provenance evidence.

The token is reconstructible from displayed `proposalDigest`. Protection is
**do not accept a reconstructed record from the model**, not secrecy of the
string.

### 3.8 Cancellation

| When                                | Required behavior                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Before lock                         | Cancel; no write; approval remains issued (not consumed)                        |
| After lock, before preflight        | Release lock; no write; approval remains issued                                 |
| After preflight, before first write | Release lock; revert claim if any; no write                                     |
| After first write                   | Do **not** abort between files. Finish commit or rollback. Then terminal result |
| During rollback                     | Complete rollback attempt; report incomplete if restore fails                   |

No optimistic cancel. `synchronizeGeneratedFiles` has no cancel hook today;
Slice 3 must not pass a signal into the write loop in a way that tears the
tree. Adoption Apply already defers cancel after `onBeforeMutation`.

### 3.9 Retry

| Failure                   | Policy                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Fail before any writes    | Host may retry preflight / Apply with the same unconsumed approval |
| Fail after first write    | No automatic retry. Reconcile. New approval after review if needed |
| Response timeout          | Treat as **unknown-mutation-state**. No automatic retry            |
| Unknown transaction state | Fail closed. Inspect/Doctor/Diff. Human recovery                   |

N5 `maxAttempts` 2 must never wrap Apply. Preflight `eligible` is not retry
authority.

---

## 4. Authority boundaries

Non-negotiable invariants (preserved):

1. Model output is never approval.
2. Success is never approval.
3. Retry is never approval.
4. Child cannot widen authority.
5. Read-only roles stay read-only.
6. No generic shell.
7. No unrestricted filesystem.
8. No direct model-controlled `writeFile`.
9. No mutation against stale fingerprint.
10. Approval exactly bound to proposal/path/baseline (**and, after Slice 2.5,
    exact content**).
11. Scope cannot widen.
12. Apply uses the canonical transaction boundary (declared-path mode; no
    second engine).
13. No automatic retry after partial mutation without reconciliation.
14. Desktop must never fabricate Apply success.
15. Desktop does not call a provider directly.
16. Mutation routing is an adapter over canonical typed operations.
17. Model prose cannot fabricate mutation state.
18. Secret bodies never exposed.
19. Tool activity/evidence is structured.
20. `mutationAllowed` remains literal `false` on model-facing snapshots.
21. Preflight eligible does not equal Apply authority.
22. Raw approval token never UI/log/diagnostics.
23. Symlink/`realpath` checks fail closed.
24. Slice 3 must repeat stale/path/approval checks immediately before first
    write.
25. No automatic mutation retry after uncertain partial state.
26. Apply authority is host-only.

Authority lattice for a future Apply:

```text
host-held bound approval
  ∩ session root / sessionId / projectId
  ∩ approval.changedPaths === payload paths
  ∩ approval content digests === payload bytes
  ∩ live projectStateDigest
  ∩ unexpired, unconsumed, claimed by this transaction
  ∩ exclusive project lock
  ∩ not cancelled
```

Delegated Neutron roles cannot Apply. Feature-builder may propose only.

---

## 5. Approval lifecycle

Simple boolean `consumed` is **not** sufficient (crash between write and
persist, concurrent claim, timeout retry).

Required durable state machine:

```text
issued
  → claimed          (under project lock, before first write)
  → executing        (first write started)
  → applied          (transaction success persisted)
  → failed-reconciled (handled failure + rollback outcome persisted)
```

Illegal transitions: `issued` → `applied` skipping claim; `applied` →
`claimed`; second `claimed` while another claim is live.

**Consumption ordering (recommended):**

1. Under exclusive lock, revalidate.
2. Persist **claim** (approval cannot be claimed twice).
3. Execute declared-path transaction.
4. Persist **applied** or **failed-reconciled** atomically with the known
   result.
5. Release lock.

Do not consume-after-success only: a crash after write would leave `issued`
and allow replay. Do not consume-before-lock: a crash would burn the approval
with zero writes and still allow a second process to race.

If durable storage is absent (today), that store is a **required Slice 3
subcomponent**, not optional polish. Slice 2.5 does not need to implement it.

Later: original Slice 3 shipped an in-process memory store as the production
default. Slice 3.1 (PR #500) made durable claim/replay the production path
(`durableStateDirectory` or an injected authoritative store). Corrupted
storage fails closed and never treats an old approval as unused.

Host issuance remains `approvalSource: local-interactive` only. Model cannot
refresh expiry.

---

## 6. Lock lifecycle

Slice 2 lock is observational only.

Slice 3 lock requirements:

- Exclusive per **canonical realpath** of the project root.
- Acquired **before** final pre-write checks.
- Released on every terminal path (success, deny, cancel-before-write,
  handled failure).
- Stale ownership: in-process lock dies with the process; document that a
  restarted daemon must treat in-flight work as **unknown** until reconcile.
- Lock identity is host-generated, never model-controlled.
- Conflict: fail-closed after a bounded wait (recommend: do not wait; return
  `transaction-conflict`).
- Deterministic error, no hang.

In-memory lock is enough to serialize **one daemon process**. It is **not**
enough against a second daemon, CLI Apply, or crash replay. Residual (same
honesty as Desktop adoption): external editors during the write loop are
undefined relative to the approved snapshot; post-apply doctor/diff surface
drift. Cross-process coordination is out of scope until a later slice unless
Slice 3 exposes a second writer.

Later: Slice 3.1 adds a durable exclusive lock file when
`durableStateDirectory` is set, because the host process model is not
proven single-process. Process-local Map lock remains only for injected
memory-store tests. An executing durable lock is not deleted automatically
without reconciliation evidence.

---

## 7. Final pre-write validation order

No write may start until all of the following pass, **under the project
lock**, immediately before the first `fs.write`. Order:

1. Request structurally valid (host Apply request, not model JSON).
2. Canonical root still matches (proposal, plan `targetRoot`, approval,
   session, live `realpath`).
3. `projectId` / `sessionId` still match.
4. Task/graph binding if present on the approval.
5. Approval digest/token format valid against the **host-held** record
   (never against caller-supplied bytes that bypass the store).
6. Approval not expired (`now < approvalValidUntil`; plan `expiresAt` if
   set).
7. Approval not consumed; this transaction holds the **claim**.
8. `proposalDigest` matches immutable stored proposal (recomputed).
9. `planDigest` matches the **content-bound** plan digest (after Slice 2.5).
10. `projectStateDigest` recomputed live and exact.
11. N5 stale project/checkpoint/profile rechecked if graph-backed; no
    auto-rerun.
12. Session/task not cancelled; `AbortSignal` not aborted.
13. Capability scope unchanged vs approval snapshot (Slice 2.5/3 must add
    the snapshot; it is missing today).
14. Exact changed path set: payload paths === approved `changedPaths` ===
    proposal plan paths.
15. Each target `realpath` / ancestor containment (Slice 2 helper).
16. Mutation lock owned by this transaction.
17. No second active transaction (implied by lock).
18. `filesToApply` bytes correspond to the reviewed artifact (per-path
    content digest), **not** fresh model output.

Inner writer then repeats `safeDestination` immediately before each
replacement.

---

## 8. Payload integrity analysis

**Question:** Can Apply payload bytes be swapped after human approval while
preserving the approved plan?

**Answer: yes, on current contracts. This is a mandatory NO-GO blocker.**

### 8.1 What `planDigest` actually is

`ApprovedApplyPlan.planDigest` is a **caller-supplied string**.
`validateApprovedApplyPlan` only requires a non-empty string. Neutron
validators additionally require `sha256:<64 lowercase hex>`. There is **no**
function in this repository that computes Approved Apply `planDigest` from
file contents.

Contrast: existing-project adoption computes
`computeExistingProjectAdoptionPlanDigest` over root, fingerprint, decisions,
affected paths, and planned **actions** (path/classification metadata — still
not generated file bodies, but at least a canonical function). Foundation
scaffold has `computePlanDigest(plan)`. Approved Apply has neither.

### 8.2 What `proposalDigest` actually covers

`digestNeutronMutationProposal` hashes canonical JSON of:

- schema, `proposalId`, `sessionId`, `projectId`, `root`, optional task/graph
- `mutationClass`
- `planDigest` (opaque string)
- `projectStateDigest`, `targetRoot`, canonical `changedPaths`, optional
  `expiresAt`

It does **not** include `GeneratedFile.content`, checksums, ordering of file
bodies, or any payload hash.

N6 structured proposal seeds
(`NeutronStructuredMutationProposalSeed`) carry `proposalId`, `planDigest`,
`projectStateDigest`, `changedPaths`, `expiresAt` only.

### 8.3 Engine behavior

`executeApprovedApplyPlan(request, filesToApply)`:

- Gates on `grantedApprovals`, optional expiry, optional current digest.
- Writes whatever `filesToApply` contains.
- Recomputes checksums from those bytes inside sync.
- Does not verify payload against `planDigest`.

Tests (`tests/approved-apply-engine.test.ts`) construct
`planDigest: "sha256:plan1"` independently of file content.

### 8.4 Human review today

N6 Slice 5 reviews **paths and digests**, not file bytes. Even a host that
later calls Apply with new bytes at the same paths would preserve the
approved `planDigest` / `proposalDigest`.

### 8.5 Required contract (Slice 2.5)

The review artifact must bind:

- exact ordered canonical path set
- exact per-path content digest (`sha256:` of UTF-8 bytes, same `checksum()`
  as core)
- those facts into `proposalDigest` (and a **computed** `planDigest`, not an
  opaque field)

Apply loads bytes from the **host-held artifact** keyed by that digest. Model
output at Apply time is irrelevant.

---

## 9. Path containment model

Defense in depth. No single early `realpath` is sufficient.

| Layer           | Function                                                               | When                                |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| Structural      | `normalizeStoredPath`, unique, code-point sort                         | Validate proposal/approval/payload  |
| Preflight       | `assertNeutronMutationPathContained` (nearest existing ancestor)       | Slice 2 today; repeat under lock    |
| Final pre-write | Same helper + live root `realpath`                                     | Immediately before first write      |
| Inner writer    | `safeDestination` walk: reject symlink components; realpath under root | Immediately before each replacement |
| Collision       | `storedPathCollisionKey` (POSIX, NFC, lowercase) for generated set     | Keep for declared payload set       |

Containment helper fail-closed on filesystem errors. Lexical `..`, absolute
paths, and empty paths are rejected.

**Case sensitivity:** Neutron path equality is exact (code-point) after
`normalizeStoredPath`. On case-insensitive volumes, `Foo.ts` vs `foo.ts` can
still collide on disk. Slice 3 must reject payload sets whose collision keys
are not unique, even if code-point paths differ.

**Unicode:** `normalizeStoredPath` applies NFC per segment. Payload paths
must pass through the same helper.

Slice 2 path equality compares **index-aligned arrays** after canonical
sort (`evaluateMutationPathScope`). Slice 3 needs **one** canonical helper
used by preflight, host adapter, and tests — not a third ad-hoc comparator.

---

## 10. Replay model

Current gap: injected boolean, default not consumed, no store.

Required:

- Durable approval records in **daemon/host memory with persistence** (not
  written into the consumer repo unless a later ADR says so).
- Claim before first write (§5).
- Duplicate RPC with the same `approvalId` while `claimed`/`executing`:
  `transaction-conflict` or attach to in-flight result; never start a second
  writer.
- After `applied`: `approval-consumed`.
- After `failed-reconciled` with **zero writes** or successful full rollback:
  policy = do not auto-retry Apply; host may issue a new approval. Do not
  reuse the same claim.
- After unknown crash: `unknown-mutation-state`; fingerprint/doctor; no
  automatic Apply.

---

## 11. Cancellation model

See §3.8. Summary: cancel is clean only **before first write**. After first
write, cancellation is **deferred** until the transaction finishes commit or
rollback. Session `cancelled` / `timed-out` / non-active states already map
to preflight `cancelled`. Slice 3 must re-read session state under the lock.

Do not report Apply success because the client discarded the RPC.

---

## 12. Retry model

See §3.9. Initial policy: **no automatic retry after mutation begins.**

Timeouts and lost responses are unknown state, not a signal to send the same
Apply again. N5 node retry must not call host Apply.

---

## 13. Crash / unknown-state model

Honest bound (same as
[`DESKTOP_ADOPTION_PRE_APPLY_SECURITY_REVIEW.md`](DESKTOP_ADOPTION_PRE_APPLY_SECURITY_REVIEW.md)):

Slice 3 **may** guarantee handled-error rollback when the process stays
alive and rollback succeeds.

Slice 3 **must not** guarantee crash-atomic recovery, rename-atomic
per-file replacement, or automatic repair after SIGKILL.

`executeApprovedApplyPlan` omits `rollbackEvidence` when
`syncResult.status !== "success"`. Operators then lose captured previous
bytes on the failure path. Closing that gap belongs to Slice 4 (verification

- rollback evidence), but Slice 3 must still return
  `transaction-failed` / `rollback-incomplete` without claiming success.

Unknown state after crash: Inspect → Doctor → Diff; stale fingerprint fails
closed; human recovery. Durable journaling is **not** a Slice 2.5
prerequisite, but Slice 3 docs and UI must not lie about it.

---

## 14. Approved Apply integration decision

**Decision: wrap with a strict Neutron host adapter, and make a minimal
canonical-engine change so the wrapper is not unsafe.**

| Option                                                        | Verdict                                                                                                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Wrap unchanged `executeApprovedApplyPlan`**              | **Rejected.** Inner writer appends undeclared `.aif` metadata; gate uses spoofable `grantedApprovals`; `currentProjectStateDigest` is optional; no path-set or payload check. Wrapping cannot delete those writes.   |
| **B. Modify Approved Apply / sync with a declared-path mode** | **Required, minimal.** Same transaction primitives (`safeDestination`, backup, rollback, post-write byte check). No second engine. Neutron host adapter is the only caller that may attach `atomic-commit-approval`. |
| New Neutron writer package                                    | **Rejected** (YAGNI / second engine).                                                                                                                                                                                |

Neutron host adapter responsibilities (Slice 3, after 2.5):

- Resolve immutable proposal + host-held approval + review artifact.
- Acquire lock; run §7 checks.
- Build `ApprovedApplyRequest` internally; never take `grantedApprovals` from
  RPC/tool JSON.
- Always pass live `currentProjectStateDigest`.
- Pass **exact** artifact bytes as `filesToApply`.
- Call declared-path execute (not full generated-file adoption sync) unless
  the approved path set **is** the generated-file transaction including
  metadata **and** those paths were reviewed.

`evaluateApprovedApplyPlan` remains unsuitable as the Neutron authorization
gate (Slice 2 already refused to reuse it). Keep it as the inner string check
only after Neutron authorization succeeded.

---

## 15. N4 integration recommendation

**Initial Slice 3 must be host-triggered Apply. Do not add an N4
mutation-class tool.**

| Question                                                    | Answer                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Why would the model invoke Apply?                           | It should not. Apply is a human/host action after review.                                                           |
| Can Desktop/CLI host trigger Apply directly?                | Yes. Daemon RPC analogous to `intentloom.existing-project.adoption.apply.v1`, authenticated, allowlisted, mutating. |
| Does a model-visible mutation tool increase attack surface? | Yes: prompt injection, tool-spoofed arguments, N5 retry wrapping, catalog union expansion.                          |

Keep `NEUTRON_READ_ONLY_TOOLS` unchanged. Keep
`classifyNeutronMutationRoute.applyAuthorized === false` for model-facing
routing. A later separately authorized slice may add
`applyApprovedTransaction` only if a real product loop requires the model to
_request_ host Apply by reference (approval id + digest, never bytes). That
is not required to land the first write.

`mutationAllowed` stays literal `false`. Apply authority lives on the
host-held approval/transaction, not on a session flag. Flipping the boolean
is a new protocol decision and is **not** authorized here.

---

## 16. Desktop integration boundary

N6 Slice 5 is read-only proposal review. This review does not add Apply UI.

Future Desktop loop (not this PR):

```text
proposal review (paths + bytes)
  → explicit human Approve
  → host-issued bound NeutronMutationApproval
  → host Apply RPC
  → structured result (never stub success)
```

`ApprovedApplyModal` + `App.tsx` fabricated `applied: true` **must not** be
reused as Neutron success. Before enabling real Neutron Apply on Desktop:

- Isolate or remove the stub from any Neutron view.
- Neutron Apply must go Desktop → allowlisted Tauri command → authenticated
  daemon → host adapter → canonical engine.
- Never show `applied: true` from `setTimeout`.
- Never render raw `approvalToken`.
- Never copy `rollbackEvidence.previousContent` into UI/RPC (secret/body
  leak; adoption review already forbade this).

Content review: approving paths without bytes is insufficient once Slice 2.5
binds content. Desktop must show the artifact bytes or a bounded diff of
those bytes before issuing approval. That UI is **not** Slice 2.5; it is a
Desktop precondition for issuing approvals, not for defining the contract.

---

## 17. Error taxonomy

Reuse existing Neutron preflight reasons where they already match. Add only
what Slice 3/2.5 cannot express.

| Code                       | Source today                           | Use                                                                                                     |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `invalid-approval`         | Slice 2                                | Forged/mismatched host record, wrong identity, model grants                                             |
| `approval-expired`         | Slice 2                                | Expiry                                                                                                  |
| `replayed-approval`        | Slice 2                                | Prefer rename/map to `approval-consumed` at the Apply boundary; keep preflight reason for compatibility |
| `approval-consumed`        | new Apply mapping                      | Terminal consumed                                                                                       |
| `approval-claimed`         | new                                    | Live claim by this or another transaction                                                               |
| `proposal-digest-mismatch` | Slice 2                                | Proposal tamper / wrong digest                                                                          |
| `approval-scope-mismatch`  | Slice 2                                | Approval paths wider than plan                                                                          |
| `affected-path-mismatch`   | Slice 2                                | Plan/payload paths not approved; containment failure today also uses this                               |
| `path-scope-mismatch`      | new or map to `affected-path-mismatch` | Payload vs approved set; prefer one code                                                                |
| `root-mismatch`            | Slice 2                                | Root/`realpath`                                                                                         |
| `project-state-mismatch`   | Slice 2                                | Stale project digest                                                                                    |
| `stale-graph`              | map N5 stale                           | Graph checkpoint/profile                                                                                |
| `capability-denied`        | Slice 2                                | Read-only, delegated, capability change                                                                 |
| `capability-changed`       | new or `capability-denied`             | Snapshot mismatch                                                                                       |
| `cancelled`                | Slice 2                                | Map `cancelled-before-write` to this when no write started                                              |
| `transaction-conflict`     | new                                    | Lock / second transaction                                                                               |
| `containment-failed`       | new or `affected-path-mismatch`        | Prefer explicit if diagnostics allow                                                                    |
| `unknown-mutation-state`   | new                                    | Timeout/crash/lost response                                                                             |
| `transaction-failed`       | Approved Apply `transaction-failed:*`  | Handled write failure                                                                                   |
| `rollback-incomplete`      | sync `transaction-rollback-incomplete` | Incomplete rollback                                                                                     |

Do not create a parallel taxonomy for the same facts. Daemon `clientErrorCode`
mapping should stay stable. Payload digest mismatch should use
`proposal-digest-mismatch` (or a single `payload-digest-mismatch` added in
Slice 2.5 with tests).

---

## 18. Required tests (eventual Slice 3, plus Slice 2.5 blockers)

### 18.1 Slice 2.5 (prerequisite) — must exist before Apply

| Case                                                                       | Expected                     |
| -------------------------------------------------------------------------- | ---------------------------- |
| Same paths, different bytes after approval                                 | Fail: digest mismatch        |
| Computed `planDigest`/`proposalDigest` covers ordered path+content digests | Pass only when bytes match   |
| Opaque caller `planDigest` that ignores bytes                              | Reject for Neutron proposals |
| Canonical path helper: duplicates, `..`, absolute, slash variants, NFC     | Fail closed                  |
| Declared-path execute does not write undeclared `.aif` metadata            | Fingerprint/metadata proof   |
| `grantedApprovals` from model/tool JSON                                    | Never reaches inner execute  |

### 18.2 Slice 3 happy path

One approved atomic transaction writes expected bytes **exactly once**. Live
fingerprint changes as expected. Approval enters `applied`. Lock released.

### 18.3 Approval attacks

Forged token; wrong approval/proposal/plan digest; wrong root/project/session/
task/graph; expired; consumed; concurrent claim; model `approved: true`;
model `grantedApprovals`.

### 18.4 TOCTOU

Change project after approval; symlink after approval; parent becomes
symlink after preflight; expire after initial preflight; cancel before
write; start second transaction.

### 18.5 Scope

Extra path; missing approved path; alias; traversal; absolute; symlink
escape; duplicate path; case-fold collision.

### 18.6 Replay

Same transaction twice; same RPC twice; timeout then retry; crash/restart
replay against restored tree.

### 18.7 Partial mutation

Inject `failAt` after first staged write (`TransactionOptions.failAt` already
exists on sync). Expect rollback or `rollback-incomplete`; never success;
no automatic retry.

### 18.8 Secrets / authority

Raw token absent from logs, errors, results, Desktop. Model cannot trigger
direct write. `mutationAllowed` remains false. Neutron UI does not use
`ApprovedApplyModal` success stub.

---

## 19. Blockers

### Critical (mandatory NO-GO)

1. **Approval / plan digest does not bind exact transaction content.**
   Evidence: `digestNeutronMutationProposal`, `ApprovedApplyPlan` validator,
   N6 seed type, absence of a plan-digest function over bytes.
2. **Apply bytes can be swapped after approval.** Evidence:
   `executeApprovedApplyPlan(request, filesToApply)` with independent
   `planDigest`.
3. **Path scope can widen via the inner writer.** Evidence:
   `synchronizeGeneratedFiles` appends `.aif/manifest.lock.json` and
   `.aif/source-map.json`; engine does not compare `filesToApply` to
   `changedPaths`.
4. **Legacy `grantedApprovals` can authorize mutation** if any caller reaches
   `evaluateApprovedApplyPlan` / `executeApprovedApplyPlan` with
   model-controlled input. Neutron preflight rejects this; the inner engine
   does not.

### Required Slice 3 subcomponents (not Slice 2.5, but Apply cannot ship

without them)

5. Durable approval claim/consume state machine (not a boolean; no store
   today).
6. Exclusive realpath project lock with fail-closed conflict (current
   adoption lock is unbounded wait + `resolve()` key + observational Neutron
   type).
7. Immediate pre-write revalidation under that lock, including N5 stale when
   graph-backed and a capability snapshot (missing on the approval record).
8. Host-triggered Apply transport (daemon RPC); no N4 mutation tool.
9. Isolation of Desktop `ApprovedApplyModal` stub from Neutron.
10. No automatic Apply retry; unknown-state error for lost responses.

### Residuals (acceptable if honestly documented later)

- Process-crash torn tree (no journal), same as adoption Apply.
- Token reconstructible from `proposalDigest` (host-held record is the
  control).
- External non-Intentloom writers during the locked loop.

Items 1–4 **block Slice 3**. Do not implement them in this review PR.

---

## 20. GO / NO-GO decision

**MUTATION SLICE 3 SECURITY REVIEW: NO-GO**

A bounded Apply implementation on **current** Slice 1+2+Approved Apply
contracts would violate payload integrity, path-set equality, or both. That
is not a documentation gap; it is proven by validators and the sync writer.

---

## 21. Exact proposed next slice (not authorized by this review)

### Mutation Slice 2.5 — content-bound review artifact and declared-path Apply

contract

**Goal:** close blockers 1–4 so a later Slice 3 can implement host Apply
without inventing a second transaction engine.

**In scope:**

- Protocol/validator: per-path content digests on the Neutron proposal (or
  wrapped plan); `proposalDigest` / computed `planDigest` cover those
  digests; reject Neutron plans whose `planDigest` is not recomputed from
  the same facts.
- Canonical helper: exact path-set equality (`normalizeStoredPath`, unique,
  code-point sort, collision-key uniqueness).
- Host-held review artifact type for `GeneratedFile[]` (or equivalent bytes)
  keyed by proposal digest. No model-supplied bytes at Apply time.
- Minimal `synchronizeGeneratedFiles` / `executeApprovedApplyPlan` **mode**
  that writes **only** declared paths (no undeclared metadata append), still
  using `safeDestination`, backups, rollback, and post-write byte equality
  of those paths.
- Tests in §18.1.
- `mutationAllowed` unchanged. No N4 write tool. No Desktop Apply. No
  durable consumption store. No lock acquisition. No production Apply RPC.

**Out of scope:** Slice 3 host Apply, Slice 4 verification/rollback UX,
Slice 5 N5 proposal integration, generic shell, `packages/neutron-runtime`.

**Intended later Slice 3 (only after 2.5 merges):** host action → resolve
artifact + approval → lock → §7 preflight → inner declared-path execute →
persist claim/applied → structured result. Still no N4 mutation tool unless
a separate grant requires it.

---

## Implementation contract sketch (Slice 3, blocked)

Do not implement. Recorded so Slice 2.5 does not paint Slice 3 into a
corner.

```text
host action (Desktop/CLI/daemon)
  → load immutable proposal + review artifact (bytes)
  → load host-held approval
  → acquire exclusive realpath project lock (deadline, fail-closed)
  → persist approval claim
  → re-run §7 preflight (including content digests)
  → attach inner atomic-commit-approval only inside trusted adapter
  → execute declared-path Approved Apply
  → persist applied or failed-reconciled
  → release lock
  → return structured result (no token, no previousContent bodies)
```

Approval consumption belongs in the claim → executing → applied machine
(§5), not as a post-success boolean.

---

## References

- [`NEUTRON_MUTATION_ROUTING_BRIEF.md`](NEUTRON_MUTATION_ROUTING_BRIEF.md)
- [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md)
- [`ADR-0053-approved-apply-transaction-engine.md`](../decisions/ADR-0053-approved-apply-transaction-engine.md)
- [`GENERATED_FILES.md`](../reference/GENERATED_FILES.md)
- [`DESKTOP_ADOPTION_PRE_APPLY_SECURITY_REVIEW.md`](DESKTOP_ADOPTION_PRE_APPLY_SECURITY_REVIEW.md)
- [`NEUTRON_N6_DESKTOP_READONLY_BRIEF.md`](NEUTRON_N6_DESKTOP_READONLY_BRIEF.md)
