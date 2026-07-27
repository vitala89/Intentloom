# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and
maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the
current state, records what happened during the watch, and leaves the repository
in a condition that the next watch can safely understand and continue.

## Current watch status

Status: partial — Desktop v0.6 execution baseline prepared for review

Active branch: `agent/desktop-v06-execution-plan`

Current objective: recover the misplaced PR #91 Desktop milestone on current main and define design, contract, implementation, TUI, security, and release gates.

Next first action: review and merge the Desktop documentation baseline, reconcile draft PR #94, then draft the Desktop stack and distribution ADR before runtime implementation.

## Watch rules

- Read the latest entry before starting work.
- Verify important claims against code, Git history, pull requests, releases,
  and CI.
- Never overwrite historical entries to hide mistakes or overwrite unfinished work.
- Append a new entry for each meaningful completed task or work session.
- Small typo-only changes may share one entry when performed in the same branch
  and pull request.
- Record partial work honestly. Use `incomplete` when the objective was not
  finished.
- A watch cannot be marked `complete` until required validation and
  documentation updates are finished.
- The next action must be concrete enough for a new agent to begin without
  guessing.
- Do not include secrets, credentials, private user data, or hidden
  chain-of-thought.

## Entry template

Copy the template from `docs/templates/DUTY_WATCH_ENTRY.md` and place the newest
entry directly below this section.

## Watch entries

### 2026-07-27, Desktop v0.6 design and execution baseline

