# CLI `command.ts` decomposition plan

## Status

`packages/cli/src/command.ts` is legacy debt at ~3300+ lines (hard limit 400).
Existing oversized files must not grow. New CLI families ship as dedicated
`*-command.ts` modules with early dispatch (same pattern as `harness`).

## Done

| Slice                       | Module                                               | Notes                                                                                          |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Harness                     | `harness-command.ts`, `harness-benchmark-command.ts` | Early dispatch in `runCli`                                                                     |
| Evidence                    | `evidence-command.ts`                                | Early dispatch; first extract required by `quality-exceptions.json` review trigger for PR #160 |
| Clean                       | `clean-command.ts`                                   | Early dispatch in `runCli`; runtime in `clean-cache.ts`; behavior preserved                    |
| Inspect                     | `inspect-command.ts`                                 | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                   |
| Timeline                    | `timeline-command.ts`                                | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                   |
| Conformance                 | `conformance-command.ts`                             | Early dispatch in `runCli`; formatter in `formatters.ts`; behavior preserved                   |
| Inception / Foundation (W5) | `engineering-workspace-command.ts`, `cli-entry.ts`   | Merged on `main` via PR #290; binary routing without growing `command.ts`                      |

## Priority order (remaining)

Extract one cohesive command family per PR. Prefer early dispatch so
`parseArguments` never grows the monolith. Keep behavior and exit codes
identical; reuse existing CLI tests.

1. **`doctor`** — includes daemon doctor path; keep IPC boundary explicit.
2. **`ui`** — interactive TUI state rendering.
3. **`workspace`** — agent workspace conversation modes.
4. **`neutron`** — subagent + sync.
5. **`memory` / `session` / `security`** — large controlled-learning and security
   surfaces; extract as separate PRs (do not combine).
6. **`adopt` / `update` / `sync` / `diff` / `plan` / `init`** — project mutation
   and sync family; extract last because of shared transaction helpers.
7. **`summary` / `skill` / `proposal` / `evaluate` / `checkpoint` / `profile` /
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
