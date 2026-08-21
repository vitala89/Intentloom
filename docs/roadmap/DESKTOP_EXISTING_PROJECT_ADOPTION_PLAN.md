# Desktop Existing-Project Adoption Plan

Status: proposed post-v0.6 product follow-up — **complete on `main` at `a9ad998`
(PR #353)**.

Primary outcome: a Desktop user can select an existing repository, review exactly what Intentloom would add or map, resolve ownership conflicts explicitly, approve one prepared adoption plan, apply it transactionally through the shared application boundary, and finish with verified `Doctor` and `Diff` results.

This plan is derived from real dogfooding against the existing Nx/TypeScript Vii workspace. It does not replace the completed v0.6 read-only vertical slice. It extends that product flow with a bounded onboarding mutation after the separate Approved Apply security boundary is satisfied.

## Product principle

Desktop must not become a second implementation of Intentloom.

All onboarding behavior must reuse the same canonical operations and contracts used by CLI, TUI, MCP, and other clients:

```text
Desktop UI
  -> typed Desktop client
  -> authenticated daemon protocol
  -> application operations
  -> adoption / transaction engine
```

The Desktop client must not parse human CLI output, duplicate profile or workspace detection, reimplement ownership rules, write project files directly, or invoke arbitrary shell commands.

Anything supported from Desktop must remain possible through the canonical non-Desktop surfaces. Desktop is an ergonomic orchestration layer, not a separate domain implementation.

## Why this follow-up exists

The completed v0.6 flow intentionally stops at read-only project inspection:

```text
Launch
-> connect
-> select and confirm project
-> Inspect
-> Doctor
-> Diff
-> Timeline
-> close
```

Real existing-project adoption requires one additional reviewed lifecycle:

```text
Select project
-> Inspect
-> Adoption preview
-> Resolve explicit conflicts
-> Review prepared plan
-> Approve
-> Revalidate
-> Transactional apply
-> Doctor
-> Diff
-> Ready
```

The Vii dogfooding exercise proved that this flow is valuable because onboarding can discover real repository-specific conditions such as:

- engineering profile detection (`typescript`);
- workspace topology detection (`nx`);
- supported adapter detection (for example Codex, Cursor, Copilot);
- existing project-owned `AGENTS.md` conflicts;
- documentation mappings;
- generated `.aif/` metadata;
- generated provider skills;
- post-adoption health and drift verification.

It also exposed bugs that were fixed in Core before Desktop adoption is attempted, including Nx/profile confusion, `.nx/cache` scan noise, over-broad documentation ambiguity, and formatting-sensitive generated JSON drift.

A later CLI-only record,
[2026-08-18-vii-first-development-cycle.md](../releases/dogfooding/2026-08-18-vii-first-development-cycle.md),
shows one real post-adoption development cycle on Vii with healthy doctor and
empty diff. That evidence informs this plan. It does not implement Desktop
adoption or close this follow-up.

A 2026-08-19 Vii-derived disposable dogfood of the Desktop adoption RPC chain
is recorded in
[2026-08-19-vii-desktop-full-adoption.md](../releases/dogfooding/2026-08-19-vii-desktop-full-adoption.md).
It does **not** close Slice F or the packaged Desktop exit criteria.

## User journey

### 1. Open Existing Project

The Desktop welcome surface exposes an explicit action such as:

```text
Open Existing Project
```

The user selects a directory through the native directory picker.

The canonical project root must be resolved and confirmed before any project-scoped operation runs.

### 2. Project discovery

Desktop invokes the canonical project inspection operation and presents verified values only.

Example:

```text
Project: Vii
Engineering profile: TypeScript
Workspace topology: Nx
Adapters: Codex, Cursor, Copilot
Intentloom status: Not initialized
```

Unknown values must be shown as unknown or not evaluated. The UI must not invent a framework, profile, package manager, tool, or adapter from heuristics that are not present in the application result.

### 3. Environment diagnostics

Environment discovery is read-only and separate from Intentloom adoption.

The UI may report relevant local prerequisites such as:

```text
Node.js       detected
pnpm          detected
Git           detected
Dependencies  installed / missing / not evaluated
```

This phase must not silently run package-manager, build, shell, network, or installer commands.

Intentloom project adoption is not equivalent to `npm install`, `pnpm install`, `pip install`, `cargo add`, or any other project dependency installation.

A future controlled execution capability may offer environment preparation only through its own preview, command allowlist, network declaration, affected-path expectations, sandbox policy, and explicit approval.

### 4. Adoption preview

Before any write, Desktop requests the canonical adoption plan.

The UI groups planned results by meaning rather than exposing only a raw file list.

Example:

```text
Intentloom metadata
+ .aif/config.yaml
+ .aif/local.example.yaml
+ .aif/manifest.lock.json
+ .aif/source-map.json

Generated adapter guidance
+ .agents/skills/...

Existing project-owned files
= README.md preserved
= architecture documentation preserved

Requires decision
! AGENTS.md already exists
```

The plan shown by Desktop must be derived from the same prepared-plan data used by the canonical adoption/application layer.

### 5. Explicit ownership conflict resolution

When an existing file conflicts with a generated destination, Desktop must not guess.

For example:

```text
AGENTS.md

[ ] Replace with generated content
[x] Keep existing file project-owned
[ ] Map manually
```

The safe default for an existing project-owned instruction file is to preserve it unless the user explicitly chooses another supported resolution.

The UI must explain why a choice is required and what ownership record will be persisted.

### 6. Review prepared plan

Before approval, Desktop presents:

- canonical project root;
- detected profile and workspace topology;
- planned creates, updates, mappings, and skips;
- exact conflict resolutions;
- generated adapter outputs;
- ownership changes;
- affected paths;
- whether network is required;
- whether external commands are required;
- rollback or transaction behavior;
- plan identity and digest;
- expiry or staleness state.

For normal Intentloom adoption, network and arbitrary command execution should remain absent unless a separately approved capability explicitly requires them.

### 7. Approve and apply

Desktop exposes no broad `Apply all` shortcut before review.

The approved flow must reuse the canonical security boundary:

```text
prepare
-> exact paths and diff
-> explicit human approval
-> plan identity and digest
-> expiry
-> canonical root
-> ownership
-> permissions and capability
-> current project state
-> transactional apply or reject
-> rollback evidence
```

Immediately before mutation, the application layer must revalidate the plan against current project state. A stale or changed project must fail closed and return to review.

Model output, chat text, provider availability, an earlier broad permission, or a previous approval must never count as adoption approval.

### 8. Post-apply verification

After a successful transaction, Desktop automatically runs canonical health and drift checks.

The ready state should require, at minimum:

```text
Intentloom metadata present
Doctor: installation healthy
Diff: no unmanaged drift
```

Example product result:

```text
Intentloom setup complete

Project: Vii
Engineering profile: TypeScript
Workspace topology: Nx
Health: Healthy
Drift: None
Adapters: Codex, Cursor, Copilot

Start Workspace
```

Warnings remain visible and must not be converted into success merely because the transaction completed.

## Required application and protocol capabilities

Desktop implementation must not begin by adding page-specific logic. First verify or add shared typed operations for:

1. project inspection;
2. adoption-plan preparation;
3. ownership/document mapping choices;
4. prepared-plan identity and digest;
5. plan staleness/revalidation;
6. approved transactional application;
7. doctor;
8. diff;
9. structured diagnostics and safe error taxonomy.

If an operation already exists in `@intentloom/application`, Desktop and daemon work must expose or reuse it rather than introducing a parallel code path.

## Safety boundaries

The adoption wizard must preserve these constraints:

- no arbitrary shell access;
- no direct webview filesystem writes;
- no hidden network access;
- no implicit dependency installation;
- no automatic replacement of project-owned instruction files;
- no mutation before explicit review and approval;
- no application of stale plans;
- no project-root expansion after confirmation;
- no model response as approval;
- no automatic Git commit, push, merge, release, deploy, or publish;
- no weakening of fail-closed conflict handling.

Generated machine-owned JSON metadata may be formatted differently by repository tooling without creating semantic drift, but malformed or semantically changed metadata must still fail deterministically.

## Environment preparation is a separate capability

Desktop may eventually help users prepare a project environment, but this must not be coupled to adoption.

A future `Prepare environment` action must show, before execution:

```text
Command: pnpm install
Working directory: <canonical project root>
Network: required
Expected project-owned files that may change: pnpm-lock.yaml
Ignored/runtime output: node_modules/
```

It requires a command allowlist, explicit network declaration, bounded working directory, environment sanitization, output limits, cancellation semantics, and separate human approval.

Until that execution boundary exists, Desktop should only diagnose missing prerequisites and provide manual remediation guidance.

## UX states

At minimum the onboarding UI should represent:

- project not selected;
- inspecting;
- unsupported or ambiguous project;
- not initialized;
- already initialized;
- adoption preview ready;
- manual decision required;
- plan stale;
- awaiting approval;
- applying;
- applied;
- verification running;
- ready;
- healthy with warnings;
- failed safely;
- rollback/recovery information available.

## Dogfooding acceptance scenario

Use an existing Nx/TypeScript workspace equivalent to the Vii adoption scenario.

Expected flow:

1. select repository;
2. detect `typescript` engineering profile;
3. detect `nx` workspace topology separately;
4. detect supported adapters;
5. preview `.aif/` and adapter skill creation;
6. preserve unrelated repository files;
7. surface existing `AGENTS.md` as an explicit ownership decision;
8. choose `keep project-owned`;
9. apply transactionally;
10. verify `Readiness: ready`;
11. verify `installation-healthy`;
12. verify zero semantic drift;
13. verify no unrelated project-owned file changed.

The test fixture must also cover repository formatter interaction with AIF-owned JSON metadata so formatting-only changes do not create false drift.

## Test requirements

### Contract and application tests

- CLI and daemon adoption plans are structurally equivalent for the same repository state;
- Desktop receives the same normalized result through protocol contracts;
- conflict mappings round-trip without loss;
- stale plan revalidation fails closed;
- transaction failure does not leave partial generated state;
- doctor and diff run against the post-apply state;
- semantic JSON equality remains formatting-insensitive for AIF-owned metadata.

### Desktop tests

- keyboard-complete onboarding flow;
- screen-reader labels for plan actions and conflicts;
- non-color conflict and health indicators;
- large plan rendering;
- cancellation before approval produces no writes;
- closing during preview produces no writes;
- applying requires explicit approval;
- post-apply warning states remain visible;
- daemon disconnect and reconnect do not repeat an already-applied transaction.

### Security tests

- selected root cannot be replaced implicitly after approval;
- symlink/root-containment behavior matches the application boundary;
- untrusted project content cannot inject an approval action;
- renderer cannot invoke unapproved daemon methods;
- token and local daemon credentials remain outside the DOM and logs;
- no package-manager or shell process can be triggered by the adoption wizard.

## Suggested implementation sequence

Keep the work reviewable.

### A. Contract inventory

Completed on `feat/desktop-adoption-contracts`. Application already had
`inspectProject`, `adoptProject` (dry-run proposal items), `planProjectAdoption`,
`doctorProject`, and `diffProject`. W9 `existing-project.workspace.prepare`
exposes only an adoption summary. Doctor/inspect/diff already have daemon RPCs.

No UI changes in this slice.

### B. Daemon adoption-plan surface

Completed for **read-only preview** as `intentloom.existing-project.adoption.plan.v1`.
The operation reuses `adoptProject({ dryRun: true })` items (creates, mappings,
skips, manual decisions, conflict details, safe next actions). It does not
expose mapping-choice mutation or apply.

No generic command execution.

### C. Desktop read-only adoption preview

Implemented for **read-only preview UI** on Desktop. The existing typed client
`existingProjectAdoptionPlan` now has a workspace surface: project summary,
grouped plan items, manual-decision notices, diagnostics, and safe next
actions. No Apply, mapping persistence, or project mutation.

Still no mutation.

### C2. Desktop adoption decision modeling

Desktop adoption decision modeling implemented. Manual-decision items expose
only supported choices derived from `adoptProject` mapping behavior
(`keep-project-owned` via `projectOwnedMappings`, `map-existing-compatible-document`
via `documentationMappings`). `intentloom.existing-project.adoption.decisions.v1`
validates selections read-only against a preview identity. No Apply, mapping
persistence, or project mutation.

Replace is not offered.

### C3. Prepared adoption plan security envelope

Prepared adoption plan security envelope implemented. Validated decisions can
be sealed into a read-only prepared plan with `preparedPlanId`, `planDigest`,
`projectFingerprint`, `createdAt`, and `expiresAt`. Revalidation detects
expiry, fingerprint/proposal drift, and tamper. No approval or Apply.

### C4. Explicit adoption approval

Explicit adoption approval implemented. `approveExistingProjectAdoptionPreparedPlan`
and `intentloom.existing-project.adoption.approve.v1` revalidate the prepared
plan, then return a local-interactive approval receipt bound to
`preparedPlanId`, `planDigest`, `projectFingerprint`, and canonical root.
Approval does not outlive `preparedPlan.expiresAt`. `approved: true`,
`applied: false`, `changesApplied: 0`. No project writes.

The receipt is returned to the caller. It is not persisted in the selected
project. Future Apply must revalidate again and must not treat this receipt as
mutation.

Security mitigations in this slice:

- Approve revalidates on the application/daemon path (UI "valid" is not trusted).
- Root, digest, preparedPlanId, fingerprint, expiry, and unresolved decisions
  fail closed.
- Tauri allowlists `adoption.approve.v1` and still denies `adoption.apply.v1`
  without a method-family wildcard.
- Approval source is `local-interactive`; no fake user identity.
- Residual risk: TOCTOU between approval and future Apply, and caller-held
  duplicate receipts, remain for the Apply slice.

### D. Approved adoption apply

Bounded transactional existing-project Apply is implemented.
`applyExistingProjectAdoptionPreparedPlan` and
`intentloom.existing-project.adoption.apply.v1` require the prepared plan and
the local-interactive approval receipt, acquire a per-canonical-root mutation
lock, revalidate live, then reuse `adoptProject` → `syncProject` →
`synchronizeGeneratedFiles`. Handled runtime failures roll back. Post-apply
Doctor, Diff, and inspection readiness are evaluated. Filesystem commit is not
Ready by itself.

Prepared ≠ approved ≠ applied. Apply does not call `applyProjectAdoption`.
Crash-safe recovery is not claimed. External non-Intentloom editors may still
race during the write loop.

No automatic Git operations.

### E. Post-apply verification and readiness UX

Implemented on the Apply result: Doctor (read-only), Diff (read-only), and
inspection readiness, using the same catalog-bound `doctorProject` /
`diffProject` inputs as canonical CLI. Ready requires applied or already-applied, no Doctor
errors, no unmanaged generated Diff drift, and inspection `ready`. A committed
transaction with health issues is `applied-needs-attention` and is not rolled
back automatically.

Existing-project plan/apply bind `--catalog-root` from the daemon process so
desired generated state is not an empty-catalog subset of CLI `adopt`.

### F. Cross-client dogfooding

Prove parity across CLI, daemon, Desktop, and TUI where applicable using the same existing-project fixtures and a sanitized real-project record.

**Status:** complete. Daemon/protocol dogfood against a Vii pre-adoption clone
is recorded in
[2026-08-19-vii-desktop-full-adoption.md](../releases/dogfooding/2026-08-19-vii-desktop-full-adoption.md).
Final maintainer packaged/dev Desktop verification on adopted
`vii-desktop-final` is recorded in
[2026-08-21-vii-desktop-adoption-completion.md](../releases/dogfooding/2026-08-21-vii-desktop-adoption-completion.md).

## Exit criteria

This follow-up is complete only when a clean packaged Desktop installation can perform the following without a separately installed Intentloom CLI:

```text
Launch
-> connect/start authenticated daemon
-> select existing project
-> inspect
-> preview adoption
-> resolve explicit ownership conflicts
-> review exact prepared plan
-> approve once
-> revalidate
-> apply transactionally
-> doctor
-> diff
-> Ready
```

The resulting generated state must match canonical CLI/application behavior for the same approved inputs, unrelated project-owned files must remain unchanged, and project dependency installation must remain outside the adoption transaction.

## Non-goals

This plan does not add:

- generic terminal access;
- arbitrary shell execution;
- automatic package installation;
- background autonomous agents;
- implicit provider/model configuration;
- live external provider connections;
- marketplace installation;
- automatic Git commit, push, PR, merge, release, deploy, or publish;
- a second Desktop-specific adoption engine.
