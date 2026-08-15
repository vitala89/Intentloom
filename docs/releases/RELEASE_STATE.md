# Intentloom release state

This is the canonical capability and release-status snapshot for Intentloom.
It distinguishes code merged into `main` from artifacts published to npm.
Historical release audits and roadmap sections retain their original scope, but
this document is the source of truth for the current status.

Snapshot: 2026-08-16
Implemented-in-main commit: `7d4ed80` (`docs(workspace): close W12 plan handoff on main (#313)`)
Workspace version field: `1.0.2` (unchanged; do not treat this as “current main is published”)
Released on npm: `1.0.2`, published through trusted workflow run [`30724962105`](https://github.com/vitala89/Intentloom/actions/runs/30724962105)
Last published npm package: `intentloom@1.0.2`, re-verified in the registry on 2026-08-16
Default npm `latest`: `intentloom@1.0.2`
Default npm `next`: `intentloom@1.0.0`
Release commit / Git tag `v1.0.2`: `192fd05`
GitHub release: [`v1.0.2`](https://github.com/vitala89/Intentloom/releases/tag/v1.0.2), published 2026-08-02

`Implemented in main` and `Released on npm` are different facts. Current
`origin/main` at `7d4ed80` includes Engineering Workspace W0–W12, later Quality /
Specialized / Extension / Assessment / Harness phases, and Desktop workspace
panels. None of that is in the published `1.0.2` tarball. Workspace
`package.json` versions still say `1.0.2` so they match the last publish; the
source tree is ahead of that artifact. This document does not pick the next
published version and does not authorize a tag or workflow dispatch.

Verified against the registry on 2026-08-16: `npm view intentloom` reports
`name=intentloom`, `version=1.0.2`, `dist-tags.latest=1.0.2`,
`dist-tags.next=1.0.0`. Registry `time.1.0.2` remains `2026-08-02T00:20:13.324Z`.
The GitHub repository description and homepage both point users to the GitHub
Pages documentation.

## Git versus npm

| Fact                                   | Value                                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code on `origin/main`                  | `7d4ed80` (2026-08-16). W0–W12 Core and Client are merged.                                                                                                                                                                 |
| What `npm install intentloom` installs | `intentloom@1.0.2` from commit `192fd05` (2026-08-02).                                                                                                                                                                     |
| Next published version                 | **Undecided.** Options for the maintainer, not a recommendation: stay unpublished on npm until an explicit publish brief; later `1.0.x` metadata/docs release; `1.1.0` (or another minor) after a real release-gate brief. |
| Do not do from this snapshot           | Tag `v0.6.0-beta.1`, dispatch `.github/workflows/release.yml`, move dist-tags, or invent a W13.                                                                                                                            |

## `1.0.2` published package

`1.0.2` is a documentation and package-metadata release built from `main` as it
stood at tag `v1.0.2` (`192fd05` on 2026-08-02), not from current `main`. It
also contains the bounded read-only provider/MCP evidence slice merged in PR
#160; it introduces no mutating provider, MCP, extension-installation, or
dependency behavior. Its metadata purpose was to make the GitHub Pages site
the canonical documentation destination and to ship the corrected npm
description and README, which npm renders from the published tarball and does
not allow editing in place.

The trusted workflow completed its dry-run and real publish after the protected
`npm-publish` environment approval. The registry reports shasum
`4a52f359ed6ffda5a80a73af657923285bcdc910`, integrity
`sha512-kga//huBL0XXTXB5m4mU6urXsetB/z3OEvyRjQHHPncsh/pD7EM1he6xQQ7HHib6KnEea9TSekew7pT2hxFvDA==`,
and 70 files. The artifact carries npm provenance through the SLSA v1
attestation endpoint:
<https://registry.npmjs.org/-/npm/v1/attestations/intentloom@1.0.2>.

The published package metadata is the corrected vendor-neutral local framework
and CLI description, homepage `https://vitala89.github.io/Intentloom/`, and
README links to the Pages documentation. The source commit also contains the
post-v1 read-only provider/evidence implementation merged by PR #160; the
remaining hardening gate is recorded in the roadmap below.

## Provenance

The `1.0.0` artifact was published manually before the release workflow existed,
so it carries **no provenance attestation** (`npm view intentloom@1.0.0` reports
no `dist.attestations`). It cannot be given one retroactively: npm does not allow
a published version to be replaced.

`1.0.2` was published through the configured npm trusted publisher and carries
the registry's SLSA v1 provenance attestation. The workflow run was dispatched
from `main` at commit `8de92ea` and passed its build, test, clean-tree, pack,
and publish steps.

Both one-time setup steps are now complete. The npm trusted publisher is
configured for `vitala89/Intentloom`, workflow `release.yml`, environment
`npm-publish`. The GitHub `npm-publish` environment exists with `vitala89` as a
required reviewer and deployment restricted to the `main` branch and `v*` tags.

`Implemented in main` means the capability is present in the current source
tree. `Released version` means the first npm release that contains the
capability. `Experimental` identifies optional, incomplete, or explicitly
non-stable surfaces; it does not mean that the code is absent.

| Capability                                                                                       | Implemented in main | Released version | CLI available   | Daemon available                              | MCP available                     | Experimental               |
| ------------------------------------------------------------------------------------------------ | ------------------- | ---------------- | --------------- | --------------------------------------------- | --------------------------------- | -------------------------- |
| Canonical catalog, profiles, adapters, init/adopt/plan/diff/sync/doctor                          | Yes                 | `0.1.0-beta.1`   | Yes             | Partial (authenticated doctor)                | No                                | No                         |
| Project inspection, local Git timeline, provider export, release analysis                        | Yes                 | `0.2.0-beta.1`   | Yes             | Partial (inspection/protocol consumers)       | Yes (inspection/release analysis) | No                         |
| Engineering conformance and managed-extension schemas/governance                                 | Yes                 | `0.3.0-beta.1`   | Yes             | Yes (conformance)                             | Yes (conformance)                 | No                         |
| Structured task/session summaries, skill lifecycle/evaluation, checkpoints, profiles, delegation | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/session reads)                | No                                | No                         |
| Optional semantic ranking                                                                        | Yes                 | `0.4.0-beta.1`   | Yes             | No                                            | No                                | Yes (optional provider)    |
| Persistent memory and security candidates M1–M4/S1–S5                                            | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/security/session reads)       | No                                | No                         |
| Read-only UI state and Agent Workspace discuss/inspect/plan/review/apply modes                   | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (shared application/daemon contracts) | No                                | Yes (surface maturity)     |
| Neutron local workspace sync and autonomous-subagent orchestration engine                        | Yes                 | `0.4.0-beta.1`   | Yes (`neutron`) | No                                            | No                                | Yes (runtime direction)    |
| Workflow variants, observed durations, conformance trends, repetition, transition intervals      | Yes                 | `0.5.0-beta.1`   | No              | Yes                                           | No                                | No                         |
| Live read-only provider connections and external MCP evidence ingestion                          | Yes                 | `1.0.2`          | Partial         | Partial (provider evidence)                   | Partial (ingestion boundary)      | Yes (hardening gate)       |
| Managed extension schemas and capability validation                                              | Yes                 | `1.0.2`          | Partial         | No                                            | No                                | Yes (lifecycle follow-up)  |
| Official Desktop application (Tauri 2 + React 19; v0.6 read-only + approved apply)               | Yes                 | —                | No (app)        | Yes (local daemon/sidecar)                    | No                                | Yes (not in npm `1.0.2`)   |
| Engineering Workspace W0–W12 (Core + Desktop/TUI/CLI panels)                                     | Yes                 | —                | Partial         | Partial                                       | Partial                           | Yes (not in npm `1.0.2`)   |
| Engineering Quality Packs Q1–Q18                                                                 | Yes                 | —                | Partial         | Partial                                       | Partial                           | Yes (not in npm `1.0.2`)   |
| Specialized Engineering Packs S1–S7                                                              | Yes                 | —                | Partial         | Partial                                       | Partial                           | Yes (S8 future)            |
| Managed Extension Lifecycle E1–E8                                                                | Yes                 | —                | Partial         | Partial                                       | Partial                           | Yes (not in npm `1.0.2`)   |
| Evidence-backed assessments A1–A22                                                               | Yes                 | —                | No              | No                                            | Partial                           | Yes (live assess deferred) |
| Agentic Evaluation Harness H0–H9                                                                 | Yes                 | —                | Partial         | Partial                                       | Partial                           | Yes (real adapters later)  |
| Managed extension installation/update and HTTP MCP transport                                     | No                  | —                | No              | No                                            | No                                | Yes (future candidates)    |
| Model training, autonomous mutation, hosted services                                             | No                  | —                | No              | No                                            | No                                | Yes (future candidates)    |

