# Engineering Quality Packs Phase Q5 Implementation Plan

## Objective

Implement the read-only decomposition planner from
`docs/roadmap/ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md`.
An oversized artifact must produce a coherent, evidence-backed plan without
mutating files, executing project tools, or splitting arbitrary line ranges.

## Scope

1. Add versioned protocol contracts for:
   - responsibility evidence and cohesion;
   - dependency and public API evidence;
   - test-preservation evidence;
   - whole-responsibility decomposition options;
   - migration steps, conflicts, and the final plan.
2. Add validator boundaries for identifiers, references, line budgets, option
   kinds, migration steps, and plan status.
3. Add pure application operations that:
   - validate and normalize decomposition evidence;
   - select whole cohesive responsibilities for minimal and recommended plans;
   - retain explicit keep-together, defer, and exception alternatives;
   - derive public API preservation and test-preservation steps;
   - report insufficient evidence or an unresolvable hard limit as reviewable
     conflicts.
4. Add focused tests for an oversized fixture, public API/dependency evidence,
   all option kinds, test-preservation steps, validation failures, and the
   no-mutation/read-only invariant.
5. Update `PROJECT_STATE.md` and `DUTY_WATCH.md` with the Q4 merge and Q5
   handoff.

## Architectural boundaries

- `@intentloom/protocol` owns versioned data contracts only.
- `@intentloom/validator` validates untrusted plan input and output.
- `@intentloom/application` owns deterministic, side-effect-free planning.
- CLI, filesystem, checker execution, network, and external PR/task providers
  remain out of scope.
- New hand-written production files stay below 250 formatted lines; the test
  file stays below 400 lines.

## Algorithm and safety rules

- Responsibilities are extracted only by stable responsibility ID; no line
  ranges or arbitrary chunks are produced.
- The planner accounts for unallocated/shared host lines explicitly rather than
  pretending all lines belong to an extractable responsibility.
- Minimal and recommended options are deterministic and preserve dependencies,
  public API symbols, and related tests through explicit migration steps.
- Keep-together and exception options remain visible when decomposition is not
  currently justified; exception output requires human review evidence.

## Validation gate

- focused Q5, Q3, and Q4 tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm format:check`;
- `pnpm verify` before push;
- staged checks, `git diff --check`, and production-file budget review;
- dedicated draft pull request after the atomic commit.
