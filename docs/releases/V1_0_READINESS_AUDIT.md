# Intentloom v1.0 Readiness Audit

Status: draft; release gate open. This audit is evidence for review and does
not authorize a tag, npm publication, or release announcement.

Date: 2026-07-29.

Candidate baseline under review: `9667b88` (`main` and `origin/main` after PR
#126 merge). The release gate remains open until the decisions and evidence in
the release-gate packet are reviewed.

## Decision summary

The Phase 1–4 implementation evidence and the release-candidate Compatibility
matrix are present in `main`. PR #117 is merged with only a bounded test timeout
for slower Windows runners, PR #118 is documentation-only, PR #120 adds a
second bounded test-harness timeout, and PR #121, PR #122, PR #123, PR #124, PR #125, and PR #126 are
documentation-only; none changes runtime, package, or dependency behavior.
Supplemental clean-room,
explicit-path, and three-scenario records remain attached from the pre-merge
runtime-equivalent candidate tree. The post-merge run for `9667b88` passed all
six Compatibility jobs after the scoped test-only remediation and the final
documentation reconciliation. The v1.0 release gate remains **open** because
support-policy
approval, the glib disposition, acceptance or authorized refresh of
real-project dogfooding records, and maintainer approval are not yet complete.

No v1.0 tag or npm artifact is claimed by this document.

## Phase evidence

| Phase                             | Evidence                                                                                                                                                                        | Assessment                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Stable compatibility contract | [ADR-0043](../decisions/ADR-0043-v1-stable-compatibility-contract-and-deprecation-policy.md), `tests/v1-compatibility-contract.test.ts`                                         | Evidence present; contract approval recorded in ADR                                                                              |
| 2 — Upgrade and protocol path     | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), `tests/v1-upgrade-migration-path.test.ts`                                                                                       | Local release-candidate verification and supplemental clean-room evidence passed; final release-commit approval remains required |
| 3 — Client-surface readiness      | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), `tests/v1-client-surface-equivalence.test.ts`                                                  | Evidence present; no domain duplication found in the documented boundary                                                         |
| 4 — Security and supply chain     | [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md), `tests/v1-security-supply-chain.test.ts`, `.github/workflows/dependency-review.yml` | Control merged in `86a1aee`; high fast-uri alert closed; proposed glib exception is pending maintainer approval                  |
| 5 — Stable release gate           | This document, [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md), release and dogfooding records                                                                                     | Open; maintainer approval pending                                                                                                |

## Stable-release checklist

| Requirement                                                  | Status              | Evidence or remaining action                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public CLI and package compatibility promise                 | PASS                | [COMPATIBILITY_POLICY.md](COMPATIBILITY_POLICY.md), ADR-0043; workspace libraries remain private                                                                                                                                                        |
| Supported Node/host/provider matrix                          | PASS                | [COMPATIBILITY_MATRIX.md](../compatibility/COMPATIBILITY_MATRIX.md); post-merge run [30491209504](https://github.com/vitala89/Intentloom/actions/runs/30491209504) for `9667b88` passed all six Ubuntu, macOS, and Windows Node 22/24 jobs              |
| Deprecation and support policy                               | PENDING             | Deprecation is defined in ADR-0043; [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md) needs maintainer approval                                                                                                                                              |
| Upgrade, migration, and rollback path                        | PASS with recheck   | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), migration tests, `.aif/migration-journal.json` contract, and [candidate clean-room evidence](dogfooding/2026-07-29-v1-candidate-clean-room-explicit-path.md); final release-commit verification remains |
| Daemon/MCP/client compatibility and discovery                | PASS                | Protocol/client tests and the typed v1 method contracts                                                                                                                                                                                                 |
| Desktop/TUI read-only equivalence and cancellation           | PASS with recheck   | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), Desktop readiness audit, and `tests/interactive-ui.test.ts`                                                                                                            |
| Threat model, permissions, provenance, and incident response | PENDING             | PR #105 merged with green Dependency Review and closed high alert #1; alert #2 has no safe point update in the current GTK/WebKit graph and requires a coordinated upgrade or approved exception                                                        |
| Dogfooding evidence                                          | PASS with follow-up | Supplemental exact-candidate records cover minimal, TypeScript, and sanitized existing-project scenarios; the current self-adoption record and historical real-project records still require explicit maintainer acceptance or an authorized refresh    |
| Final readiness audit and maintainer approval                | OPEN                | Approve this audit only after the remaining evidence is attached to one release commit                                                                                                                                                                  |

