# CLI `command.ts` decomposition plan

## Status

**COMPLETE (2026-08-29).** The controlled-learning extraction sequence P4l1–P4l16
is merged on `main` (#419–#421). Post-P4l16 `command.ts` is a thin router at
171 physical / 167 effective lines (canonical `scripts/production-file-metrics.mjs`).
**CLI `command.ts` decomposition exit condition satisfied.**

Historical note: `command.ts` was legacy debt at ~3300+ lines (hard limit 400).
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

### P4l mutation and controlled-learning family (complete)

| Slice | Module(s)                                                                            | Status       | Notes                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4l1  | `mutation-outcome.ts`, `project-command-context.ts`, `governance-adoption-format.ts` | **complete** | Shared mutation/sync outcome mapping, project bootstrap context, governance plan formatting; no command early dispatch; `command.ts` still owns init/adopt/update/sync routing                                                                                |
| P4l2  | `diff-command.ts`, `diff-parse.ts`                                                   | **complete** | Early dispatch for `diff`; positional project path preserved; uses P4l1 shared modules                                                                                                                                                                        |
| P4l3  | `plan-command.ts`, `plan-parse.ts`                                                   | **complete** | Early dispatch for top-level `plan`; positional project path rejected; lightweight bootstrap (catalog validator + `planFeature` only); bare `update` fallthrough preserved in `command.ts`                                                                    |
| P4l4  | `init-command.ts`, `init-parse.ts`                                                   | **complete** | Early dispatch for top-level `init`; positional project path rejected; mapping flags preserved via P4l1 `parseMappings`; init metadata/bootstrap semantics unchanged; adopt/sync/update/plan untouched                                                        |
| P4l5  | `sync-command.ts`, `sync-parse.ts`                                                   | **complete** | Early dispatch for top-level `sync`; positional project path preserved; `--force` remains sync-only; mapping flags rejected; P4l1 mutation outcome mapping reused; adopt/update/init/plan/diff untouched                                                      |
| P4l6  | `adopt-command.ts`, `adopt-parse.ts`                                                 | **complete** | Early dispatch for top-level `adopt`; positional project path preserved; mapping flags preserved via P4l1 `parseMappings`; plan/apply/default adopt semantics unchanged; update/init/plan/diff/sync untouched                                                 |
| P4l7  | `update-command.ts`, `update-parse.ts`                                               | **complete** | Early dispatch for top-level `update`; positional project path preserved; `--force` and mapping flags rejected; pack `--plan`/`--apply` and bare-update legacy fallthrough preserved; P4l1 mutation bootstrap reused                                          |
| P4l8  | `summary-command.ts`, `summary-parse.ts`                                             | **complete** | Early dispatch for top-level `summary`; subcommands `list`/`get`/`record`; legacy parser index-2 compatibility preserved; task summary APIs unchanged; controlled-learning cluster siblings untouched                                                         |
| P4l9  | `skill-command.ts`, `skill-parse.ts`                                                 | **complete** | Early dispatch for top-level `skill`; subcommand `discover`; legacy parser index-2 compatibility preserved; progressive skill discovery APIs unchanged; controlled-learning cluster siblings untouched                                                        |
| P4l10 | `proposal-command.ts`, `proposal-parse.ts`                                           | **complete** | Early dispatch for top-level `proposal`; subcommands `list`/`get`/`create`/`approve`/`plan`/`apply`; legacy parser index-2 compatibility preserved; skill proposal lifecycle APIs unchanged; controlled-learning cluster siblings untouched                   |
| P4l11 | `evaluate-command.ts`, `evaluate-parse.ts`                                           | **complete** | Early dispatch for top-level `evaluate`; subcommands `run`/`list`; legacy parser index-2 compatibility preserved; skill evaluation APIs unchanged; controlled-learning cluster siblings untouched                                                             |
| P4l12 | `checkpoint-command.ts`, `checkpoint-parse.ts`                                       | **complete** | Early dispatch for top-level `checkpoint`; subcommands `create`/`pause`/`cancel`/`redirect`/`resume`/`list`/`delete`; legacy parser index-2 compatibility preserved; task checkpoint lifecycle APIs unchanged; controlled-learning cluster siblings untouched |
| P4l13 | `profile-command.ts`, `profile-parse.ts`                                             | **complete** | Early dispatch for top-level `profile`; subcommands `create`/`get`/`list`; legacy parser index-2 compatibility preserved; profile definition APIs unchanged; controlled-learning cluster siblings untouched                                                   |
| P4l14 | `delegate-command.ts`, `delegate-parse.ts`                                           | **complete** | Early dispatch for top-level `delegate`; flag-only grammar preserved; role delegation APIs unchanged; controlled-learning cluster siblings untouched                                                                                                          |
| P4l15 | `rank-command.ts`, `rank-parse.ts`                                                   | **complete** | Early dispatch for top-level `rank`; positional query and `config` subcommand preserved; semantic ranking config read/write and `rankProceduralMemory` execution unchanged; controlled-learning cluster siblings untouched (#419)                             |
| P4l16 | `context-command.ts`, `context-parse.ts`                                             | **complete** | Final controlled-learning command extraction; `context get` grammar, `--root`/`--query`/`--max-tokens`/`--max-items`/`--json`, and `getBoundedProjectContext` application semantics preserved; post-extract `command.ts` 171 physical / 167 effective (#421)  |

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

**Result (verified on `main` @ `ede3511`, post-P4l16 #421): satisfied.**

Remaining responsibilities in `command.ts` only:

- `--version` and help/usage routing
- early dispatch table to extracted `*-command.ts` modules (harness through context)
- shared top-level error translation (`SchemaCatalogError`, validation failures, usage errors)
- shared CLI dependency / IO types (`CliExitCode`, `CliIo`, `CliDependencies`)

Final metrics (`scripts/production-file-metrics.mjs`):

| File                                     | Physical | Effective |
| ---------------------------------------- | -------- | --------- |
| `command.ts` (before P4l16 @ `2df34a85`) | 339      | 328       |
| `command.ts` (after P4l16 @ `ede3511`)   | 171      | 167       |
| `context-parse.ts`                       | 125      | 118       |
| `context-command.ts`                     | 53       | 48        |

No P4l17 or further `command.ts` extraction slices are planned in this roadmap.
Other oversized production files (`packages/daemon/src/index.ts`,
`packages/evidence-analysis/src/index.ts`, `packages/mcp-server/src/index.ts`)
remain separate quality-debt follow-ups per `POST_W12_NEXT_INCREMENT_PLAN.md`.
