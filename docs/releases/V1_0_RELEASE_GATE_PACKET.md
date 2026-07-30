# Intentloom v1.0 release-gate packet

Status: review packet; this document does not authorize a tag, npm
publication, or release announcement.

Date: 2026-07-30.

## Candidate under review

- Verified `main` commit: `65f3886`, merged by PR [#135](https://github.com/vitala89/Intentloom/pull/135) (PR [#134](https://github.com/vitala89/Intentloom/pull/134) merged as `ba5e870`, PR [#133](https://github.com/vitala89/Intentloom/pull/133) merged as `85f0ad3`, PR [#136](https://github.com/vitala89/Intentloom/pull/136) merged as `221e97e`, PR [#132](https://github.com/vitala89/Intentloom/pull/132) merged as `3360e93`, PR [#131](https://github.com/vitala89/Intentloom/pull/131) merged as `5dc9313`).
- Post-merge Compatibility run: [30527543027](https://github.com/vitala89/Intentloom/actions/runs/30527543027) for `65f3886`, all six Ubuntu, macOS, and Windows Node 22/24 jobs passed. Post-merge CodeQL run: [30527542998](https://github.com/vitala89/Intentloom/actions/runs/30527542998), passed both Actions and JavaScript/TypeScript analyses.
- PR #117 through PR #130 carried Phase 5 reconciliations, test harness timeouts, and documentation updates. PR #131 added the free security baseline (`.github/dependabot.yml` and `.github/workflows/codeql.yml`); PR #132, PR #133, PR #134, PR #135 applied Dependabot updates (`getrandom`, `@types/node`, `vite`, `prettier`); PR #136 added `.prettierignore` to exclude generated lockfiles from Prettier checks.
- Dependency Review evidence: [run 30403512016](https://github.com/vitala89/Intentloom/actions/runs/30403512016), passed on PR #105.
- Existing workflow warning: GitHub reports the Node.js 20 action deprecation for the current action versions; this is not a product test failure.

## Decisions still required

The following decisions must be recorded by the project maintainer before the
readiness audit can be approved:

1. Approve or revise [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md), including
   the supported Node/host boundary and experimental-surface exclusions.
2. Explicitly accept the existing dogfooding records or refresh them against
   this candidate. Current supplemental candidate records cover minimal,
   TypeScript, and sanitized existing-project scenarios at
   [dogfooding/2026-07-29-v1-candidate-minimal.md](dogfooding/2026-07-29-v1-candidate-minimal.md),
   [dogfooding/2026-07-29-v1-candidate-typescript.md](dogfooding/2026-07-29-v1-candidate-typescript.md),
   and [dogfooding/2026-07-29-v1-candidate-existing-project.md](dogfooding/2026-07-29-v1-candidate-existing-project.md).
   A current self-adoption record is also available at
   [2026-07-29-intentloom-self-adoption-readonly.md](dogfooding/2026-07-29-intentloom-self-adoption-readonly.md),
   but the earlier real-project records still use development builds and require
   explicit acceptance or an authorized refresh. The supplemental local records
   do not replace real-project evidence.
3. Approve or reject the proposed scoped exception for Dependabot alert #2
   in [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md),
   or authorize a coordinated GTK/WebKit/Tauri migration instead. If approved,
   record the owner and the review/expiry date of 2026-10-29.
4. Confirm the retained [clean-room and explicit-path evidence](dogfooding/2026-07-29-v1-candidate-clean-room-explicit-path.md)
   from the runtime-equivalent `46a278c` tree is sufficient for exact approved
   commit `3257bdf`, or authorize a new external-project run.
5. Approve the readiness audit and the exact release commit. Complete the
   separate publication authorization checklist before any release action.

## Current security disposition

Dependabot alert [#2](https://github.com/vitala89/Intentloom/security/dependabot/2)
remains open at medium severity for transitive `glib@0.18.5` in
`apps/desktop/src-tauri/Cargo.lock`; GitHub identifies `0.20.0` as the first
patched version. The current GTK/WebKit/Tauri graph does not have a safe point
upgrade, and no direct `glib` or `VariantStrIter` use was found in Desktop
source. The proposed exception keeps the alert visible and expires on
2026-10-29 or before a public stable Desktop release, whichever comes first.

## Execution order after approval

1. Record the maintainer decisions in the readiness audit, support policy, and
   security audit.
2. Re-run or retain the exact clean-room and explicit-path evidence for the
   approved commit.
3. Open and merge the release PR only after all gates are green.
4. Create the tag and publish only from that verified merged commit with
   separate explicit authorization.
