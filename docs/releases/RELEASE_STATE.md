# Intentloom release state

This is the canonical capability and release-status snapshot for Intentloom.
It distinguishes code merged into `main` from artifacts published to npm.
Historical release audits and roadmap sections retain their original scope, but
this document is the source of truth for the current status.

Snapshot: 2026-07-31
Main commit: `8fa2c19` (PR #140 merged)
Release commit: `a148f2f` (tagged `v1.0.0` as `c1205a8`)
Workspace version: `1.0.0`
Git tag: `v1.0.0` (pushed to `origin`)
GitHub release: [`v1.0.0`](https://github.com/vitala89/Intentloom/releases/tag/v1.0.0), published 2026-07-30
Published npm package: `intentloom@1.0.0`, published 2026-07-30 under the `next` dist-tag
Default npm `latest`: `intentloom@0.1.0-alpha.3`
Default npm `next`: `intentloom@1.0.0`

`1.0.0` is published to npm, but **`latest` still resolves to
`0.1.0-alpha.3`**. An unqualified `npm install intentloom` therefore installs the
July 18 alpha, not the stable release. Moving the tag is a deliberate maintainer
action and is not done automatically:

```sh
npm dist-tag add intentloom@1.0.0 latest
```

Until that runs, describe `1.0.0` as published under `next` only.

The `1.0.0` artifact was published manually before
[`.github/workflows/release.yml`](../../.github/workflows/release.yml) existed,
so it carries **no provenance attestation** (`npm view intentloom@1.0.0` reports
no `dist.attestations`). The workflow is now on `main` and uses npm trusted
publishing, which attaches provenance automatically, so the next published
version will carry it. `1.0.0` cannot be given provenance retroactively: npm does
not allow a published version to be replaced.

Two setup steps remain before the workflow can publish; they are listed in
[Publishing](PUBLISHING.md#one-time-setup-performed-by-the-package-owner).

`main` has advanced past the `v1.0.0` tag with documentation and CI changes
only. `git diff --name-only v1.0.0..main -- packages/ catalog/ profiles/ scripts/build-cli.mjs`
is empty, so the package payload is identical at both commits. This is recorded
because provenance attests to the commit the release workflow runs on, and the
workflow postdates the tag.

`Implemented in main` means the capability is present in the current source
tree. `Released version` means the first npm release that contains the
capability. `Experimental` identifies optional, incomplete, or explicitly
non-stable surfaces; it does not mean that the code is absent.

| Capability                                                                                                     | Implemented in main | Released version | CLI available   | Daemon available                              | MCP available                     | Experimental            |
| -------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- | --------------- | --------------------------------------------- | --------------------------------- | ----------------------- |
| Canonical catalog, profiles, adapters, init/adopt/plan/diff/sync/doctor                                        | Yes                 | `0.1.0-beta.1`   | Yes             | Partial (authenticated doctor)                | No                                | No                      |
| Project inspection, local Git timeline, provider export, release analysis                                      | Yes                 | `0.2.0-beta.1`   | Yes             | Partial (inspection/protocol consumers)       | Yes (inspection/release analysis) | No                      |
| Engineering conformance and managed-extension schemas/governance                                               | Yes                 | `0.3.0-beta.1`   | Yes             | Yes (conformance)                             | Yes (conformance)                 | No                      |
| Structured task/session summaries, skill lifecycle/evaluation, checkpoints, profiles, delegation               | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/session reads)                | No                                | No                      |
| Optional semantic ranking                                                                                      | Yes                 | `0.4.0-beta.1`   | Yes             | No                                            | No                                | Yes (optional provider) |
| Persistent memory and security candidates M1–M4/S1–S5                                                          | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/security/session reads)       | No                                | No                      |
| Read-only UI state and Agent Workspace discuss/inspect/plan/review/apply modes                                 | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (shared application/daemon contracts) | No                                | Yes (surface maturity)  |
| Neutron local workspace sync and autonomous-subagent orchestration engine                                      | Yes                 | `0.4.0-beta.1`   | Yes (`neutron`) | No                                            | No                                | Yes (runtime direction) |
| Workflow variants, observed durations, conformance trends, repetition, transition intervals                    | Yes                 | `0.5.0-beta.1`   | No              | Yes                                           | No                                | No                      |
| Live provider connections, external MCP evidence ingestion, managed extension installation, HTTP MCP transport | No                  | —                | No              | No                                            | No                                | Yes (future candidates) |
| Full desktop application, model training, autonomous mutation, hosted services                                 | No                  | —                | No              | No                                            | No                                | Yes (future candidates) |

## What users receive from npm

```text
npm install intentloom          ->  0.1.0-alpha.3
npm install intentloom@latest   ->  0.1.0-alpha.3
npm install intentloom@next     ->  1.0.0
```

This is not the intended end state. `latest` was left where it was when
`1.0.0` was published under `next`, so the default install still serves an alpha
from 2026-07-18 while the stable release sits behind an explicit `@next`. For a
prerelease that arrangement was deliberate; for a stable release it inverts the
meaning of both tags. Run `npm dist-tag add intentloom@1.0.0 latest` when the
maintainer authorizes it, then update this section.

## Evidence

- npm registry, verified 2026-07-31: [`intentloom` package](https://www.npmjs.com/package/intentloom)
  reports `latest=0.1.0-alpha.3` and `next=1.0.0`. The `1.0.0` artifact has
  integrity
  `sha512-KNT3g/Py0SHyDWxtDHlQTD6cKRBdAtv1oSCp3ZcAEeB7c2djcPXvaCBgHuGC6THZtncw5gpTwCd5xlVgOZPX/g==`,
  shasum `434fcb624ddb3706502a29ad96b27aee36df675c`, 70 files, 981107 bytes
  unpacked, and no `dist.attestations`, confirming it was published without
  provenance. The preceding `0.5.0-beta.1` tarball shasum is
  `58b2e27eb66789f57c1e91cec46aea710a6fc241`.
- Artifact reproduced from source on 2026-07-31: `pnpm build` followed by
  `npm pack --dry-run --json` in `packages/cli` produces shasum
  `434fcb624ddb3706502a29ad96b27aee36df675c`, 70 files, 981107 bytes unpacked,
  matching the registry exactly. The published artifact is the artifact this
  repository builds. This is a reproducibility check, not a substitute for
  provenance: it proves the bytes match, not who built them or where.
- GitHub releases: [`v1.0.0`](https://github.com/vitala89/Intentloom/releases/tag/v1.0.0)
  and [`v0.4.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.4.0-beta.1).
- Historical release-state baseline: [PR #112](https://github.com/vitala89/Intentloom/pull/112),
  merged as `5d1af7c`; it completes the release-state reconciliation after PR
  #111. The post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30410395631)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. The preceding
  state baseline is [PR #111](https://github.com/vitala89/Intentloom/pull/111),
  merged as `c21939e`; the release-candidate record is in
  [PR #110](https://github.com/vitala89/Intentloom/pull/110), merged as
  `ae63b7a`; the dependency-review control is in
  [PR #105](https://github.com/vitala89/Intentloom/pull/105), merged as
  `86a1aee`.
- PR [#113](https://github.com/vitala89/Intentloom/pull/113) is merged as
  `a0443b5`; it completes the final Phase 5 state reconciliation. The
  post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30411096968)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs.
- PR [#114](https://github.com/vitala89/Intentloom/pull/114) is merged as
  `d3da25d`; it adds the v1.0 release-gate packet and reconciles the release
  records after PR #113. The post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30411737284)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs.
- PR [#115](https://github.com/vitala89/Intentloom/pull/115) is merged as
  `3ee661d`; it adds current read-only self-dogfooding evidence and records the
  remaining external dogfooding follow-up. The post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30446567214)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs.
- PR [#116](https://github.com/vitala89/Intentloom/pull/116) is merged as
  `46a278c`; it reconciles the post-merge dogfooding state and records the
  remaining Phase 5 gates. The post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30451241803)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs.
- PR [#117](https://github.com/vitala89/Intentloom/pull/117) is merged as
  `c20c245`; it completes the candidate release-state reconciliation and adds
  a bounded Windows packed-doctor test timeout. The post-merge [Compatibility
  run](https://github.com/vitala89/Intentloom/actions/runs/30456140463) passed
  all six Ubuntu, macOS, and Windows Node 22/24 jobs. The test timeout is not
  runtime, package, or dependency behavior, and no v1.0 release authorization
  follows from the green matrix.
- PR [#118](https://github.com/vitala89/Intentloom/pull/118) is merged as
  `ec869e1`; it carries the final documentation-only reconciliation of the
  post-merge candidate state. The post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30458387847)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#119](https://github.com/vitala89/Intentloom/pull/119) is merged as
  `c49bf793`; it carries the post-merge documentation reconciliation. Its
  post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30459836027)
  failed only on Windows Node 24 at
  `tests/adapter-packed-process.test.ts:96` due to the default 5-second Vitest
  timeout; the other five jobs passed. The scoped test-only timeout remediation
  was merged by PR #120.
- PR [#120](https://github.com/vitala89/Intentloom/pull/120) is merged as
  `d076c037`; it adds a bounded timeout only to the packed all-adapter
  generation test. Its post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30462153444)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#121](https://github.com/vitala89/Intentloom/pull/121) is merged as
  `83cefd3`; it reconciles the Phase 5 records after PR #120 and records
  cleanup of branches belonging to merged PRs. Its post-merge [Compatibility
  run](https://github.com/vitala89/Intentloom/actions/runs/30463844868) passed
  all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime, package, or
  dependency behavior changed.
- PR [#122](https://github.com/vitala89/Intentloom/pull/122) is merged as
  `96ba437`; it reconciles the Phase 5 records after PR #121 and records the
  final branch inventory cleanup. Its post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30484088638)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#123](https://github.com/vitala89/Intentloom/pull/123) is merged as
  `840989a`; it reconciles the Phase 5 records after PR #122. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30485311670)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#124](https://github.com/vitala89/Intentloom/pull/124) is merged as
  `484fcb4`; it reconciles the Phase 5 records after PR #123. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30486706654)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#125](https://github.com/vitala89/Intentloom/pull/125) is merged as
  `d750acf`; it reconciles the Phase 5 records after PR #124. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30489057541)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#126](https://github.com/vitala89/Intentloom/pull/126) is merged as
  `9667b88`; it reconciles the Phase 5 records after PR #125. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30491209504)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#127](https://github.com/vitala89/Intentloom/pull/127) is merged as
  `c47eb0f`; it reconciles the Phase 5 records after PR #126. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30492745164)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#128](https://github.com/vitala89/Intentloom/pull/128) is merged as
  `2c7d4a4`; it reconciles the Phase 5 records after PR #127. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30495322242)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#129](https://github.com/vitala89/Intentloom/pull/129) is merged as
  `802da40`; it reconciles the Phase 5 records after PR #128. Its post-merge
  [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30496928912)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No runtime,
  package, or dependency behavior changed.
- PR [#130](https://github.com/vitala89/Intentloom/pull/130) is merged as
  `3257bdf`; it carries the Phase 5 reconciliation and a bounded
  Windows-aware timeout for the existing CLI schema process test. Its
  post-merge [Compatibility run](https://github.com/vitala89/Intentloom/actions/runs/30498583852)
  passed all six Ubuntu, macOS, and Windows Node 22/24 jobs. No product
  runtime, package, or dependency behavior changed.
- PR [#131](https://github.com/vitala89/Intentloom/pull/131) is merged as `5dc9313` (adds `.github/dependabot.yml` and `.github/workflows/codeql.yml`).
- PR [#132](https://github.com/vitala89/Intentloom/pull/132) (`getrandom`), PR [#133](https://github.com/vitala89/Intentloom/pull/133) (`@types/node`), PR [#134](https://github.com/vitala89/Intentloom/pull/134) (`vite`), and PR [#135](https://github.com/vitala89/Intentloom/pull/135) (`prettier`) are merged via Dependabot.
- PR [#136](https://github.com/vitala89/Intentloom/pull/136) is merged as `350ad1e` (adds `.prettierignore`).
- The latest `main` candidate `46d3a2e` passed post-merge [Compatibility run 30527543027](https://github.com/vitala89/Intentloom/actions/runs/30527543027) (6/6 matrix jobs) and post-merge [CodeQL run 30527542998](https://github.com/vitala89/Intentloom/actions/runs/30527542998) (Actions and JS/TS analyses).
- Supplemental exact-candidate clean-room, explicit-path, and three-scenario
  records are retained under
  [`docs/releases/dogfooding/`](dogfooding/2026-07-29-v1-candidate-clean-room-explicit-path.md);
  they are not claims of refreshed external-project access or maintainer
  release approval.
- The GTK/WebKit dependency assessment is recorded in [PR #107](https://github.com/vitala89/Intentloom/pull/107),
  merged as `88d6f6b`; no dependency or runtime files changed.
- The proposed glib exception and release-gate conditions are prepared after
  [PR #108](https://github.com/vitala89/Intentloom/pull/108), merged as
  `542633a`; maintainer approval remains pending.
- Local release-candidate verification was run against the pre-candidate
  baseline `d191205` and is recorded in [PR #110](https://github.com/vitala89/Intentloom/pull/110),
  merged as `ae63b7a`; PR #111 then reconciled the records in `main` as
  `c21939e`, and PR #112 completed that reconciliation as `5d1af7c`. The
  post-merge Compatibility run is green, but no tag or publication is
  authorized by that evidence.
- Release tag: [`v0.5.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.5.0-beta.1)
  points to the verified release commit `a0e0b13`.
- Version source: root `package.json`, synchronized by
  `scripts/sync-version.mjs`.

Roadmap and release-audit documents should link here when they describe current
status. They may retain historical candidate scope and exit criteria, but must
not describe an already released or merged capability as an unqualified future
candidate.