- **Status:** partial
- **Agent/tool:** Codex with local repository and GitHub state verification
- **Branch:** `agent/desktop-v06-execution-plan`
- **Commits:** local documentation commit `9e3628a`; GitHub connector head `fe53e725`
- **Pull request:** [#95](https://github.com/vitala89/Intentloom/pull/95), draft
- **Objective:** Create one durable design and engineering handoff for the next Desktop milestone and recover the Desktop/TUI roadmap intent that did not land in `main`.
- **Completed:** Verified published `intentloom@0.5.0-beta.1`, tag `v0.5.0-beta.1`, current remote `main` at `05aa0c6`, merged PR #93, misplaced PR #91 base, and open draft PR #94. Added a Desktop documentation entrypoint, System Designer brief, phased v0.6 implementation plan, and copy-ready execution prompt. Updated roadmap and durable state so v0.6 precedes stable v1 planning. Recorded the verified current contract gaps for Diff, root-bound Timeline, capability discovery, client cancellation/errors, and Workspace RPC.
- **Not completed:** No ADR, protocol, daemon, Tauri, UI, TUI, packaging, merge, tag, publication, or release work was performed. PR #94 is not modified or closed by this branch.
- **Files or packages changed:** `docs/desktop/README.md`, `docs/desktop/DESIGN_BRIEF.md`, `docs/desktop/AGENT_EXECUTION_PROMPT.md`, `docs/roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md`, `docs/README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** Prettier 3.9.5 passed for all eight changed Markdown documents. `git diff --check` passed. A local relative-link target check passed. The final documentation diff was reviewed. Compatibility run `30225884569` passed the complete Linux, macOS, and Windows Node 22/24 matrix, including install, typecheck, lint, format, build, and tests.
- **Decisions and assumptions:** Desktop remains a Tauri 2 client over the standalone daemon. The first product slice is read-only. Full TUI hardening follows stable Desktop presentation contracts. Approved Apply remains a separate threat-reviewed gate. Stable v1 planning consumes Desktop/TUI compatibility evidence later rather than blocking v0.6.
- **Risks or compatibility impact:** Documentation-only and backwards compatible. Draft PR #94 overlaps `ROADMAP.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md` and requires reconciliation before either branch is merged without conflict.
- **Open issues or blockers:** UI framework, daemon self-contained distribution, Tauri transport, capability discovery, cancellation, Diff/Timeline RPC, and approved design assets remain unresolved implementation inputs.
- **Next first action:** Review and merge this documentation baseline, reconcile PR #94 as a later stability plan, then create the Desktop stack and distribution ADR on a new branch.
- **Evidence:** remote `main` commit `05aa0c6`, npm `next=0.5.0-beta.1`, Git tag `v0.5.0-beta.1`, PR #91, PR #93, PR #94, ADR-0032 through ADR-0035, protocol/daemon/application sources, and the new Desktop documents.

#### Duty completion checklist

- [x] Current release, main, PR, protocol, daemon, application, and roadmap state reverified
- [x] Desktop design brief and implementation plan added
- [x] Copy-ready implementation-agent prompt added
- [x] Project state and roadmap updated
- [x] Formatter and Markdown checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] Documentation commit created
- [x] Draft pull request opened
- [x] Compatibility run `30225884569` passed

### 2026-07-27, v1.0 stable compatibility plan drafted

- **Status:** partial
- **Agent/tool:** Codex with decomposition-planning-roadmap workflow adapted to compatibility sequencing
- **Branch:** `codex/v1-compatibility-planning`
- **Commits:** merged through PR #94 at `7402687`
- **Pull request:** [#94](https://github.com/vitala89/Intentloom/pull/94), merged
- **Objective:** Define the next roadmap step after the v0.5 release without prematurely implementing a broad v1.0 surface.
- **Completed:** Added `docs/roadmap/V1_0_STABLE_COMPATIBILITY_PLAN.md` with ordered phases for the stable contract, upgrade path, client-surface readiness, security/supply-chain review, and final release evidence; linked it from `ROADMAP.md` and updated the next first action in `PROJECT_STATE.md`.
- **Validation:** Documentation scope reviewed against the current compatibility policy, runtime/host matrix, public monorepo evolution plan, ADR-0033, v0.5 release evidence, and existing release process. The planning change is now merged into `main`.
- **Decisions and assumptions:** v1.0 planning starts with the compatibility contract and upgrade evidence. Desktop, hosted services, model training, live providers, external MCP ingestion, and autonomous mutation remain separately gated candidates.
- **Risks or compatibility impact:** This is a planning-only change and does not claim v1.0 implementation or stable support commitments.
- **Open issues or blockers:** Selection of the first compatibility-contract ADR/specification scope is pending.
- **Next first action:** Draft the first compatibility-contract ADR/specification as a later stability workstream while v0.6 Desktop proceeds.
- **Evidence:** `docs/roadmap/V1_0_STABLE_COMPATIBILITY_PLAN.md`, `ROADMAP.md`, `docs/releases/COMPATIBILITY_POLICY.md`, and `docs/compatibility/COMPATIBILITY_MATRIX.md`.

#### Duty completion checklist

- [x] v1.0 planning draft created
- [x] Roadmap and Project State linked to the draft
- [x] Formatter and diff checks passed
- [x] Planning PR opened and merged
- [ ] First compatibility-contract ADR/specification selected

### 2026-07-27, v0.5.0-beta.1 published to npm

- **Status:** partial
- **Agent/tool:** Codex with authorized release verification workflow
- **Branch:** `codex/v05-cwd-guidance`
- **Commits:** release commit `a0e0b13`; tag `v0.5.0-beta.1`; follow-up docs pending in PR #93
- **Pull request:** [#93](https://github.com/vitala89/Intentloom/pull/93), draft and open
- **Objective:** Confirm the authorized v0.5 publication and transition to the next roadmap gate.
- **Completed:** Verified npm `next=0.5.0-beta.1`, confirmed `intentloom@0.5.0-beta.1` exists in the registry, and recorded the published tarball metadata.
- **Validation:** Registry reports version `0.5.0-beta.1`, 70 files, unpacked size 972987 bytes, shasum `58b2e27eb66789f57c1e91cec46aea710a6fc241`, and integrity `sha512-x+dyIoKjcjVd5EGIUnFLA37nA4k5aY/EQlDC2jy0BmFX8h35WXshe0Hd2UZ7gv3DJp6MODEglGxJQYbsmaWFMA==`. `latest` remains `0.1.0-alpha.3` by prerelease policy.
- **Decisions and assumptions:** v0.5 is released under `next`; `latest` is intentionally unchanged. The next roadmap table milestone is `v1.0.0`, while TUI, Desktop, live providers, external MCP ingestion, and managed extensions remain candidate tracks requiring scope selection.
- **Risks or compatibility impact:** The release-record documentation is not yet merged in PR #93; no runtime code changed after the tagged release commit.
- **Open issues or blockers:** Merge/review PR #93, then choose the first v1.0 compatibility milestone with its support, upgrade, Desktop/MCP, and security gates.
- **Next first action:** Merge/review PR #93, then draft the first v1.0 compatibility milestone and required ADR/specification updates.
- **Evidence:** npm registry metadata, tag `v0.5.0-beta.1`, release commit `a0e0b13`, and [PR #93](https://github.com/vitala89/Intentloom/pull/93).

#### Duty completion checklist

- [x] v0.5 Git tag pushed
- [x] v0.5 npm package published under `next`
- [x] Registry metadata verified
- [x] `latest` prerelease policy preserved
- [ ] PR #93 release records merged
- [ ] v1.0 compatibility milestone selected

### 2026-07-27, npm EPRIVATE traced to private workspace cwd

- **Status:** partial
- **Agent/tool:** Codex with release-publish diagnosis
- **Branch:** `codex/v05-publish-otp-followup`
- **Commits:** follow-up documentation pending
- **Pull request:** [#92](https://github.com/vitala89/Intentloom/pull/92), draft
- **Objective:** Diagnose the failed retry without changing the published state.
- **Completed:** Confirmed root `package.json` is intentionally `private: true`, while `packages/cli/package.json` is `private: false` and publishes `intentloom`. Reproduced a successful dry-run from `packages/cli`.
- **Validation:** `npm publish --dry-run --tag next --access public` from `packages/cli` reports `intentloom@0.5.0-beta.1`, 70 files, and the expected shasum. The EPRIVATE error is therefore a working-directory error, not a package metadata defect.
- **Decisions and assumptions:** Do not remove `private` from the root workspace. Publish only from `packages/cli` after the OTP challenge is completed.
- **Risks or compatibility impact:** Publishing from the repository root targets the private `@intentloom/workspace` package and must remain prohibited.
- **Open issues or blockers:** Complete OTP confirmation, then run the publish command from `packages/cli` explicitly.
- **Next first action:** `cd packages/cli && npm publish --tag next --access public`, complete any OTP prompt, and verify registry metadata.
- **Evidence:** root `package.json`, `packages/cli/package.json`, successful CLI dry-run, and the reported npm `EPRIVATE` error.

#### Duty completion checklist

- [x] Root/private versus CLI/public package boundary verified
- [x] CLI dry-run reproduced successfully
- [x] Publishing guidance made cwd-explicit
- [ ] OTP confirmation completed
- [ ] npm publication accepted
- [ ] Registry metadata and install verification completed

### 2026-07-27, v0.5 tag pushed; npm publish awaits OTP

- **Status:** partial
- **Agent/tool:** Codex with authorized release workflow
- **Branch:** `codex/v05-publish-otp-followup`
- **Commits:** release commit `a0e0b13`; tag object `b9234ce`; follow-up state update pending
- **Pull request:** None; release tag is already pushed from verified `main`
- **Objective:** Execute the authorized v0.5 release while preserving a recoverable partial state.
- **Completed:** Verified PR #90 merged and `main` at `a0e0b13`; created and pushed `v0.5.0-beta.1`; reran pack dry-run with the recorded shasum; started the real npm publish under `next`.
- **Validation:** Tag resolves locally and on origin. Pack dry-run reports `intentloom@0.5.0-beta.1`, 70 files, shasum `21d5ec78b9cd840ccdcd263af71eb3d8b12a1c71`, integrity `sha512-w8uADr0INb0HBRk/IOs/uNA0QPTEbg8NJ6YSL8LC4b4u9dwxTmlkkcCxaDSm5enDiCIin6ncKsuoaLqmbescAg==`. npm publish stopped with `EOTP`; registry still reports `next=0.4.0-beta.1` and `intentloom@0.5.0-beta.1` returns 404.
- **Decisions and assumptions:** The Git tag is intentionally retained; no rollback or tag deletion is attempted. npm publication is incomplete and must be retried only after the one-time-password confirmation.
- **Risks or compatibility impact:** The release is in a partial external state: consumers cannot install `0.5.0-beta.1` from npm yet, while the Git tag is public.
- **Open issues or blockers:** Complete npm's browser OTP challenge, then rerun `npm publish --tag next --access public` from `packages/cli` and verify registry metadata.
- **Next first action:** Complete the npm OTP confirmation, rerun publish, and verify `npm view intentloom version dist-tags`.
- **Evidence:** tag `v0.5.0-beta.1`, npm publish `EOTP`, registry metadata query, and package shasum/integrity above.

#### Duty completion checklist

- [x] PR #90 merged and release commit verified
- [x] v0.5.0-beta.1 tag created and pushed
- [x] Final pack dry-run passed
- [x] npm publish authorization and package access verified
- [ ] OTP confirmation completed
- [ ] npm publication accepted
- [ ] Registry metadata and install verification completed
- [ ] Release records finalized

### 2026-07-27, v0.5 publication authorization and npm access verified

- **Status:** partial
- **Agent/tool:** Codex with controlled release authorization checks
- **Branch:** `codex/post-v05-state-merge`
- **Commits:** `44babb1`, plus this handoff update
- **Pull request:** [#90](https://github.com/vitala89/Intentloom/pull/90), draft and open
- **Objective:** Begin the explicitly authorized v0.5 tag/npm release gate without bypassing repository controls.
- **Completed:** Recorded the maintainer's explicit authorization for the v0.5 publication step; verified public npm metadata and confirmed current `latest=0.1.0-alpha.3` and `next=0.4.0-beta.1`; verified npm user and `intentloom: read-write` access; updated `RELEASE_STATE.md` to main commit `8f4bec4`; and completed both package dry-runs for `intentloom@0.5.0-beta.1`.
- **Validation:** `npm whoami --registry=https://registry.npmjs.org/` returned `vitalii.kas`; `npm access list packages --json --registry=https://registry.npmjs.org/` returned `intentloom: read-write`; `npm pack --dry-run --json` and `npm publish --dry-run --tag next --access public` passed with shasum `21d5ec78b9cd840ccdcd263af71eb3d8b12a1c71`.
- **Decisions and assumptions:** Authorization covers the v0.5 release action. The npm package remains unchanged until PR #90 is merged and the controlled release sequence begins.
- **Risks or compatibility impact:** The remaining release prerequisite is the PR #90 merge; no tag or publication has been attempted.
- **Open issues or blockers:** PR #90 is still draft/open, although both duplicate Compatibility runs passed all 12 checks.
- **Next first action:** Merge PR #90, then execute the verified v0.5 tag and npm publication sequence.
- **Evidence:** npm access commands and dry-run outputs, [PR #90](https://github.com/vitala89/Intentloom/pull/90), and Compatibility runs `30223921117` and `30223919725`.

#### Duty completion checklist

- [x] Explicit v0.5 publication authorization recorded
- [x] Registry metadata verified
- [x] npm account authenticated and package rights verified
- [x] Package dry-runs passed and artifact hash recorded
- [x] No tag or npm publication attempted before PR merge
- [ ] PR #90 merged
- [ ] npm account authenticated and package rights verified
- [ ] v0.5 tag created
- [ ] v0.5 npm publication completed

### 2026-07-27, post-merge release-state PR #89 merged

- **Status:** partial
- **Agent/tool:** Codex with GitHub and local release-state verification
- **Branch:** `codex/post-v05-state-merge`
- **Commits:** merge `8f4bec4`; state update pending
- **Pull request:** [#89](https://github.com/vitala89/Intentloom/pull/89), merged
- **Objective:** Synchronize local `main` and handoff records after the post-merge release-state PR.
- **Completed:** Verified PR #89 merged, fast-forwarded local `main` to `8f4bec4`, and confirmed the merged documentation records the remote 12-check compatibility verification and the untagged/unpublished v0.5 boundary.
- **Validation:** Local `main` is clean and tracks `origin/main`; PR #89 merge commit is `8f4bec4`.
- **Decisions and assumptions:** The workspace remains `0.5.0-beta.1`; npm `next` remains `0.4.0-beta.1`. The completed PR merge does not authorize a Git tag, dist-tag change, or npm publication.
- **Risks or compatibility impact:** Local `pnpm build` remains unavailable because the interrupted dependency environment lacks `@types/node`; remote CI is the verified evidence for the merged release-preparation changes.
- **Open issues or blockers:** Explicit authorization for v0.5 publication is still required.
- **Next first action:** Obtain explicit authorization for any v0.5 tag or npm publication; do not perform either action implicitly.
- **Evidence:** merge commit `8f4bec4`, [PR #89](https://github.com/vitala89/Intentloom/pull/89), `PROJECT_STATE.md`, `DUTY_WATCH.md`, and `docs/audits/V0_5_RELEASE_READINESS.md`.

#### Duty completion checklist

- [x] PR #89 merge verified
- [x] Local `main` fast-forwarded to `8f4bec4`
- [x] Release-state records are on `main`
- [ ] Explicit tag/npm publication authorization obtained
- [ ] Tag and npm publication completed

### 2026-07-27, v0.5 release-preparation PR #88 merged

- **Status:** partial
- **Agent/tool:** Codex with GitHub and local release-state verification
- **Branch:** `codex/post-v05-merge-release-state`
- **Commits:** merge `f6232e4`, state update `e681cf4`, plus this handoff update
- **Pull request:** [#88](https://github.com/vitala89/Intentloom/pull/88), merged
- **Objective:** Synchronize local `main` and durable project records after the approved release-preparation merge.
- **Completed:** Verified PR #88 merged into `main`, fast-forwarded local `main` to `f6232e4`, confirmed both duplicate Compatibility runs passed all 12 checks, and confirmed no `v0.5` tag exists.
- **Validation:** Remote runs `30223382394` and `30223381378` completed successfully. Local branch is clean before the state-document update; package dry-runs remain documented as passing.
- **Decisions and assumptions:** The v0.5 workspace candidate remains `0.5.0-beta.1`; npm `next` remains `0.4.0-beta.1`. Merge authorization does not imply tag or npm publication authorization.
- **Risks or compatibility impact:** Local `pnpm build` remains unavailable because the interrupted dependency environment lacks `@types/node`; remote CI is the verified build/test evidence for the merged branch.
- **Open issues or blockers:** The readiness audit must record remote verification, and a maintainer must separately authorize any tag, dist-tag change, or npm publication.
- **Next first action:** Review the updated readiness audit and obtain explicit authorization for any v0.5 tag or npm publication.
- **Evidence:** merge commit `f6232e4`, [PR #88](https://github.com/vitala89/Intentloom/pull/88), [run 30223382394](https://github.com/vitala89/Intentloom/actions/runs/30223382394), [run 30223381378](https://github.com/vitala89/Intentloom/actions/runs/30223381378), and `git tag --list 'v0.5*'` returning no tags.

#### Duty completion checklist

- [x] PR #88 merge verified
- [x] Local `main` fast-forwarded to `f6232e4`
- [x] Remote compatibility matrix passed
- [x] Absence of a v0.5 tag verified
- [x] Release-state and readiness records updated
- [ ] Explicit tag/npm publication authorization obtained
- [ ] Tag and npm publication completed

### 2026-07-27, post-merge v0.5 release-state PR #89 opened

- **Status:** partial
- **Agent/tool:** Codex with controlled documentation and release-state workflow
- **Branch:** `codex/post-v05-merge-release-state`
- **Commits:** `e681cf4`, `5da5081`
- **Pull request:** [#89](https://github.com/vitala89/Intentloom/pull/89), draft
- **Objective:** Publish the post-merge state corrections for review without performing release side effects.
- **Completed:** Opened draft PR #89 with the final merge commit, remote CI verification, readiness-audit PASS status, current `main` pointer, and explicit no-tag/no-npm boundary.
- **Validation:** Prettier 3.9.5 and `git diff --check` passed before publication. The source evidence is PR #88 merge `f6232e4` and successful Compatibility runs `30223382394` and `30223381378`.
- **Decisions and assumptions:** v0.5 remains synchronized in the workspace but unpublished; npm `next` remains `0.4.0-beta.1`. PR #89 is documentation-only.
- **Risks or compatibility impact:** PR #89 CI and review are pending. Local `pnpm build` remains unavailable because `@types/node` is missing from the interrupted dependency environment.
- **Open issues or blockers:** Explicit authorization for a v0.5 tag, dist-tag change, or npm publication has not been granted.
- **Next first action:** Inspect PR #89 checks and review, then keep release publication as a separately authorized action.
- **Evidence:** [PR #89](https://github.com/vitala89/Intentloom/pull/89), `docs/audits/V0_5_RELEASE_READINESS.md`, `PROJECT_STATE.md`, and `f6232e4`.

#### Duty completion checklist

- [x] Post-merge state and readiness records updated
- [x] Branch pushed
- [x] Draft PR #89 opened
- [ ] PR #89 checks passed
- [ ] PR #89 review completed
- [ ] Tag/npm publication authorized and completed

### 2026-07-27, PR #88 CI formatting failure corrected

- **Status:** partial
- **Agent/tool:** Codex with GitHub Actions CI-fix workflow
- **Branch:** `codex/process-intelligence-next-roadmap-3`
- **Commits:** `321c06e`
- **Pull request:** [#88](https://github.com/vitala89/Intentloom/pull/88), draft
- **Objective:** Diagnose and correct the failed compatibility checks without changing release scope.
- **Completed:** Inspected both failed Compatibility runs (`30223037624` and `30223036688`) and confirmed all 12 matrix jobs stopped at `pnpm format:check` because `docs/audits/V0_5_RELEASE_READINESS.md` was not Prettier-formatted. Formatted only that file.
- **Validation:** Full Prettier 3.9.5 check passes and `git diff --check` passes. Typecheck and lint had already completed before the failing format step in the remote logs; the local dependency environment remains incomplete for a full build.
- **Decisions and assumptions:** This is a documentation-only correction. No package version, runtime behavior, release scope, tag, npm publication, or merge was changed.
- **Risks or compatibility impact:** PR checks must be rerun after the correction; no claim is made that remote CI is green yet.
- **Open issues or blockers:** Formatting is corrected and the latest 12-job compatibility matrix is green; review and release authorization remain pending.
- **Next first action:** Review the green PR #88 checks and draft diff before any separately authorized release action.
- **Evidence:** [PR run 30223037624](https://github.com/vitala89/Intentloom/actions/runs/30223037624), [push run 30223036688](https://github.com/vitala89/Intentloom/actions/runs/30223036688), and `docs/audits/V0_5_RELEASE_READINESS.md`.

#### Duty completion checklist

- [x] Failure cause verified from GitHub Actions logs
- [x] Minimal formatting correction applied
- [x] Full Prettier check passed
- [x] `git diff --check` passed
- [x] Correction committed and pushed
- [x] PR #88 remote checks rerun and passed
- [ ] Review completed

### 2026-07-27, v0.5 release-preparation PR #88 published

- **Status:** partial
- **Agent/tool:** Codex with GitHub release-preparation workflow
- **Branch:** `codex/process-intelligence-next-roadmap-3`
- **Commits:** `128080d` release artifacts, `b2d459f` artifact handoff, plus this handoff update
- **Pull request:** [#88](https://github.com/vitala89/Intentloom/pull/88), draft
- **Objective:** Publish the synchronized v0.5 candidate for remote build/test verification.
- **Completed:** Pushed the release-preparation branch and opened draft PR #88 with the v0.5 version synchronization, release-state documentation, changelog, roadmap, and readiness audit.
- **Validation:** Prettier and `git diff --check` passed before publication. `npm pack --dry-run --json` and `npm publish --dry-run --tag next --access public` passed for `intentloom@0.5.0-beta.1`. Local `pnpm build` remains blocked by the interrupted dependency environment (`TS2688: Cannot find type definition file for 'node'`).
- **Decisions and assumptions:** PR #88 is for remote verification only. No tag, npm publication, dist-tag change, or merge was performed.
- **Risks or compatibility impact:** Remote CI must establish the build/test result for the synchronized version. The workspace candidate remains unpublished while npm `next` remains `0.4.0-beta.1`.
- **Open issues or blockers:** PR checks and review are pending; local dependency restoration remains incomplete.
- **Next first action:** Inspect PR #88 checks and review results, then decide whether an explicitly authorized release action is appropriate.
- **Evidence:** PR #88, branch `codex/process-intelligence-next-roadmap-3`, `docs/audits/V0_5_RELEASE_READINESS.md`, and package dry-run outputs.

#### Duty completion checklist

- [x] Release-preparation branch pushed
- [x] Draft PR #88 opened
- [x] Version and release-state artifacts included
- [x] Package dry-runs passed
- [x] Local build limitation recorded
- [ ] Remote build/test matrix passed
- [ ] Review completed
- [ ] Merge, tag, and npm publication separately authorized and completed

### 2026-07-27, v0.5.0-beta.1 release artifacts prepared

- **Status:** partial
- **Agent/tool:** Codex with controlled release-preparation workflow
- **Branch:** `codex/process-intelligence-next-roadmap-3`
- **Commits:** `128080d` (local)
- **Pull request:** None for v0.5 preparation; external publication requires explicit authorization.
- **Objective:** Prepare the synchronized v0.5 candidate artifacts after scope approval.
- **Completed:** Synchronized the root, all workspace manifests, and generated core version to `0.5.0-beta.1`; added the unreleased v0.5 changelog section; updated README/install guidance, versioning, publishing, roadmap, release-state, project state, and readiness audit; and kept npm `latest=0.1.0-alpha.3` / `next=0.4.0-beta.1` explicit.
- **Validation:** Full Prettier 3.9.5 check and `git diff --check` pass. `npm pack --dry-run --json` and `npm publish --dry-run --tag next --access public` pass for `intentloom@0.5.0-beta.1` using an isolated npm cache. Local `pnpm build` is blocked by the damaged dependency environment (`TS2688: Cannot find type definition file for 'node'`); no real publish or tag was attempted.
- **Decisions and assumptions:** Version synchronization is preparation only. The published npm artifact remains `0.4.0-beta.1`; the v0.5 artifact is not yet tagged or published.
- **Risks or compatibility impact:** Remote CI must verify build and tests against the new version before release. Existing process-intelligence boundaries and no-CLI/no-MCP claims remain unchanged.
- **Open issues or blockers:** Local dependency restoration and remote verification are pending; tag/npm publication remains separately authorized.
- **Next first action:** Publish the release-preparation branch for remote CI, then review build/test results before any tag or npm publication.
- **Evidence:** commit `128080d`, `docs/audits/V0_5_RELEASE_READINESS.md`, package dry-run outputs, and version synchronization script output.

#### Duty completion checklist

- [x] Scope approval recorded
- [x] Workspace versions synchronized
- [x] Changelog and release-state artifacts updated
- [x] Formatter and diff checks passed
- [x] Package dry-runs passed
- [x] Local build limitation recorded
- [ ] Release-preparation PR published
- [ ] Remote build/test matrix passed
- [ ] Tag and npm publication authorized and completed

### 2026-07-27, v0.5 readiness audit reviewed

- **Status:** partial
- **Agent/tool:** Codex with release-readiness verification
- **Branch:** `codex/process-intelligence-next-roadmap-3`
- **Commits:** `9b41808` plus audit commits below (local)
- **Pull request:** None; release preparation requires explicit scope approval.
- **Objective:** Review the drafted v0.5 release-readiness audit against repository evidence.
- **Completed:** Verified all five operations in the audit against protocol constants/validators, pure evidence-analysis functions, application bridges, authenticated daemon routing, ADR-0037 through ADR-0041, and matching specifications. Confirmed the branch is clean and `git diff main...HEAD --check` passes.
- **Not completed:** Scope approval, version synchronization to `0.5.0-beta.1`, changelog/release-state updates for the new artifact, package dry runs, tag, npm publication, and release PR.
- **Validation:** Local evidence review passed; the full Prettier check for the audit and state documents passed. Runtime and compatibility evidence remains the green merged PR #87 matrix and the prior full test record.
- **Decisions and assumptions:** The proposed v0.5 scope is limited to workflow variants, observed durations, conformance trends, repetition, and transition intervals. CLI and MCP remain intentionally unavailable for these operations.
- **Risks or compatibility impact:** Version bumping would change the release boundary and must not occur until the scope is approved. No runtime behavior changed in this review.
- **Open issues or blockers:** Maintainer/user approval of the v0.5 scope and release preparation is pending.
- **Next first action:** Obtain scope approval, then run the controlled version synchronization and prepare changelog/release-state updates.
- **Evidence:** `docs/audits/V0_5_RELEASE_READINESS.md`, protocol/application/daemon sources, ADR-0037 through ADR-0041, and green PR #87 checks.

#### Duty completion checklist

- [x] Audit reviewed against code and ADR/spec evidence
- [x] Surface availability verified
- [x] Formatter and diff checks passed
- [x] Handoff updated
- [ ] v0.5 scope approved
- [ ] Version and release artifacts prepared

### 2026-07-27, v0.5 release-readiness audit drafted

- **Status:** partial
- **Agent/tool:** Codex with release-readiness review
- **Branch:** `codex/process-intelligence-next-roadmap-3`
- **Commits:** `e10d84f` (local)
- **Pull request:** None; publication requires explicit authorization.
- **Objective:** Start the next planned release-readiness step after the release-state merge.
- **Completed:** Reviewed the process-intelligence concept, ADR-0037 through ADR-0041, matching specifications, protocol/application/daemon surfaces, publishing policy, and roadmap. Added `docs/audits/V0_5_RELEASE_READINESS.md` covering the five bounded operations, exact CLI/daemon/MCP availability, verification gates, release blockers, and non-goals; added the audit to the documentation index and marked `v0.5.0-beta.1` readiness in the roadmap.
- **Not completed:** Maintainer approval, version synchronization to `0.5.0-beta.1`, changelog/release-state publication update, package dry runs, tag, npm publication, and release PR.
- **Validation:** Full Prettier 3.9.5 check passes; `git diff --check` passes. The merged PR #87 compatibility matrix is green; no new dependency-backed runtime suite was required for this documentation-only audit draft.
- **Decisions and assumptions:** v0.5 scope is the five already merged process-intelligence operations. CLI and MCP remain unavailable for these operations by design; no broader process-mining semantics are added.
- **Risks or compatibility impact:** The audit does not change package versions or runtime behavior. Publication remains blocked until explicit release authorization and package ownership/permissions are confirmed.
- **Open issues or blockers:** Audit review and release decision are pending.
- **Next first action:** Review the v0.5 audit, then prepare version/changelog/release-state changes only after the release scope is approved.
- **Evidence:** `docs/audits/V0_5_RELEASE_READINESS.md`, ADR-0037 through ADR-0041, PR #87 merge commit `f546b76`, and green compatibility checks.

#### Duty completion checklist

- [x] Relevant ADRs/specs and implementation surfaces reviewed
- [x] Readiness audit drafted
- [x] Roadmap and documentation index updated
- [x] Formatter passed
- [x] `git diff --check` passed
- [x] Project state and Duty Watch updated
- [ ] Audit approved
- [ ] Version bump, release artifacts, and publication completed

### 2026-07-27, PR #87 merged and local main updated

- **Status:** partial
- **Agent/tool:** Codex with GitHub merge verification
- **Branch:** `main` → `codex/process-intelligence-next-roadmap-3`
- **Commits:** merge commit `f546b76`; next branch created from updated `main`
- **Pull request:** [#87](https://github.com/vitala89/Intentloom/pull/87), merged
- **Objective:** Complete the release-state documentation milestone and move to the next release-readiness step.
- **Completed:** Confirmed PR #87 is `MERGED`, all 12 compatibility checks succeeded, fetched `origin/main`, fast-forwarded local `main` from `83941ab` to `f546b76`, and created `codex/process-intelligence-next-roadmap-3`.
- **Not completed:** v0.5 readiness audit, version bump, release tag, npm publication, and merge for the next release.
- **Validation:** GitHub PR metadata reports merge commit `f546b76` and successful Ubuntu, macOS, and Windows Node 22/24 checks; local `main` matches `origin/main` and is clean at branch creation.
- **Decisions and assumptions:** The release-state matrix is now part of `main`. Process-intelligence capabilities remain merged in `main` but unreleased to npm; the next planned release milestone is `v0.5.0-beta.1`.
- **Risks or compatibility impact:** No new runtime behavior was added in this watch. Release preparation must preserve the explicit process-intelligence boundaries and must not add waiting-time, rework, bottleneck, causal, remote, persistence, or model claims.
- **Open issues or blockers:** v0.5 release readiness, version synchronization, tag creation, npm publication, and release authorization are pending.
- **Next first action:** Inspect the v0.5 process-intelligence scope, ADRs/specs, and release criteria, then draft the readiness audit.
- **Evidence:** merge commit `f546b76`, [PR #87](https://github.com/vitala89/Intentloom/pull/87), and local `git pull --ff-only origin main`.

#### Duty completion checklist

- [x] Merge and CI verified
- [x] Local `main` updated
- [x] New roadmap branch created
- [x] `PROJECT_STATE.md` updated
- [x] `DUTY_WATCH.md` handoff updated
- [ ] v0.5 readiness audit drafted and reviewed
- [ ] v0.5 release prepared, published, and merged

### 2026-07-26, PR #87 format failure fixed

- **Status:** partial
- **Agent/tool:** Codex with GitHub Actions CI fix workflow
- **Branch:** `codex/release-state-unification`
- **Commits:** `07264b8` (pushed after CI failure)
- **Pull request:** [#87](https://github.com/vitala89/Intentloom/pull/87), draft, targeting `main`
- **Objective:** Resolve the common failure reported by all PR #87 compatibility jobs.
- **Completed:** Inspected all 12 failed jobs and their logs. Every job passed install, typecheck, and lint, then failed only at `pnpm format:check` because `docs/releases/VERSIONING.md` was not Prettier-formatted. Ran Prettier 3.9.5, verified the full repository with `pnpm dlx prettier@3.9.5 --check "**/*.{ts,md,json,yaml,yml}"`, passed `git diff --check`, committed `07264b8`, and pushed it to the PR branch.
- **Not completed:** New remote CI, maintainer review, conversion from draft, merge, and release.
- **Validation:** Full Prettier check passes locally. Previous dependency-backed test/typecheck/lint/build results remain recorded; no new full test run was needed because the fix is formatting-only.
- **Decisions and assumptions:** The failure was one shared formatting defect, not a platform-specific compatibility issue. No source behavior changed.
- **Open issues or blockers:** Awaiting the rerun of PR #87 checks.
- **Next first action:** Inspect the new PR #87 check results and address only any remaining evidenced failures.
- **Evidence:** Failed run `30221479786`, failed run `30221478844`, `docs/releases/VERSIONING.md`, commit `07264b8`, and PR #87.

#### Duty completion checklist

- [x] Failure root cause identified from GitHub Actions logs
- [x] Focused fix implemented
- [x] Full formatter check passed
- [x] `git diff --check` passed
- [x] Fix committed and pushed
- [x] Duty Watch handoff updated
- [ ] New remote CI complete
- [ ] Pull request reviewed and merged

### 2026-07-26, Release-state draft PR #87 published

- **Status:** partial
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `codex/release-state-unification`
- **Commits:** `6829942` plus the release-state commits below (local and remote)
- **Pull request:** [#87](https://github.com/vitala89/Intentloom/pull/87), draft, targeting `main`
- **Objective:** Publish the reviewed release-state unification branch for remote CI and maintainer review.
- **Completed:** Pushed `codex/release-state-unification` to `origin` and created draft PR #87 with the release-state scope, npm/main boundary, validation history, and compatibility notes.
- **Not completed:** Remote CI, maintainer review, conversion from draft, merge, and release.
- **Validation:** Local branch was clean; `git diff main...HEAD --check` passed. Before the dependency-environment interruption, full tests, MCP tests, typecheck, lint, build, and format checks passed; dependency-backed reruns remain unavailable because the offline cache lacks the required esbuild tarball.
- **Decisions and assumptions:** PR remains draft until remote checks and maintainer review are available. No merge or release was performed.
- **Risks or compatibility impact:** Documentation-led release-state clarification plus synchronized MCP version reporting; no protocol behavior or package version change.
- **Open issues or blockers:** PR #87 CI/review are pending; network API access was intermittent during creation but the PR was successfully created.
- **Next first action:** Inspect PR #87 checks and review feedback, then merge only after all required checks and explicit approval.
- **Evidence:** [PR #87](https://github.com/vitala89/Intentloom/pull/87), pushed branch, `git diff main...HEAD --check`, and release-state matrix.

#### Duty completion checklist

- [x] Final diff reviewed for scope
- [x] Relevant prior validation and unavailable checks recorded
- [x] `PROJECT_STATE.md` updated
- [x] `DUTY_WATCH.md` handoff updated
- [x] Pull request published
- [ ] Remote CI and maintainer review complete
- [ ] Pull request merged

### 2026-07-26, Release-state branch final local review

- **Status:** partial
- **Agent/tool:** Codex with local Git review
- **Branch:** `codex/release-state-unification`
- **Commits:** `1b9997e`, `2aad42e`, `fec2e69`, `ea10395`, `9804235`, `dd7c027`
- **Pull request:** None; publication requires explicit authorization.
- **Objective:** Complete the final local review before the release-state documentation PR.
- **Completed:** Confirmed the branch is clean and six commits ahead of merged `main` at `83941ab`; reviewed all 22 changed paths; verified all workspace package versions and the generated core version are `0.4.0-beta.1`; confirmed the release-state matrix distinguishes npm `latest`, npm `next`, and post-tag `main` capabilities; and passed `git diff main...HEAD --check`.
- **Not completed:** Push, PR, remote CI, review, and merge.
- **Validation:** Local dependency-backed checks remain unavailable because the interrupted offline install left `node_modules` incomplete; prior successful test/typecheck/lint/build/format results are recorded in the preceding entry. GitHub API read-only lookup was unavailable in this session due network connectivity.
- **Risks or compatibility impact:** No new source behavior beyond synchronized MCP version reporting; documentation remains the primary scope.
- **Open issues or blockers:** External publication and dependency restoration require explicit authorization and/or network availability.
- **Next first action:** Publish `codex/release-state-unification` and open a PR after explicit authorization.
- **Evidence:** `git diff main...HEAD --check`, synchronized package/version files, `docs/releases/RELEASE_STATE.md`, and clean branch status.

#### Duty completion checklist

- [x] Final diff reviewed for scope
- [x] Version synchronization checked against package manifests and generated source
- [x] `git diff --check` passed
- [x] Duty Watch handoff updated
- [x] Failed or unavailable validation recorded
- [ ] Pull request published, reviewed, and merged

### 2026-07-26, Release-state documentation unification

- **Status:** partial
- **Agent/tool:** Codex with release-state verification
- **Branch:** `codex/release-state-unification`
- **Commits:** `1b9997e`, `2aad42e`, `fec2e69`, `ea10395`, `9804235` (local)
- **Pull request:** None; publication requires explicit authorization.
- **Objective:** Reconcile source versions, npm registry state, release audits, README/install guidance, and roadmap status into one capability matrix.
- **Completed:** Confirmed merged `main` at `83941ab`, GitHub release/tag `v0.4.0-beta.1`, npm `latest=0.1.0-alpha.3` and `next=0.4.0-beta.1`. Added `docs/releases/RELEASE_STATE.md` with capability/CLI/daemon/MCP/experimental columns; updated README, CLI/getting-started/reference docs, changelog, release policy/versioning, v0.4 audit, roadmap, concept/roadmap supplements, and MCP server version reporting. Process-intelligence capabilities are explicitly marked as merged in `main` but not in the published npm artifact.
- **Not completed:** PR, CI, and merge.
- **Files or packages changed:** `docs/releases/RELEASE_STATE.md`, README/install/reference docs, changelog, release/versioning docs, roadmap/concept docs, `packages/application/src/index.ts`, `packages/mcp-server/src/index.ts`, `tests/mcp-server.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** Before the dependency-environment interruption: full `pnpm test` (728 passed, 3 skipped across 82 files), MCP-focused tests (8 passed), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`, and `git diff --check` passed. `pnpm install --offline --frozen-lockfile` confirmed the lockfile resolution is up to date but could not restore a missing cached esbuild tarball; a subsequent network install requires explicit dependency-install authorization.
- **Decisions and assumptions:** `main` and npm are intentionally separate release boundaries. `0.4.0-beta.1` is the current published prerelease under `next`; `latest` remains `0.1.0-alpha.3`. MCP server version now comes from the synchronized framework version source.
- **Risks or compatibility impact:** Documentation clarifies existing behavior; the only code change removes a hardcoded stale MCP version. No protocol behavior or package version was changed.
- **Open issues or blockers:** Local `node_modules` needs restoration before any new validation run; PR publication and any dependency install require explicit authorization.
- **Next first action:** Review commit `1b9997e`, then open a PR after explicit authorization.
- **Evidence:** `docs/releases/RELEASE_STATE.md`, npm registry metadata, GitHub release `v0.4.0-beta.1`, merge commit `83941ab`, and the validation outputs above.

#### Duty completion checklist

- [x] Formatter passed before the dependency interruption
- [x] Markdown and lint checks passed before the dependency interruption
- [x] Relevant tests, type checks, and build passed before the dependency interruption
- [x] `git diff --check` passed before the dependency interruption
- [x] Final diff reviewed for scope (final commit review pending)
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff updated
- [x] Related release, roadmap, versioning, changelog, and reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request published, reviewed, and merged

### 2026-07-26, Draft PR #86 published

- **Status:** partial
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `codex/process-intelligence-next-roadmap-2`
- **Commits:** `e999667`, `bfc1c9c`, `cf4ace1`, `6e1bcfa`, `48306b8`, `70d9a78`, `98de493`
- **Pull request:** [#86](https://github.com/vitala89/Intentloom/pull/86), draft, targeting `main`
- **Objective:** Publish the reviewed ADR-0041 transition interval implementation for CI and maintainer review.
- **Completed:** Verified a clean branch, pushed `codex/process-intelligence-next-roadmap-2`, created draft PR #86, and confirmed twelve GitHub checks are in progress on Ubuntu, macOS, and Windows with Node 22/24.
- **Not completed:** CI, maintainer review, conversion from draft, merge into `main`, and release.
- **Files or packages changed:** No additional source files after the reviewed implementation; PR includes protocol, evidence-analysis, application, daemon, tests, ADR/spec/security/state/changelog, and Duty Watch updates.
- **Validation:** Local full test suite (727 passed, 3 skipped across 82 files), focused tests, typecheck, lint, build, formatter, and diff-check passed before publication. GitHub PR checks are currently `IN_PROGRESS`.
- **Decisions and assumptions:** PR is intentionally draft. No merge, release, or publication beyond the branch/PR was performed.
- **Risks or compatibility impact:** Additive read-only protocol and daemon operation; remote CI remains the compatibility gate.
- **Open issues or blockers:** CI and maintainer review are pending; merge requires explicit authorization.
- **Next first action:** Inspect PR #86 checks and review feedback, then merge only when all required checks and explicit approval are present.
- **Evidence:** [PR #86](https://github.com/vitala89/Intentloom/pull/86), pushed branch, and `gh pr view 86` showing `OPEN`, `isDraft: true`, base `main`, and twelve checks `IN_PROGRESS`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request checks and maintainer review complete

### 2026-07-26, Observed workflow transition interval implementation

- **Status:** partial
- **Agent/tool:** Codex with TDD workflow
- **Branch:** `codex/process-intelligence-next-roadmap-2`
- **Commits:** `e999667`, `bfc1c9c`, `cf4ace1`, `6e1bcfa`
- **Pull request:** None; publishing is not authorized in this watch.
- **Objective:** Implement the accepted observed workflow transition interval boundary from ADR-0041.
- **Completed:** Accepted ADR-0041 and the v0.1 specification. Added canonical protocol request/response contracts and validation for `intentloom.workflow.transitions.intervals.v1`, pure adjacent-interval aggregation with minimum/median/maximum elapsed minutes and coverage, application bridge, authenticated daemon routing, deterministic protocol/analysis/daemon fixtures, and accepted security/state/changelog documentation.
- **Not completed:** Maintainer review, PR publication, CI, and merge into `main`.
- **Files or packages changed:** `packages/protocol/src/index.ts`, `packages/evidence-analysis/src/index.ts`, `packages/application/src/index.ts`, `packages/daemon/src/index.ts`, `tests/workflow-transition-intervals.test.ts`, `tests/protocol.test.ts`, `tests/daemon.test.ts`, ADR/spec/security/state/changelog documentation, and `DUTY_WATCH.md`.
- **Validation:** Focused protocol/analysis tests (13 passed); daemon IPC tests (16 passed, 1 skipped); full `pnpm test` (727 passed, 3 skipped across 82 files); `pnpm typecheck`; `pnpm lint`; `pnpm build`; `git diff --check`; formatter passed. Daemon tests required unsandboxed Unix-socket access because the sandbox returned `EPERM` on `server.listen`.
- **Decisions and assumptions:** Only valid, non-decreasing adjacent timestamp pairs contribute intervals. Out-of-order pairs are excluded without repair. Output remains aggregate and descriptive; no queue-time, latency, rework, bottleneck, performance, causal, actor, provider, persistence, or model interpretation is introduced.
- **Risks or compatibility impact:** Additive protocol/application/daemon method; no existing method behavior changed. The local branch is ahead of merged `main` and has not passed remote CI yet.
- **Open issues or blockers:** Maintainer review and explicit authorization are required before pushing or opening a PR.
- **Next first action:** Review the final diff and local commit, then publish for CI/review only when authorized.
- **Evidence:** ADR-0041, `WORKFLOW_TRANSITION_INTERVALS_V0_1_SPEC.md`, `pnpm test` output, and the focused daemon/protocol/analysis results above.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request published, reviewed, and merged

### 2026-07-26, Final branch review and contract correction

- **Status:** partial
- **Agent/tool:** Codex with two-axis review
- **Branch:** `codex/process-intelligence-next-roadmap-2`
- **Commits:** `48306b8` review correction commit
- **Pull request:** None; publishing remains unauthorized in this watch.
- **Objective:** Review the transition-interval branch against `main` and resolve actionable findings before publication.
- **Completed:** Confirmed the branch is clean and the diff is scoped to ADR-0041. Corrected strict ISO timestamp eligibility, clarified that reports contain only observable transitions, removed stale current-main state, and completed the Duty Watch commit/file inventory.
- **Not completed:** Follow-up validation/commit, maintainer review, PR publication, CI, and merge into `main`.
- **Files or packages changed:** `packages/evidence-analysis/src/index.ts`, `tests/workflow-transition-intervals.test.ts`, `PROJECT_STATE.md`, `docs/specs/WORKFLOW_TRANSITION_INTERVALS_V0_1_SPEC.md`, and `DUTY_WATCH.md`.
- **Validation:** Two-axis review completed; focused transition/protocol tests (13 passed), daemon IPC tests (16 passed, 1 skipped), full `pnpm test` (727 passed, 3 skipped across 82 files), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`, and `git diff --check` all passed after the correction. Daemon/full tests required unsandboxed Unix-socket access.
- **Decisions and assumptions:** Non-ISO date strings are invalid evidence for this operation even if the JavaScript parser can interpret them. Zero-count transition records are not emitted because they carry no observable interval statistics.
- **Risks or compatibility impact:** The correction narrows interval eligibility to the accepted specification; valid ISO timestamps and existing report shape remain unchanged.
- **Open issues or blockers:** Maintainer review and explicit authorization are still required before pushing or opening a PR.
- **Next first action:** Commit the correction, update this handoff with the exact commit, then wait for explicit authorization before publication.
- **Evidence:** Two-axis review reports and `git diff main...HEAD --check`/`pnpm format:check` before the correction.

#### Duty completion checklist

- [x] Formatter passed after correction
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed after correction
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff updated
- [x] Related specification updated
- [x] Findings and unresolved authorization blocker recorded
- [ ] Pull request published, reviewed, and merged

### 2026-07-26, Observed workflow transition interval candidate

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-next-roadmap-2`
- **Commits:** `57a2c9b` merge baseline, `e999667` candidate proposal
- **Pull request:** None; this is a local proposal only.
- **Objective:** Select and specify the next bounded process-intelligence candidate after workflow repetition summary merge.
- **Completed:** Reviewed the engineering process-intelligence concept and existing duration/repetition boundaries. Proposed ADR-0041 and `WORKFLOW_TRANSITION_INTERVALS_V0_1_SPEC.md`, constraining the candidate to aggregate elapsed minutes for valid adjacent timestamp pairs without queue-time, latency, rework, bottleneck, causal, quality, actor, persistence, remote, or model claims. Added security invariant 34 and updated durable project state.
- **Not completed:** ADR/spec approval, protocol/analysis implementation, adapters, fixtures, PR, and merge.
- **Files or packages changed:** `docs/decisions/ADR-0041-observed-workflow-transition-intervals.md`, `docs/specs/WORKFLOW_TRANSITION_INTERVALS_V0_1_SPEC.md`, `docs/security/THREAT_MODEL.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** Roadmap/ADR/concept review completed; `pnpm format:check` and `git diff --check` passed. No runtime tests were rerun because this commit is documentation-only.
- **Decisions and assumptions:** An interval is an observed evidence fact only when adjacent valid timestamps are non-decreasing; out-of-order pairs are unavailable evidence and are not repaired.
- **Risks or compatibility impact:** Documentation-only proposal; no runtime behavior or protocol surface changed.
- **Open issues or blockers:** Maintainer/user review is required before implementation.
- **Next first action:** Review ADR-0041 and the draft specification, then approve, revise, or reject the candidate.
- **Evidence:** `docs/concepts/ENGINEERING_PROCESS_INTELLIGENCE.md`, ADR-0038, ADR-0040, and merged baseline `57a2c9b`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [ ] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Candidate approved and implemented

### 2026-07-26, PR #85 merged and local main updated

- **Status:** complete
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `main` → `codex/process-intelligence-next-roadmap-2`
- **Commits:** merge commit `57a2c9b`; local main fast-forwarded from `c0e7cb0`
- **Pull request:** [#85](https://github.com/vitala89/Intentloom/pull/85), merged
- **Objective:** Merge the reviewed workflow repetition summary and update the local checkout for the next roadmap step.
- **Completed:** Confirmed all twelve compatibility checks succeeded, verified PR #85 is merged, fetched `origin/main`, fast-forwarded local `main` to `57a2c9b`, and created the next roadmap branch.
- **Not completed:** Selection or implementation of the next process-intelligence candidate.
- **Files or packages changed:** No files changed in this watch; the merged PR contains the implementation and documentation changes.
- **Validation:** `gh pr view 85` reports `MERGED` with merge commit `57a2c9b`; `git pull --ff-only origin main` succeeded; local `main` is clean and matches `origin/main`.
- **Decisions and assumptions:** Workflow repetition summary is now part of `main`. Any broader rework, retry, bottleneck, causal, actor, persisted, remote, or model-assisted capability still requires a separate ADR, specification, and threat review.
- **Risks or compatibility impact:** No new code was added after the merged PR; next work must preserve the additive, local, read-only boundary.
- **Open issues or blockers:** The next candidate is intentionally unselected.
- **Next first action:** Inspect the roadmap and relevant ADRs, then propose the next bounded candidate before implementation.
- **Evidence:** PR #85 metadata, twelve successful CI checks, merge commit `57a2c9b`, and clean local `main` at `origin/main`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [x] Pull request merged and local main updated

### 2026-07-26, Draft PR #85 published

- **Status:** partial
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `codex/process-intelligence-next-roadmap`
- **Commits:** `0bbe550`, `9c16b1d`, `40f58de`, `2cf866d`
- **Pull request:** [#85](https://github.com/vitala89/Intentloom/pull/85), draft, targeting `main`
- **Objective:** Publish the reviewed workflow repetition summary implementation for remote checks and maintainer review.
- **Completed:** Verified clean branch and GitHub authentication, pushed the branch, and created draft PR #85 with scope, safety boundary, changelog impact, and validation results.
- **Not completed:** Compatibility checks, maintainer review, conversion from draft, and merge into `main`.
- **Files or packages changed:** No files changed in this watch; implementation and documentation are in the listed commits.
- **Validation:** Local `pnpm test` (723 passed, 3 skipped across 81 files), typecheck, lint, build, format, diff-check, and TDD-focused review passed. PR checks are currently in progress for Ubuntu/macOS/Windows on Node 22/24.
- **Decisions and assumptions:** PR remains draft until required checks and human review complete; no merge or release was performed.
- **Risks or compatibility impact:** Additive protocol and daemon method only; remote CI is the remaining compatibility gate.
- **Open issues or blockers:** PR checks are in progress and maintainer review is pending.
- **Next first action:** Inspect PR #85 checks and review feedback, then merge after required approval.
- **Evidence:** PR #85 metadata and `gh pr view 85` status show `OPEN`, `isDraft: true`, base `main`, and twelve checks `IN_PROGRESS`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request checks and maintainer review complete

### 2026-07-26, Deterministic workflow repetition summary implementation

- **Status:** partial
- **Agent/tool:** Codex with TDD workflow
- **Branch:** `codex/process-intelligence-next-roadmap`
- **Commits:** `0bbe550`, `9c16b1d`, `40f58de`
- **Pull request:** Not opened; local implementation is ready for review.
- **Objective:** Implement the accepted bounded workflow repetition summary over caller-supplied timelines.
- **Completed:** Accepted ADR-0040 and the v0.1 specification. Added canonical protocol contracts and validation for `intentloom.workflow.repetitions.summary.v1`, pure repeated-activity aggregation, application bridge, authenticated daemon routing, protocol/analysis/application/daemon fixtures, security invariant 33, changelog, and durable state updates.
- **Not completed:** Final commit/push, PR review, CI, and merge into `main`.
- **Files or packages changed:** `CHANGELOG.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0040-deterministic-workflow-repetition-summary.md`, `docs/specs/WORKFLOW_REPETITION_SUMMARY_V0_1_SPEC.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/evidence-analysis/src/index.ts`, `packages/application/src/index.ts`, `packages/daemon/src/index.ts`, `tests/workflow-repetition-summary.test.ts`, `tests/protocol.test.ts`, and `tests/daemon.test.ts`.
- **Validation:** Focused workflow/protocol tests (13 passed); daemon IPC tests (16 passed, 1 skipped); full `pnpm test` (723 passed, 3 skipped across 81 files); `pnpm typecheck`; `pnpm lint`; `pnpm build`; `pnpm format:check`; and `git diff --check` passed. Daemon tests required unsandboxed Unix-socket access.
- **Decisions and assumptions:** Repeated activity is a descriptive count only. The operation never labels repetition as rework, retry, delay, bottleneck, quality, performance, or cause.
- **Risks or compatibility impact:** Additive protocol and daemon method; no persistence, provider access, network calls, or mutation path was added.
- **Open issues or blockers:** Final validation and PR review remain.
- **Next first action:** Complete validation, review the diff, commit, and open a PR only after checks pass.
- **Evidence:** ADR-0040/specification, TDD tracer cycles, focused tests, and current branch diff.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request opened and reviewed

### 2026-07-26, Deterministic workflow repetition summary candidate

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-next-roadmap`
- **Commits:** `c0e7cb0` merge baseline, `0bbe550` candidate proposal
- **Pull request:** None; this is a local proposal only.
- **Objective:** Select and specify the next bounded process-intelligence candidate after conformance trend summary merge.
- **Completed:** Reviewed the engineering process-intelligence concept and roadmap. Proposed ADR-0040 and `WORKFLOW_REPETITION_SUMMARY_V0_1_SPEC.md`, constraining the candidate to repeated activity counts over caller-supplied, same-type timelines without rework, retry, bottleneck, causal, quality, actor, persistence, remote, or model claims. Added security invariant 33 and updated durable project state.
- **Not completed:** ADR/spec approval, protocol/analysis implementation, adapters, fixtures, PR, and merge.
- **Files or packages changed:** `docs/decisions/ADR-0040-deterministic-workflow-repetition-summary.md`, `docs/specs/WORKFLOW_REPETITION_SUMMARY_V0_1_SPEC.md`, `docs/security/THREAT_MODEL.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** Roadmap/ADR/concept review completed; `pnpm format:check` and `git diff --check` passed. No runtime tests were rerun because this commit is documentation-only.
- **Decisions and assumptions:** Repeated activity is a descriptive count only. Any interpretation as rework, retry, delay, bottleneck, performance, or cause requires a separate approved boundary.
- **Risks or compatibility impact:** Documentation-only proposal; no runtime behavior or protocol surface changed.
- **Open issues or blockers:** Maintainer/user review is required before implementation.
- **Next first action:** Review ADR-0040 and the draft specification, then approve, revise, or reject the candidate.
- **Evidence:** `docs/concepts/ENGINEERING_PROCESS_INTELLIGENCE.md`, existing ADR-0037/0038/0039, and merged baseline `c0e7cb0`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [ ] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Candidate approved and implemented

### 2026-07-26, PR #84 merged and local main updated

- **Status:** complete
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `main` → `codex/process-intelligence-next-roadmap`
- **Commits:** merge commit `c0e7cb0`; local main fast-forwarded from `890d6d3`
- **Pull request:** [#84](https://github.com/vitala89/Intentloom/pull/84), merged
- **Objective:** Merge the reviewed conformance trend summary and update the local checkout for the next roadmap step.
- **Completed:** Confirmed all twelve compatibility checks succeeded, converted PR #84 from draft to ready, merged it into `main`, fetched `origin/main`, fast-forwarded local `main` to `c0e7cb0`, and created the next roadmap branch.
- **Not completed:** Selection or implementation of the next process-intelligence candidate.
- **Files or packages changed:** No files changed in this watch; the merged PR contains the implementation and documentation changes.
- **Validation:** `gh pr view 84` reports `MERGED` with merge commit `c0e7cb0`; `git pull --ff-only origin main` succeeded; local `main` is clean and matches `origin/main`.
- **Decisions and assumptions:** The conformance trend summary is now part of `main`. Any broader bottleneck, causal, actor, persisted, remote, or model-assisted capability still requires a separate ADR, specification, and threat review.
- **Risks or compatibility impact:** No new code was added after the merged PR; next work must preserve the additive, local, read-only boundary.
- **Open issues or blockers:** The next candidate is intentionally unselected.
- **Next first action:** Inspect the roadmap and relevant ADRs, then propose the next bounded candidate before implementation.
- **Evidence:** PR #84 metadata, twelve successful CI checks, merge commit `c0e7cb0`, and clean local `main` at `origin/main`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [x] Pull request merged and local main updated

### 2026-07-26, Draft PR #84 published

- **Status:** partial
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `codex/process-intelligence-next-candidate`
- **Commits:** `ff92506`, `6bbdd36`, `eb52e65`, `1b789d0`, `b402271`, `29ad679`, `b7787d5`
- **Pull request:** [#84](https://github.com/vitala89/Intentloom/pull/84), draft, targeting `main`
- **Objective:** Publish the reviewed conformance trend summary implementation for remote checks and maintainer review.
- **Completed:** Reauthenticated GitHub CLI through device flow, verified API access as `vitala89`, pushed the branch, and created draft PR #84 with scope, safety boundary, changelog impact, and validation results.
- **Not completed:** Compatibility checks, maintainer review, conversion from draft, and merge into `main`.
- **Files or packages changed:** No files changed in this watch; all implementation and documentation are in the listed commits.
- **Validation:** Local `pnpm test` (717 passed, 3 skipped), typecheck, lint, build, format, diff-check, and two-axis review passed. PR checks are currently in progress for Ubuntu/macOS/Windows on Node 22/24.
- **Decisions and assumptions:** PR remains draft until required checks and human review complete; no merge or release was performed.
- **Risks or compatibility impact:** Additive protocol and daemon method only; remote CI is the remaining compatibility gate.
- **Open issues or blockers:** PR checks are in progress and maintainer review is pending.
- **Next first action:** Inspect PR #84 checks and review feedback, then merge after required approval.
- **Evidence:** PR #84 metadata and `gh pr view 84` status show `OPEN`, `isDraft: true`, base `main`, and twelve checks `IN_PROGRESS`.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request checks and maintainer review complete

### 2026-07-26, GitHub connector availability check

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-next-candidate`
- **Commits:** `29ad679` and preceding trend-summary commits
- **Pull request:** Not opened; the requested GitHub connector is not available in the current tool set.
- **Objective:** Continue the authorized PR publication through the requested GitHub plugin.
- **Completed:** Checked the active tools and confirmed no callable GitHub connector is loaded. The local repository remains clean and no push or PR mutation was attempted.
- **Not completed:** Remote branch publication, PR creation, checks, and merge.
- **Files or packages changed:** None in this watch.
- **Validation:** Tool availability inspection completed; the prior `gh auth status` remains failed because the local token is invalid.
- **Decisions and assumptions:** Do not bypass the requested plugin path or use unauthenticated remote mutation. Preserve the existing reviewed branch and commits.
- **Risks or compatibility impact:** None locally; remote review status remains unknown.
- **Open issues or blockers:** Enable the GitHub connector in this session or refresh GitHub CLI authentication.
- **Next first action:** After connector/auth availability, verify repository/head/base and open the authorized draft PR.
- **Evidence:** Current `ALL_TOOLS` inventory, clean branch status, and prior GitHub authentication check.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request opened and reviewed

### 2026-07-26, Authorized PR publication blocked by GitHub authentication

- **Status:** partial
- **Agent/tool:** Codex with GitHub publish workflow
- **Branch:** `codex/process-intelligence-next-candidate`
- **Commits:** `b402271` and preceding trend-summary commits
- **Pull request:** Not opened; publication stopped before push because `gh auth status` reports an invalid token for `vitala89`.
- **Objective:** Publish the reviewed conformance trend summary branch and open a draft PR after explicit user authorization.
- **Completed:** Confirmed clean working tree, remote `https://github.com/vitala89/Intentloom.git`, installed GitHub CLI, and explicit user authorization. No remote mutation was attempted after authentication failed.
- **Not completed:** Git push, PR creation, remote checks, and merge.
- **Files or packages changed:** No files changed in this watch; the prior implementation and handoff commits remain intact.
- **Validation:** `gh --version` passed; `gh auth status` failed with an invalid token. Local validation remains recorded in the preceding handoff.
- **Decisions and assumptions:** Followed the publish skill's stop condition for unauthenticated GitHub CLI; did not bypass it with unverified credentials or alternate remote mutation.
- **Risks or compatibility impact:** None locally; branch remains unpublished and remote review status is unknown.
- **Open issues or blockers:** User must re-authenticate with `gh auth login -h github.com` before publication can continue.
- **Next first action:** Re-run `gh auth status` after login, then push with tracking and open a draft PR.
- **Evidence:** `git status -sb`, `git remote get-url origin`, `gh --version`, and `gh auth status` output.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request opened and reviewed

### 2026-07-26, Conformance trend summary review and PR handoff

- **Status:** partial
- **Agent/tool:** Codex with two-axis review
- **Branch:** `codex/process-intelligence-next-candidate`
- **Commits:** `ff92506`, `6bbdd36`, `eb52e65`, `1b789d0`, plus this handoff update
- **Pull request:** Not opened; explicit authorization and GitHub API access are still required.
- **Objective:** Review the conformance trend summary diff against repository standards and ADR-0039/specification, then prepare an accurate handoff.
- **Completed:** Standards review found no code-boundary violations. Specification review found no missing requirements, scope creep, or incorrect behavior. Added the required Unreleased changelog entry and corrected the handoff status/evidence fields.
- **Not completed:** Opening/reviewing a remote pull request and merging into `main`.
- **Files or packages changed:** `CHANGELOG.md` and `DUTY_WATCH.md`; implementation remains in the preceding commits.
- **Validation:** `pnpm test` (717 passed, 3 skipped), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`, `git diff --check`, plus local two-axis review. `gh pr list` could not reach `api.github.com` in this environment.
- **Decisions and assumptions:** The implementation remains local and read-only; no push, PR, merge, release, or network fallback was performed. The accepted ADR/spec boundary is unchanged.
- **Risks or compatibility impact:** Additive protocol and daemon method only. Remote review status is unknown until a PR is opened.
- **Open issues or blockers:** PR creation needs explicit user authorization and working GitHub connectivity.
- **Next first action:** Obtain authorization, verify `gh auth status`, and open the PR with validation results and changelog impact.
- **Evidence:** `git diff origin/main...HEAD`, the two review reports, local test/build results, and clean committed working tree.

#### Duty completion checklist

- [x] Formatter passed
- [x] Markdown and lint checks passed when configured
- [x] Relevant tests, type checks, builds, or compatibility checks passed
- [x] `git diff --check` passed
- [x] Final diff reviewed
- [x] `PROJECT_STATE.md` updated when applicable
- [x] `DUTY_WATCH.md` handoff completed
- [x] Related roadmap, ADR, changelog, migration, or reference docs updated
- [x] Failed or unavailable checks recorded
- [ ] Pull request opened and reviewed

### 2026-07-26, Conformance trend summary implementation

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-next-candidate`
- **Objective:** Implement the accepted bounded conformance trend summary over caller-supplied reports.
- **Completed:** Accepted ADR-0039 and `CONFORMANCE_TREND_SUMMARY_V0_1_SPEC.md`. Added canonical protocol request/response contracts and validation for `intentloom.conformance.trend.summary.v1`, pure deterministic status/severity aggregation, application bridge, authenticated daemon routing, and focused protocol/analysis/application/daemon fixtures. Updated security invariant 32 and durable project state.
- **Validation:** `pnpm typecheck`; focused protocol and trend tests (10 passed); daemon IPC tests (16 passed, 1 skipped); full `pnpm test` (717 passed, 3 skipped); `pnpm format:check`; `pnpm lint`; `pnpm build`; and `git diff --check` passed.
- **Decisions:** The operation requires at least two schema-validated reports with one case type and policy; it returns counts only and does not infer causes, bottlenecks, compliance, actors, or remediation priority.
- **Risks or compatibility impact:** Additive protocol and daemon method. No persistence, provider access, network calls, or mutation path was added.
- **Next first action:** Review the final diff, commit, and open a pull request only with explicit user authorization.

### 2026-07-26, PR #83 merge and conformance trend summary candidate

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-next-candidate`
- **Pull request:** #83 merged as `890d6d3`
- **Objective:** Record the merged first process-intelligence increment and define the next bounded candidate.
- **Completed:** Verified PR #83 merge and all 12 Compatibility checks. Added proposed ADR-0039 and Draft `CONFORMANCE_TREND_SUMMARY_V0_1_SPEC.md`. The candidate aggregates only existing schema-validated conformance reports for one policy and case type; it exposes status/severity counts and forbids raw evidence, actor data, certification, bottleneck claims, remediation ranking, persistence, remote ingestion, and model interpretation. Added security invariant 32 and updated durable project state.
- **Validation:** GitHub merge/check verification passed. Markdown formatting and `git diff --check` are required before commit.
- **Decisions:** This is a proposed boundary only. No conformance-trend implementation may begin until ADR-0039 and its specification receive review.
- **Next first action:** Review and approve or revise ADR-0039 and the draft specification.

### 2026-07-26, PR #83 merged and first process-intelligence increment accepted

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `main` → `codex/process-intelligence-next-candidate`
- **Pull request:** #83, merged as `890d6d3`
- **Objective:** Verify the merge of conformance, workflow-variant, and observed-duration contracts and move the watch to the next roadmap decision.
- **Completed:** Confirmed PR #83 is merged into `origin/main`; all 12 Compatibility checks for Ubuntu/macOS/Windows on Node 22/24 completed successfully. Updated durable project state and Duty Watch to remove the stale draft-PR status. The merged increment includes versioned conformance, memory-evaluation, workflow-variant, and workflow-duration read-only IPC/application contracts.
- **Validation:** Git fetch and GitHub PR metadata verification passed; PR #83 state is `MERGED`, merge commit `890d6d3`, and all required Compatibility checks are `SUCCESS`.
- **Decisions:** The next process-intelligence capability is intentionally unselected until a separate ADR, specification, and threat review define its evidence and privacy boundaries.
- **Next first action:** Select and specify the next candidate; do not implement broader bottleneck, performance, causal, remote-ingestion, or model-assisted analysis without that review.

### 2026-07-26, Observed workflow-duration metrics implementation

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Implement accepted aggregate observed-duration metrics without creating bottleneck, performance, or causal analysis.
- **Completed:** Added `WorkflowDurationSummaryReport` protocol contracts and `intentloom.workflow.durations.summary.v1`. Implemented pure `summarizeWorkflowDurations`, which validates caller-supplied timelines, rejects insufficient/mixed/duplicate cases, derives timestamp coverage, and returns aggregate observed elapsed minutes (minimum, median, maximum) only for cases with at least two valid timestamps. Added equivalent application and authenticated daemon adapters plus focused tests. ADR-0038 and the v0.1 specification are now accepted.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0038-observed-workflow-duration-metrics.md`, `docs/specs/WORKFLOW_DURATION_METRICS_V0_1_SPEC.md`, `packages/protocol/src/index.ts`, `packages/evidence-analysis/src/index.ts`, `packages/application/src/index.ts`, `packages/daemon/src/index.ts`, `tests/workflow-duration-metrics.test.ts`, `tests/protocol.test.ts`, and `tests/daemon.test.ts`.
- **Validation:** `pnpm typecheck`; `pnpm vitest run tests/workflow-duration-metrics.test.ts tests/protocol.test.ts` (9 passed); `pnpm vitest run tests/daemon.test.ts` (16 passed, 1 Windows-only skipped); `pnpm format:check`; and `git diff --check` passed.
- **Decisions:** An invalid timestamp is unavailable evidence, not an error repair target. The report omits `elapsedMinutes` when no case has an observable interval and never returns raw timestamps or per-case duration values.
- **Risks or compatibility impact:** Additive protocol and daemon method. Existing timeline, conformance, and workflow-variant contracts are unchanged.
- **Pull request:** #83 (draft)
- **Next first action:** Review PR #83 checks and feedback, then merge after required CI and human approval. Before any broader process-intelligence capability, prepare a separate ADR, specification, and threat review.

### 2026-07-26, Observed workflow-duration metrics candidate

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Specify the next narrowly bounded timing candidate without claiming bottlenecks, performance, or causality.
- **Completed:** Added proposed ADR-0038 and Draft `WORKFLOW_DURATION_METRICS_V0_1_SPEC.md`. The candidate accepts only explicitly supplied, same-type canonical timelines and emits aggregate elapsed-minute statistics when timestamps permit, plus evidence coverage. It prohibits persistence, project or network access, actors, raw timestamps, rankings, alerts, bottleneck labels, performance claims, and causal interpretation. Added security invariant 31 and updated durable project state.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0038-observed-workflow-duration-metrics.md`, `docs/specs/WORKFLOW_DURATION_METRICS_V0_1_SPEC.md`, and `docs/security/THREAT_MODEL.md`.
- **Validation:** Markdown formatting and `git diff --check` are required before commit.
- **Decisions:** This is a proposed boundary only. It is not authorization to implement duration metrics or broader workflow timing analysis.
- **Next first action:** Review and approve or revise ADR-0038 and the draft specification. Only after approval, add canonical protocol types, deterministic fixtures, the pure analysis operation, application adapter, and authenticated daemon IPC.

### 2026-07-26, Deterministic workflow-variant summary implementation

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Implement the accepted narrow workflow-variant summary without expanding into process mining, causal analysis, persistence, or evidence collection.
- **Completed:** Added `WorkflowVariantSummaryReport` protocol contracts and `intentloom.workflow.variants.summary.v1`. Implemented pure `summarizeWorkflowVariants` using only caller-supplied canonical timelines; it groups ordered activity sequences using SHA-256 identifiers, validates timeline count/case type/case-ID isolation, reports timestamp coverage only, and deterministically sorts variants. Added equivalent application and authenticated daemon adapters plus protocol, pure-analysis, application, and daemon test coverage. ADR-0037 and the v0.1 specification are now accepted.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0037-deterministic-workflow-variant-summary.md`, `docs/specs/WORKFLOW_VARIANT_SUMMARY_V0_1_SPEC.md`, `packages/protocol/src/index.ts`, `packages/evidence-analysis/src/index.ts`, `packages/application/src/index.ts`, `packages/daemon/src/index.ts`, `tests/workflow-variant-summary.test.ts`, `tests/protocol.test.ts`, and `tests/daemon.test.ts`.
- **Validation:** `pnpm typecheck`; `pnpm vitest run tests/workflow-variant-summary.test.ts tests/protocol.test.ts` (8 passed); `pnpm vitest run tests/daemon.test.ts` (16 passed, 1 Windows-only skipped); `pnpm format:check`; and `git diff --check` passed.
- **Decisions:** The operation is pure and accepts no root path, credentials, provider configuration, persistence target, actor, or raw evidence payload. Empty timelines produce `unavailable` timestamp coverage rather than a delay claim.
- **Risks or compatibility impact:** Additive protocol and daemon method. Existing timeline, conformance, and evidence contracts are unchanged.
- **Next first action:** Review, commit, and open a pull request. Before any broader process-intelligence capability, prepare a separate ADR, specification, and threat review.

### 2026-07-26, Deterministic workflow-variant summary candidate

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Specify the next narrow Engineering Process Intelligence increment without prematurely implementing process mining or causal analysis.
- **Completed:** Added proposed ADR-0037 and Draft `WORKFLOW_VARIANT_SUMMARY_V0_1_SPEC.md`. The candidate is constrained to pure, in-memory aggregation of at least two explicitly supplied, same-type canonical timelines. It exposes normalized activity sequences, case identifiers, counts, and timestamp coverage only; it prohibits root access, persistence, network, actors, raw payloads, bottleneck/delay claims, causality, recommendations, and model interpretation. Added security invariant 30 and updated durable project state.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0037-deterministic-workflow-variant-summary.md`, `docs/specs/WORKFLOW_VARIANT_SUMMARY_V0_1_SPEC.md`, and `docs/security/THREAT_MODEL.md`.
- **Validation:** Markdown formatting and `git diff --check` are required before commit.
- **Decisions:** This is a proposed boundary only. It is not authorization to implement workflow-variant analysis or to expand toward bottleneck/process-mining capabilities.
- **Next first action:** Review and approve or revise ADR-0037 and the draft specification. Only after approval, add canonical protocol types, deterministic fixtures, the pure analysis operation, application adapter, and authenticated daemon IPC.

### 2026-07-26, Engineering Process Intelligence & Agent Memory Evaluation system (IPC increment complete)

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Complete the first shared-application and authenticated-local-daemon increment for deterministic engineering conformance and procedural-memory evaluation reads.
- **Completed:** Moved engineering workflow policy, timeline, and conformance report contracts to `@intentloom/protocol`, retaining `@intentloom/evidence-analysis` as the pure evaluator and a compatibility re-export surface. Added `intentloom.engineering.conformance.v1`, application operation `evaluateProjectEngineeringConformance`, and authenticated daemon routing. The existing `intentloom.memory.evaluations.list.v1` exposes procedural-memory evaluation records. Updated ADR-0020 and durable project state.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `docs/decisions/ADR-0020-engineering-workflow-policy-and-conformance.md`, `pnpm-lock.yaml`, `packages/application/`, `packages/daemon/src/index.ts`, `packages/evidence-analysis/`, `packages/protocol/src/index.ts`, `tests/daemon.test.ts`, `tests/engineering-conformance.test.ts`, and `tests/protocol.test.ts`.
- **Validation:** `pnpm install --offline`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, focused `pnpm vitest run tests/engineering-conformance.test.ts tests/protocol.test.ts` (11 passed), and `pnpm vitest run tests/daemon.test.ts` (16 passed, 1 Windows-only skipped) passed. `git diff --check` passed before the final state/documentation edits. A full `pnpm test` run emitted all progress markers but this environment did not return its final summary; it is not claimed as passed.
- **Decisions:** Protocol owns the conformance contract; evidence analysis owns the deterministic algorithm; application and daemon are adapters. All new operations remain local, token-authenticated for daemon access, deterministic, and read-only.
- **Risks or compatibility impact:** Additive protocol and daemon methods; package dependency graph now explicitly reflects `application → evidence-analysis → protocol`.
- **Next first action:** Review, rerun `git diff --check`, commit, and open a pull request. After merge, write a separate ADR/specification before any process-variant or bottleneck implementation.

### 2026-07-26, Engineering conformance IPC contract (interrupted)

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Move engineering-conformance contract types into `@intentloom/protocol`, then expose the existing pure evaluator through application and authenticated local daemon IPC.
- **Completed:** Began the canonical-contract migration: protocol request/response shapes and validators, daemon routing, and application bridge are present in the working tree. `@intentloom/evidence-analysis` now declares `@intentloom/protocol` as its source for conformance types and `@intentloom/application` declares `@intentloom/evidence-analysis` as a dependency.
- **Blocked:** TypeScript cannot resolve the newly declared `@intentloom/evidence-analysis` workspace alias until pnpm updates local workspace links. `pnpm install --offline` was requested solely to synchronize existing workspace metadata without network access, but was rejected because repository policy requires explicit authorization for dependency installation or synchronization.
- **Validation:** `pnpm typecheck` currently fails only with `TS2307: Cannot find module '@intentloom/evidence-analysis'`; before that, the referenced project was corrected to `composite: true` and missing type re-exports were fixed. Do not claim this increment is validated.
- **Recovery:** With explicit authorization, run `pnpm install --offline`, then run `pnpm typecheck`, `pnpm vitest run tests/engineering-conformance.test.ts tests/protocol.test.ts tests/daemon.test.ts`, `pnpm format:check`, and `git diff --check`. Add focused application/daemon integration coverage before committing. If authorization is not granted, revert the uncommitted conformance-contract changes rather than replacing the package dependency with an unreviewed relative-import workaround.
- **Next first action:** Obtain explicit authorization for `pnpm install --offline` or direct the intended alternative; no external package download is required.

### 2026-07-26, Engineering Process Intelligence & Agent Memory Evaluation system (first IPC increment)

- **Status:** partial
- **Agent/tool:** Codex
- **Branch:** `codex/process-intelligence-memory-evaluation`
- **Objective:** Begin the next platform milestone without duplicating the existing deterministic conformance or procedural-memory evaluation engines.
- **Completed:** Verified that PR #82 is merged in `main` (`152ab09`) and corrected the resulting stale Duty Watch and project-state records. Added the versioned authenticated local IPC method `intentloom.memory.evaluations.list.v1`, which exposes existing project-scoped `SkillEvaluationResult` records with optional `skillId` and outcome filters. The daemon operation is read-only and requires the same session-token authentication as existing IPC methods.
- **Files changed:** `PROJECT_STATE.md`, `DUTY_WATCH.md`, `packages/protocol/src/index.ts`, `packages/daemon/src/index.ts`, and `tests/daemon.test.ts`.
- **Validation:** `pnpm typecheck`, `pnpm vitest run tests/daemon.test.ts` (16 passed, 1 Windows-only skipped), `pnpm format:check`, and `git diff --check` passed. The daemon test requires an unsandboxed temporary Unix socket; sandboxed execution fails before handlers run with `EPERM`.
- **Decisions:** Existing `listSkillEvaluations` remains the shared application operation and authoritative evaluation-record reader. The daemon only adapts that typed operation; it creates no new memory authority, writes, network access, or model capability.
- **Not completed:** No daemon IPC contract has yet been added for engineering-conformance evaluation. Process-variant discovery, bottleneck inference, remote evidence ingestion, and model-based judgments remain out of scope pending separate specification and threat review.
- **Next first action:** Add a canonical, versioned engineering-conformance request/report contract before exposing the existing evaluator through application and daemon boundaries; avoid duplicating the types currently owned by `@intentloom/evidence-analysis`.

### 2026-07-26, Neutron autonomous subagent orchestration & local workspace sync engine

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/neutron-orchestration`
- **Pull request:** #82
- **Objective:** Implement Neutron Autonomous Subagent Orchestration & Local Workspace Sync Engine, including ADR-0036, subagent task record schemas (`NeutronSubagentTaskRecord`), task lifecycle operations (`spawnNeutronSubagentTask`, `getNeutronSubagentTask`, `listNeutronSubagentTasks`), local workspace sync (`syncLocalWorkspaceState`), CLI subcommand routing (`intentloom neutron subagent <spawn|get|list>` and `intentloom neutron sync`), and test coverage.
- **Completed:** Added `ADR-0036-neutron-autonomous-subagent-orchestration-and-local-workspace-sync.md`. Implemented `NeutronSubagentTaskRecord` schemas and validators in `@intentloom/protocol`. Implemented `spawnNeutronSubagentTask`, `getNeutronSubagentTask`, `listNeutronSubagentTasks`, and `syncLocalWorkspaceState` in `@intentloom/application`. Exposed CLI routing for `intentloom neutron subagent` and `intentloom neutron sync` in `@intentloom/cli`. Added unit & integration tests in `tests/neutron-orchestration.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0036-neutron-autonomous-subagent-orchestration-and-local-workspace-sync.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/neutron-orchestration.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/neutron-orchestration.test.ts` (3/3 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Neutron subagent tasks are project-isolated (`.aif/neutron/subagents/`), role-bound (`research`, `arch-checker`, `test-runner`, `conformance-auditor`, `custom`), and enforce zero-mutation read-only guarantees during research and workspace state synchronization.
- **Risks or compatibility impact:** Additive features in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/neutron-orchestration`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Agent workspace plan, review, and transactional apply modes

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/agent-workspace-apply-modes`
- **Pull request:** #81
- **Objective:** Implement Agent Workspace: Plan, Review, and Transactional Apply Modes, including ADR-0035, proposal promotion (`promoteWorkspaceConversationToProposal`), review diagnostics (`reviewWorkspaceProposal`), human approval gates (`applyWorkspaceProposal`), CLI subcommand routing (`intentloom workspace promote|review|apply`), and test coverage.
- **Completed:** Added `ADR-0035-agent-workspace-plan-review-apply-modes.md`. Implemented `promoteWorkspaceConversationToProposal`, `reviewWorkspaceProposal`, and `applyWorkspaceProposal` in `@intentloom/application`. Exposed CLI routing for `intentloom workspace promote`, `review`, `apply` in `@intentloom/cli`. Added unit & integration tests in `tests/workspace-apply.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0035-agent-workspace-plan-review-apply-modes.md`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/workspace-apply.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/workspace-apply.test.ts` (4/4 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Plan and Review modes maintain 100% zero-mutation guarantees. Codebase mutations occur ONLY during explicit Apply mode execution backed by human approval gates (`--approved-by USER`) and transactional rollback protection.
- **Risks or compatibility impact:** Additive features in `@intentloom/application` and `@intentloom/cli`.
- **Next first action:** Commit `feat/agent-workspace-apply-modes`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Agent workspace discuss and inspect modes

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/agent-workspace-modes`
- **Pull request:** #80
- **Objective:** Implement Agent Workspace: Discuss and Inspect Modes, including ADR-0034, WorkspaceConversationRecord schemas, conversation lifecycle operations in `@intentloom/application`, CLI subcommand routing (`intentloom workspace`), and comprehensive test coverage.
- **Completed:** Added `ADR-0034-agent-workspace-discuss-and-inspect-modes.md`. Implemented `WorkspaceConversationRecord` schemas and validator in `@intentloom/protocol`. Implemented `startWorkspaceConversation`, `getWorkspaceConversation`, `appendWorkspaceMessage`, and `listWorkspaceConversations` in `@intentloom/application` with secret redaction. Exposed CLI routing for `intentloom workspace <start|get|list|append>` in `@intentloom/cli`. Added unit & integration tests in `tests/workspace-agent.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0034-agent-workspace-discuss-and-inspect-modes.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/workspace-agent.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/workspace-agent.test.ts` (4/4 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Workspace conversations are local (`.aif/workspace/conversations/`), project-isolated, auto-redact credentials, and enforce 100% read-only guarantees for Discuss and Inspect modes.
- **Risks or compatibility impact:** Additive features in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/agent-workspace-modes`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Interactive surfaces read-only TUI and desktop application shell

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/interactive-surfaces-tui`
- **Pull request:** #79
- **Objective:** Implement Interactive Surfaces: Read-Only TUI and Desktop Application Shell, including ADR-0033, workspace state provider (`getInteractiveWorkspaceState`), CLI subcommand routing (`intentloom ui`), and comprehensive test coverage.
- **Completed:** Added `ADR-0033-interactive-surfaces-tui-and-desktop-shell.md`. Implemented `getInteractiveWorkspaceState` in `@intentloom/application` aggregating doctor findings, security audit, and session history into structured presentation view models. Exposed CLI routing for `intentloom ui [--root PATH] [--json]` in `@intentloom/cli`. Added unit & integration tests in `tests/interactive-ui.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0033-interactive-surfaces-tui-and-desktop-shell.md`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/interactive-ui.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/interactive-ui.test.ts` (3/3 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** TUI and Desktop shells consume shared application operations (`getInteractiveWorkspaceState`) and daemon IPC, maintaining 100% read-only zero-mutation guarantees.
- **Risks or compatibility impact:** Additive feature in `@intentloom/application` and `@intentloom/cli`.
- **Next first action:** Commit `feat/interactive-surfaces-tui`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Daemon and protocol contracts for second clients

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/daemon-protocol-contracts`
- **Pull request:** #78
- **Objective:** Implement Daemon & Protocol Contracts for Second Clients, including ADR-0032, expanded RPC request/response schemas (`doctor`, `inspect`, `securityAudit`, `memorySearch`, `sessionGet`), daemon dispatch handlers, secret token authentication, and multi-operation IPC integration tests.
- **Completed:** Added `ADR-0032-second-client-daemon-protocol-contracts.md`. Expanded `DaemonRequest` and `DaemonResponse` types, request creators, and validators in `@intentloom/protocol`. Implemented typed RPC request handlers in `@intentloom/daemon`. Added multi-operation IPC integration tests in `tests/daemon.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0032-second-client-daemon-protocol-contracts.md`, `packages/protocol/src/index.ts`, `packages/daemon/src/index.ts`, `tests/daemon.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/daemon.test.ts` (16/16 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Daemon RPC expands beyond doctor to serve inspect, securityAudit, memorySearch, and sessionGet over authenticated local IPC.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol` and `@intentloom/daemon`.
- **Next first action:** Commit `feat/daemon-protocol-contracts`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S5 continuous security audit and verification

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s5`
- **Pull request:** #77
- **Objective:** Implement Candidate S5: Continuous Security Audit and Verification, including ADR-0031, threat model updates, versioned protocol schemas, private application operations (`runContinuousSecurityAudit`, `getSecurityAuditReport`), CLI command routing (`intentloom security audit`, `intentloom security verify`), and comprehensive test coverage.
- **Completed:** Added `ADR-0031-continuous-security-audit-and-verification.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 29. Implemented `SecurityInvariantStatus`, `SecurityInvariantCheck`, `ContinuousSecurityAuditReport` schemas and validators in `@intentloom/protocol`. Implemented invariant verification engine (1–28 checks), health score calculation (0–100%), and tamper-evident SHA-256 audit hashing (`runContinuousSecurityAudit`) in `@intentloom/application`. Exposed CLI routing for `intentloom security audit` and `intentloom security verify` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s5.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0031-continuous-security-audit-and-verification.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s5.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s5.test.ts` (3/3 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Continuous security audit verifies active invariants (1–28), logs tamper-evident SHA-256 digests under `.aif/security/audit-report.json`, and returns exit code 3 on health score < 80% or failing invariant checks.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`. Completes Memory & Security Roadmap Candidates M1–M4 and S1–S5.
- **Next first action:** Commit `feat/memory-security-s5`, open a pull request, merge after approval, and conclude Memory & Security roadmap.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S4 controlled agentic security sandbox

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s4`
- **Pull request:** #76
- **Objective:** Implement Candidate S4: Controlled Agentic Security Sandbox, including ADR-0030, threat model updates, versioned protocol schemas, private application operations (`getSandboxCapabilityPolicy`, `writeSandboxCapabilityPolicy`, `evaluateProposalAgainstSandbox`), CLI command routing (`intentloom security sandbox`), and comprehensive test coverage.
- **Completed:** Added `ADR-0030-controlled-agentic-security-sandbox.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 28. Implemented `SandboxCapabilityMode`, `SandboxPathRule`, `SandboxCommandRule`, `SandboxCapabilityPolicy`, `SandboxEvaluationResult` schemas and validators in `@intentloom/protocol`. Implemented sandbox policy management and proposal evaluation algorithm (`evaluateProposalAgainstSandbox`) in `@intentloom/application`. Exposed CLI routing for `intentloom security sandbox <check|validate|policy>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0030-controlled-agentic-security-sandbox.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s4.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Sandbox capability policies are schema-validated files stored under `.aif/security/sandbox.json`; proposals violating capability mode, path rules, command allowlists, or network settings are blocked before execution with structured violation diagnostics.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s4`, open a pull request, merge after approval, and prepare Candidate S5 (Continuous Security Audit and Verification).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S3 deterministic security policies and baselines

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s3`
- **Pull request:** #75
- **Objective:** Implement Candidate S3: Deterministic Security Policies and Baselines, including ADR-0029, threat model updates, versioned protocol schemas, private application operations (`getSecurityPolicy`, `writeSecurityPolicy`, `getSecurityBaseline`, `updateSecurityBaseline`, `checkSecurityPolicyAndBaseline`), CLI command routing (`intentloom security baseline`, `intentloom security policy`), and comprehensive test coverage.
- **Completed:** Added `ADR-0029-security-policies-and-baselines.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 27. Implemented `SecurityPolicy`, `SecurityBaseline`, `SecurityBaselineCheckResult` schemas and validators in `@intentloom/protocol`. Implemented security policy/baseline operations and drift detection algorithm (`checkSecurityPolicyAndBaseline`) in `@intentloom/application`. Exposed CLI routing for `intentloom security baseline <check|update>` and `intentloom security policy <check|validate>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s3.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0029-security-policies-and-baselines.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s3.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s3.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security policies and baselines are schema-validated files under `.aif/security/`; baseline updates require explicit maintainer invocation; policy violations with `fail` enforcement exit with deterministic non-zero codes.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s3`, open a pull request, merge after approval, and prepare Candidate S4 (Controlled Agentic Security Sandbox).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S2 local deterministic security adapters

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s2`
- **Pull request:** #74
- **Objective:** Implement Candidate S2: Local Deterministic Security Adapters, including ADR-0028, threat model updates, versioned protocol schemas, private application operations (`runLocalSecurityAdapters`, `correlateSecurityFindings`), CLI command routing (`intentloom security scan`), and comprehensive test coverage.
- **Completed:** Added `ADR-0028-local-deterministic-security-adapters.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 26. Implemented `SecurityAdapterCategory`, `SecurityAdapterMetadata`, `SecurityAdapterResult` schemas and validators in `@intentloom/protocol`. Implemented built-in deterministic read-only security adapters (`dependency`, `secret`, `config`, `mcp`, etc.) and finding deduplication/correlation (`correlateSecurityFindings`) in `@intentloom/application`. Exposed CLI routing for `intentloom security scan [--category CATEGORY]` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s2.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0028-local-deterministic-security-adapters.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s2.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s2.test.ts` (4/4 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security adapters execute strictly local read-only file inspections without shell commands, build scripts, external binaries, or network connections, and findings normalize to `SecurityFinding` with local deduplication.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s2`, open a pull request, merge after approval, and prepare Candidate S3 (Deterministic Security Policies and Baselines).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S1 security evidence and posture

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s1`
- **Pull request:** #73
- **Objective:** Implement Candidate S1: Security Evidence and Posture, including ADR-0027, threat model updates, versioned protocol schemas, private application operations, CLI command routing (`intentloom security`), and comprehensive test coverage.
- **Completed:** Added `ADR-0027-security-evidence-and-posture.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 25. Implemented `SecurityFinding`, `SecurityCoverageReport`, `SarifImportResult` schemas and validators in `@intentloom/protocol`. Added security operations (`importSarifSecurityReport`, `getSecurityCoverageReport`, `dismissSecurityFinding`, `acceptSecurityRisk`, `listSecurityFindings`, `getSecurityFinding`) in `@intentloom/application` with secret path redaction (`secretLikePath`) and local `.aif/security/` JSON persistence. Exposed CLI routing for `intentloom security <import|inspect|coverage|dismiss|accept-risk|list>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0027-security-evidence-and-posture.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s1.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security evidence and finding ingestion are provider-neutral, local-first, project-isolated under `.aif/security/`, redact secret paths, process SARIF reports as untrusted input, and cannot execute scripts or alter project configuration without review.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s1`, open a pull request, merge after approval, and prepare Candidate S2 (Local Deterministic Security Adapters).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate M4 agent session lifecycle

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-m4`
- **Pull request:** #72
- **Objective:** Implement Candidate M4: Agent Session Lifecycle, including ADR-0026, threat model updates, versioned protocol schemas, private application operations, CLI command routing (`intentloom session`), and comprehensive test coverage.
- **Completed:** Added `ADR-0026-agent-session-lifecycle.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 24. Implemented `AgentSessionItem`, `AgentSessionState`, `AgentSessionExportResult` schemas and validators in `@intentloom/protocol`. Added session lifecycle operations (`startAgentSession`, `closeAgentSession`, `getAgentSession`, `listAgentSessions`, `deleteAgentSession`, `exportAgentSession`) in `@intentloom/application` with secret path redaction (`secretLikePath`) and local `.aif/memory/sessions/` JSON persistence. Exposed CLI routing for `intentloom session <start|close|list|get|delete|export>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-m4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0026-agent-session-lifecycle.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test` (666 tests passed across 68 test suites), and `git diff --check` passed cleanly.
- **Decisions:** Session lifecycle tracking is local-first, vendor-neutral, stored under `.aif/memory/sessions/`, redacts secret paths, and cannot silently mutate canonical intent or overwrite accepted memory.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-m4`, open a pull request, merge after approval, and prepare Candidate S1 (Security Evidence and Posture).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate M3 semantic retrieval (partial)

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m3`
- **Commit:** `bc0d973 feat(memory): add semantic retrieval adapters`
- **Pull request:** #71 (draft)
- **Objective:** Begin M3 semantic retrieval and portable adapter work after merged M2.
- **Completed:** Added provider-neutral persistent-memory search and bounded rendering contracts, plus explicit rebuild/clear lifecycle for `.aif/memory/index.json` derived state and CLI `memory search`, `memory render`, and `memory index` routing. Accepted, project-scoped records are deterministically ranked by local terms and render to named portable targets without network access.
- **Validation:** `pnpm typecheck` and `pnpm vitest run tests/memory-security-m3.test.ts` passed.
- **Not completed:** Merge remains subject to human review and approval.
- **Next first action:** Review draft PR #71, merge after approval, then begin Candidate M4 (Agent Session Lifecycle) with its required ADR and threat review.

### 2026-07-26, Memory & Security Candidate M2 accepted persistent memory

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m2`
- **Commit:** `c877714 feat(memory): add accepted persistent memory`
- **Pull request:** #70 (draft)
- **Objective:** Implement project-local accepted persistent memory with typed lifecycle, explicit approval, redaction, project isolation, import/export, supersession, and deletion safeguards.
- **Completed:** Added ADR-0024 and persistent-memory threat controls. Implemented versioned `PersistentMemoryItem` and export schemas; local proposal, review, accept, supersede, forget, export, and import operations; import rollback; CLI routing under `intentloom memory`; and M2 unit/integration tests. Updated durable project state from M1 to M2.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m2.test.ts`, `docs/decisions/ADR-0024-accepted-persistent-memory.md`, `docs/security/THREAT_MODEL.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test`, and `git diff --check` passed. The daemon suite requires Unix-socket permissions unavailable in the workspace sandbox; it passed unchanged when rerun outside the sandbox (16 passed, 1 Windows-only skipped).
- **Decisions:** Imports are always untrusted proposals; canonical and verified classifications cannot be imported. Accepted records require explicit approval evidence. Superseded and forgotten records retain lifecycle audit evidence.
- **Risks or compatibility impact:** Additive protocol, application, CLI, and local storage behavior. No network calls, hooks, or background collection are introduced.
- **Not completed:** Merge remains subject to human review and approval.
- **Next first action:** Review draft PR #70, merge after approval, then begin Candidate M3 (Semantic Retrieval and Portable Adapters) with its required ADR and threat review.
- **Evidence:** local typecheck, lint, Prettier check, build, full Vitest run, daemon validation outside sandbox, and `git diff --check`.

### 2026-07-26, PR #71 Windows packed adapter test timeout

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m3`
- **Objective:** Fix the failing Windows Node 22 compatibility check for PR #71.
- **Completed:** Increased only `performs a second all-adapter sync with zero changes` in `tests/adapter-packed-process.test.ts` from Vitest's default five-second timeout to 20 seconds. The Windows runner recorded this deterministic packed CLI integration test at 7.5 seconds; no production code changed.
- **Validation:** `pnpm vitest run tests/adapter-packed-process.test.ts` passed (13 passed, 1 skipped) in 5.17 seconds; `git diff --check` passed.
- **Next first action:** Observe rerun CI for PR #71; merge after all required checks pass and approval is granted.

### 2026-07-26, Framework version bump and v0.4.0-beta.1 candidate release

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `release/v0.4.0-beta.1`
- **Objective:** Bump framework version from `0.3.0-beta.1` to `0.4.0-beta.1`, synchronize version across all workspace packages and `packages/core/src/version.ts`, create `v0.4` candidate release readiness audit, update versioning strategy docs, run full verification matrix, and open Release Pull Request.
- **Completed:** Bumped root `package.json` to `0.4.0-beta.1`, executed `scripts/sync-version.mjs` via `pnpm build`, created `docs/audits/V0_4_RELEASE_READINESS.md`, updated `docs/releases/VERSIONING.md`, updated `PROJECT_STATE.md` and `DUTY_WATCH.md`. Merged Release PR #68 into `main`, tagged `v0.4.0-beta.1`, and created GitHub Release `v0.4.0-beta.1`.
- **Files changed:** `package.json`, `packages/*/package.json`, `packages/core/src/version.ts`, `docs/releases/VERSIONING.md`, `docs/audits/V0_4_RELEASE_READINESS.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly.
- **Decisions:** Release `0.4.0-beta.1` contains the complete Controlled Agent Learning & Procedural Memory Milestone (Candidates L1–L8).
- **Risks or compatibility impact:** None. Lockstep pre-release bump for workspace packages.
- **Next first action:** Run `npm login` / `npm publish` for npmjs registry deployment when authorized, and proceed with Memory & Security Candidate M1.
- **Evidence:** local build, version sync, typecheck, lint, prettier format check, vitest run, GitHub Release `v0.4.0-beta.1`.

### 2026-07-26, Memory & Security Candidate M1 bounded project context

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-m1`
- **Objective:** Implement context schemas (`ContextSourceType`, `ContextSource`, `ContextRetrievalRequest`, `ContextRetrievalResult`), application read-only operation (`getBoundedProjectContext`), secret path exclusion, item & token budget clamping, CLI command routing (`intentloom context get`), and test coverage.
- **Completed:** Implemented versioned context schemas (`ContextSourceType`, `ContextSource`, `ContextRetrievalRequest`, `ContextRetrievalResult`) and validators in `@intentloom/protocol`. Added read-only `getBoundedProjectContext` operation in `@intentloom/application` enforcing secret path exclusion (`.env`, credentials, private keys, `.git`), item & token budget clamping, and trust classification. Added CLI command routing for `intentloom context get` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-m1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly.
- **Decisions:** `getBoundedProjectContext` is byte-for-byte read-only. Excluded files and secret paths can NEVER enter returned context.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/memory-security-m1`, observe CI, merge after approval, and proceed to Candidate M2 (Accepted Persistent Memory).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L8 profile isolation and role-aware delegation

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l8`
- **Objective:** Implement profile definition and delegation schemas (`DelegatedAgentRole`, `AgentRoleCapabilities`, `ProfileDefinition`, `DelegationRequest`, `DelegationResult`), application operations (`createProfile`, `getProfile`, `listProfiles`, `delegateTaskRole`), strict capability scoping, read-only enforcement for context-scout and reviewer roles, CLI command routing (`intentloom profile`, `intentloom delegate`), and test coverage.
- **Completed:** Implemented versioned `DelegatedAgentRole`, `AgentRoleCapabilities`, `ProfileDefinition`, `DelegationRequest`, `DelegationResult` schemas and validators in `@intentloom/protocol`. Added profile and delegation operations (`createProfile`, `getProfile`, `listProfiles`, `delegateTaskRole`) in `@intentloom/application` enforcing profile isolation, subagent capability clamping, and read-only constraints for `context-scout` and `reviewer` roles. Added CLI routing for `intentloom profile <create|get|list>` and `intentloom delegate` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l8.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l8.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (651 tests passed across 64 test files).
- **Decisions:** Cross-profile and cross-project retrieval is denied by default. Delegated roles (`context-scout`, `reviewer`) cannot mutate project state or widen their own capability grants.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l8`, observe CI, merge after approval, completing all candidates in the Controlled Agent Learning Roadmap!
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L7 optional semantic ranking

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l7`
- **Objective:** Implement provider-neutral semantic ranking contract (`SemanticRankingProvider`, `SemanticRankingConfig`, `SemanticRankItem`, `SemanticRankResult`), application memory ranking operations (`rankProceduralMemory`, `getSemanticRankingConfig`, `updateSemanticRankingConfig`), preservation of canonical records, privacy exclusions, CLI command routing (`intentloom rank`), and test coverage.
- **Completed:** Implemented versioned `SemanticRankingProvider`, `SemanticRankingConfig`, `SemanticRankItem`, `SemanticRankResult` schemas and validators in `@intentloom/protocol`. Added memory ranking operations (`rankProceduralMemory`, `getSemanticRankingConfig`, `updateSemanticRankingConfig`) in `@intentloom/application` enforcing canonical record preservation, deterministic baseline keyword ranking, and secret path filtering. Added CLI routing for `intentloom rank [QUERY|config]` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l7.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l7.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (646 tests passed across 63 test files).
- **Decisions:** Removing or rebuilding the semantic ranking index does NOT remove canonical memory records. Deterministic keyword and structural retrieval remain available as the default baseline.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l7`, observe CI, merge after approval, and prepare Candidate L8 (Profile Isolation and Role-Aware Delegation).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L6 pause, redirect, checkpoint, and resume

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l6`
- **Objective:** Implement checkpoint schemas (`TaskCheckpoint`, `TaskCheckpointState`, `TaskRedirectRequest`, `TaskResumeResult`), application memory operations (`createTaskCheckpoint`, `pauseTask`, `cancelTask`, `redirectTask`, `resumeTask`, `listTaskCheckpoints`, `deleteTaskCheckpoint`, `exportTaskCheckpoint`), byte-for-byte file preservation on pause/cancel, plan invalidation on redirect, state verification on resume, CLI command routing (`intentloom checkpoint`), and test coverage.
- **Completed:** Implemented versioned `TaskCheckpointState`, `TaskCheckpoint`, `TaskRedirectRequest`, `TaskResumeResult` schemas and validators in `@intentloom/protocol`. Added checkpoint operations (`createTaskCheckpoint`, `pauseTask`, `cancelTask`, `redirectTask`, `resumeTask`, `listTaskCheckpoints`, `deleteTaskCheckpoint`) in `@intentloom/application` enforcing byte-for-byte file safety on pause/cancel, plan invalidation on redirect, and root/state verification on resume. Added CLI routing for `intentloom checkpoint <create|pause|cancel|redirect|resume|list|delete>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l6.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l6.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (641 tests passed across 62 test files).
- **Decisions:** Pause and cancellation leave project files byte-for-byte unchanged unless an already approved transaction completed atomically. Redirect invalidates every stale digest or approval affected by the new intent.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l6`, observe CI, merge after approval, and prepare Candidate L7 (Optional Semantic Ranking).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L5 accepted procedural memory operations

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l5`
- **Objective:** Implement procedural memory summary (`listProceduralMemorySummary`), inspection (`inspectProceduralMemory`), extension lock validation (`validateSkillExtensionLock`), prepared-plan transaction boundary (`prepareSkillMutationPlan`, `applySkillMutationPlan`), doctor skill validation integration, CLI command routing (`intentloom memory inspect`, `intentloom proposal plan`, `intentloom proposal apply`), and test coverage.
- **Completed:** Implemented versioned `ProceduralMemorySummary`, `ProceduralMemoryInspection`, `SkillMutationPlan` schemas and validators in `@intentloom/protocol`. Added memory operations (`listProceduralMemorySummary`, `inspectProceduralMemory`, `validateSkillExtensionLock`, `prepareSkillMutationPlan`, `applySkillMutationPlan`) in `@intentloom/application` enforcing prepared-plan dry-run transactions and atomic apply with rollback logging. Added CLI routing for `intentloom memory inspect` and `intentloom proposal plan / apply` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l5.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l5.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (636 tests passed across 61 test files).
- **Decisions:** Skill mutations (approval, activation, deprecation, rollback) execute strictly through the prepared-plan transaction boundary to guarantee atomic application and rollback.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l5`, observe CI, merge after approval, and prepare Candidate L6 (Pause, Redirect, Checkpoint, and Resume).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L4 skill evaluation and regression gates

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l4`
- **Objective:** Implement evaluation schemas (`EvaluationCase`, `EvaluationOutcome`, `SkillEvaluationResult`), regression classification (`improved`, `regressed`, `ambiguous`, `unsupported`, `unsafe`, `passed`), evaluation runner (`evaluateSkillProposal`), regression gates blocking proposal activation on failed or unsafe evaluation, CLI command routing (`intentloom evaluate`), and test coverage.
- **Completed:** Implemented versioned `SkillEvaluationResult` and `EvaluationCase` schemas in `@intentloom/protocol`. Added evaluation operations (`evaluateSkillProposal`, `listSkillEvaluations`, `getSkillEvaluation`) in `@intentloom/application` with prompt injection security analysis and outcome classification (`improved`, `regressed`, `ambiguous`, `unsupported`, `unsafe`, `passed`). Enforced strict regression gate in `updateSkillProposalState` blocking proposal activation if evaluations fail, regress, or are missing. Added CLI routing for `intentloom evaluate <run|list>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (632 tests passed across 60 test files).
- **Decisions:** Proposal activation is strictly blocked if required evaluations fail, regress, or lack security verification.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l4`, observe CI, merge after approval, and prepare Candidate L5 (Accepted Procedural Memory Operations).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L3 skill proposal lifecycle

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l3`
- **Objective:** Implement skill proposal lifecycle schemas (`proposed`, `under-review`, `approved`, `rejected`, `active`, `deprecated`, `archived`, `superseded`, `rolled-back`), local `.aif/memory/proposals/` storage, application operations (`createSkillProposal`, `listSkillProposals`, `getSkillProposal`, `updateSkillProposalState`, `rollbackSkill`), CLI command routing (`intentloom proposal`), and test coverage.
- **Completed:** Implemented versioned `SkillProposal` schemas and validators in `@intentloom/protocol`. Added proposal operations (`createSkillProposal`, `listSkillProposals`, `getSkillProposal`, `updateSkillProposalState`, `rollbackSkill`) in `@intentloom/application` enforcing local `.aif/memory/proposals/` storage and mandatory approval evidence for activation. Added CLI routing for `intentloom proposal <list|get|create|approve>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l3.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l3.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (627 tests passed across 59 test files).
- **Decisions:** Automatic skill activation is strictly prohibited. Every accepted proposal requires explicit approval evidence. Rejection and deletion do not modify project-owned files.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l3`, observe CI, merge after approval, and prepare Candidate L4 (Skill Evaluation & Regression Gates).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Controlled Agent Learning Candidate L2 progressive skill discovery

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l2`
- **Objective:** Implement 3 progressive skill loading levels (catalog metadata, execution contract, full procedure), context cost budget accounting, pack and role metadata filtering, discovery decision logs, application operations (`discoverSkills`, `getSkillAtLevel`), CLI routing (`intentloom skill discover`), and test coverage.
- **Completed:** Implemented 3 progressive loading levels (`catalog`, `contract`, `procedure`), context cost calculation, pack/role filtering, decision logs in `@intentloom/protocol` and `@intentloom/application`. Added CLI routing for `intentloom skill discover` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l2.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l2.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (622 tests passed across 58 test files).
- **Decisions:** Skills support 3 loading levels (`catalog`, `contract`, `procedure`) to enable progressive discovery and measurable context budget savings without eagerly injecting full procedures into agent context.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l2`, observe CI, merge after approval, and prepare Candidate L3 (Skill Proposal Lifecycle).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Controlled Agent Learning Candidate L1 structured task and session summaries

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l1`
- **Objective:** Implement versioned schemas for task and session summaries, local `.aif/memory/` storage, path redaction for secret files (`secretLikePath`), application operations (`recordTaskSummary`, `listTaskSummaries`, `getTaskSummary`), CLI routing, and unit/integration test coverage.
- **Completed:** Implemented versioned `TaskSummary` and `SessionSummary` schemas and validators in `@intentloom/protocol`. Added `recordTaskSummary`, `listTaskSummaries`, `getTaskSummary`, `recordSessionSummary`, and `listSessionSummaries` in `@intentloom/application` with secret path redaction (`secretLikePath`). Added CLI command routing for `intentloom summary <list|get|record>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/application/package.json`, `packages/application/tsconfig.json`, `packages/cli/src/command.ts`, `vitest.config.ts`, `tests/controlled-learning-l1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (614 tests passed).
- **Decisions:** Task and session summaries store structured execution metadata (intent, plan ref, affected paths, validation outcome, evidence, used skills, unresolved work, trust class, retention state) locally in `.aif/memory/` without storing raw chat transcripts or secret file paths.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l1`, observe CI, merge after approval, and prepare Candidate L2 (Progressive Skill Discovery).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 6 provider synchronization (`intentloom sync` / `intentloom diff`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-provider-sync`
- **Objective:** Implement provider-specific instruction derivative generation, drift detection, local section preservation, pre-synchronization diffing (`intentloom diff` / `intentloom sync`), and test coverage.
- **Completed:** Verified provider instruction derivative generation across all supported adapters (`claude`, `codex`, `cursor`, `copilot`), ensured `buildTransactionMetadata` safety against missing pins, implemented CLI integration tests in `tests/cli-provider-sync.test.ts` verifying drift detection, local section preservation, diff proposals, and dry-run safety. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `tests/cli-provider-sync.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Canonical policy remains the single source of truth; provider derivative files can be regenerated without losing documented user-owned local extensions.
- **Risks or compatibility impact:** None. Completes the 6-phase Portable Adoption & Migration roadmap.
- **Next first action:** Open PR for `feat/intentloom-provider-sync`, observe CI, merge after approval.
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 5 conformance and security profiles (`intentloom conformance`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-conformance-profiles`
- **Objective:** Implement project stack profile detection (Nx, SQLite, sensitive security profiles), evidence-linked conformance evaluation, CLI routing, and test coverage.
- **Completed:** Expanded `detectProjectProfiles` in `@intentloom/application` to detect Nx monorepo (`nx`), SQLite database (`sqlite`), and sensitive security profiles (`security-sensitive`). Updated `intentloom conformance` CLI handler in `@intentloom/cli` to use `fileSystem.read` for memory filesystem compatibility. Added unit/integration test suite in `tests/cli-conformance-profiles.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-conformance-profiles.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stack detection automatically identifies Nx, SQLite, and sensitive security paths (stealth, credentials, secrets) to enforce evidence-linked deterministic conformance rules.
- **Risks or compatibility impact:** None. Backwards compatible profile expansion.
- **Next first action:** Open PR for `feat/intentloom-conformance-profiles`, observe CI, merge after approval, and prepare Phase 6 (Provider Synchronization).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 4 pack update and three-way migration (`intentloom update --plan` / `--apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-pack-update`
- **Objective:** Implement pack update planning operation `planPackUpdate`, 3-way migration comparison algorithm, CLI routing for `intentloom update --plan` and `intentloom update --apply`, and test coverage.
- **Completed:** Added `planPackUpdate` application operation in `@intentloom/application` to evaluate 3-way diffs between base pack version, project state, and target pack version. Implemented CLI routing for `intentloom update --plan` and `intentloom update --apply` supporting `--json`, `--output`, `--strict`, and `--dry-run` flags, and added unit/integration test suite in `tests/cli-pack-update.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-pack-update.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** 3-way comparison guarantees local customizations are preserved and conflicts are explicitly flagged instead of silently overwritten upon pack version upgrade. Update plans execute transactionally via `applyProjectAdoption`.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-pack-update`, observe CI, merge after approval, and prepare Phase 5 (Conformance and Security Profiles).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 3 transactional apply and rollback (`intentloom adopt --apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-apply`
- **Objective:** Implement transactional adoption execution (`intentloom adopt --apply <plan>`), expectedCurrentHash stale content guards, migration journal recording, atomic failure rollback, and test coverage.
- **Completed:** Added `applyProjectAdoption` application operation in `@intentloom/application` to validate plan envelopes, verify `expectedCurrentHash` invariants, create pre-apply file backups, execute approved operations, and append `.aif/migration-journal.json` entries. Implemented CLI routing for `intentloom adopt --apply` with `--json` and `--dry-run` flags, exit code 3 mapping for stale hash or invalid plan errors, exit code 4 for rollback recovery, and full unit/integration test suite in `tests/cli-adopt-apply.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-apply.test.ts`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stale hash mismatches immediately abort execution with exit code 3 before modifying any files. Rollback automatically restores original pre-apply file contents and removes newly created files. `.aif/migration-journal.json` records transaction history.
- **Risks or compatibility impact:** None. Backwards compatible transactional apply addition.
- **Next first action:** Open PR for `feat/intentloom-adopt-apply`, observe CI, merge after approval, and prepare Phase 4 (Pack Update & 3-Way Migration).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 2 interactive proposal (`intentloom adopt --plan`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-plan`
- **Objective:** Implement interactive adoption proposal scanning operation and `intentloom adopt --plan` CLI command.
- **Completed:** Added `planProjectAdoption` application operation in `@intentloom/application` to scan project artifacts, compute hashes, detect governance role candidates, and invoke deterministic governance adoption planner. Implemented CLI routing for `intentloom adopt --plan` supporting `--json`, `--output`, and `--strict` flags, human-readable Markdown adoption plan formatter `formatGovernanceAdoptionPlan`, and full unit/integration test suite. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-plan.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** `adopt --plan` remains strictly read-only. It scans project files without writing or deleting any target project files. `--strict` returns exit code 3 on ambiguous/conflicting findings or when automatic apply is disallowed.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-adopt-plan`, observe CI, merge after approval, and prepare Phase 3 (Transactional Apply & Rollback).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 1 contracts

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/portable-adoption-contracts`
- **Pull request:** #53
- **Objective:** Implement versioned portable-adoption contracts, deterministic
  planning primitives, runtime validation, `@intentloom/core/adoption` exports, and a synthetic Applye fixture.
- **Completed:** Added governance roles, ownership classes, findings, operations,
  validations, exceptions, migration journal, and adoption plan types. Added
  stable serialization, deterministic identifiers, a deterministic read-only
  governance planner, plan-envelope validation, path-sort fix, vitest/tsconfig aliases, an Applye fixture, and tests.
- **Files changed:** `packages/core/src/adoption.ts`, `packages/core/package.json`, `tests/adoption-contracts.test.ts`, `tests/fixtures/adoption/applye.json`, `tsconfig.base.json`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** All 589 tests across 51 test suites passed. Compatibility CI run #30127658406 passed on Node 22/24 on Ubuntu, macOS, and Windows. Merged into `main`.
- **Decisions:** Phase 1 remains deterministic and read-only. `@intentloom/core/adoption` subpath export established.
- **Risks or compatibility impact:** None. Fully backwards compatible read-only contracts.
- **Open issues or blockers:** None. Phase 1 complete.
- **Next first action:** Begin Portable Adoption Phase 2: interactive adoption proposal and `intentloom adopt --plan` CLI command.
- **Evidence:** merged PR #53 commit `f2cf5d6` and GitHub Actions run #30127658406.

### 2026-07-24, Portable Duty Watch adoption and migration contract

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `feat/portable-duty-watch-adoption`
- **Pull request:** #52
- **Objective:** Define how Intentloom safely adopts and updates mature existing
  projects, using Applye as the first reference consumer.
- **Completed:** Defined the analysis-first adoption lifecycle, canonical role
  mapping, duplicate classification, proposal and approval model, transactional
  apply, three-way pack updates, rollback, conformance, security profiles,
  provider synchronization, portable Duty Watch pack contract, and Applye
  reference fixture expectations.
- **Files changed:** `docs/concepts/PORTABLE_DUTY_WATCH_ADOPTION.md`,
  `docs/roadmap/PORTABLE_ADOPTION_AND_MIGRATION_PLAN.md`,
  `catalog/packs/duty-watch/README.md`,
  `docs/fixtures/APPLYE_DUTY_WATCH_ADOPTION.md`, and `DUTY_WATCH.md`.
- **Validation:** Compatibility CI passed before final merge preparation. The
  branch was rebuilt directly on current `main` to remove stacked-branch merge
  conflicts without changing the approved documentation scope.
- **Decisions:** Adoption uses canonical roles rather than fixed filenames.
  Existing project-owned files are mapped and preserved. Pack updates use a
  three-way comparison between the old pack, current project, and new pack.
  Ambiguous, destructive, executable, privacy, and security changes require
  explicit approval.
- **Risks or compatibility impact:** This watch defines contracts only. It does
  not claim the planner, pack runtime, transactional migration, conformance
  engine, or security automation are already implemented.
- **Open issues or blockers:** Phase 1 runtime schemas, planner code, fixtures,
  and tests remain unimplemented.
- **Next first action:** Implement the adoption-plan and ownership schemas plus
  deterministic Applye fixture tests.
- **Evidence:** merged PR #51, PR #52, branch history, and CI results.

### 2026-07-24, Duty Watch governance foundation

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `docs/duty-watch-agent-handoff`
- **Pull request:** #51
- **Objective:** Create a default project context and handoff system for Claude
  Code, Codex, Antigravity, and other repository agents.
- **Completed:** Added the mandatory entrypoint, durable project state, Duty
  Watch log, governance documents, templates, and repository agent rules.
- **Files changed:** `AGENT_START_HERE.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`,
  governance and template files, and `AGENTS.md`.
- **Validation:** Required compatibility checks passed before merge.
- **Decisions:** The handoff system is named Duty Watch. `PROJECT_STATE.md`
  stores durable state, while `DUTY_WATCH.md` stores chronological handoffs.
  Documentation updates are part of Definition of Done.
- **Open issues:** Portable adoption and migration remained follow-up work.
- **Next action:** Define portable Duty Watch adoption for existing projects.
- **Evidence:** merged PR #51 and repository history.
