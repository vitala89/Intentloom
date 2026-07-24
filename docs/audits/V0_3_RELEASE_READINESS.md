# v0.3 Candidate Release Readiness Audit

Audit date: 2026-07-24. Scope: repository state at `3973487` on branch `main`
and the v0.3 candidate roadmap.

## Executive Summary

The v0.3 candidate feature set has been fully documented, implemented, verified,
and merged into `main`. The set includes the Engineering Conformance engine and
CLI/MCP surfaces (v0.3 engineering conformance milestone), and the Managed
Extension Lifecycle architecture including ADR-0021 and a full governance
specification covering manifest schema, lockfile schema, legal and attribution
boundaries, safe update transactions, rollback, revocation, and vendor-neutral
extension categories.

All 49 test files comprising 580 unit and integration tests pass cleanly.
Monorepo TypeScript compilation (`pnpm typecheck`), formatting
(`pnpm format:check`), package build (`pnpm build`), and git diff safety checks
are verified.

## Candidate Milestone Verification

### 1. v0.3 — Engineering Conformance Engine

- **Implementation**: Added `evaluateEngineeringConformance(timeline, policy)` in
  `@intentloom/evidence-analysis`. Accepts a `WorkflowTimeline` and a
  `ConformancePolicy`, produces a `ConformanceReport` with typed findings
  (`missing`, `out-of-order`, `duplicate`, `skipped`, `unverifiable`,
  `compliant`).
- **Verification**: 6 dedicated unit tests covering passing cases, missing steps,
  out-of-order steps, skip-if-absent steps, unverifiable evidence, and empty
  timelines.
