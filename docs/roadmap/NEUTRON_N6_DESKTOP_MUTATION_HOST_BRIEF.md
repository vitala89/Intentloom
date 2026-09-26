# Neutron N6 — Desktop Mutation Host Flow (Security + Architecture Brief)

## Status

**D1 — READ-ONLY AUTHORITATIVE MUTATION REVIEW TRANSPORT: IMPLEMENTED AND MERGED**

**DESKTOP MUTATION D2 IMPLEMENTED AND MERGED**

**D3 IMPLEMENTED ON BRANCH AWAITING MAINTAINER REVIEW** (not merged)

**D4–D5, DL: NOT AUTHORIZED**

**DESKTOP APPROVE/APPLY IMPLEMENTATION: NOT AUTHORIZED**

This document is the canonical threat-reviewed design for the first safe
Desktop mutation flow. **D1** (read-only review payload transport) is
implemented (PR #516, merge `ca87a2532d1e4965655f97d39efb21fc8ad36437`;
implementation head `25d0f6391ebc3079a755c2cbe0f492ef868a6578`). **D2**
(Desktop exact mutation review UI) is implemented (PR #519, merge
`2d3dfed9296ee998a458379db81ac5c0e1fa9e67`; implementation head
`74acec00d07afcf8c5a69e8ba667d091fcedbfa7`). It does **not**
authorize D4–D5, DL, production mutation UI, mutating mutation RPC,
Approve/Apply buttons, an N4 mutation tool, Undo, or any change to
`mutationAllowed`.

