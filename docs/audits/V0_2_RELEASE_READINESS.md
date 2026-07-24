# v0.2 Release Readiness Audit

Audit date: 2026-07-24. Scope: repository state at `041c53b` on branch `main` and the post-v0.1 candidate roadmap.

## Executive Summary

The v0.2 Connected Project and Workflow Evidence feature set has been fully implemented, verified, and merged into `main`. The suite includes read-only project inspection, restricted local Git evidence collection, vendor-neutral provider export adapters (GitHub/GitLab), timeline correlation and release analysis, a local `stdio` MCP server, and release conformance evaluation.

All 47 test files comprising 571 unit and integration tests pass cleanly. Monorepo TypeScript compilation (`pnpm typecheck`), formatting (`pnpm format:check`), package build (`pnpm build`), and git diff safety checks are verified.

## Candidate Milestones Verification

### 1. v0.2.1 — Project Connection and Inspection

- **Implementation**: Added `@intentloom/application` project inspection capability and `intentloom inspect` CLI.
- **Verification**: Reports project profile, adapter readiness, instruction files, documentation mappings, ownership state, and adoption status without mutating project files or making network requests.
- **Exit Criteria**: Met in `main` (PR #23).

### 2. v0.2.2 — Local Git Evidence & Release Timeline

- **Implementation**: Added restricted local Git evidence collection (`@intentloom/evidence-git`) and `intentloom timeline` CLI.
- **Verification**: Executes fixed read-only Git commands without a shell, network access, or git config modification. Normalizes commits, tags, branches, and merges into vendor-neutral release timelines.
- **Exit Criteria**: Met in `main` (PR #24, #25, #26).

### 3. v0.2.3 — Provider Export Adapters

- **Implementation**: Added `@intentloom/evidence-provider` and `intentloom import-provider` CLI.
- **Verification**: Imports explicitly provided GitHub and GitLab JSON exports, redacts secrets/identities, prevents cross-project mixing, and normalizes pull/merge requests, reviews, pipelines, and releases into the evidence model.
- **Exit Criteria**: Met in `main` (PR #27, #28).

### 4. v0.2.4 — Timeline and Release Analysis

- **Implementation**: Added `@intentloom/evidence-analysis` and `intentloom release-analysis` CLI.
- **Verification**: Correlates local Git and provider evidence for release cases, identifying verified, missing, conflicting, ambiguous, and unsupported evidence.
- **Exit Criteria**: Met in `main` (PR #29, #30).

### 5. v0.2.5 — Local MCP Server

- **Implementation**: Added `@intentloom/mcp-server` and `intentloom mcp serve --stdio` CLI command.
- **Verification**: Exposes typed read-only MCP tools (`inspect_project`, `doctor_project`, `create_adoption_plan`, `diff_adoption`, `create_release_timeline`, `analyze_release_evidence`) over `@intentloom/application`. Strictly prohibits shell execution, arbitrary file access, and mutating actions.
- **Exit Criteria**: Met in `main` (PR #31, #33).

### 6. v0.2.8 — Release Conformance Evaluation

- **Implementation**: Added release conformance evaluation engine (`evaluateReleaseConformance`) and dogfooding evidence record.
- **Verification**: Compares observed workflow evidence against canonical Intentloom release policies and records evidence in `docs/releases/dogfooding/2026-07-24-release-conformance.md`.
- **Exit Criteria**: Met in `main` (PR #34, #35).

## Verification Observed

| Metric / Check           | Result | Detail                                                                   |
| ------------------------ | ------ | ------------------------------------------------------------------------ |
| Monorepo Build           | PASS   | `pnpm build` completed cleanly for all 12 packages                       |
| TypeScript Check         | PASS   | `pnpm typecheck` passed with 0 errors                                    |
| Formatting               | PASS   | `pnpm format:check` verified all TS, MD, and JSON files                  |
| Unit & Integration Suite | PASS   | 47 test files, 571 tests passed, 3 skipped                               |
| Git Safety               | PASS   | Clean `git diff --check` with no trailing whitespace or conflict markers |

## Verdict

**TECHNICALLY READY** — The `0.2.0-beta.1` candidate is prepared locally and merged in `main`. Git tagging and npm publication remain separate, unperformed actions pending explicit authorization gates.