- **ADR**: [ADR-0020](../decisions/ADR-0020-engineering-workflow-policy-and-conformance.md)
- **Spec**: [ENGINEERING_CONFORMANCE_V0_3_SPEC.md](../specs/ENGINEERING_CONFORMANCE_V0_3_SPEC.md)
- **Exit Criteria**: Met in `main` (PR #36).

### 2. v0.3 — `intentloom conformance` CLI Command

- **Implementation**: Added `conformance` sub-command to `@intentloom/cli` with
  `--policy`, `--timeline`, `--case-id`, `--case-type`, and `--json` flags.
  Human-readable and machine-readable output modes. Delegates to
  `evaluateEngineeringConformance` through the application-operation boundary.
- **Verification**: 2 integration tests covering JSON output and human-readable
  output paths using fixture data.
- **ADR**: [ADR-0016](../decisions/ADR-0016-release-analysis-cli.md)
- **Exit Criteria**: Met in `main` (PR #37).

### 3. v0.3 — `intentloom_engineering_conformance` MCP Tool

- **Implementation**: Added `ENGINEERING_CONFORMANCE_TOOL` to
  `@intentloom/mcp-server`. Defined typed input schema
  (`urn:intentloom:mcp:engineering-conformance:input:1`) and output schema
  (`urn:intentloom:mcp:engineering-conformance:output:1`). Registered handler
  in `handleMcpRequest`.
- **Verification**: 7 MCP server tests including `tools/list` registration check
  and `tools/call` invocation assertions.
- **ADR**: [ADR-0017](../decisions/ADR-0017-mcp-stdio-analysis-boundary.md),
  [ADR-0020](../decisions/ADR-0020-engineering-workflow-policy-and-conformance.md)
- **Exit Criteria**: Met in `main` (PR #38).

### 4. v0.3 — ADR-0021 and Managed Extension Lifecycle Architecture

- **Implementation**: Created
  [ADR-0021](../decisions/ADR-0021-managed-extension-lifecycle-and-manifest.md)
  establishing the vendor-neutral governance model for external extensions
  (Agent Skills, MCP servers, knowledge providers, adapters, policy packs).
  Defines the capability scoping model, pinned lockfile requirement, pre-adoption
  inspection mandate, and fail-closed transactional install boundary.
- **Verification**: ADR reviewed, formatted, and merged (PR #40). ROADMAP.md and
  CHANGELOG.md updated.
- **Exit Criteria**: Met in `main` (PR #40).

### 5. v0.3 — Managed Extension Lifecycle Specification (Full)

- **Implementation**: Created full
  [MANAGED_EXTENSION_LIFECYCLE_V0_3_SPEC.md](../specs/MANAGED_EXTENSION_LIFECYCLE_V0_3_SPEC.md)
  covering: 6 extension categories, manifest schema
  (`urn:aif:schema:extension-manifest:1`), lockfile schema
  (`urn:aif:schema:extension-lock:1`), legal and attribution boundaries (8
  requirements), 11-step pre-adoption inspection workflow, update discovery and
  safe update transactions, rollback and recovery classification, compatibility
  contracts, doctor diagnostics, revocation and removal model, Graphify as a
  vendor-neutral integration example, and non-goals.
- **Verification**: Spec formatted, reviewed, and merged (PR #41). All 49 test
  files continue to pass after merge.
- **Exit Criteria**: Met in `main` (PR #41).

## Verification Summary

| Metric / Check           | Result | Detail                                                                 |
| ------------------------ | ------ | ---------------------------------------------------------------------- |
| Monorepo Build           | PASS   | `pnpm build` completed cleanly for all packages                        |
| TypeScript Check         | PASS   | `pnpm typecheck` passed with 0 errors                                  |
| Formatting               | PASS   | `pnpm format:check` verified all TS, MD, and JSON files                |
| Unit & Integration Suite | PASS   | **49 test files, 580 tests passed, 3 skipped**                         |
| Git Safety               | PASS   | Clean `git diff --check` with no whitespace or conflict markers        |
| GitHub CI Matrix         | PASS   | All 12 CI jobs (ubuntu/macos/windows × Node 22/24 × 2 workflows) green |

## v0.3 Candidate Merge History

| PR                                                    | Branch                                         | Title                                                                |
| ----------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| [#36](https://github.com/vitala89/Intentloom/pull/36) | `feat/engineering-conformance`                 | feat: add evaluateEngineeringConformance operation and tests         |
| [#37](https://github.com/vitala89/Intentloom/pull/37) | `feat/cli-conformance`                         | feat(cli): add intentloom conformance command                        |
| [#38](https://github.com/vitala89/Intentloom/pull/38) | `feat/mcp-engineering-conformance`             | feat(mcp): add intentloom_engineering_conformance tool               |
| [#39](https://github.com/vitala89/Intentloom/pull/39) | `chore/ignore-graphify-out`                    | chore: ignore graphify-out in .gitignore                             |
| [#40](https://github.com/vitala89/Intentloom/pull/40) | `docs/managed-extension-lifecycle`             | docs: add ADR-0021 and Managed Extension Lifecycle Specification     |
| [#41](https://github.com/vitala89/Intentloom/pull/41) | `docs/extend-managed-extension-lifecycle-spec` | docs: expand Managed Extension Lifecycle Specification to full scope |

## v0.3 Candidate Scope vs Exit Criteria

| Criterion                                                                                                                  | Status                 |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Engineering conformance evaluates workflow timelines against canonical policies                                            | ✅ Met                 |
| Reports missing, out-of-order, duplicated, skipped, unverifiable steps                                                     | ✅ Met                 |
| Produces machine-readable and human-readable output                                                                        | ✅ Met                 |
| Conformance accessible via CLI and MCP tool                                                                                | ✅ Met                 |
| Extension manifest and lockfile schemas defined (`urn:aif:schema:extension-manifest:1`, `urn:aif:schema:extension-lock:1`) | ✅ Met (specification) |
| Pre-adoption inspection, capability delta, license check defined                                                           | ✅ Met (specification) |
| Safe update transaction and fail-closed rollback defined                                                                   | ✅ Met (specification) |
| Revocation, removal, and doctor diagnostics defined                                                                        | ✅ Met (specification) |
| No automatic repository state changes                                                                                      | ✅ Enforced throughout |

## Verdict

**TECHNICALLY READY** — The v0.3 candidate engineering conformance implementation
and managed extension lifecycle governance architecture are complete and merged
in `main` at commit `3973487`. The next step is an explicit release decision:
version bump to `0.3.0-beta.1`, git tagging, and npm publication under the
`next` dist-tag, each requiring separate authorization.