Evidence baseline: `origin/main` @
`2d3dfed9296ee998a458379db81ac5c0e1fa9e67` (2026-09-25; D2 PR #519 merged).
Tracked tree clean at handoff start.

Authoritative implementation and tests remain truth. Related:

- [`NEUTRON_RUNTIME_ROADMAP.md`](NEUTRON_RUNTIME_ROADMAP.md) §N5.5–§N6
- [`NEUTRON_MUTATION_ROUTING_BRIEF.md`](NEUTRON_MUTATION_ROUTING_BRIEF.md)
- [`NEUTRON_MUTATION_SLICE3_SECURITY_REVIEW.md`](NEUTRON_MUTATION_SLICE3_SECURITY_REVIEW.md)
- [`NEUTRON_N6_DESKTOP_READONLY_BRIEF.md`](NEUTRON_N6_DESKTOP_READONLY_BRIEF.md)
- [`NEUTRON_N5_EXECUTABLE_TASK_GRAPH_BRIEF.md`](NEUTRON_N5_EXECUTABLE_TASK_GRAPH_BRIEF.md)
- [`ADR-0042`](../decisions/ADR-0042-desktop-stack-and-daemon-distribution.md)
- [`ADR-0053`](../decisions/ADR-0053-approved-apply-transactional-mutation.md)

---

## 0. Maintainer recommendation (not an implementation grant)

| Decision                                    | Verdict                                                                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First future implementation slice           | **D4 — Approve & Apply**, after maintainer review of **D3**. **D1** and **D2** merged (PR #516, PR #519). **D3** is on a branch awaiting review. No production Approve/Apply. |
| Approval issuer                             | Trusted **daemon/application host** only. Desktop submits a typed human intent. Host re-fetches the review bundle and issues `NeutronMutationApproval` itself.                |
| Public RPC shape                            | **B — one host `approveAndApply` action**, plus read-only `review.get` and `status.get`. No separate public Approve RPC.                                                      |
| Desktop button copy (when later authorized) | **Approve & Apply**                                                                                                                                                           |
| `approvalToken`                             | Never leaves the host/application boundary. Desktop may receive `approvalId` / status / expiry only.                                                                          |
| Durable authority                           | Reuse Slice 3.1 store and project lock. Do not add a Desktop approval database.                                                                                               |
| Apply engine                                | Reuse `applyApprovedNeutronGraphMutation` → `applyApprovedNeutronMutation` → declared-path Approved Apply → Slice 4 verification.                                             |
| N4 / `mutationAllowed`                      | Unchanged. Seven read-only tools. Literal `false`.                                                                                                                            |
| Undo                                        | Out of first Desktop mutation scope.                                                                                                                                          |
| Legacy fake Approved Apply                  | **Prerequisite cleanup (DL)** before D4. Neutron must never reuse fabricated `applied: true`.                                                                                 |
| This document                               | D1 and D2 merged. D3 branch work is awaiting review. Do not start D4–D5 or DL from this document without explicit maintainer authorization.                                   |

---

## 1. Baseline

| Item                          | Evidence                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| Expected `main` after PR #511 | Merged Slice 5.1 handoff                                                    |
| Actual `origin/main`          | `1a8abac9dce73cbdddb12d035416691b6360cde6`                                  |
| Latest merge                  | PR #511 `docs(neutron): handoff for Mutation Slice 5.1`                     |
| Prior correction              | PR #510 Slice 5.1 implementation `b36d836c05591599f2526f0d3f5302e7edce8f5b` |
| Tracked tree at brief start   | Clean `main` fast-forwarded to `origin/main`                                |
| Unrelated scratch             | None present; nothing preserved or deleted                                  |

If this brief is read against a tree where #511 is not merged, stop:
`DESKTOP MUTATION HOST FLOW BRIEF BLOCKED: SLICE 5.1 HANDOFF NOT MERGED`.

---

## 2. Current mutation foundation (Slices 1–5.1)

Implementation and tests are authoritative.

| Slice   | What exists                                                                               | Authority                                            |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **1**   | `NeutronMutationProposal`, host-shaped `NeutronMutationApproval`, preflight envelopes     | Types only                                           |
| **2**   | `preflightNeutronMutation` semantic authorization                                         | Eligible/rejected; zero writes                       |
| **2.5** | Content-bound `NeutronMutationReviewArtifact`, canonical `planDigest`, declared-path sync | Review artifact is not approval                      |
| **3**   | Host-only `applyApprovedNeutronMutation`                                                  | One claimed transaction; declared-path Apply         |
| **3.1** | Durable approval/transaction store + exclusive project lock                               | Production requires store or `durableStateDirectory` |
| **4**   | Independent post-Apply verification; sanitized rollback projection                        | `applied` ≠ `verified`; no Apply retry               |
| **5**   | N5 candidate → host materialization → payload store; `applyApprovedNeutronGraphMutation`  | Host composition after separately issued approval    |
| **5.1** | Stale materialization fail-closed; production capability clamp                            | Candidate A cannot rebind onto project B             |

Invariants that this Desktop design must not weaken:

- `NeutronRuntimeSession.mutationAllowed` is typed `false`.
- N4 catalog is seven read-only tools. `assertReadOnlyTool` denies writes.
- Proposal validators reject `approved`, `grantedApprovals`, `approvalToken`,
  and related authority keys.
- Approval source is `local-interactive`. Token format is
  `approved:<proposalDigest>` (binding string, not a high-entropy secret).
- Model `grantedApprovals` cannot authorize Neutron mutation. The inner
  Approved Apply string `"atomic-commit-approval"` is attached only by the
  trusted Apply adapter (`NEUTRON_MUTATION_INNER_APPLY_APPROVAL`).
- Hidden `.aif/manifest.lock.json` and `.aif/source-map.json` must not appear
  unless declared (`NEUTRON_HIDDEN_GENERATED_METADATA_PATHS`).
- Graph-linked Apply calls `detectNeutronGraphStaleness` before
  `applyApprovedNeutronMutation`.
- There is **no** production `issueNeutronMutationApproval` helper today.
  Tests construct the approval record. Desktop must not become that issuer.

---

## 3. Current Desktop foundation (N6 Slices 1–5)

| Slice | What exists                                                          | Mutation?            |
| ----- | -------------------------------------------------------------------- | -------------------- |
| **1** | Named Neutron session RPCs + Desktop Neutron view                    | No                   |
| **2** | Bounded N3 context + N4 tool activity on the completed turn snapshot | No                   |
| **3** | Graph get / one-wave execute / cancel                                | No                   |
| **4** | Authoritative result/evidence/provenance UX                          | No                   |
| **5** | Read-only `NeutronMutationProposal` panel                            | Paths + digests only |

Current Desktop review is intentionally insufficient for real approval:

- Session viewmodel carries a single `mutationProposal` or `null`.
- `selectSessionMutationProposal` uses array-first (`length === 1`) or
  `ambiguous` → `null`. That is acceptable while Apply is impossible.
- `NeutronMutationProposalPanel` shows ids, class, plan/baseline/proposal
  digests, and **paths only** via `DiffViewer`.
- Copy is **Mutation not authorized** / **No Approve control** / **No Apply
  control**.
- `NeutronGraphSnapshot` does **not** project `mutationProposals[]`.
- Review artifact bytes and `GeneratedFile[]` stay in the host payload store.
- `desktopClient.neutronRequest(request: object)` plus
  `invoke_neutron_request` forwards one of seven allowlisted read-only
  methods. That hole must not grow to mutation.

Daemon Neutron capabilities are classified `read-only`. Spawn
(`packages/daemon/src/bin.ts`) creates `createNeutronSessionRuntime` with an
Ollama adapter and **does not** inject `durableStateDirectory`. Payload store
is in-process memory (`createMemoryNeutronGraphMutationPayloadStore`).

---

## 4. Critical principle

Desktop is **presentation and user-intent capture**.

Desktop must not:

- fabricate approval or Apply success;
- generate `approvalToken`, `approvalDigest`, or `approvalId`;
- recompute security-sensitive digests as authority;
- hold mutation authority independently;
- write project files directly;
- call a provider/model to approve;
- call generic shell;
- regenerate reviewed content;
- silently retry Apply.

Actual authority stays in trusted host/application boundaries:

```text
Neutron task graph
  → host-materialized authoritative proposal + review artifact + payload
  → Desktop displays exact review information (read-only transport)
  → human explicitly selects proposalId and clicks Approve & Apply
  → Desktop sends typed intent (identities + reviewed artifact digest)
  → authenticated daemon / application host
       1. re-fetches host-held bundle
       2. revalidates session/graph/project currentness
       3. issues bound NeutronMutationApproval (token stays host-side)
       4. durable Slice 3.1 claim + project lock
       5. applyApprovedNeutronGraphMutation
       6. applyApprovedNeutronMutation
       7. declared-path Approved Apply engine
       8. Slice 4 verification
       9. persist structured result
  → Desktop displays authoritative result/evidence from host state
```

Do not invent a parallel Desktop mutation engine, a second approval store, or
an N4 `applyApprovedTransaction` tool.

---

## 5. Existing authority chain (reuse, do not fork)

Verified chain for a later implementation:

```text
Desktop UI
  → typed desktopClient operation (narrow; not generic request: object)
  → dedicated Tauri command allowlist
  → authenticated local daemon (session token, no wildcard methods)
  → versioned JSON-RPC
  → application host operation
  → host-issued NeutronMutationApproval
  → applyApprovedNeutronGraphMutation
       (payload-store lookup, authoritative source only,
        detectNeutronGraphStaleness)
  → applyApprovedNeutronMutation
       (parse envelope, canonical realpath, durable store,
        exclusive claim, lock, pre-write validate)
  → executeTrustedDeclaredPathApply
       → evaluateApprovedApplyPlan + executeApprovedApplyPlan
       → synchronizeGeneratedFiles (declared-paths-only)
  → Slice 4 independent verification
  → durable transaction record (ids, digests, statuses; no token/bodies)
```

Forbidden substitutes:

- `intentloom.project.approvedApply.v1` as the Neutron Desktop path
- App.tsx fabricated `applied: true`
- model output, `expectedOutput`, or preview proposal as Apply bytes
- renderer-supplied approval record
- Desktop filesystem or shell commands
- N4 mutation tool
- adoption Apply (`applyProjectAdoption`) or workspace `approvedBy`

Adoption Approve/Apply is a **pattern analogue** (host-issued bound approval,
explicit human click, daemon mutating classification), not the Neutron
writer.

---

## 6. Threat model

### 6.1 Approval spoofing

| Threat                      | Required control                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Model says `approved: true` | Keep proposal/candidate rejection of the key. Host ignores it.                                     |
| UI sends `approved: true`   | Request schema forbids authority flags. Host issues approval itself.                               |
| Malicious renderer JS       | Treat renderer as untrusted. Intent only. Host recomputes facts.                                   |
| Replayed old approval       | Slice 3.1 one-use claim. Combined approveAndApply so unused approvals are not exported.            |
| Forged `approvalId`         | Host allocates ids. Client-supplied approval ids are rejected.                                     |
| Copied proposal digest      | Digest is review-visible by design. Unforgeability is architectural (host-held record), not a MAC. |
| Old Desktop session         | Bind sessionId/projectId/root; daemon root equality; cancelled session fails closed.               |
| Modified RPC payload        | Schema validation; host re-fetches bundle; extra paths rejected; exact path-set equality.          |

`approvalToken` is `approved:<proposalDigest>`. It is **not** a secret. The
control is “never accept a client/model approval record,” not token secrecy.
Desktop still must not receive the token, because presence in viewmodels/logs
trains a fake-authority path.

### 6.2 TOCTOU

Windows between proposal display, click, daemon receipt, durable claim, and
first write:

| Change                      | Control                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Project files change        | Review-time fingerprint + write-time `project-stale` / graph stale                  |
| Symlink / root change       | Canonical `realpath` containment; root equality                                     |
| Profile / checkpoint change | `detectNeutronGraphStaleness` before graph-linked Apply                             |
| Graph becomes stale         | Slice 5.1 currentness + Slice 5 graph stale reject                                  |
| Approval expires            | Host rechecks `approvalValidUntil` / plan `expiresAt` before issue and before write |
| Session cancelled           | Existing cancellation mapping; `cancelled-before-write`                             |

Desktop click is never a capability. Both **review-time currentness** and
**write-time currentness** are mandatory.

### 6.3 Replay

Double-click, network retry, daemon reconnect, Desktop refresh, app restart,
duplicate RPC, and restored-tree replay of an old approval are handled by:

- single host approveAndApply;
- Slice 3.1 exclusive claim (`wx` + fsync);
- applied replay returns the prior terminal result without a second write;
- client idempotency keys are optional UX, not authority.

An old approval after the tree is restored must not write again. Slice 3.1
already treats consumed/applied records as non-reusable.

### 6.4 Multiple Desktop windows/processes

Desktop/Tauri locks are not authoritative. Two windows on the same project
must serialize through the Slice 3.1 durable project lock
(`durableStateDirectory` lock file keyed by canonical realpath). Lock
conflict returns a structured `lock-conflict` / claim conflict, not a second
write.

### 6.5 Crash

| Moment                                      | Required durable outcome                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| After intent, before host approval          | No approval, no write                                                                                                 |
| After approval, before claim                | Combined operation: approval is not exported; crash looks like unused. Do not persist a free-floating approval in D4. |
| After claim, before write                   | `claimed` / `failed-before-write` / in-flight → fail closed; no second writer                                         |
| During write                                | Existing Apply rollback / `failed-needs-reconciliation`                                                               |
| After write, before verification            | `applied` + verification pending/incomplete; resume verification only                                                 |
| After verification, before Desktop response | Durable record is truth; status.get recovers it                                                                       |

### 6.6 Stale proposal (Slice 5.1)

Materialization already requires accepted stale report and
attempt fingerprint == current project fingerprint. Desktop Apply must keep
that gate. Candidate bytes generated against project A cannot be approved
onto project B.

Preview `expectedOutput` remains non-authoritative. `source !== "authoritative"`
is `preview-not-authoritative`.

### 6.7 Secret leakage

Desktop viewmodels, review RPC, status RPC, Apply result, logs, and evidence
must not contain:

- `approvalToken`
- raw previous file bodies / `previousContent`
- hidden context, prompts, or model reasoning
- secret-like path excerpts beyond existing N6 redaction

Review content may include **proposed bytes** and **current on-disk bytes**
for the declared path set only, through the explicit review endpoint, bounded
by Slice 2.5 limits (256 files, 1 MiB/file, 8 MiB aggregate).

---

## 7. Approval creation

**Decision:** a real `NeutronMutationApproval` is created only inside the
trusted application host during `approveAndApply`.

It must **not** be created in:

- model output or N5 scheduler;
- Desktop renderer;
- N4 tool router;
- generic RPC payload from an arbitrary caller;
- a client-supplied approval JSON blob.

Preferred sequence:

1. Desktop submits typed human approval **intent** (identities +
   `reviewArtifactDigest`).
2. Host loads the authoritative bundle from the session payload store by
   `proposalId`.
3. Host revalidates currentness, binding, expiry, cancellation, and
   artifact digest.
4. Host constructs the approval (ids, digests, `approvalSource:
"local-interactive"`, `approvingActor` host-assigned, token
   `approved:<proposalDigest>`, `reviewArtifactDigest` required).
5. Host immediately claims and Applies. Token never appears on the wire.

There is no production issuer today. Future D3 tests the host factory
without a public Approve-only method. Future D4 is the only production
caller.

`approvingActor` is assigned by the host (for example
`desktop-local-interactive`) from the authenticated daemon session. The
renderer does not supply actor identity as authority.

---

## 8. Desktop approval request

Narrow typed intent. Conceptual fields:

| Field                  | Role                            |
| ---------------------- | ------------------------------- |
| `protocolVersion`      | Existing protocol compatibility |
| `root`                 | Bound to daemon canonical root  |
| `sessionId`            | Current Neutron session         |
| `projectId`            | Current project                 |
| `graphId`              | Current graph identity          |
| `taskId`               | Proposal origin task            |
| `proposalId`           | Explicit user selection         |
| `reviewArtifactDigest` | What the human reviewed         |

Optional later hardening (not required for D1): host-issued
`reviewViewNonce` from `review.get`, short TTL, single-use with
approveAndApply. Security still depends on host re-fetch + revalidation, not
the nonce.

**Rejected client fields:** file bodies, `planDigest` override,
`projectStateDigest` override, `approvalToken`, `approvalDigest`,
`approvalId`, `grantedApprovals`, `approved: true`, arbitrary target paths,
`filesToApply`, actor identity as authority.

Host resolves authoritative proposal, artifact, files, digests, root, expiry,
and mutation class from the payload store.

---

## 9. Human review boundary

Paths-only N6 Slice 5 was acceptable because Apply was impossible. Real
approval requires the human to understand the bytes that will be written.

Desktop must show, before enabling Approve & Apply:

- selected project / canonical root;
- proposal identity (`proposalId`, session/project/graph/task);
- mutation class `approved-transaction-apply`;
- exact changed paths;
- create / update / no-op classification (delete is **not** in the current
  writer);
- exact content diff or other safe rendering of reviewed bytes;
- `proposalDigest`, `planDigest`, `reviewArtifactDigest`;
- baseline `projectStateDigest` / fingerprint;
- stale / current status and warnings;
- expiry;
- test/evidence state if already present (usually empty before Apply).

A filename list is insufficient. Preview/model prose cannot substitute for
the host payload.

If multiple authoritative proposals exist, Desktop lists them and requires
an explicit `proposalId` selection. No array-first Apply.

---

## 10. Exact reviewed bytes

Do not reconstruct bytes from model output, `expectedOutput`, or a second
model call.

Source of truth: host-held `NeutronGraphMutationReviewBundle`
(`proposal` + `artifact` + `GeneratedFile[]`) in the session payload store
populated by `materializeNeutronGraphMutationReview`.

D1 adds a **read-only** review RPC that copies declared-path proposed bytes
from that store. No mutation authority in the review method.

If the bundle is missing (daemon restart, cancelled session, never
materialized), return structured `proposal-not-found`. Do not rematerialize
from the model.

**Do not persist raw review bodies into the Slice 3.1 durable approval
store.** That store is ids/digests/statuses. File bodies stay in process
memory for the review window. Restart before Apply fail-closes; the user
re-runs the graph to obtain a new current proposal.

---

## 11. Diff architecture

Reuse `DiffViewer` (`apps/desktop/src/design/components/code/DiffViewer.tsx`).
Today Neutron feeds it path names with `kind: "add"`. Future review UI must
feed real hunks.

Per path, host review payload supplies:

| Field           | Source                                                    |
| --------------- | --------------------------------------------------------- |
| exact path      | artifact `changedPaths` / file binding                    |
| proposed bytes  | payload-store `GeneratedFile.content`                     |
| proposed digest | artifact `fileBindings[].contentDigest`                   |
| current bytes   | read-only disk read at review time, or absent             |
| classification  | missing → `create`; equal → `no-op`; different → `update` |

Diff display is **not** the Apply byte source. Apply continues to use the
host payload store. Desktop-edited buffers, if any, are ignored.

Delete is unsupported in `NeutronMutationProposalCandidateFile` (path +
content only) and in `executeTrustedDeclaredPathApply` (create/update/no-op).
A later delete capability needs its own security review.

---

## 12. Approval binding

Host-issued approval must bind existing canonical facts:

- `proposalId`, `proposalDigest`
- `reviewArtifactDigest` (required for Apply; not optional in this flow)
- `planDigest`, `projectStateDigest`
- `root`, `projectId`, `sessionId`
- `graphId` / `taskId` when the proposal carries them
- exact `changedPaths`
- `mutationClass: approved-transaction-apply`
- `approvalSource: local-interactive`
- `approvedAt`, `approvalValidUntil`

Do not weaken Slice 1–5.1 invariants. Do not omit `reviewArtifactDigest`.
Do not accept approvals without content-bound artifacts.

---

## 13. Desktop must never see `approvalToken`

**Decision:** raw `approvalToken` remains inside the trusted host.

Safe Desktop fields after a later Apply:

- `approvalId`
- status / failureCode
- expiry (if still relevant)
- proposal / artifact / transaction identities and digests

Existing Apply/verification validators already reject `approvalToken` on
public results. Keep that rule on every new RPC and viewmodel.

---

## 14. New protocol methods

Naming follows current Neutron RPC style
(`intentloom.neutron.<area>.<verb>.v1` in `packages/protocol/src/jsonrpc.ts`).

| Conceptual method                                | Classification | Authority                                       |
| ------------------------------------------------ | -------------- | ----------------------------------------------- |
| `intentloom.neutron.mutation.review.get.v1`      | read-only      | Display exact reviewed bytes                    |
| `intentloom.neutron.mutation.approveAndApply.v1` | mutating       | Host issues approval, claims, Applies, verifies |
| `intentloom.neutron.mutation.status.get.v1`      | read-only      | Durable/authoritative recovery                  |

Names are design targets. Implementation may keep these exact strings.

### 14.1 Option A — separate Approve then Apply

Mirrors existing-project adoption
(`adoption.approve.v1` + `adoption.apply.v1`).

| Pros                                   | Cons                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Matches adoption UX                    | Creates a free-floating Neutron approval                                                                                     |
| Can test issuance alone via public RPC | Wider TOCTOU; replay of unused approval                                                                                      |
| User could delay Apply                 | Slice 3.1 store tracks **claimed** transactions, not unused approvals; A would add a new unused-approval persistence surface |

### 14.2 Option B — single approveAndApply (recommended)

One authenticated host action performs:

1. resolve authoritative review bundle;
2. revalidate project/session/graph;
3. issue approval (token host-local);
4. durable claim + project lock;
5. existing graph/current Apply;
6. persist result;
7. Slice 4 verification.

| Pros                                                         | Cons                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| No exported unused approval                                  | Cannot “approve now, apply later”                                                         |
| Smaller TOCTOU and replay window                             | Combined failure taxonomy must stay structured                                            |
| Matches the intended button                                  | Host factory still needs unit tests (D3)                                                  |
| Fits current `applyApprovedNeutronGraphMutation` input shape | Cancellation during the combined call needs the existing before-claim / after-claim split |

**Recommendation: B.** Safer and simpler for the first Desktop mutation
slice. D3 tests the internal issuer without publishing Approve-only RPC.

Do not automatically retry on stale, lock-conflict, or verification failure.

---

## 15. Recommended transaction UX

Single explicit user action: **Approve & Apply**.

That label is the confirmation of mutation for ordinary declared-path
generated-file transactions. Do not use Continue / Accept / Done.

Host atomicity is **authority-level** (one operation, claim-then-write), not
a promise that the OS cannot crash mid-write. Crash semantics stay on Slice
3.1 / Slice 4.

---

## 16. Staleness before approval

Before issuing approval the host revalidates:

- project fingerprint vs proposal `projectStateDigest`;
- Slice 5.1 currentness (attempt fingerprint == current);
- graph stale kinds: project / checkpoint / profile;
- session binding and cancellation;
- proposal identity and `reviewArtifactDigest`;
- payload `source === "authoritative"`;
- expiry.

If stale: structured stale result. No approval. No write. No automatic
regenerate/rebase/rerun.

---

## 17. Staleness after approval

Desktop approval does not replace Slice 3 pre-write checks.

`applyApprovedNeutronMutation` already revalidates immediately before the
first write (digest, expiry, cancellation, containment, path set, live
project-state, optional graph stale). Keep both layers:

```text
review-time currentness  →  may issue approval
write-time currentness   →  may enter executeTrustedDeclaredPathApply
```

---

## 18. Durable approval state

Reuse Slice 3.1. Do not design a second Desktop approval database.

Production Apply already fails closed without an injected
`NeutronMutationApprovalStore` or host `durableStateDirectory`. Memory store
is test-only.

**D4 prerequisite:** Desktop-spawned daemon must own a host-controlled
directory (runtime state beside the existing session token file — not project
source, not `.aif` generated adapters). Lifecycle: created with the daemon
runtime, not deleted on project switch while a claimed/executing transaction
exists, not world-writable.

Durable records store ids, digests, states, and sanitized results. No token,
no file bodies, no prompts.

---

## 19. Project lock

Reuse the Slice 3.1 durable exclusive project lock when
`durableStateDirectory` is set. Canonical realpath key. Fail-fast conflict.

`withCanonicalProjectRootLock` is in-process and insufficient across two
Desktop windows / two daemon processes.

N5 leases serialize task attempts, not project files.

---

## 20. Apply result

Desktop must render structured host status. Never collapse to Success/Failed.

Minimum distinguishable outcomes:

| Outcome                                                  | Meaning                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `approval-rejected` / invalid intent                     | Host refused to issue approval               |
| `stale` / `graph-stale` / `project-stale`                | Currentness failed; no write                 |
| `preview-not-authoritative`                              | Preview/expectedOutput is not Apply          |
| `proposal-not-found`                                     | No host bundle                               |
| `claim-conflict` / `lock-conflict` / `approval-consumed` | Another actor or replay                      |
| `cancelled-before-write`                                 | Cancelled before first write                 |
| `transaction-failed`                                     | Writer failed; see rollback flags            |
| `applied` + verification pending                         | Bytes written; verify not finished           |
| `verified`                                               | Applied and independent verification matched |
| `verification-failed`                                    | Applied, verification mismatched             |
| `reconciliation-required`                                | Unknown/incomplete crash or rollback         |

Use existing `NeutronMutationApplyStatus` /
`NeutronMutationApplyFailureCode` /
`NeutronMutationVerificationStatus` plus graph-linked failure codes. Do not
invent a second enum that collapses them.

---

## 21. Applied vs verified

Preserve Slice 4. If bytes were written and verification fails, Desktop
shows **Applied + Verification failed**, not Apply failed, and does not
offer automatic Apply retry.

Optional later control: **Retry verification** (read-only
`retryNeutronMutationVerification`). Never label it Retry Apply. This brief
designs the label only; it does not authorize the control.

---

## 22. Crash / reconnect UX

After Desktop reconnect, status comes from host durable state (and, while
the same daemon process lives, in-memory review bundles). Desktop must not
infer status from whether an RPC response arrived.

| Host state                                      | Desktop                                |
| ----------------------------------------------- | -------------------------------------- |
| Bundle present, no claim                        | Review required / unused               |
| `claimed` / `executing`                         | In flight; do not offer a second Apply |
| `applied` + pending verification                | Applied; verification pending          |
| `applied` + `verified`                          | Verified                               |
| `failed-before-write`                           | Failed before write; consumed          |
| `failed-needs-reconciliation`                   | Reconciliation required                |
| Bundle missing after restart, no durable record | Proposal not found; re-run graph       |

---

## 23. Verification recovery

Slice 4 already allows read-only verification resume. If Desktop later
exposes it, the control is **Retry verification**. Out of this
authorization.

---

## 24. Reconciliation UX

Read-only recovery information for incomplete rollback, unknown crash, or
verification mismatch:

- affected paths;
- safe digests;
- state / `reconciliationRequired`;
- rollback summary (`attempted` / `completed` / `verified`, not raw bodies);
- guidance to a human/operator.

No automatic repair. Host rollback execution / Undo remains separately
unauthorized.

---

## 25. Undo

Keep out of the first Desktop mutation slice. Do not map rollback evidence
to a clickable Undo. Rollback write execution needs its own
authority/security review.

---

## 26. Legacy fake Approved Apply path

**Current fact (must stay isolated until cleaned):**

`apps/desktop/src/App.tsx` `onApprovePlan` opens `ApprovedApplyModal`, injects
`["atomic-commit-approval"]` in the modal, **does not** call
`intentloom.project.approvedApply.v1`, and after 600 ms fabricates
`applied: true` plus `previousContent: "// previous snapshot content"`.

Neutron tests assert Neutron sources do not import `ApprovedApplyModal`.
`WorkspaceContent.tsx` still mounts the modal globally.

**Decision:** this is **security/confusion debt**, not a reusable operation.
The modal primary label is already **Approve & Apply Plan**. Once Neutron
has a real **Approve & Apply**, two similar controls — one fake, one real —
are an unacceptable authority mix-up.

**DL (prerequisite to D4, not authorized here):** remove or replace the
legacy stub so fabricated success is unreachable. Neutron must never call
that handler. Replacement, if any, must be the canonical host operation, not
a second stub.

Until DL lands, keep Neutron isolation tests. Do not wire Neutron to
`approvedApply.v1`.

---

## 27. Tauri security

Current Neutron bridge: `invoke_neutron_request` + `is_neutron_method`
exact match of seven session/graph methods. No wildcards. Capabilities:
`core:default` + `dialog:allow-open`. No FS/shell/HTTP plugins. CSP
`default-src 'self'`. Commands run on `main`.

**Do not** add mutation methods to `invoke_neutron_request`.
**Do not** add a generic invoke proxy or arbitrary daemon method string.

Recommended dedicated commands:

| Tauri command                        | RPC                  |
| ------------------------------------ | -------------------- |
| `get_neutron_mutation_review`        | `review.get.v1`      |
| `approve_and_apply_neutron_mutation` | `approveAndApply.v1` |
| `get_neutron_mutation_status`        | `status.get.v1`      |

`desktopClient` grows typed methods that construct params internally. The
renderer does not pass a free-form `request: object` for mutation.

No arbitrary filesystem command. Folder dialog remains the existing
`select_project_root`.

Origin/window: keep commands on the default `main` window capability. Do not
expose mutation commands to untrusted additional windows if any are added
later.

---

## 28. Daemon security

Keep the authenticated local daemon as the host boundary.

Existing controls to reuse:

- session token (≥32 chars) on every envelope (`packages/daemon/src/index.ts`);
- protocol parse + schema validation;
- root/session/project binding on Neutron methods;
- canonical root enforcement where other mutating handlers already use it;
- mutating vs read-only capability classification (see adoption Apply).

**Prerequisites before D4 (identify, do not implement here):**

1. Wire `durableStateDirectory` in Desktop daemon spawn.
2. Classify `approveAndApply` as `mutating`; review/status as `read-only`.
3. Reject externally supplied approval records.
4. Redact tokens from results, logs, and errors (existing
   `redactApprovalToken` helpers).
5. Bind mutation calls to the same canonical root as the session.
6. Keep payload-store lookup inside the daemon process that materialized the
   graph; missing bundle fails closed.

Current daemon security is sufficient for **D1 read-only review** if the new
method is authenticated, root-bound, schema-validated, and classified
read-only. It is **not** sufficient for Apply until (1)–(5) exist.

---

## 29. Desktop process trust

Assume the renderer is easier to compromise than the application host.

Renderer requests are **intent**, not mutation authority. Host always
re-fetches the bundle and recomputes/revalidates authoritative facts.
Desktop-computed diffs, shortened digests, and disabled buttons are UX only.

---

## 30. Multiple proposals

`selectSessionMutationProposal` array-first / `ambiguous` is **not** an
Apply selector.

D1/D2 must list host-held authoritative proposals for the session/graph
(`proposalId` + safe evidence). The human selects `proposalId`. Approve
without an explicit selection is invalid.

Preview proposals remain non-authoritative and cannot be approved.

---

## 31. Proposal expiry

Display `expiresAt` / currentness. If expired, disable Approve & Apply.
Host still rechecks. UI disabling is never security.

---

## 32. Cancellation

Reuse existing session/graph cancellation and Apply `AbortSignal` mapping.

| Phase                                 | Behavior                                     |
| ------------------------------------- | -------------------------------------------- |
| Before click                          | No host mutation                             |
| During approval request, before claim | `cancelled-before-write`; no approval export |
| After claim, before write             | Existing Slice 3.1 before-write failure      |
| During transaction                    | Existing writer/rollback semantics           |
| During verification                   | Cancel does not un-apply                     |
| After applied                         | Renderer cancel must not erase the mutation  |

Client Promise abort is not success (same as N6 graph cancel).

---

## 33. Button semantics

Final wording for the first mutating control: **Approve & Apply**.

Not Continue, Accept, Done, Apply (alone), or Approve (alone). The combined
host action and the label must match.

Disabled reasons (expired, stale, no selection, in-flight, already applied)
must be explicit status text, not color-only (React a11y: glyph + word).

---

## 34. Confirmation design

**Decision:** do not add universal second-confirmation friction.

The explicit **Approve & Apply** click is the human approval for ordinary
declared-path generated-file transactions inside existing bounds (max 256
files, 1 MiB/file, 8 MiB aggregate, realpath containment).

Risk-based extra confirmation is justified only when existing governance
already treats the case as higher risk. For this mutation class:

- delete is unsupported → reject, do not confirm;
- undeclared hidden metadata → fail closed (Slice 2.5/4);
- extra / escaped paths → fail closed, no override checkbox;
- many files within the existing hard cap → show the full review, not a
  second modal by default.

If a later capability adds deletes, symlink retargeting, or writes outside
generated-file declared paths, that is a new security review — not a generic
“type APPLY” checkbox invented here.

Foundation scaffold’s `applyConfirmed` checkbox is a different domain
(scaffold apply) and is not copied onto Neutron by default.

---

## 35. Sensitive paths

Reuse existing path/profile mechanisms; do not invent uncontrolled
exceptions.

| Mechanism                                                              | Role                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| Session/profile `allowedPaths` + proposal capability clamp (Slice 5.1) | Who may propose                                 |
| Canonical path + `realpath` containment                                | Where writes may land                           |
| Exact path-set equality                                                | No extra path at Apply                          |
| Hidden metadata denylist unless declared                               | No silent `.aif` widening                       |
| N4 `trustedRoot` string equality                                       | Insufficient alone; Apply already uses realpath |

If a proposal includes high-risk paths that fail those controls: **reject**.
If it passes: existing host-issued approval is sufficient. Do not add a
parallel “allow sensitive path” exception flag.

---

## 36. Network

After a review artifact exists, approval and Apply are **host-local**.

No provider/model call between human approval and Apply. That prevents the
model from changing the reviewed transaction.

N2/Ollama remains available for new graph turns, which produce **new**
proposal identities, not mutations of the reviewed bundle.

---

## 37. Evidence

Desktop-visible safe evidence (status and result surfaces):

- `transactionId`, `proposalId`
- `approvalId` (not token)
- `reviewArtifactDigest`, `planDigest`, `proposalDigest`
- changed / created / updated / unchanged paths
- `applied`, verification status, `verificationEvidenceDigest`
- `reconciliationRequired`, rollback status summary
- graph/task/attempt identities from existing graph apply evidence

No bodies except on the explicit review content endpoint. No
`previousContent`. No `approvalToken`. Byte-check records may include
expected/actual **digests** only.

---

## 38. Audit / logging

Log identities, statuses, and digests. No tokens, prompts, raw secret
bodies, or reasoning traces. Reuse existing redaction helpers on error
messages.

Conceptual future metrics (docs only; do not add production instrumentation
from this brief): approveAndApply counts by structured status, stale
rejects, lock conflicts, verification mismatches. No payload bodies.

---

## 39. No N4 mutation tool

First Desktop mutation flow calls a host application RPC.

Keep N4’s seven read-only tools: `inspect`, `doctor`, `memorySearch`,
`timeline`, `conformance`, `securityAudit`, `projectDiff`.

Do not design `applyApprovedTransaction` as model-callable.
`mutationAttempted` stays `false` on proposal nodes.

---

## 40. `mutationAllowed`

Keep model-facing `mutationAllowed: false` on `NeutronRuntimeSession`.

Desktop human host mutation is **outside** model session permission. Do not
change the N1 contract merely to enable Desktop Apply.

---

## 41. Proposed implementation slices (not authorized)

Adjustments after audit: add **DL** as a D4 prerequisite; keep D3 as host
issuer tests without public Approve-only RPC; D1 remains first.

### DL — Legacy fake Approved Apply isolation/removal

Prerequisite to D4. Remove or replace `App.tsx` fabricated success.
Neutron remains unable to reach it.

### D1 — Read-only review payload protocol + daemon endpoint

**Implemented and merged** — PR #516 (`feat/neutron-desktop-mutation-review-transport`);
starting main `d8d312f2c9e2dac9f7375a2f79ab572d4e75bb7d`; final head
`25d0f6391ebc3079a755c2cbe0f492ef868a6578`; merge
`ca87a2532d1e4965655f97d39efb21fc8ad36437`.

Transport exact reviewed bytes from the host payload store to Desktop via
`intentloom.neutron.mutation.review.list.v1` and
`intentloom.neutron.mutation.review.get.v1` (read-only). Tauri:
`list_neutron_mutation_reviews`, `get_neutron_mutation_review`. Desktop client:
`listNeutronMutationReviews`, `getNeutronMutationReview`. Generic Neutron invoke
does not gain arbitrary mutation-review dispatch. Proposed bytes only from
`NeutronGraphMutationPayloadStore` / authoritative
`NeutronGraphMutationReviewBundle` — never reconstructed from preview, model
output, or Desktop bodies. In-memory payload store: daemon restart without
payload fails closed (persistence not implemented). Compatibility correction:
`resolveDaemonProjectRoot` honors `enforceCanonicalRoots === false` for Neutron
session/review dispatch; production daemon remains
`enforceCanonicalRoots: true`; Slice 5.1 `attemptFingerprint ===
currentFingerprint` unchanged.

No approval. No Apply.

### D2 — Desktop exact mutation review UI

**Implemented and merged** — PR #519 (`feat/neutron-desktop-mutation-review-ui`);
starting main `4ce587259080d8dee8e0ebe843fc7a02899d52cc`; final head
`74acec00d07afcf8c5a69e8ba667d091fcedbfa7`; merge
`2d3dfed9296ee998a458379db81ac5c0e1fa9e67`. Do not record the first branch
head `759d910dab9261066283b3fd53923f0e0917cdac` as the final D2 head.

Render diffs/classification/digests/expiry/currentness over the D1 viewmodel.
Still no approval or Apply. Explicit multi-proposal selection UX without
enabling mutation: if multiple authoritative proposals exist, none is silently
selected; get uses explicit `proposalId`. If one proposal exists, Desktop may
present it directly while preserving explicit proposal identity. Host
currentness (current / stale / expired / cancelled) is rendered as-is; Desktop
does not rebase, regenerate, convert stale to current, or rerun a model.
Exact review distinguishes `"alpha"` from `"alpha\n"`, `"alpha\n"` from
`"alpha\n\n"`, and `""` from `"\n"` via presentation marker
`No newline at end of file` without mutating authoritative D1 strings (EOF
correction `5ccd169dec03deba294f9ed907c7266db1823d1e`). A later test-helper
CodeQL correction (`74acec00d07afcf8c5a69e8ba667d091fcedbfa7`) did not change
production review semantics. Renderer review state clears when root, session,
project, or graph scope changes. Secret-like paths expose safe status only.

D2 did not add Approve, Apply, approval issuance, transaction mutation, D3
host approval intent, D4 approveAndApply, D5 reconnect/status flow, DL
cleanup, N4 mutation tool, or `mutationAllowed` change. Those remain
unauthorized.

### D3 — Host approval-intent protocol + security tests

**Implemented on branch `feat/neutron-mutation-approval-intent` (PR #522),
awaiting maintainer review.** Not merged. Not complete. Internal host issuer + intent
schema + adversarial tests. No production Desktop button. No public
Approve-only RPC. Apply may be exercised in tests through existing host
functions. D4 is not authorized by this implementation.

### D4 — Approve & Apply host operation

Daemon mutating RPC using existing graph mutation Apply. First real Desktop
mutation authority. Requires DL + durableStateDirectory wiring + D1 bundle
lookup.

### D5 — Authoritative result / verification / reconnect UX

Structured statuses, reconnect via `status.get`, applied vs verified.
No Undo. Retry verification may be designed but remains separately gated.

---

## 42. Security gates per slice

### D1

| Gate       | Rule                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Allowed    | Read host-held review bundle; return declared-path proposed bytes + current disk bytes for diff; list authoritative `proposalId`s |
| Forbidden  | Approval issuance, claim, Apply, token, Desktop writes                                                                            |
| Inputs     | session/project/root/graph + optional `proposalId`                                                                                |
| Outputs    | Safe review viewmodel; `stale` / `proposal-not-found` / `ambiguous` listing                                                       |
| Tests      | Binding, root equality, no token/previousContent, extra-path ignore, preview not authoritative, missing store, size bounds        |
| Exit       | Desktop can display exact reviewed bytes; fingerprint unchanged; Apply still impossible                                           |
| Next grant | Explicit maintainer authorization for D2 (or combined D1+D2 docs/UI)                                                              |

### D2

| Gate       | Rule                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Allowed    | Review UI over D1 payload; disable expired/stale; explicit selection                                            |
| Forbidden  | Approve & Apply button that calls a mutating RPC; reuse of `ApprovedApplyModal`                                 |
| Inputs     | D1 viewmodel                                                                                                    |
| Outputs    | Human-readable diff + statuses                                                                                  |
| Tests      | Paths-only is insufficient; multi-proposal requires click-to-select; Neutron still does not import legacy modal |
| Exit       | Review UX ready; mutation still unauthorized                                                                    |
| Next grant | D3                                                                                                              |

### D3

| Gate       | Rule                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Allowed    | Host factory for `NeutronMutationApproval` from intent; reject spoofed fields; tests may call existing Apply |
| Forbidden  | Production Desktop mutating control; public Approve-only RPC; token in responses                             |
| Inputs     | Typed intent fixture                                                                                         |
| Outputs    | Host approval object in-process; public results still token-free                                             |
| Tests      | Section 43 adversarial cases that do not require Desktop chrome                                              |
| Exit       | Issuer cannot be spoofed by model/renderer fields in tests                                                   |
| Next grant | D4 including DL                                                                                              |

### D4

| Gate       | Rule                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Allowed    | `approveAndApply` → host approval → Slice 3.1 claim/lock → graph Apply → Slice 4                                  |
| Forbidden  | N4 tool, `mutationAllowed: true`, Undo, silent retry, client approval records, extending `invoke_neutron_request` |
| Inputs     | Typed intent                                                                                                      |
| Outputs    | Structured Apply/verification result                                                                              |
| Tests      | Full section 43 including two windows, reconnect, legacy isolation                                                |
| Exit       | One human click can mutate only through the canonical chain; token never on Desktop                               |
| Next grant | D5                                                                                                                |

### D5

| Gate       | Rule                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| Allowed    | Result/evidence/status recovery UX; optional design of Retry verification |
| Forbidden  | Retry Apply, Undo, collapsing statuses                                    |
| Inputs     | D4 result + `status.get`                                                  |
| Outputs    | Applied vs verified vs reconciliation copy                                |
| Tests      | Response-lost-after-Apply, verification mismatch labeling                 |
| Exit       | Reconnect shows durable truth                                             |
| Next grant | Separate Undo / verification-retry / N4 decisions                         |

### DL

| Gate       | Rule                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| Allowed    | Remove or replace fabricated Approved Apply success                          |
| Forbidden  | Wiring Neutron to the stub; leaving fake success reachable beside real Apply |
| Exit       | No Desktop path fabricates `applied: true` without the daemon                |
| Next grant | Required before D4 merge                                                     |

---

## 43. Required adversarial tests (future implementation)

Documented now; not added in this docs PR:

- model emits `approved: true`
- renderer sends fake `approvalId`
- renderer sends `approvalToken`
- renderer sends `grantedApprovals` / `approved: true`
- proposal changed after review
- project changed after review
- stale graph / checkpoint / profile
- expired proposal
- cancelled session
- double click / duplicate RPC
- two Desktop windows on one project
- daemon restart after claim
- crash after write
- response lost after Apply
- verification mismatch labeled Applied + Verification failed
- multiple proposals require explicit `proposalId`
- malicious extra path
- symlink escape
- hidden metadata path undeclared
- Desktop reconnect uses status.get
- token leakage in viewmodels/logs/results
- `previousContent` leakage
- Slice 5.1 rebind of candidate A onto project B rejected
- preview/`expectedOutput` cannot approve
- missing payload store after restart → not found, no rematerialize
- legacy fake Apply not reachable from Neutron
- no N4 mutation tool; `mutationAllowed` remains false

---

## 44. Production metrics

Docs only. Do not touch production files in the brief PR. Future slices may
count structured statuses without logging bodies or tokens.

---

## 45. Canonical document

This file:
`docs/roadmap/NEUTRON_N6_DESKTOP_MUTATION_HOST_BRIEF.md`

---

## 46. Cross-links

Update pointers in `DUTY_WATCH.md`, `PROJECT_STATE.md`,
`NEUTRON_RUNTIME_ROADMAP.md`, `NEUTRON_N6_DESKTOP_READONLY_BRIEF.md`, and
`NEUTRON_MUTATION_ROUTING_BRIEF.md`. Mark **D1** and **D2** complete. D3
branch status is recorded in the status section; D4–D5 remain unauthorized.

---

## 47. Status wording (normative)

Implementation and handoff PRs that cite this brief must repeat:

**D1 IMPLEMENTED AND MERGED** (PR #516)

**DESKTOP MUTATION D2 IMPLEMENTED AND MERGED** (PR #519)

**D3 IMPLEMENTED ON BRANCH AWAITING MAINTAINER REVIEW** (not merged)

**D4–D5, DL: NOT AUTHORIZED**

**DESKTOP APPROVE/APPLY IMPLEMENTATION: NOT AUTHORIZED**

**`mutationAllowed` remains literal `false`. N4 remains seven read-only tools.**

---

## 48. Architecture decision

**D1 (implemented):** read-only authoritative mutation review payload transport
from the authenticated daemon to Desktop (PR #516).

**D2 (implemented):** Desktop exact mutation review UI over D1 (PR #519).
Read-only. No Approve/Apply.

**D3 (branch, awaiting maintainer review):** host approval-intent protocol
and security tests. Not merged. No production Approve/Apply.

**Recommended next slice when separately authorized:** **D4** — Approve &
Apply host operation, including DL.

Rationale for sequencing (unchanged):

- Exact reviewed bytes live in the host payload store; D1 exposes them and D2
  presents them without widening mutation authority.
- Combined approveAndApply remains the later authority slice (D4), unsafe
  without D2 review UX, host issuer tests (D3), durable directory wiring, and
  legacy-stub cleanup (DL).
- Approval issuance, daemon Apply RPC, and Desktop `durableStateDirectory`
  wiring remain future grants.

This document does **not** authorize D4–D5 or DL. D3 on the implementation
branch is awaiting maintainer review and is not merged.

---

## 49. Out of scope (repeat)

- production mutation UI
- mutation RPC implementation
- Approve/Apply buttons
- N4 mutation tool
- Undo / host rollback execution
- `mutationAllowed` change
- automatic Apply retry
- persisting unused approvals
- rematerializing payloads from the model after daemon restart
