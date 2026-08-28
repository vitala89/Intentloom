# CLI `command.ts` decomposition plan

## Status

`packages/cli/src/command.ts` is legacy debt at ~3300+ lines (hard limit 400).
Existing oversized files must not grow. New CLI families ship as dedicated
`*-command.ts` modules with early dispatch (same pattern as `harness`).

## Done

| Slice                       | Module                                                                                                       | Notes                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Harness                     | `harness-command.ts`, `harness-benchmark-command.ts`                                                         | Early dispatch in `runCli`                                                                                                     |
| Evidence                    | `evidence-command.ts`                                                                                        | Early dispatch; first extract required by `quality-exceptions.json` review trigger for PR #160                                 |
| Clean                       | `clean-command.ts`                                                                                           | Early dispatch in `runCli`; runtime in `clean-cache.ts`; behavior preserved                                                    |
| Inspect                     | `inspect-command.ts`                                                                                         | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                                                   |
| Timeline                    | `timeline-command.ts`                                                                                        | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                                                   |
| Conformance                 | `conformance-command.ts`                                                                                     | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                                                   |
| Doctor                      | `doctor-command.ts`, `cli-project-metadata.ts`                                                               | Early dispatch in `runCli`; local + daemon paths; shared metadata helpers co-extracted                                         |
| UI                          | `ui-command.ts`                                                                                              | Early dispatch in `runCli`; legacy-compatible parser; schema catalog bootstrap preserved                                       |
| Workspace                   | `workspace-command.ts`, `workspace-parse.ts`                                                                 | Early dispatch in `runCli`; two-module split; parser compatibility preserved; seven subcommands                                |
| Neutron                     | `neutron-command.ts`, `neutron-parse.ts`                                                                     | Early dispatch in `runCli`; two-module split; asymmetric parser; sync + subagent family                                        |
| Memory                      | `memory-command.ts`, `memory-parse.ts`                                                                       | Early dispatch in `runCli`; two-module split; twelve subcommands; legacy parser compatibility                                  |
| Session                     | `session-command.ts`, `session-parse.ts`                                                                     | Early dispatch in `runCli`; two-module split; six subcommands; positional ID rejection preserved                               |
| Security                    | `security-command.ts`, `security-parse.ts`, `security-findings-command.ts`, `security-operations-command.ts` | Early dispatch in `runCli`; four-module cohesive split; twelve subcommands; baseline/sandbox index-3 parser topology preserved |
| Inception / Foundation (W5) | `engineering-workspace-command.ts`, `cli-entry.ts`                                                           | Merged on `main` via PR #290; binary routing without growing `command.ts`                                                      |

## Priority order (remaining)

Extract one cohesive command family per PR. Prefer early dispatch so
`parseArguments` never grows the monolith. Keep behavior and exit codes
identical; reuse existing CLI tests.

### P4l mutation family (in progress)

| Slice  | Module(s)                                                                            | Status       | Notes                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4l1   | `mutation-outcome.ts`, `project-command-context.ts`, `governance-adoption-format.ts` | **complete** | Shared mutation/sync outcome mapping, project bootstrap context, governance plan formatting; no command early dispatch; `command.ts` still owns init/adopt/update/sync routing                                                              |
| P4l2   | `diff-command.ts`, `diff-parse.ts`                                                   | **complete** | Early dispatch for `diff`; positional project path preserved; uses P4l1 shared modules                                                                                                                                                      |
| P4l3   | `plan-command.ts`, `plan-parse.ts`                                                   | **complete** | Early dispatch for top-level `plan`; positional project path rejected; lightweight bootstrap (catalog validator + `planFeature` only); bare `update` fallthrough preserved in `command.ts`                                                  |
| P4l4   | `init-command.ts`, `init-parse.ts`                                                   | **complete** | Early dispatch for top-level `init`; positional project path rejected; mapping flags preserved via P4l1 `parseMappings`; init metadata/bootstrap semantics unchanged; adopt/sync/update/plan untouched                                      |
| P4l5   | `sync-command.ts`, `sync-parse.ts`                                                   | **complete** | Early dispatch for top-level `sync`; positional project path preserved; `--force` remains sync-only; mapping flags rejected; P4l1 mutation outcome mapping reused; adopt/update/init/plan/diff untouched                                    |
| P4l6   | `adopt-command.ts`, `adopt-parse.ts`                                                 | **complete** | Early dispatch for top-level `adopt`; positional project path preserved; mapping flags preserved via P4l1 `parseMappings`; plan/apply/default adopt semantics unchanged; update/init/plan/diff/sync untouched                               |
| P4l7   | `update-command.ts`, `update-parse.ts`                                               | **complete** | Early dispatch for top-level `update`; positional project path preserved; `--force` and mapping flags rejected; pack `--plan`/`--apply` and bare-update legacy fallthrough preserved; P4l1 mutation bootstrap reused                        |
| P4l8   | `summary-command.ts`, `summary-parse.ts`                                             | **complete** | Early dispatch for top-level `summary`; subcommands `list`/`get`/`record`; legacy parser index-2 compatibility preserved; task summary APIs unchanged; controlled-learning cluster siblings untouched                                       |
| P4l9   | `skill-command.ts`, `skill-parse.ts`                                                 | **complete** | Early dispatch for top-level `skill`; subcommand `discover`; legacy parser index-2 compatibility preserved; progressive skill discovery APIs unchanged; controlled-learning cluster siblings untouched                                      |
| P4l10  | `proposal-command.ts`, `proposal-parse.ts`                                           | **complete** | Early dispatch for top-level `proposal`; subcommands `list`/`get`/`create`/`approve`/`plan`/`apply`; legacy parser index-2 compatibility preserved; skill proposal lifecycle APIs unchanged; controlled-learning cluster siblings untouched |
| P4l11+ | controlled-learning cluster (planned)                                                | not started  | Per-command extraction after proposal                                                                                                                                                                                                       |

1. **`evaluate` / `checkpoint` / `profile` /
   `delegate` / `rank` / `context`** — remaining controlled-learning cluster;
   split by subdomain once shared helpers are isolated.

## Rules

- Target new modules ≤ 250 lines preferred, ≤ 400 hard.
- Net line count of `command.ts` must decrease (or stay equal) on every PR that
  touches it, unless an approved exception is recorded.
- Do not compress or merge unrelated helpers to game the budget.
- After each extract, run the existing focused CLI tests for that family plus
  `pnpm verify`.

## Exit condition

`command.ts` is a thin router (help/version, early dispatch table, shared parse
helpers only) at or under 400 lines, or a remaining oversized core with a
documented exception and no further growth.
