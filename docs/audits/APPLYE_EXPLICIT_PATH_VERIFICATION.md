# Applye Explicit-Path Verification

Audit date: 2026-07-15. AIF commit: `2213e06` at audit start. Packed CLI
version: `0.1.0-alpha.0`. Target: a local Applye Git checkout, identified by
repository metadata only; its local path, remote, and file contents are not
recorded here.

## Scope and safety boundary

This audit was read-only against Applye. It used an external temporary evidence
directory and an externally installed `aif-core` tarball. No Applye scripts,
dependencies, formatting, AIF write-mode command, or adoption apply mode ran.
Raw diagnostics and safe hashes were retained only outside both repositories.

Initial target state was `main` at `b08488053e63e21edc61698b7e59324869678b4b`,
with 522 tracked files, 18 pre-existing modified files, two pre-existing
untracked entries, no `.aif` directory, no AIF transaction artifacts, no
symlinks in the bounded inventory, and 12 existing instruction files. Existing
instructions were never read, changed, or claimed as AIF-owned.

## Packed CLI and invocation result

The CLI was built, packed as `aif-core@0.1.0-alpha.0`, installed with scripts
disabled in an isolated temporary runner, and checked with `--help` and
`--version`. The original positional command form required by this audit was
then run from two unrelated external working directories with an absolute target
path:

| Command form               | Runs | Exit result | Result                   |
| -------------------------- | ---: | ----------- | ------------------------ |
| `adopt <target> --dry-run` |    2 | 2           | positional path rejected |
| `doctor <target>`          |    2 | 2           | positional path rejected |
| `diff <target>`            |    1 | 2           | positional path rejected |
| `sync <target> --dry-run`  |    2 | 2           | positional path rejected |

Neither runner changed. Because the CLI rejected the required positional path,
it did not produce an Applye adoption proposal, profile classification, adapter
proposal, documentation mapping, doctor diagnostic set, diff classification, or
sync dry-run plan for this audit.

## Halt condition and immutability result

After the rejected invocations, the target Git status and untracked inventory
diverged from the pre-command baseline: the pre-existing modified/untracked set
was no longer present and a different tracked modification was observed. The
target commit was unchanged; `.aif` and AIF transaction artifacts remained
absent, and both external runners remained unchanged.

The audit cannot safely attribute that concurrent state change to AIF, but it
also cannot prove byte-for-byte immutability. In accordance with the read-only
verification protocol, no further AIF command was run against Applye and no
attempt was made to restore, stage, clean, reset, or otherwise alter Applye.

## AIF correction and regression coverage

The rejected positional-path form exposed a CLI-contract defect. AIF now accepts
one explicit positional project path for `adopt`, `doctor`, `diff`, and `sync`,
while retaining `--root PATH`. A synthetic memory-filesystem test covers all
four commands and asserts that they do not write. This correction was not
retested against Applye because its baseline was no longer stable.

Verification after the correction passed: targeted regression tests, full suite
(522 passed, 2 Windows command-shim tests skipped locally), lint/typecheck,
formatting check, build, packed CLI tests, `npm pack --dry-run`, and `git diff
--check`.

## Verdict

| Area                                 | Verdict                | Reason                                                                            |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------- |
| Applye immutability                  | **NOT VERIFIED**       | target state diverged during the halted sequence                                  |
| Explicit-path behavior               | **PARTIALLY RESOLVED** | synthetic positional-path regression passes; real verification is pending         |
| Applye adoption dry-run              | **PARTIALLY SAFE**     | no completed real-target proposal after the halt                                  |
| Applye doctor                        | **PARTIALLY VALID**    | no completed real-target diagnostic run after the halt                            |
| Applye sync dry-run                  | **PARTIALLY SAFE**     | no completed real-target plan after the halt                                      |
| Overall explicit-path Applye blocker | **NOT RESOLVED**       | a clean, stable target baseline is required before repeating the packed-CLI audit |

No Applye path is committed. No Applye files were deliberately changed by this
audit, and no Applye-specific fixture content was copied into AIF.

## Rerun: baseline stability gate

Rerun date: 2026-07-15. AIF revision: `45de959`. Before building or invoking
the packed CLI, two external, read-only snapshots captured Git branch and HEAD,
porcelain-v2 status, index fingerprint, tracked working-tree hashes, untracked
entries, bounded directory inventory, relevant ignored AIF/agent destinations,
documentation candidates, symlinks, and transaction-artifact paths.

