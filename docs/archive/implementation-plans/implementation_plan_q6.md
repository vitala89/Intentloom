# Engineering Quality Packs Phase Q6 Implementation Plan

## Objective

Implement the first-party, data-only Engineering Quality Packs increment from
the roadmap. Base quality, TypeScript, Angular, React, Rust, Tauri 2, testing,
accessibility, and security-sensitive guidance must be represented by one
provider-neutral pack contract and resolve deterministically without checker
execution, external import, network access, telemetry, dependency installation,
project mutation, or publishing.

## Scope

1. Add versioned protocol contracts for pack identity, entries, provenance,
   compatibility ranges, dependencies, conflicts, and resolution results.
2. Add validator-boundary checks for untrusted pack data, including bounded
   strings and collections, first-party provenance, source references,
   compatibility ranges, entry semantics, and duplicate meaning IDs.
3. Add pure application resolution that validates inputs, expands first-party
   dependencies, checks the Intentloom/runtime compatibility context, orders
   packs and entries deterministically, deduplicates identical canonical
   meanings, and fails on conflicting meanings.
4. Add data-only first-party pack definitions under `catalog/` with
   primary-source provenance and compatibility ranges.
5. Add focused contract and resolution tests covering every pack family,
   dependency ordering, compatibility, deterministic output, duplicate
   meanings, conflicting meanings, malformed untrusted data, and read-only
   behavior.

## Architectural boundaries

- `@intentloom/protocol` owns canonical versioned pack and resolution contracts.
- `@intentloom/validator` validates all pack data before application use.
- `@intentloom/application` owns pure deterministic resolution only.
- `catalog/` is the first-party source of data-only pack meanings; no generated
  provider/tool adapters are added or hand-edited.
- Checker execution, external pack import, catalog download, installation,
  activation, CLI/MCP/Desktop exposure, and project writes remain out of scope
  for Q7–Q10.
- No new package or runtime dependency is introduced.

## Resolution and safety rules

- Pack IDs, versions, dependencies, and canonical meaning IDs are explicit.
- Dependency expansion is cycle-checked and ordered lexically with dependencies
  before dependents.
- Compatibility is checked against the explicit Intentloom and technology
  context; unavailable or incompatible packs fail truthfully.
- Identical canonical meanings are emitted once; the same meaning ID with a
  different semantic fingerprint produces a conflict rather than silently
  choosing one rule.
- Pack data is treated as untrusted at the validator boundary. No URL is
  fetched, no source text is executed, and no pack can grant capabilities.

## Validation gate

- focused Q6 contract and resolution tests;
- Q3–Q6 focused regression tests;
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and
  `pnpm build` through `pnpm verify`;
- staged checks, `git diff --cached --check`, and final `git diff --check`;
- production-file and test-file budget review;
- manual review for provider neutrality, generated-file ownership, and absent
  network, telemetry, installation, mutation, execution, and publishing;
- update `PROJECT_STATE.md` and `DUTY_WATCH.md` before the atomic commit;
- create a separate draft PR only after the full gate is green.

## Stop condition

Stop after the pure first-party resolution contract, fixtures, documentation,
and verification are complete and reviewable. Do not implement checker
execution, external pack import, catalog download, activation, or generated
adapters in Q6.
