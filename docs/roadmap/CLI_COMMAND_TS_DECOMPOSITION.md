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
| Inception / Foundation (W5) | `engineering-workspace-command.ts`, `cli-entry.ts`   | Merged on `main` via PR #290; binary routing without growing `command.ts`                      |

## Priority order (remaining)

Extract one cohesive command family per PR. Prefer early dispatch so
`parseArguments` never grows the monolith. Keep behavior and exit codes
identical; reuse existing CLI tests.

1. **`clean`** — already partially extracted (`clean-cache.ts`); move remaining
   dispatch out of `runCli`.
2. **`inspect` / `timeline` / `conformance`** — read-only evidence/git consumers;
   share formatters already in `command.ts`.
3. **`doctor`** — includes daemon doctor path; keep IPC boundary explicit.
4. **`ui`** — interactive TUI state rendering.
5. **`workspace`** — agent workspace conversation modes.
6. **`neutron`** — subagent + sync.
7. **`memory` / `session` / `security`** — large controlled-learning and security
   surfaces; extract as separate PRs (do not combine).
8. **`adopt` / `update` / `sync` / `diff` / `plan` / `init`** — project mutation
   and sync family; extract last because of shared transaction helpers.
9. **`summary` / `skill` / `proposal` / `evaluate` / `checkpoint` / `profile` /
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
