# Engineering Quality Packs Q4 Implementation Plan

## Objective

Implement Phase Q4, Task and Pull-Request Integration, on top of the merged
Q1-Q3 quality contracts. The increment remains provider-neutral and read-only:
it evaluates a proposed task shape before mutation, compares final evidence to
that plan, and renders reviewable pull-request evidence.

## Scope

1. Add versioned protocol contracts for projected growth, affected-path policy
   resolution, acceptance criteria, final diff comparison, and rendered PR
   evidence.
2. Validate every Q4 input and result at the validator boundary.
3. Resolve policy scopes deterministically for affected paths, including the
   applicable rule set and hard/review thresholds.
4. Produce a visible plan conflict when likely growth crosses a hard limit,
   policy resolution is unavailable, or required acceptance criteria are absent.
5. Compare final measured evidence with the projection and report unexpected
   paths, missing evidence, projection drift, and hard-limit violations.
6. Render deterministic Markdown evidence suitable for a pull request body or
   review artifact without contacting GitHub or mutating repository state.

## Architecture and file budgets

- `@intentloom/protocol`: `engineering-quality/task-integration.ts` and additive
  Q4 enums/constants in `engineering-quality/common.ts`.
- `@intentloom/validator`: `engineering-quality/task-integration.ts`, kept
  separate from Q3 baseline validators.
- `@intentloom/application`: `engineering-quality/plan-growth.ts`,
  `plan-diff.ts`, and `pull-request-evidence.ts`; all operations are pure.
- `tests/engineering-quality-task-integration.test.ts`: contract, conflict,
  policy-scope, final-diff, and rendering regression coverage.
- Keep every new hand-written production file below 250 lines and extract any
  helper responsibility before growth approaches the budget.

## Decisions

- A projection is an estimate, never a final measurement; it records minimum,
  likely, and confidence values.
- A path resolves against matching policy scopes and applicable rules. Glob
  matching is deterministic and local; no provider or filesystem access is
  introduced.
- Likely hard-limit crossing, missing required criteria, unresolved policy, and
  final evidence drift are visible conflicts. No operation applies changes,
  approves a plan, creates a branch, or calls a pull-request service.
- Final comparison accepts measured `EngineeringQualityEvidence` and explicit
  acceptance results, so evidence provenance remains outside canonical policy
  logic.

## Validation and handoff

- Run the focused Q4 tests, typecheck, lint, format check, full test suite,
  build, `git diff --check`, staged validation, and production-file budget
  review.
- Update `PROJECT_STATE.md` and `DUTY_WATCH.md` with Q4 status, commit, PR, and
  the next roadmap action.
