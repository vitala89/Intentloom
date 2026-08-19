# Desktop Existing-Project Adoption: Pre-Apply Security Review

Status: accepted review for the next bounded implementation slice. This document
does not implement Apply.

Date: 2026-08-19.

Scope: Intentloom Desktop existing-project adoption after PRs #337, #339, #340,
#342, and #343. Consumer: local existing repositories selected through Desktop.
This review does not apply to Vii as a product.

## Decision

**A. READY FOR BOUNDED APPLY IMPLEMENTATION.**

The canonical mutation machinery already exists in `@intentloom/application`
(`adoptProject` → `syncProject` → `synchronizeGeneratedFiles`). Desktop Apply
must reuse that path. It must not invent a second transaction engine, and it
must not call `applyProjectAdoption` (a different, narrower governance-pack
writer).

Crash-safe recovery is **not** a prerequisite for the first Apply PR. The first
release may only claim **handled-error rollback**. Process crash during mutation
is **not** crash-atomic today. That bound is explicit below and must remain
honest in protocol, UI, and tests.

Exact next PR: implement `intentloom.existing-project.adoption.apply.v1` as a
mutating, authenticated, allowlisted RPC that authorizes an
`ExistingProjectAdoptionApproval` receipt against a live prepared plan, then
applies through `adoptProject` / `synchronizeGeneratedFiles`, then runs
read-only `doctorProject` and `diffProject`.

## Current flow (merged)

```text
Select existing project
-> Inspect
-> Preview (adoptProject dry-run)
-> Resolve supported decisions
-> Validate
-> Prepare (security envelope)
-> Revalidate
-> Explicit local-interactive approval
```

Prepared ≠ approved ≠ applied. Approval currently returns `approved: true`,
`applied: false`, `changesApplied: 0`. Tauri still denies
`intentloom.existing-project.adoption.apply.v1`.

## 1. Current mutation primitives

There are three write-capable adoption-adjacent paths. Only one is the Desktop
existing-project engine.

