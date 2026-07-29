# Intentloom v1.0 release-gate packet

Status: review packet; this document does not authorize a tag, npm
publication, or release announcement.

Date: 2026-07-29.

## Candidate under review

- Verified `main` commit: `d750acf`, merged by PR [#125](https://github.com/vitala89/Intentloom/pull/125).
- Post-merge Compatibility run: [30489057541](https://github.com/vitala89/Intentloom/actions/runs/30489057541), all six Ubuntu, macOS, and Windows Node 22/24 jobs passed.
- PR #117 added only release-state documentation and a bounded Windows packed-doctor test timeout; PR #118 added only the final documentation reconciliation; PR #120 added only a bounded packed all-adapter test timeout; PR #121, PR #122, PR #123, PR #124, and PR #125 added only documentation and branch-inventory cleanup records. No runtime, package, or dependency behavior changed.
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
   commit `d750acf`, or authorize a new external-project run.
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
