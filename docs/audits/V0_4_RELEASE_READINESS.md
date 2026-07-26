# v0.4 Candidate Release Readiness Audit

Audit date: 2026-07-26. Scope: repository state on `main` and the Controlled Agent Learning Roadmap (Candidates L1–L8).

## Executive Summary

The **v0.4 Controlled Agent Learning & Procedural Memory Candidate Milestone** (Candidates L1 through L8) has been fully documented, implemented, verified, and merged into `main`.

All 64 test files comprising 651 unit and integration tests pass cleanly. Monorepo TypeScript compilation (`pnpm typecheck`), formatting (`pnpm format:check`), package build (`pnpm build`), and git diff safety checks are verified.

## Candidate Milestone Verification Summary

| Candidate        | Description & Scope                                                                                                              | Status   | PR / Evidence |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------- | :------- | :------------ |
| **Candidate L1** | Local procedural memory foundation & task state machine (`TaskSummary`, `intentloom summary`).                                   | **PASS** | PR #60        |
| **Candidate L2** | Progressive skill discovery & loading levels (`intentloom skill discover`).                                                      | **PASS** | PR #61        |
| **Candidate L3** | Skill proposal lifecycle & rollback evidence (`intentloom proposal <list                                                         | get      | create        | approve>`). | **PASS** | PR #62 |
| **Candidate L4** | Skill evaluation & prompt injection security regression gates (`intentloom evaluate <run                                         | list>`). | **PASS**      | PR #63      |
| **Candidate L5** | Accepted procedural memory summary, inspection & mutation plans (`intentloom memory inspect`, `intentloom proposal plan/apply`). | **PASS** | PR #64        |
| **Candidate L6** | Controlled agent learning pause, redirect, checkpoint, and resume (`intentloom checkpoint`).                                     | **PASS** | PR #65        |
| **Candidate L7** | Provider-neutral optional semantic ranking (`intentloom rank`).                                                                  | **PASS** | PR #66        |
| **Candidate L8** | Profile isolation & role-aware delegation (`intentloom profile`, `intentloom delegate`).                                         | **PASS** | PR #67        |

## Verification Matrix

| Metric / Check           | Result   | Detail                                                          |
| :----------------------- | :------- | :-------------------------------------------------------------- |
| Monorepo Build           | **PASS** | `pnpm build` completed cleanly for all packages                 |
| TypeScript Check         | **PASS** | `pnpm typecheck` passed with 0 errors                           |
| Formatting               | **PASS** | `pnpm format:check` verified all TS, MD, and JSON files         |
| Unit & Integration Suite | **PASS** | **64 test files, 651 tests passed, 3 skipped**                  |
| Git Safety               | **PASS** | Clean `git diff --check` with no whitespace or conflict markers |
| Release Target Version   | **PASS** | `0.4.0-beta.1`                                                  |

## Release Recommendation (historical snapshot)

At the time of this audit, the framework version needed to be bumped from
`0.3.0-beta.1` to **`0.4.0-beta.1`** across all workspace packages via
`scripts/sync-version.mjs` and published to npm under `intentloom`. The
recommendation was completed after this audit snapshot; see the release
follow-up below.

## Release follow-up

This audit's recommendation was completed after the audit snapshot: the
repository was synchronized to `0.4.0-beta.1`, tagged as `v0.4.0-beta.1`, and
published to npm under `next` on 2026-07-25. The current registry state is
`latest=0.1.0-alpha.3` and `next=0.4.0-beta.1`. This document remains the
historical readiness audit; [`docs/releases/RELEASE_STATE.md`](../releases/RELEASE_STATE.md)
is the current capability and release-status source of truth.
