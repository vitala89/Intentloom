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

| Slice | Module(s)                                                                            | Status       | Notes                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P4l1  | `mutation-outcome.ts`, `project-command-context.ts`, `governance-adoption-format.ts` | **complete** | Shared mutation/sync outcome mapping, project bootstrap context, governance plan formatting; no command early dispatch; `command.ts` still owns init/adopt/update/sync routing             |
| P4l2  | `diff-command.ts`, `diff-parse.ts`                                                   | **complete** | Early dispatch for `diff`; positional project path preserved; uses P4l1 shared modules                                                                                                     |
| P4l3  | `plan-command.ts`, `plan-parse.ts`                                                   | **complete** | Early dispatch for top-level `plan`; positional project path rejected; lightweight bootstrap (catalog validator + `planFeature` only); bare `update` fallthrough preserved in `command.ts` |
| P4l4+ | init / adopt / sync / update (planned)                                               | not started  | Per-command extraction after plan                                                                                                                                                          |

1. **`init` / `adopt` / `sync` / `update`** — remaining mutation commands;
   one family per PR after plan (P4l4 init is next).
2. **`summary` / `skill` / `proposal` / `evaluate` / `checkpoint` / `profile` /
   `delegate` / `rank` / `context`** — controlled-learning cluster; split by
   subdomain once shared helpers are isolated.

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