| Primitive                                                    | Role                                                                                                                                                                                  | Use for Desktop Apply?                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adoptProject` → `syncProject` → `synchronizeGeneratedFiles` | Canonical generated-file adoption: creates/updates Intentloom-managed files, writes `.aif/manifest.lock.json` and `.aif/source-map.json`, post-write consistency, in-process rollback | **Yes. Required.** Preview already uses `adoptProject({ dryRun: true })`.                                                                                                          |
| `executeApprovedApplyPlan` / `evaluateApprovedApplyPlan`     | Generic Approved Apply gate + wrapper around `synchronizeGeneratedFiles`                                                                                                              | **Partial reuse.** Keep the gate ideas (expiry, state digest, explicit grant). Do not replace the typed adoption approval receipt with the coarse `atomic-commit-approval` string. |
| `applyProjectAdoption`                                       | Duty-watch/governance pack apply: `create` ops with hardcoded bodies, `expectedCurrentHash` pre-loop, `.aif/migration-journal.json` after success                                     | **No.** Wrong artifact set. Not the generated-skill/metadata transaction.                                                                                                          |

Evidence:

- Preview: `packages/application/src/existing-project-adoption-plan.ts` calls
  `adoptProject({ dryRun: true })` and throws if `proposal.applied`.
- Transaction: `synchronizeGeneratedFiles` in
  `packages/application/src/index.ts` (collision check, noncanonical path check,
  `safeDestination` per file, backup/create tracking, write, post-write
  validation, rollback).
- `adoptProject` live write: when not dry-run and not blocked, calls
  `syncProject({ dryRun: false })`.
- `applyProjectAdoption`: only writes `create` operations plus a journal file;
  `map-existing` is a no-op write.

### Planned action inventory (Desktop existing-project Apply)

These are the action classes produced by `adoptProject` items, not
`applyProjectAdoption` operations.

| Action                                                     | Precondition                                                                 | Expected-before                                                       | Write                                                                           | Rollback                                                                                  | Failure evidence                                                                   | Idempotency                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Create generated file (adapter skill, missing `.aif` file) | `writeEligible`, destination absent, not project-owned, no blocking conflict | Path absent (or later overwritten only if already Intentloom-owned)   | `fs.mkdir` + `fs.write` via `synchronizeGeneratedFiles` after `safeDestination` | Delete created path                                                                       | `TransactionResult.failedStage`, diagnostics                                       | Replay after success should be `already-applied` if live bytes already match desired payload |
| Update generated / metadata file                           | Existing Intentloom-owned or recognized metadata; content differs            | Live bytes captured into in-memory `backups` immediately before write | Same write path                                                                 | Restore backup bytes                                                                      | Same                                                                               | Same                                                                                         |
| Mapping metadata (project-owned / documentation mappings)  | Validated decisions; mappings passed into `adoptProject`                     | Encoded in `.aif/config.yaml` desired content                         | Config write as part of desired generated set                                   | Restore previous config or delete if created                                              | Same                                                                               | Same                                                                                         |
| Generated skill write                                      | Catalog/adapter generation; path canonical; not secret-like scan target      | Collision/noncanonical checks fail closed before any write            | Same                                                                            | Restore/delete                                                                            | Same                                                                               | Same                                                                                         |
| Manifest / source-map write                                | Built from desired generated files; included in the same transaction batch   | Existing lock/source-map bytes backed up if present                   | Written after generated files in the same loop                                  | Restore/delete                                                                            | Post-write validation codes                                                        | Same                                                                                         |
| Directory creation                                         | Parent of a write                                                            | Directory may already exist (`mkdir` recursive)                       | `fs.mkdir`                                                                      | Directories created for new files are **not** separately rolled back; file remove remains | Incomplete rollback if mkdir succeeded and later file write fails but remove fails | Harmless leftover empty dirs possible                                                        |

`FileSystem.write` is `writeFile` (not temp-file + rename). Per-file replacement
is not POSIX-atomic. The transaction is **logical**: all planned files then
rollback on thrown error.

## 2. Current rollback guarantees

| Failure                                                                                       | Classification                                                                                                                                           | Evidence                                                                                                                         |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Before first write (gate/revalidate fail, collision, noncanonical path, blocking diagnostics) | Fully recoverable (zero writes)                                                                                                                          | `synchronizeGeneratedFiles` returns `failed` with `rollbackAttempted: false`                                                     |
| Midway through multiple file writes (handled exception)                                       | Recoverable with evidence                                                                                                                                | In-memory backups restored; created files removed; `rollbackCompleted` true if every restore/remove succeeds                     |
| Metadata write failure                                                                        | Recoverable with evidence if the error is thrown inside the try                                                                                          | Manifest/source-map are in the same batch                                                                                        |
| Generated skill write failure                                                                 | Same                                                                                                                                                     | Same                                                                                                                             |
| Permission / disk full / IO error                                                             | Recoverable with evidence if `write` throws; **partially recoverable** if rollback itself fails (`transaction-rollback-incomplete`, `failed-incomplete`) | `rollbackFailures`                                                                                                               |
| Unexpected local modification during the write loop                                           | Not CAS-protected; last writer wins for that path unless `safeDestination` throws                                                                        | See TOCTOU                                                                                                                       |
| Cancellation mid-write                                                                        | **Not currently covered** by the transaction API (no deferred-cancel flag)                                                                               | Must be designed in Apply                                                                                                        |
| Daemon / process crash mid-write                                                              | **Not currently covered**                                                                                                                                | No durable journal. `.aif/migration-journal.json` is only written by `applyProjectAdoption` after success and is not this engine |
| Post-write consistency invalid                                                                | Recoverable with evidence                                                                                                                                | Validation failure throws, then rollback                                                                                         |

Do not claim process-crash atomicity. CLI `adopt` already ships this same
in-process rollback model.

## 3. TOCTOU findings

Window: final revalidation → first filesystem write, and then write N → write
N+1.

What current APIs do:

1. `revalidateExistingProjectAdoptionPreparedPlan` recomputes digest, plan id,
   expiry, root, preview identity, fingerprint, decisions, and blocking
   diagnostics. It does not take a mutation lock.
2. `synchronizeGeneratedFiles` then **re-reads** live bytes to decide
   create/update and to fill backups, then writes. That is not compare-and-swap
   against the approved fingerprint.
3. `applyProjectAdoption` checks `expectedCurrentHash` for all ops **first**,
   then writes later. That is still two-phase TOCTOU. Desktop must not treat it
   as a solution.
4. `safeDestination` runs immediately before each write: rejects symlink
   destinations and realpath escape from canonical root.

Project state **can** change between validation and mutation (editor, other
CLI, second Desktop, git checkout).

Required fail-closed control for Apply (implement in the Apply PR, not a new
engine):

1. Acquire an in-process exclusive lock keyed by canonical project root.
2. Under that lock, run the full 20-gate list including a fresh fingerprint.
3. Only then call `adoptProject` / `synchronizeGeneratedFiles`.
4. Keep `safeDestination` before every write (already present).
5. If fingerprint or revalidation is not `valid` under the lock: zero writes.

This does not stop a non-Intentloom process from mutating the tree during the
locked write loop. The remaining residual is accepted for the first release and
must be tested as “external edit during apply is undefined relative to the
approved snapshot; post-apply doctor/diff will surface drift.” A durable
filesystem lease is out of scope unless later evidence shows in-process locking
is insufficient.

## 4. Replay / idempotency

Current approval receipt is caller-held. Duplicate receipts are equivalent.
There is **no** daemon approval database and **no** consumed-token store.
Neutron `inFlightSessions` is unrelated.

Required Apply policy (deterministic, no new persistence):

| Situation                                                                  | Behavior                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same approval, project still matches approved fingerprint, not yet applied | First caller under the root lock applies; second waits then sees live state                                                                                                                                                      |
| Same approval after successful Apply                                       | Do **not** rewrite. If desired generated bytes and ownership metadata already match the plan payload, return `already-applied` with `changesApplied: 0`. If the tree drifted, fail closed (`stale-fingerprint` / `stale-digest`) |
| Same approval after successful handled rollback                            | Fingerprint should again match the approved snapshot; Apply may proceed (retry)                                                                                                                                                  |
| Same approval after `failed-incomplete`                                    | Fail closed. Return recovery evidence. Do not claim applied                                                                                                                                                                      |
| Concurrent duplicate Apply                                                 | Serialized by per-root lock. No double write of the same transaction                                                                                                                                                             |

Approval is **not** single-use in a persistent sense. It is **single-flight**
per root and **logically consumed** by a successful apply of that plan identity.
Replay after success is idempotent **already-applied**, not a second mutation.

Do not write approval records into the consumer repository.

## 5. Concurrency

| Scenario                                                     | Required behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two Apply calls, same canonical root                         | Exclusive per-root lock in the daemon process. Second waits or fails with a typed in-progress error. Prefer wait-with-deadline then `already-applied` or fail closed                                                                                                                                                                                                                                                                                                                                                                               |
| Two Apply calls, different roots                             | Allowed in parallel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Doctor / Diff / Preview / Inspect while Apply holds the lock | Doctor/Diff/Preview are read-only. They may observe a torn tree if they run **during** writes. Require: while a root lock is held for Apply, other mutating methods for that root wait; read-only methods should either wait for the lock or return a typed `mutation-in-progress` diagnostic. Smallest safe rule: **all project-scoped RPCs for that canonical root wait on the same lock** for the Apply critical section, so Doctor/Diff after commit see a stable tree. Preview during Apply should not start a second adopt dry-run mid-write |
| Daemon restart during Apply                                  | Lock is lost. Crash residual applies (see §6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Lock scope: **per canonical project root** (realpath of the approved root).
Not daemon-global.

## 6. Crash recovery

There is **no** durable transaction journal for `synchronizeGeneratedFiles`.
`nodeFileSystem.write` is not rename-atomic. Daemon restart during Apply can
leave a subset of generated files plus partial metadata.

First Apply release **may** guarantee:

- rollback on handled runtime errors when rollback itself succeeds;
- `failed-incomplete` with path evidence when rollback fails.

First Apply release **must not** guarantee:

- crash-safe atomic recovery;
- automatic repair after SIGKILL.

After a crash, the next session must Inspect → Doctor → Diff. Partial metadata
already maps to `partial-metadata` inspection readiness. The user re-previews;
a stale fingerprint/plan fails closed.

Durable journaling is **not** a blocker for this first Desktop Apply slice
because it would be a new subsystem the CLI adopt path also lacks. It is a
documented residual risk, not a silent claim.

## 7. Symlink / path findings

Existing controls:

- Daemon `canonicalProjectRoot`: absolute, exists, directory, **rejects root
  symlink**, returns `realpath`.
- Application `assertCanonicalProjectRoot` / fingerprint / approve / plan:
  reject symbolic-link roots.
- `inside()` / fingerprint `containedPath()`: traversal (`..`) fails closed.
- `safeDestination`: walk parents; symlink current path is `security-error`;
  realpath must stay under canonical root.
- `normalizeStoredPath` / `storedPathCollisionKey`: reject absolute/Windows
  device names; collision key is **lowercased** (case-insensitive collision
  detection for generated destinations).
- `nodeFileSystem.list` **skips** symlink entries when scanning.
- Fingerprint **skips** symlink files (they are omitted from the hash).

Required immediately before each transaction mutation (already in
`synchronizeGeneratedFiles`; Apply must not bypass it):

1. Reconfirm canonical root is not a symlink and still equals approved root.
2. `safeDestination` for the concrete write path.
3. Fail closed on collision keys and noncanonical stored paths.

Gaps to keep fail-closed in Apply gates (before first write):

- Affected path became a symlink after approval: fingerprint may have skipped
  it; `safeDestination` must still abort that write and roll back.
- Parent directory became a symlink: `safeDestination` walk should catch it.
- Generated destination escaping root: `inside` + `safeDestination`.
- Case-insensitive collision between a generated path and an existing
  project-owned file: `findDestinationCollisions` covers generated set
  collisions; Apply tests must include a macOS-like case-fold fixture.

## 8. Post-apply Doctor / Diff / Ready

A successful filesystem transaction **is not** Ready.

Required order:

```text
authorize + lock
-> adoptProject / synchronizeGeneratedFiles
-> if transaction failed: return failure (rollback status); do not call Ready
-> if transaction succeeded: doctorProject (read-only)
-> diffProject (read-only)
-> evaluate Ready
```

`doctorProject` and `diffProject` (`plan`) do not write. They must keep using
the same `FileSystem` against the committed tree. Do not pass a mutating
transaction option.

**Do not roll back** a committed successful transaction because Doctor or Diff
is unhappy. That would destroy an already-consistent generated state due to
unrelated warnings (documentation missing, instruction-root warnings, formatter
noise). Post-apply verification failure is **committed-but-needs-attention**.

Ready (all required):

- `applicationStatus` applied or `already-applied`;
- `transactionOutcome.status === "success"` (or already-applied with matching
  live generated state);
- Doctor: no `severity === "error"` findings (info `installation-healthy` may
  be present);
- Diff: no unmanaged Intentloom generated drift (`conflict` / `modified` /
  `security-error` on Intentloom-managed paths). Project-owned mapped files
  remaining unchanged is success;
- Inspection readiness `ready` (metadata present).

Not Ready: any Doctor error, unmanaged generated drift, `failed-restored`,
`failed-incomplete`, denied authorization.

Warnings stay visible and must not be upgraded to Ready by transaction success
alone.

## 9. Apply result model

Do not invent a Desktop-only result. Compose existing types into one protocol
viewmodel (same pattern as approve/prepare):

Reuse:

- `AdoptionProposal.applicationStatus` and `AdoptionTransactionOutcome`;
- `TransactionResult` path lists (`createdFiles`, `updatedFiles`,
  `unchangedFiles`);
- Doctor findings/errors;
- Diff `Plan.changes` (content omitted or redacted; paths + kinds only);
- Approval identity fields already on `ExistingProjectAdoptionApproval`;
- Prepared plan `preparedPlanId` / `planDigest` / `root`.

Conceptual result (protocol names to be added in the Apply PR):

- `status`: `applied` \| `already-applied` \| `denied` \| `rolled-back` \|
  `failed-incomplete` \| `applied-needs-attention`
- `canonicalRoot`, `preparedPlanId`, `planDigest`, `approvalId`
- `transactionId`: **omit** unless a real engine id exists. Do not fake one.
  `AdoptionTransactionOutcome` has no transaction id today.
- `appliedPaths` / `unchangedPaths` from `TransactionResult`
- `rollbackAttempted` / `rollbackCompleted` / `rollbackFailures`
- `changesApplied`: count of created+updated files; `0` for already-applied and
  denied
- `doctor` / `diff` viewmodels (existing daemon doctor/diff contracts where
  possible)
- `diagnostics` (safe codes only; `adoptProject` already sanitizes)
- `ready`: boolean
- `applied: true` only when filesystem mutation committed or already-applied
  equivalent; never when denied or rolled back

Evidence returned to the caller: identities, path **names**, rollback failure
paths, doctor/diff summaries. **Do not** return file contents, backup bytes, or
secret-like paths. `executeApprovedApplyPlan` currently stores
`previousContent` in rollback evidence — Desktop Apply **must not** copy that
shape into the protocol response.

Do not write an audit file into the consumer repo unless a later ADR requires
it. Current architecture does not.

## 10. Protocol / daemon / Desktop UX (design only)

Method: `intentloom.existing-project.adoption.apply.v1`

Classification: **mutating**.

Requirements:

- Authenticated daemon session (existing token handshake).
- Explicit capability, exact allowlist arm in daemon **and** Tauri
  (`is_foundation_method` currently **denies** this method; that is correct
  until the Apply PR).
- Params: canonical root, prepared plan, approval receipt (full typed object),
  preparedPlanId, planDigest. No extra path list. No shell. No generic
  execution.
- Daemon resolves `canonicalProjectRoot` then application re-checks symlink and
  equality with `approval.root` / `preparedPlan.root`.
- Final revalidation under the root lock before writes.
- Payload bounded by existing 1 MiB JSON-RPC message limit
  (`maxMessageBytes` in `packages/daemon/src/index.ts`). Oversized request/
  response already fails closed.
- Deterministic error mapping: reuse daemon `clientErrorCode` / viewmodel
  `reasons` (`stale-fingerprint`, `expired`, `tampered-digest`,
  `root-mismatch`, …). Add `mutation-in-progress` only if wait-with-deadline
  is rejected.
- Cancellation: if `AbortSignal` fires **before** the first write, cancel
  cleanly. After first write begins, **defer cancel** until the transaction
  try/finally completes (commit or rollback). Do not abort between writes.
  `synchronizeGeneratedFiles` has no cancel hook today; Apply must not pass a
  signal into the write loop in a way that leaves a torn tree.
- Concurrency: per-root lock as in §5.

Desktop UX:

- Separate **Approve** (done) and **Apply approved plan** (new). Do not merge
  into one click. Separate steps are a security feature, not a problem.
- Before Apply show: root, plan id/digest, affected file count from preview
  items with `writeEligible`, approval status, expiry, no unresolved decisions,
  explicit warning that project files will change.
- Apply enabled only after `revalidation.status === "valid"` **and** a live
  approval receipt that still binds that plan. UI validity is not trusted;
  daemon re-checks.

## 11. Secrets

`secretLikePath` treats `.env`, `.env.*`, and `*.key`/`*.pem`/`*.p12`/`*.pfx`
path segments. Fingerprint and inspect skip those paths. Adoption planning
`planProjectAdoption` also skips them.

Apply must:

- not include secret-like paths in protocol path lists if they were never
  adoption targets (they should not be);
- not hash secret contents into logs;
- not return `previousContent` / generated file bodies in the Apply RPC;
- not overwrite ignored secret-like files (they are not in the generated
  payload).

Residual: a secret stored at a non-matching path (for example `secrets.txt`)
is not classified. Do not expand secret detection in the Apply PR unless a
write target would include it.

## 12. Twenty gates (before any write)

Future Apply must verify, in order, under the per-root lock:

1. Canonical root resolves to the approved root.
2. Root is not a symlink substitution.
3. Prepared plan schema/version is supported.
4. Prepared plan is unexpired.
5. Approval is unexpired (`approvalValidUntil`, equal to plan expiry today).
6. Approval receipt is structurally valid (parse/validate).
7. Approval `preparedPlanId` matches.
8. Approval `planDigest` matches.
9. Approval `projectFingerprint` matches the live fingerprint.
10. Approval `root` matches canonical root.
11. `approvalDigest` / `approvalId` recompute equal (canonical JSON of unsigned
    fields, same as approve).
12. `approvalSource` is `local-interactive` only.
13. Plan revalidation status is `valid`.
14. Project fingerprint still matches (same as 9; keep an explicit check).
15. Decisions still validate (`invalid-decisions` / remaining manual paths).
16. No blocking diagnostics (`blocked-diagnostics`).
17. Affected write paths stay inside canonical root (`inside` /
    `normalizeStoredPath`).
18. No unsafe symlink on affected paths (`safeDestination` / pre-walk).
19. Transaction engine available (`synchronizeGeneratedFiles` / `adoptProject`
    not dry-run).
20. Rollback capability available for every planned mutation (in-memory backup
    or create-delete). If collision/noncanonical checks fail, that **is** fail
    closed before write.

Any failure: **zero writes.**

## 13. Threat matrix

| Threat                          | Attack / failure scenario          | Current mitigation                        | Gap                                                       | Required control                                 | Blocking for Apply?    |
| ------------------------------- | ---------------------------------- | ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ | ---------------------- |
| Stale plan                      | Tree changed after prepare         | Revalidate fingerprint/preview/digest     | Apply not implemented                                     | Revalidate under lock immediately before write   | no (design into Apply) |
| Stale approval                  | Clock past `approvalValidUntil`    | Approve uses plan expiry                  | Apply must re-check clock                                 | Injected clock, fail closed                      | no                     |
| Root substitution               | Different directory after picker   | Daemon realpath + approve bind            | Renderer could send another root                          | Compare approval.root, plan.root, canonical root | no                     |
| Symlink swap                    | Root or dest replaced with symlink | Reject symlink root; `safeDestination`    | Fingerprint skips symlink files                           | Gate + per-write `safeDestination`               | no                     |
| Digest tamper                   | Edited prepared plan JSON          | Digest/id recompute on revalidate/approve | Apply must recompute again                                | Same digest functions                            | no                     |
| Approval replay                 | Resubmit receipt                   | Duplicate receipts equivalent             | No consume DB                                             | Idempotent already-applied / stale fail closed   | no                     |
| Concurrent apply                | Two RPCs same root                 | None                                      | No root lock                                              | Per-root mutex                                   | no (in Apply PR)       |
| Partial write                   | Exception mid-loop                 | In-process rollback                       | Rollback can fail                                         | `failed-incomplete` + evidence                   | no                     |
| Daemon crash                    | Kill during write                  | None                                      | No journal                                                | Honest non-claim; doctor after restart           | no                     |
| Cancel during commit            | Abort between writes               | Request cancel exists on daemon client    | Transaction ignores cancel                                | Defer cancel until commit/rollback               | no                     |
| Post-apply verification failure | Doctor error after commit          | Doctor/diff exist                         | Ready vs rollback not defined before this review          | Committed-needs-attention; no auto-rollback      | no                     |
| Protocol tamper                 | Forged method / approval           | Auth token, allowlists, parse             | Apply method denied today                                 | Exact allowlist + parse                          | no                     |
| Oversized payload               | Huge plan                          | 1 MiB request/response cap                | Prepared plan must fit                                    | Keep bound; fail closed                          | no                     |
| Secret leakage                  | Contents in RPC/logs               | secretLikePath; diagnostic sanitization   | Approved Apply rollback evidence includes previousContent | Do not return contents                           | no                     |
| Cross-root path escape          | `../` destination                  | `inside`, normalizeStoredPath             | Must not bypass transaction                               | Fail closed                                      | no                     |
| Filesystem permission           | EACCES                             | write throws → rollback                   | Possible incomplete rollback                              | Surface rollbackFailures                         | no                     |
| Disk full                       | ENOSPC                             | Same                                      | Same                                                      | Same                                             | no                     |

No row in this table is a **separate** security-prerequisite PR. Remaining
controls belong in the bounded Apply implementation.

## 14. Capability matrix

| Capability             | Application                                                    | Protocol                                                | Daemon                                   | Desktop           | Ready for Apply?                                                                |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| Final revalidation     | `revalidateExistingProjectAdoptionPreparedPlan`                | revalidate RPC                                          | yes                                      | panel             | yes — call again under lock                                                     |
| Mutation authorization | typed approval receipt; generic Approved Apply gate is coarser | approval types                                          | approve RPC only                         | Approve button    | yes — verify receipt on Apply; do not substitute `atomic-commit-approval` alone |
| Transaction            | `synchronizeGeneratedFiles` / `adoptProject`                   | `TransactionResult` not yet an adoption-apply viewmodel | CLI adopt; no existing-project apply RPC | deny apply method | yes — reuse engine; add RPC                                                     |
| Rollback               | in-process backups                                             | `AdoptionTransactionOutcome`                            | none for this flow                       | none              | yes — handled errors only                                                       |
| Concurrency locking    | none                                                           | none                                                    | none                                     | none              | **add in Apply PR** (smallest missing primitive, not a blocker PR)              |
| Replay / idempotency   | none for approval                                              | caller-held receipt                                     | none                                     | none              | **add in Apply PR**                                                             |
| Post-apply doctor      | `doctorProject`                                                | `intentloom.doctor.v1`                                  | yes                                      | Doctor view       | yes — invoke after commit                                                       |
| Post-apply diff        | `diffProject`                                                  | `intentloom.project.diff.v1`                            | yes                                      | Diff view         | yes — invoke after commit                                                       |
| Readiness evaluation   | inspection `readiness`, doctor errors                          | inspect/doctor                                          | yes                                      | inspect           | yes — compose, do not invent a second Ready engine                              |
| Recovery evidence      | rollbackFailures, failedStage, postWriteValidation codes       | partial on adopt proposal                               | sanitized diagnostics                    | none              | yes — return codes/paths, not contents                                          |

## 15. Blocking gaps

None that require a separate prerequisite PR before bounded Apply.

Non-blocking residuals that the Apply PR must not paper over:

- no crash journal;
- no filesystem CAS;
- no persistent approval store;
- generic `executeApprovedApplyPlan` rollback evidence is content-bearing and
  must not be used as the Desktop protocol result.

If Apply implementers discover that `adoptProject({ dryRun: false })` cannot
consume prepared-plan decisions without a small adapter function, that adapter
stays in application (map decisions → `projectOwnedMappings` /
`documentationMappings`) and is part of the same Apply PR — not a second
engine.

## 16. Exact next PR

**Title direction:** `feat(adoption): apply approved existing-project plan transactionally`

**Must:**

1. Application `applyExistingProjectAdoptionPreparedPlan` (name may vary)
   implementing the 20 gates, per-root lock (module-level map is acceptable if
   daemon is the only concurrent mutating client; still serialize inside
   application so CLI+daemon in-process tests can cover it), then
   `adoptProject` / `synchronizeGeneratedFiles`.
2. Protocol viewmodel + `intentloom.existing-project.adoption.apply.v1`.
3. Daemon mutating capability, dispatch, canonical root, lock around
   authorize+mutate+doctor+diff.
4. Tauri exact allowlist arm (no wildcard). Still no shell/FS plugin.
5. Desktop: summary + separate Apply action; never auto-apply on approve.
6. Tests: zero writes on each failed gate; rollback; already-applied;
   concurrent same-root; symlink; stale fingerprint; doctor/diff read-only
   after commit; apply still denied until allowlisted in that PR’s tests
   flip from deny to allow.

**Must not:** Git commit/push; second transaction engine; `applyProjectAdoption`;
consumer-repo audit files; claiming crash atomicity.

## References

- ADR-0003 non-destructive adoption
- ADR-0007 application operation boundary
- ADR-0008 versioned local protocol
- ADR-0009 daemon security (1 MiB messages, auth, local IPC)
- ADR-0053 Approved Apply transaction engine
- `docs/roadmap/DESKTOP_EXISTING_PROJECT_ADOPTION_PLAN.md` slices C4–E
- `packages/application/src/existing-project-adoption-approval.ts`
- `packages/application/src/existing-project-adoption-prepared-plan-revalidate.ts`
- `packages/application/src/index.ts` (`synchronizeGeneratedFiles`,
  `adoptProject`, `applyProjectAdoption`, `doctorProject`, `diffProject`)
- `apps/desktop/src-tauri/src/method_allowlist.rs`
