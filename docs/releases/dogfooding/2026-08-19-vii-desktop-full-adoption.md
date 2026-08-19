# Intentloom dogfooding record: Vii Desktop full existing-project adoption

**Date:** 2026-08-19
**Scenario:** Desktop existing-project adoption completion gate against a
real Vii-derived consumer
**Consumer repository source:** [kas-labs/vii](https://github.com/kas-labs/vii)
**Conclusion:** Pass with follow-up (not complete)

This record is documentation only. It does not change Intentloom runtime. It
does not modify the maintainer Vii checkout. It does not authorize a release,
a Vii pull request, or crash-safe recovery claims.

Related records:

- [2026-08-17-vii-nx-existing-project.md](2026-08-17-vii-nx-existing-project.md)
- [2026-08-18-vii-first-development-cycle.md](2026-08-18-vii-first-development-cycle.md)

## Evidence classes

| Class                                                                   | Used                                       |
| ----------------------------------------------------------------------- | ------------------------------------------ |
| Automated test evidence (#337–#345, including Apply rollback suites)    | yes, prior merged PRs                      |
| Authenticated daemon JSON-RPC using Desktop client request constructors | yes, this watch                            |
| Packaged Desktop / native window click-through                          | **no** (blocked in this session)           |
| Real Vii-derived disposable consumer                                    | yes                                        |
| Synthetic fixture                                                       | not used as the apply target               |
| CLI inspect/doctor/diff                                                 | diagnostics and post-apply comparison only |

## Identity

- **Intentloom SHA tested:** `0385e6324e2a37f760bdb7661b226b96e2a7e569` (`#345` on `main`)
- **Vii pre-adoption SHA:** `93e072c043a9d8718843d28901e5f9fd537bedf1` (parent of `2b67e92` `chore: adopt Intentloom engineering guidance`)
- **Disposable consumer:** local `git clone --no-hardlinks` of the maintainer Vii checkout, detached at the pre-adoption SHA
- **Preferred disposable path:** `intentloom-dogfood/vii-desktop-adoption`
- **Stale-plan second copy:** `intentloom-dogfood/vii-desktop-adoption-stale`
- **node_modules:** not copied, not installed
- **Desktop/daemon build:** debug `intentloom-desktop` plus `packages/daemon/dist/intentloomd.cjs` (same debug launch_spec Desktop uses: `node` + dist daemon, `--endpoint`, `--token-file`, `--catalog-root`)
- **Packaged SEA sidecar:** not used

## Consumer safety (source Vii checkout)

This watch did not run Git writes in the maintainer Vii working tree. That
checkout’s branch/HEAD moved during the session from other local work
(`3f50345` → `af40b0d` → `a54e1b0` observed). `git status --short` stayed
empty whenever sampled. Disposable clones used `--no-hardlinks` and a
detached pre-adoption commit.

## Baseline (disposable, pre-adoption)

- HEAD `93e072c`; clean tree
- `.aif` absent; `.agents` absent
- `AGENTS.md` SHA-256 `09ab5933d221cb2a34ec3a3d460561bc0afeab94192f7bfbd79b754b7fb5a8c6`
- `.github` workflows/templates present and later compared byte-for-byte
- CLI `inspect`: profile `typescript`, topology `nx`, readiness `not-initialized`, `.nx/cache` excluded, instruction path `AGENTS.md`
- CLI `doctor`/`diff`: missing `.aif` metadata; `AGENTS.md` conflict (existing destination has no Intentloom ownership record)

## Product path actually executed

Desktop was launched (`tauri` debug binary + Vite `127.0.0.1:1420`). This
agent session could not operate the window: System Events assistive access
was denied, and screen capture from the agent environment failed.

The mutating dogfood therefore used the **same authenticated daemon
transport Desktop uses** (`{ token, request }` on the Unix socket) and the
**same protocol constructors / request ids** as `apps/desktop/src/desktop-client-adoption-*.ts`:

`desktop-existing-project-adoption-plan` → decisions → prepare → revalidate →
approve → apply.

That is not a substitute for a packaged Desktop click-through. It is daemon +
protocol + application + canonical `adoptProject` evidence.

## Preview

- `previewIdentity` prefix `9ee20fbfc0b5…`
- profile `typescript`, topology `nx`, detected adapters `codex`, `cursor`
- 253 plan items on the first run; `.nx/cache` items: 0
- `.github/**` classified `project-owned` / `skip` (not instruction roots)
- `AGENTS.md` required decision `keep-project-owned`
- Tree unchanged after preview (`git status` empty)

## Decisions

- `keep-project-owned` on `AGENTS.md` → `valid`
- `decisionsPrepared: 1`, `changesApplied: 0`
- Tree still unchanged

## Prepared plan

- `preparedPlanId` prefix `prepared-plan-529379e9…`
- `planDigest` prefix `16d146c4347e…`
- `projectFingerprint` prefix `dd0e234b0c91…`
- `affectedPathCount: 253`
- `approved: false`, `applied: false`, `changesApplied: 0`
- expiry ~15 minutes
- Tree still unchanged

Creates in the existing-project plan (not CLI unmapped `adopt --dry-run`):

- `.aif/config.yaml`, `.aif/local.example.yaml`, `.aif/manifest.lock.json`, `.aif/source-map.json`
- generated-candidate Cursor rules: `.cursor/rules/intentloom-core.mdc`, `.cursor/rules/intentloom-typescript.mdc`

CLI `adopt --dry-run` on the same pre-adoption tree additionally listed 21
Codex `.agents/skills/aif-*` generated-candidates. Those paths were **absent**
from `intentloom.existing-project.adoption.plan.v1` once `AGENTS.md` is the
project-owned mapping. Recorded as a parity observation, not applied.

## Revalidate / Approve

- Revalidate `valid`, `changesApplied: 0`
- Approve `approved: true`, `applied: false`, `changesApplied: 0`
- approval id prefix `adoption-approval-7a74aacb…`
- Tree still unchanged until Apply

## Apply / transaction

- `status: applied`, `ready: true`
- `changesApplied: 4`
- applied paths: `.aif/config.yaml`, `.aif/local.example.yaml`, `.cursor/rules/intentloom-core.mdc`, `.cursor/rules/intentloom-typescript.mdc`
- lock/source-map also appeared under `.aif/` as generated metadata
- `elapsedMs: 161` (under the Desktop native 5s socket read timeout)
- rollback not triggered; `rollbackFailures: []`
- Apply-result Doctor `errorCount: 0`; unmanaged Diff drift `[]`; inspection readiness `ready`

## Project-owned preservation (disposable after Apply)

Unchanged vs baseline checksums:

- `AGENTS.md`
- `.github/workflows/**`
- `.github/ISSUE_TEMPLATE/**`
- `.github/PULL_REQUEST_TEMPLATE.md`

Unrelated Vii source not in the apply path. `.nx/cache` not adopted.
Git status after Apply: untracked `.aif/` and `.cursor/` only.

## Post-Apply CLI doctor / diff (diagnostic)

CLI `doctor` on the same tree reported blocking findings
(`adapter-output-stale` on the new Cursor rules;
`schema-constraint-failed` on empty `sourceHashes` / empty source-map
`sources`). CLI `diff --json` returned `artifact-validation-failed`.

This disagrees with Apply’s internal health (`ready: true`). Residual: Apply
Ready is not the same as a subsequent CLI doctor/diff on this generated lock
shape.

## Idempotency

Second Apply of the same approved plan: `already-applied`, `ready: true`,
`changesApplied: 0`, no extra paths.

## Stale approved plan (second disposable copy)

Preview → decisions → prepare → revalidate → approve, then append a marker
line to `AGENTS.md`, then Apply:

- `status: denied`
- reasons `stale-fingerprint`, `stale-digest`
- `changesApplied: 0`
- `.aif` not created
- manual `AGENTS.md` edit preserved
- `git status`: `M AGENTS.md` only

## Rollback

Not manually dogfooded (no supported non-destructive fault injector used).
#345 automated rollback tests remain the evidence. Marked **test-evidenced**.

## Desktop UX

Not observed in the native window this session. Code inspection of the
preview/prepare/approve/apply panels: Preview copy is read-only; Prepare /
Approve / Apply are separate controls; Apply uses a mutating danger button
and warning “This will modify files in the selected project.”

Known Desktop gaps not fixed here:

- Inspect daemon result is identity-only (`projectId` / `root`).
- Desktop Doctor/Diff client still sends `profile: generic`, `adapters: []`.
- Native folder picker cannot be automated without assistive access.

## Findings

| ID  | Step                          | Expected                   | Actual                                                                                         | Severity                     | Repro                        | Layer | Smallest safe fix                                                        |
| --- | ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- | ----- | ------------------------------------------------------------------------ |
| 1   | Native Desktop click-through  | Select Vii copy in Desktop | Window launched; agent could not click (no assistive access / no display capture)              | high for the completion gate | environment                  | G     | Maintainer GUI walkthrough                                               |
| 2   | Packaged Desktop              | SEA sidecar, no extra CLI  | Debug daemon used                                                                              | medium                       | always in this watch         | G     | Packaged `pnpm --filter @intentloom/desktop package` dogfood             |
| 3   | Post-Apply CLI doctor/diff    | Healthy / clean            | Schema/stale errors vs Apply `ready`                                                           | medium                       | this Vii tree + Cursor rules | A     | Investigate lock `sourceHashes` / Cursor stale vs Apply health           |
| 4   | Plan vs CLI `adopt --dry-run` | Same generated-candidates  | CLI lists 21 Codex skills; existing-project plan does not, with `keep-project-owned` AGENTS.md | low                          | this tree                    | A / F | Confirm whether omitting Codex skills is intended when AGENTS.md is kept |
| 5   | Desktop Doctor view           | Project profile            | Hardcoded generic                                                                              | low                          | code                         | D     | Pass inspect profile/adapters into `createDoctorRequest` (follow-up PR)  |

No crash-journal requirement, path escape, or cross-plan Apply was observed
on the daemon path.

## Completion gate

- [x] inspect correct (CLI + adoption plan; not Desktop Inspect richness)
- [x] preview correct on daemon path
- [x] decisions correct
- [x] no write before Apply
- [x] prepared plan valid
- [x] explicit approval works
- [x] explicit Apply required
- [x] intended generated state for this plan written (`.aif` + Cursor rules)
- [x] project-owned files preserved
- [x] Apply-result Doctor healthy / Diff unmanaged-drift empty / Ready
- [ ] CLI doctor/diff post-Apply healthy
- [x] repeat/idempotent behavior correct
- [x] stale approved plan denied with zero writes
- [x] original Vii checkout not mutated by this watch
- [x] no security boundary bypass observed on the daemon path
- [ ] real existing project selected through Desktop UI
- [ ] packaged Desktop flow
- [x] residual risks documented

**Decision: NOT COMPLETE: FOLLOW-UP REQUIRED**

Smallest next step: maintainer-operated packaged Desktop click-through of
this same pre-adoption disposable recipe. Smallest code PR if GUI is healthy
and CLI doctor still fails: investigate Apply Ready vs CLI
`schema-constraint-failed` / `adapter-output-stale`. Do not start an unrelated
feature.

## Residual risks

- External-editor TOCTOU during the write loop (documented, not closed)
- Crash-torn tree without a journal (documented, not closed)
- Desktop 5s native socket read timeout (not hit; Apply was 161ms)
- Apply Ready vs CLI doctor/diff disagreement
- Codex `.agents/skills` not in the existing-project plan for this mapping
