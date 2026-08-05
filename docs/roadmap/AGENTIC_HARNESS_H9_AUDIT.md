# Agentic Harness H9 Hardening Audit

## Status

Audit updated on 2026-08-05 against `main` at `7fb752f`, including PR #233
(`04b93e2`) and PR #234 (`bb67e1d`). This document records existing evidence
and the smallest remaining hardening gap; it does not authorize provider
execution, network access, or mutation.

## Existing evidence

| H9 concern                       | Repository evidence                                                                                                                                                                                                                            | Result                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Cross-platform compatibility     | `.github/workflows/compatibility.yml` runs typecheck, lint, formatting, build, and tests on Ubuntu, macOS, and Windows with Node 22 and 24.                                                                                                    | Covered in hosted CI.                                        |
| Governance and source safety     | `.github/workflows/governance.yml` validates commit range, attribution, whitespace, and production-file budgets; CodeQL analyzes JavaScript/TypeScript and Actions.                                                                            | Covered for pull requests and protected `main`.              |
| Dependency and release readiness | Dependency Review checks dependency-changing PRs; `.github/workflows/release.yml` is manual-dispatch only, restricts refs to `main`/`v*`, uses npm trusted publishing, tests and builds before publication, and checks the tree remains clean. | Covered by existing release controls.                        |
| Adoption gate                    | `tests/harness-adoption-gate.test.ts` covers passing scorecards, missing/failing/stale scorecards, and missing approvals.                                                                                                                      | Fail-closed contract covered.                                |
| Rollback and migration recovery  | `tests/transaction-consistency.test.ts`, `tests/cli-adopt-apply.test.ts`, and `tests/cli-pack-update.test.ts` cover transactional rollback, stale plans, and migration journals.                                                               | Existing application recovery evidence.                      |
| Retention and purge              | `tests/harness-state.test.ts` covers checkpoint purge; `tests/evidence-cache-revocation-cross-surface.test.ts` covers provider-cache purge and revocation across surfaces.                                                                     | Existing bounded purge evidence.                             |
| Composed H9 evidence             | `tests/harness-h9-evidence-contract.test.ts` uses versioned deterministic fixtures to compose adoption-gate failure, replay, cross-project resume rejection, checkpoint purge, and transactional rollback recovery.                            | Covered without wall-clock thresholds.                       |
| Hosted H9 compatibility          | PR #233 adds a Windows Node 22-only timeout budget for the packed CLI process test; Compatibility, Governance, and CodeQL passed after merge.                                                                                                  | Correctness evidence is green; timing remains observational. |

## Remaining gap

There is no stable harness performance budget suitable for a hosted matrix, and
the deterministic contract is not a certification claim. Adding wall-clock
thresholds to the test suite would be flaky across the existing six
compatibility jobs. PR #233 fixed a Windows Node 22 test timeout without turning
that observed runner duration into a product budget.

## Bounded next slice

The merged [H9 performance benchmark specification](../specs/AGENTIC_HARNESS_PERFORMANCE_BENCHMARK_SPEC.md)
defines a local, provider-neutral measurement contract that consumes the
existing H9 fixtures without becoming a release gate until its variance is
characterized. Any future benchmark runner requires its own implementation
review and must keep fixture version `h9-evidence-drill@1` and its expected
terminal states (`passed` gate, `failed` gate, deterministic replay, purged
checkpoint, and completed rollback) stable.

## Explicitly out of scope

- provider or model adapters;
- remote or hosted state;
- generic shell, network, or subprocess capability;
- automatic activation, commits, merges, releases, or publication;
- certification or universal safety claims.
