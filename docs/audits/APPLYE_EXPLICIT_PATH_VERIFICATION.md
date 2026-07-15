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
