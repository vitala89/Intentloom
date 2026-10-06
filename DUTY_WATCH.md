# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and
maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the
current state, records what happened during the watch, and leaves the repository
in a condition that the next watch can safely understand and continue.

## Current watch status

Status: **N5 complete**. Mutation-routing **Slice 1 contracts implemented**.
**Mutation Slice 2 implemented** (semantic authorization + approved-transaction
preflight). **Mutation Slice 2.5 implemented** (content-bound review artifact,
declared-path sync contract). **Mutation Slice 3 implemented** (host-only
single approved transaction Apply). **Mutation Slice 3.1 implemented**
(crash-safe durable approval/transaction state). **Mutation Slice 4
implemented** (independent post-Apply verification + sanitized rollback
evidence). **Mutation Slice 5 implemented** (N5 proposal/review integration;
host-only graph-linked Apply composition), **security-corrected by Slice 5.1**
(stale proposal fail-closed + end-to-end proposal capability clamp).
**N6 Slices 1–5 implemented** (read-only Desktop Neutron, including mutation
proposal review). **Desktop mutation host flow D1 complete** (implementation PR #516 and handoff
PR #517 merged; authoritative read-only mutation review payload transport).
**Desktop mutation host flow D2 complete** (implementation PR #519 merged;
read-only Desktop exact mutation review UX over D1). **Desktop mutation host
flow D3 complete** (implementation PR #522 and handoff PR #523 merged; host
approval-intent protocol + security tests). D3 does not grant production
Desktop mutation authority.
**Desktop mutation host flow DL complete** (implementation PR #525 and
handoff PR #526 merged; legacy fake Approved Apply production composition
removed). **Desktop mutation durable host state prerequisite complete**
(implementation PR #528 and handoff PR #532 merged). **DESKTOP MUTATION D4
COMPLETE** (implementation PR #534, merge
`0da5612e45d99454eb765cb370a058187ef47f94`; handoff PR #535, merge
`a7504ca09550d395a7180f863776dd83b10e3c49`; finalize PR #536, merge
`d62b10a67051fc0f5f1ccb4d8a863c69bca0b1c8`). **D5 SLICE 1 IMPLEMENTED AND
MERGED** (implementation PR #537, merge
`866c96ab6fd1a1265dfc46a8840117baaaebd0b6`; handoff PR #539, merge
`6b8c64e06a8d7e546bfa0566592f33790f5a7fb4`). **DESKTOP MUTATION D5 COMPLETE** (Slice 2 PR #540, merge
`bb9255a79229d9a64d611ce644c0f75caaec74bf`; final audited head
`a0c029f62c30008dde416f5f93847fca45279e0d`). **Post-D5 verification
recovery V1 is complete** (PR #541, merge
`988954db7eb1fec49df6279ea53af40c65cefa3a`). It retries Slice 4
verification only. The durable write compare-and-sets the Slice 3.1
record digest, so a stale cross-process retry cannot replace a newer
verified result. Cross-process CAS hardening is complete.
**Undo U1 host rollback preflight is implemented** on
`feat/neutron-mutation-undo-preflight` and is awaiting maintainer review.
U1 does not execute Undo, restore files, or persist pre-Apply bytes.
Updated-file transactions stay non-eligible (`undo-source-unavailable`)
because exact previous bytes do not survive a successful Apply.
`mutationAllowed` remains literal `false`. N4 remains the seven read-only
tools. U2 snapshot persistence, U3 Undo execution, U4 post-Undo
verification, U5 Desktop Undo, optional N3 Slice 5, P4l17, and any N4
mutation or verification tool remain unauthorized. Do not auto-merge.

### 2026-10-06, agent architecture source-of-truth hardening

- **Status:** complete on branch; awaiting maintainer review and CI.
- **Branch:** `docs/agent-architecture-source-of-truth`.
- **Objective:** ensure every non-trivial design, feature, refactor, or material
  edit starts from repository architecture/governance documentation rather than
  guessed conventions.
- **Finding:** the requested filenames `DDD_ARCHITECTURE.md`,
  `UBIQUITOUS_LANGUAGE.md`, `ARCHITECTURE_GUIDELINES.md`,
  `BACKEND_ARCHITECTURE.md`, `FRONTEND_ARCHITECTURE.md`, `CODE_STYLE.md`, and
  `AGENT_DEVELOPMENT_RULES.md` do not exist on `main`. Their concerns are already
  covered by canonical Intentloom documents, especially
  `ENGINEERING_PRINCIPLES.md`, `DOMAIN_MODELING.md`,
  `CODE_QUALITY_STANDARDS.md`, `REACT_BEST_PRACTICES.md`, `AGENTS.md`, and
  `AI_AGENT_WORKFLOW.md`. Creating duplicate files would create drift risk.
- **Completed:** added an explicit architecture source-of-truth map to
  `AGENTS.md`; strengthened `AGENT_START_HERE.md` so task preflight records
  applicable architecture docs, boundaries, ubiquitous language, dependency
  direction, file/function budgets, technology guidance, tests, and unresolved
  decisions; strengthened `AI_AGENT_WORKFLOW.md` so plans and PRs identify the
  canonical guidance used and agents must not guess unresolved durable
  architecture choices.
- **Code budgets:** existing canonical limits remain unchanged: preferred 250
  effective lines/file, review above 300, hard new-file limit 400 effective / 700
  physical, preferred 40 lines/function, hard 80 without approved exception.
- **Compatibility:** governance/documentation only. No runtime, schema, CLI,
  daemon, Desktop, protocol, package, or release behavior changed.
- **Not done:** no duplicate alias documents were created; no runtime code or
  existing architecture was reorganized.
- **Validation:** final GitHub compare/diff review and pull-request CI required.
- **Next first action:** review the PR diff and CI; merge only if the canonical
  source-of-truth mapping matches maintainer intent.

### 2026-10-06, Undo U1 — host rollback eligibility preflight

- **Status:** **UNDO U1 HOST ROLLBACK PREFLIGHT IMPLEMENTED ON BRANCH
  AWAITING MAINTAINER REVIEW.** Do not merge. Do not execute Undo.
- **Branch:** `feat/neutron-mutation-undo-preflight`
- **Starting main:** `988954db7eb1fec49df6279ea53af40c65cefa3a` (PR #541
  merge). Post-D5 verification recovery V1 is complete, including
  cross-process CAS hardening.
- **Operation:** application `preflightNeutronMutationUndo`. Identity-only
  `NeutronMutationUndoIntent`. No public Undo RPC. No Desktop control.
  No project writes.
- **Finding:** `executeApprovedApplyPlan` captures previous bytes only in
  ephemeral `rollbackEvidence`. The Slice 3.1 record keeps digests
  (`previousContentDigests`, post-Apply `expectedContentDigest`). Updated
  paths are `undo-source-unavailable`. A verified created path is eligible
  for a future delete only while current bytes still match that digest.
  `reconciliation-required` is closed. Historical `applied: true` is not
  rewritten.
- **Not done:** U2 trusted pre-Apply snapshots for new mutations, U3
  host-only Undo authorization and execution, U4 post-Undo verification,
  U5 Desktop Undo. Original Apply approval is not reusable.

<!-- Existing historical Duty Watch entries continue unchanged below this point. -->
