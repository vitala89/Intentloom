# Intentloom v1.0 release-gate packet

Status: review packet; this document does not authorize a tag, npm
publication, or release announcement.

Date: 2026-07-29.

## Candidate under review

- Verified `main` commit: `a0443b5`, merged by PR [#113](https://github.com/vitala89/Intentloom/pull/113).
- Post-merge Compatibility run: [30411096968](https://github.com/vitala89/Intentloom/actions/runs/30411096968), all six Ubuntu, macOS, and Windows Node 22/24 jobs passed.
- Dependency Review evidence: [run 30403512016](https://github.com/vitala89/Intentloom/actions/runs/30403512016), passed on PR #105.
- Existing workflow warning: GitHub reports the Node.js 20 action deprecation for the current action versions; this is not a product test failure.

## Decisions still required

The following decisions must be recorded by the project maintainer before the
readiness audit can be approved:

1. Approve or revise [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md), including
   the supported Node/host boundary and experimental-surface exclusions.
2. Explicitly accept the existing dogfooding records or refresh them against
   this candidate. Existing records are dated 2026-07-20 and 2026-07-24 and
   use earlier development builds; a fixture or CI result does not replace
   real-project evidence.
3. Approve or reject the proposed scoped exception for Dependabot alert #2
   in [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md),
   or authorize a coordinated GTK/WebKit/Tauri migration instead. If approved,
   record the owner and the review/expiry date of 2026-10-29.
4. Confirm clean-room installation and explicit-path dogfooding evidence for
   the exact approved release commit.
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
