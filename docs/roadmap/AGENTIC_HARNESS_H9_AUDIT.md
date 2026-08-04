# Agentic Harness H9 Hardening Audit

## Status

Audit completed on 2026-08-04 against `main` at `8a1ce50` (PR #214). This
document records existing evidence and the smallest remaining hardening gap; it
does not authorize provider execution, network access, or mutation.

## Existing evidence

| H9 concern                       | Repository evidence                                                                                                                                                                                                                            | Result                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Cross-platform compatibility     | `.github/workflows/compatibility.yml` runs typecheck, lint, formatting, build, and tests on Ubuntu, macOS, and Windows with Node 22 and 24.                                                                                                    | Covered in hosted CI.                           |
| Governance and source safety     | `.github/workflows/governance.yml` validates commit range, attribution, whitespace, and production-file budgets; CodeQL analyzes JavaScript/TypeScript and Actions.                                                                            | Covered for pull requests and protected `main`. |
| Dependency and release readiness | Dependency Review checks dependency-changing PRs; `.github/workflows/release.yml` is manual-dispatch only, restricts refs to `main`/`v*`, uses npm trusted publishing, tests and builds before publication, and checks the tree remains clean. | Covered by existing release controls.           |
| Adoption gate                    | `tests/harness-adoption-gate.test.ts` covers passing scorecards, missing/failing/stale scorecards, and missing approvals.                                                                                                                      | Fail-closed contract covered.                   |
| Rollback and migration recovery  | `tests/transaction-consistency.test.ts`, `tests/cli-adopt-apply.test.ts`, and `tests/cli-pack-update.test.ts` cover transactional rollback, stale plans, and migration journals.                                                               | Existing application recovery evidence.         |
| Retention and purge              | `tests/harness-state.test.ts` covers checkpoint purge; `tests/evidence-cache-revocation-cross-surface.test.ts` covers provider-cache purge and revocation across surfaces.                                                                     | Existing bounded purge evidence.                |

## Remaining gap

There is no dedicated harness-specific CI drill that combines scorecard
freshness/approval enforcement with checkpoint purge and rollback recovery, and
there is no stable harness performance budget suitable for a hosted matrix.
Adding wall-clock thresholds to the test suite would be flaky across the
existing six compatibility jobs.

## Bounded next slice

Add a deterministic, fixture-backed H9 evidence contract that composes the
existing adoption gate, replay/purge, and rollback outcomes without measuring
wall-clock time or granting new capabilities. Keep it as a focused test and
document the fixture versions and expected terminal states. A later, separately
reviewed performance benchmark may consume the same fixtures without becoming a
release gate until its variance is characterized.

## Explicitly out of scope

- provider or model adapters;
- remote or hosted state;
- generic shell, network, or subprocess capability;
- automatic activation, commits, merges, releases, or publication;
- certification or universal safety claims.