The snapshots were **not identical**: the target advanced from commit
`feba87ba88ecae85dd9b28f1f92402fc687331c2` to
`dd6d896e5960cec5bd4f59f77fad2e78aa338d08` during the stability gate. Its
branch remained `fix/cv-section-line-toggle`. Baseline A was dirty with eight
tracked status entries; baseline B was clean. `.aif` was absent in both bounded
snapshots. The status entries that changed were:

- `apps/desktop/src/app/pages/documents/cv-content.util.ts`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-detail.component.ts`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-live-style-panel/cv-live-style-panel.component.html`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-live-style-panel/cv-live-style-panel.component.ts`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-preview/cv-preview.component.scss`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-preview/cv-preview.component.spec.ts`
- `apps/desktop/src/app/pages/documents/cv-detail/cv-preview/cv-preview.component.ts`
- `libs/core/src/lib/models/document.model.ts`

No AIF command or runner was created with Applye as its target after that gate
failed.

Read-only process inspection found active Applye-related development processes,
including an Nx daemon, `npm run desktop:dev`, Tauri development, Nx serving,
esbuild, and the desktop process. These are plausible external writers but are
not proof of the specific Git-state change. No process was stopped or modified.

After the gate stopped, AIF-only verification passed without referencing Applye:
the targeted positional-path regression tests, build, formatting and diff
checks, and a fresh external packed-CLI smoke installation. The packed CLI
reported `0.1.0-alpha.0`, included `PROJECT_PATH` in help, and its tarball
contained 67 files. This documentation-only rerun did not execute the full
suite; the current AIF regression evidence remains 522 passed with two
Windows-only command-shim tests skipped locally.

### Rerun verdict

| Area                                 | Verdict                | Reason                                                                     |
| ------------------------------------ | ---------------------- | -------------------------------------------------------------------------- |
| Baseline stability                   | **UNSTABLE**           | target HEAD and status changed between snapshots                           |
| Applye immutability                  | **NOT VERIFIED**       | no stable baseline exists to compare against                               |
| Positional explicit-path behavior    | **PARTIALLY RESOLVED** | synthetic and packed tests pass; no new real-target invocation was allowed |
| Adopt dry-run                        | **NOT EXECUTED**       | baseline gate blocked all AIF commands                                     |
| Doctor                               | **NOT EXECUTED**       | baseline gate blocked all AIF commands                                     |
| Diff                                 | **NOT EXECUTED**       | baseline gate blocked all AIF commands                                     |
| Sync dry-run                         | **NOT EXECUTED**       | baseline gate blocked all AIF commands                                     |
| Overall explicit-path Applye blocker | **NOT RESOLVED**       | retry only after external writers are paused and two snapshots match       |

## Final rerun: writer gate

Final rerun date: 2026-07-15. A read-only process inspection ran before any
packed-CLI build, snapshot, or Applye-facing command. An Applye Nx process was
still active (PID `97676`), so the writer gate failed. A separate code-indexer
process associated with the target was observed (PID `93056`) but was not
treated as a writer.

No AIF command, package build, tarball installation, snapshot, or filesystem
operation targeted Applye in this rerun. No process was stopped or modified.

| Area                                 | Verdict                | Reason                                                       |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| Baseline stability                   | **NOT CAPTURED**       | active Nx process blocked snapshot capture                   |
| Applye immutability                  | **NOT VERIFIED**       | no accepted baseline and no command sequence                 |
| Positional explicit-path behavior    | **PARTIALLY RESOLVED** | prior synthetic and packed evidence remains valid            |
| Adopt dry-run                        | **NOT EXECUTED**       | writer gate failed                                           |
| Doctor                               | **NOT EXECUTED**       | writer gate failed                                           |
| Diff                                 | **NOT EXECUTED**       | writer gate failed                                           |
| Sync dry-run                         | **NOT EXECUTED**       | writer gate failed                                           |
| Overall explicit-path Applye blocker | **NOT RESOLVED**       | pause the active Nx process, then restart at the writer gate |

### Repeated writer-gate check

The repeated final-verification request re-ran the writer gate on 2026-07-15.
**Writer-gate verdict: FAIL** — the Applye Nx process remained active (PID
`97676`). The target-associated code-indexer remained separately classified as
read-only. In accordance with the gate, no AIF build, package, snapshot, or
Applye-facing command ran; baseline stability remains not captured and all four
commands remain not executed.