## Release-state facts

- Current workspace version is `0.5.0-beta.1`.
- The published prerelease is `intentloom@0.5.0-beta.1` under npm `next`.
- `v1.0.0` has not been tagged or published.
- Current release-state details are maintained in [RELEASE_STATE.md](RELEASE_STATE.md).

- PR [#105](https://github.com/vitala89/Intentloom/pull/105) merged as
  `86a1aee`; the final Dependency Review, Compatibility, and Desktop SEA
  Feasibility checks passed. Dependabot alert #1 for `fast-uri@3.1.3` is
  closed after the `3.1.4` lockfile remediation.
- PR [#106](https://github.com/vitala89/Intentloom/pull/106) merged as
  `b8f1e31`; its documentation-only compatibility checks passed and reconciled
  the post-merge Phase 5 state.
- PR [#107](https://github.com/vitala89/Intentloom/pull/107) merged as
  `88d6f6b`; its documentation-only compatibility checks passed and recorded
  the upstream availability assessment.
- PR [#108](https://github.com/vitala89/Intentloom/pull/108) merged as
  `542633a`; its documentation-only compatibility checks passed and recorded
  the proposed exception path.
- PR [#109](https://github.com/vitala89/Intentloom/pull/109) merged as
  `d191205`; its documentation-only compatibility checks passed and recorded
  the proposed exception path.
- PR [#110](https://github.com/vitala89/Intentloom/pull/110) merged as
  `ae63b7a`; it recorded the release-candidate verification and Windows
  process-test correction. The post-merge Compatibility run [30409035485](https://github.com/vitala89/Intentloom/actions/runs/30409035485)
  passed all six jobs on `main`.
- PR [#111](https://github.com/vitala89/Intentloom/pull/111) merged as
  `c21939e`; it reconciled the release records after PR #110. The post-merge
  Compatibility run [30409627721](https://github.com/vitala89/Intentloom/actions/runs/30409627721)
  passed all six jobs on `main`.
- PR [#112](https://github.com/vitala89/Intentloom/pull/112) merged as
  `5d1af7c`; it completed the release-state reconciliation after PR #111. The
  post-merge Compatibility run [30410395631](https://github.com/vitala89/Intentloom/actions/runs/30410395631)
  passed all six jobs on `main`.
- PR [#113](https://github.com/vitala89/Intentloom/pull/113) merged as
  `a0443b5`; it completed the final Phase 5 state reconciliation. The
  post-merge Compatibility run [30411096968](https://github.com/vitala89/Intentloom/actions/runs/30411096968)
  passed all six jobs on `main`.
- PR [#114](https://github.com/vitala89/Intentloom/pull/114) merged as
  `d3da25d`; it added the v1.0 release-gate packet and reconciled the release
  records after PR #113. The post-merge Compatibility run [30411737284](https://github.com/vitala89/Intentloom/actions/runs/30411737284)
  passed all six jobs on `main`.
- PR [#115](https://github.com/vitala89/Intentloom/pull/115) merged as
  `3ee661d`; it added current read-only self-dogfooding evidence and recorded
  the remaining external dogfooding follow-up. The post-merge Compatibility
  run [30446567214](https://github.com/vitala89/Intentloom/actions/runs/30446567214)
  passed all six jobs on `main`.
- PR [#116](https://github.com/vitala89/Intentloom/pull/116) merged as
  `46a278c`; it reconciled the post-merge dogfooding state. The post-merge
  Compatibility run [30451241803](https://github.com/vitala89/Intentloom/actions/runs/30451241803)
  passed all six jobs on `main`.
- PR [#117](https://github.com/vitala89/Intentloom/pull/117) merged as
  `c20c245`; it reconciled the candidate release state and added the bounded
  Windows packed-doctor test timeout. The post-merge Compatibility run
  [30456140463](https://github.com/vitala89/Intentloom/actions/runs/30456140463)
  passed all six jobs on `main`.
- PR [#118](https://github.com/vitala89/Intentloom/pull/118) merged as
  `ec869e1`; it completed the documentation-only post-merge reconciliation.
  The post-merge Compatibility run
  [30458387847](https://github.com/vitala89/Intentloom/actions/runs/30458387847)
  passed all six jobs on `main`.
- PR [#119](https://github.com/vitala89/Intentloom/pull/119) merged as
  `c49bf793`; its post-merge Compatibility run
  [30459836027](https://github.com/vitala89/Intentloom/actions/runs/30459836027)
  failed only on Windows Node 24 at the packed-process test timeout. The other
  five jobs passed; the scoped test-only timeout remediation was merged by PR
  #120.
- PR [#120](https://github.com/vitala89/Intentloom/pull/120) merged as
  `d076c037`; its post-merge Compatibility run
  [30462153444](https://github.com/vitala89/Intentloom/actions/runs/30462153444)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. The change is
  limited to the packed all-adapter generation test timeout.
- PR [#121](https://github.com/vitala89/Intentloom/pull/121) merged as
  `83cefd3`; its post-merge Compatibility run
  [30463844868](https://github.com/vitala89/Intentloom/actions/runs/30463844868)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. The change is
  limited to documentation and merged-branch cleanup records.
- Dependabot alert [#2](https://github.com/vitala89/Intentloom/security/dependabot/2)
  remains open at medium severity for `glib@0.18.5` in
  `apps/desktop/src-tauri/Cargo.lock`; GitHub reports `0.20.0` as the first
  patched version. A read-only `cargo tree --invert glib@0.18.5` assessment
  shows the crate is shared by the GTK 0.18.x/WebKit 2.0.2 stack used through
  Tauri/Wry. The current `gtk 0.18.2` and `webkit2gtk 2.0.2` manifests require
  `glib 0.18`, so a direct `glib 0.20` lockfile override would not remove the
  vulnerable 0.18 branch and is not an acceptable remediation.

## Dependabot alert #2 assessment

The alert is technically understood but remains unresolved. The dependency
tree is:

```text
intentloom-desktop -> tauri 2.11.5 -> tauri-runtime-wry -> wry 0.55.1
                   -> gtk 0.18.2 / webkit2gtk 2.0.2 -> glib 0.18.5
```

The same `glib 0.18.5` node is also reached by `atk`, `cairo-rs`, `gdk`,
`gio`, `pango`, and the corresponding `*-sys` crates. The required patched
version `0.20.0` therefore requires a coordinated GTK/WebKit/Tauri-compatible
upgrade, not a hand-edited lockfile substitution. No dependency files were
changed during this assessment.

The current published crate versions are unchanged from the Desktop lockfile:
`tauri 2.11.5`, `wry 0.55.1`, and `webkit2gtk 2.0.2`. A read-only crates.io
check found no newer version in those package lines that could provide the
required coordinated lift. This leaves a scoped maintainer exception as the
near-term option unless a separate Desktop stack migration is approved.

The proposed exception is documented in
[V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md)
and remains pending maintainer approval.

## Release-candidate verification

Verified locally against `d191205` on 2026-07-29; the resulting candidate and
release-state reconciliations are merged in `main` as `5d1af7c`. Hosted
Compatibility verification for `5d1af7c` passed in [run 30410395631](https://github.com/vitala89/Intentloom/actions/runs/30410395631):

| Check                                                  | Result                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `CI=1 pnpm install --frozen-lockfile --ignore-scripts` | PASS; lockfile up to date, pnpm 10.12.4                                          |
| `pnpm typecheck`                                       | PASS                                                                             |
| `pnpm build`                                           | PASS                                                                             |
| `pnpm test`                                            | PASS with 87 files, 753 tests passed, 3 skipped                                  |
| `pnpm pack:cli`                                        | PASS; expected `intentloom@0.5.0-beta.1` tarball created and removed after smoke |
| `node packages/cli/dist/intentloom.cjs --help`         | PASS                                                                             |
| `pnpm format:check`                                    | PASS                                                                             |
| `git diff --check`                                     | PASS                                                                             |

The hosted run for the candidate baseline `5d1af7c` completed all six Ubuntu,
macOS, and Windows Node 22/24 jobs. The post-merge candidate `c20c245`
completed all six jobs in [run 30456140463](https://github.com/vitala89/Intentloom/actions/runs/30456140463),
and the documentation-reconciled candidate `ec869e1` completed all six jobs in
[run 30458387847](https://github.com/vitala89/Intentloom/actions/runs/30458387847).
The historical `main` candidate `c49bf793` was blocked by the Windows Node 24
timeout in [run 30459836027](https://github.com/vitala89/Intentloom/actions/runs/30459836027);
the previous `main` candidate `96ba437` passed post-merge in [run
30484088638](https://github.com/vitala89/Intentloom/actions/runs/30484088638), and
the previous `main` candidate `840989a` passed post-merge in [run
30485311670](https://github.com/vitala89/Intentloom/actions/runs/30485311670), and
the previous `main` candidate `484fcb4` passed post-merge in [run
30486706654](https://github.com/vitala89/Intentloom/actions/runs/30486706654), and
the previous `main` candidate `d750acf` passed post-merge in [run
30489057541](https://github.com/vitala89/Intentloom/actions/runs/30489057541), and
the current `main` candidate `9667b88` passed post-merge in [run
30491209504](https://github.com/vitala89/Intentloom/actions/runs/30491209504).
The local clean-room records were produced against the pre-merge runtime tree
`46a278c`; PR #117 and PR #118 made no runtime, package, or dependency changes,
but a maintainer must still confirm that retained evidence is sufficient for
the exact approved release commit `9667b88` or authorize a fresh run.
GitHub emitted only the existing Node.js 20 action deprecation annotations.

The first sandbox attempts were not counted as results: npm DNS resolution was
blocked during reinstall and Unix-socket tests returned `EPERM`. The install
and full test suite were rerun with the required access and passed. This local
evidence does not authorize a tag, npm publication, or release announcement.

## Required actions before approval

1. Review the [v1.0 release-gate packet](V1_0_RELEASE_GATE_PACKET.md) and
   approve or revise [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md).
2. Review and explicitly approve or reject the proposed scoped exception in
   [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md),
   or approve a separate coordinated GTK/WebKit/Tauri-compatible stack
   migration instead.
3. Local release-candidate install, build, packed CLI smoke, and full validation
   are recorded above. Confirm that the retained clean-room installation and explicit-path
   evidence from runtime-equivalent tree `46a278c` is sufficient for the exact
   approved commit `9667b88`, or authorize a fresh run.
4. Accept or refresh the existing dogfooding records against the stable
   candidate without including private project data. The current self-adoption
   record is supporting evidence only and does not replace the three required
   project scenarios.
5. Complete the applicable [publish authorization checklist](PUBLISH_AUTHORIZATION_CHECKLIST.md)
   and record maintainer approval for the exact release commit.
6. Only after approval, open the release PR; tag and publish from the verified
   merged commit under the repository release process.

## Approval record

- Maintainer decision: pending
- Approved release commit: pending
- Approval date: pending
- Tag/publication authorization: pending