## What users receive from npm

```text
npm install intentloom          ->  1.0.2
npm install intentloom@latest   ->  1.0.2
npm install intentloom@next     ->  1.0.0
```

The `latest` tag points at `1.0.2`, while `next` remains at `1.0.0`. That is
registry state only. Installing from npm does not deliver current `main`.
`next` is expected to move ahead of `latest` again at the next prerelease;
publishing a prerelease must not move `latest`. No publish is authorized here.

## Evidence

- Current npm registry evidence, re-verified 2026-08-16 with
  `npm view intentloom name version dist-tags`:
  [`intentloom@1.0.2`](https://www.npmjs.com/package/intentloom/v/1.0.2)
  still reports `latest=1.0.2`, `next=1.0.0`. The 2026-08-02 trusted-publish
  reading also recorded homepage `https://vitala89.github.io/Intentloom/`,
  shasum `4a52f359ed6ffda5a80a73af657923285bcdc910`, the integrity recorded
  above, and a SLSA v1 provenance attestation. This session did not re-fetch
  shasum or attestations; those numbers stay the 2026-08-02 record.
- Current git evidence, verified 2026-08-16: `origin/main` is `7d4ed80`.
  Git tag `v1.0.2` is `192fd05`. GitHub release `v1.0.2` is published
  (not draft, not prerelease), `publishedAt=2026-08-02T00:41:17Z`.
- Open plan PR at snapshot time: [#314](https://github.com/vitala89/Intentloom/pull/314)
  (`docs/post-w12-next-increment-plan`) is OPEN. P0 Release honesty is
  authorized from that brief even while the plan file is not on `main`.

- Historical npm registry evidence, re-verified 2026-07-31 after the dist-tag promotion:
  [`intentloom` package](https://www.npmjs.com/package/intentloom)
  reports `latest=1.0.0` and `next=1.0.0`. The earlier reading the same day, before
  promotion, was `latest=0.1.0-alpha.3`. The `1.0.0` artifact has
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
- GitHub releases: [`v1.0.2`](https://github.com/vitala89/Intentloom/releases/tag/v1.0.2),
  [`v1.0.0`](https://github.com/vitala89/Intentloom/releases/tag/v1.0.0), and
  [`v0.4.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.4.0-beta.1).
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
