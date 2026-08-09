# Implementation Plan: Engineering Quality Packs Phase Q10 (Curated Catalog)

## Overview & Goal

Implement Phase Q10: Curated Catalog of the Engineering Quality Packs roadmap.
This phase delivers read-only catalog search and inspection, first-party metadata, verified data-only downloads and quarantine boundary, pack locking, deterministic update diffs, and fail-closed revocation/yanking handling.

Exit Gate: A catalog entry can be inspected and verified without automatic installation or activation.

## Triage Assessment (AGENT_TASK_TRIAGE_POLICY.md)

- **Score:** 5 / 10
  - Blast Radius: 2 (touches protocol, validator, application barrel files and contracts)
  - Ambiguity: 0 (well-defined roadmap specification and contracts)
  - Risk: 1 (user-visible standards behavior, untrusted data validation)
  - Verification: 2 (full `pnpm verify` gate, staged checks, diff checks)
  - Unknowns: 0 (follows established Q1-Q9 architecture patterns)
- **Route:** `plan` -> `implement` -> `review` -> `verification gate` (`aif-task-router`: `plan`)
- **Recommended Model / Effort:** Gemini 3.6 Flash (Medium) / High Effort
- **Required Skills:** `aif-task-router`, `aif-extension-review`
- **Required Checks:**
  - `pnpm typecheck`
  - `pnpm lint` (oxlint)
  - `pnpm format:check`
  - `pnpm test`
  - `pnpm build`
  - `pnpm verify`
  - `pnpm verify:staged`
  - `git diff --cached --check`
  - Remote PR CI verification (Compatibility, Governance, CodeQL)
- **Stop Condition:** `implementation_plan_q10.md` created and approved by user before production code implementation; upon completion and validation, draft PR created, `DUTY_WATCH.md` and `PROJECT_STATE.md` updated, remote CI checks verified green.

## Architectural Boundaries & Clean Architecture

Following the repository's Clean Architecture standards:

1. **Protocol (`packages/protocol/src/engineering-quality/curated-catalog.ts`)**:
   - Defines canonical URNs:
     - `QUALITY_CATALOG_ENTRY_SCHEMA_URN = "urn:intentloom:schema:engineering-quality-catalog-entry:1"`
     - `QUALITY_CATALOG_LOCK_SCHEMA_URN = "urn:intentloom:schema:engineering-quality-catalog-lock:1"`
     - `QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN = "urn:intentloom:schema:engineering-quality-catalog-update-diff:1"`
     - `QUALITY_CATALOG_REVOCATION_SCHEMA_URN = "urn:intentloom:schema:engineering-quality-catalog-revocation:1"`
     - `QUALITY_CATALOG_QUARANTINE_SCHEMA_URN = "urn:intentloom:schema:engineering-quality-catalog-quarantine:1"`
   - Defines canonical types & interfaces:
     - `CatalogTrustClass` ("first-party" | "curated-third-party" | "organization")
     - `CatalogPackClass` ("data-only" | "executable-checker" | "remediation")
     - `CatalogSupportStatus` ("supported" | "deprecated" | "yanking" | "revoked")
     - `CatalogSearchQuery`
     - `CatalogEntry`
     - `CatalogSearchResult`
     - `QuarantineArtifact`
     - `EngineeringQualityPackLock`
     - `EngineeringQualityPackUpdateDiff`
     - `EngineeringQualityRevocationState`
2. **Validator (`packages/validator/src/engineering-quality/curated-catalog.ts`)**:
   - Implements strict runtime schema validation for untrusted payloads:
     - `validateCatalogEntry(data: unknown): CatalogEntry`
     - `validateCatalogSearchQuery(data: unknown): CatalogSearchQuery`
     - `validateQuarantineArtifact(data: unknown): QuarantineArtifact`
     - `validateEngineeringQualityPackLock(data: unknown): EngineeringQualityPackLock`
     - `validateEngineeringQualityPackUpdateDiff(data: unknown): EngineeringQualityPackUpdateDiff`
     - `validateEngineeringQualityRevocationState(data: unknown): EngineeringQualityRevocationState`
3. **Application (`packages/application/src/engineering-quality/curated-catalog.ts`)**:
   - Pure deterministic operations:
     - `searchEngineeringCatalog(catalog: readonly CatalogEntry[], query: CatalogSearchQuery): CatalogSearchResult`
     - `inspectEngineeringCatalogEntry(catalog: readonly CatalogEntry[], packId: string, version?: string): CatalogEntry`
     - `verifyQuarantineArtifact(entry: CatalogEntry, rawContent: string | Uint8Array, expectedDigest?: string): QuarantineArtifact`
     - `comparePackLock(currentLock: EngineeringQualityPackLock, targetPacks: readonly { id: string; version: string; digest: string }[]): EngineeringQualityPackLock`
     - `diffEngineeringQualityPackUpdates(currentEntry: CatalogEntry, targetEntry: CatalogEntry): EngineeringQualityPackUpdateDiff`
     - `evaluateRevocationState(entry: CatalogEntry): EngineeringQualityRevocationState`
     - `FIRST_PARTY_CATALOG_ENTRIES`: Pre-populated dataset of first-party catalog metadata for built-in quality packs.
4. **Re-exports / Entry Points**:
   - Re-export modules in `packages/protocol/src/engineering-quality/index.ts`, `packages/validator/src/engineering-quality/index.ts`, and `packages/application/src/engineering-quality/index.ts` via separate `curated-catalog.ts` files to keep production files strictly <250 lines.

## Code Quality & Line Budgets

- Hand-written production files: **<250 lines** target (hard limit 400 lines).
- Function budgets: **<40 lines** target (hard limit 80 lines).
- Complexity: **<10** per function.
- Tests: **<400 lines** target per file (hard limit 700 lines).

## Security & Safety Controls

- Untrusted Data Handling: Every catalog/quarantine payload passes validator checks before application logic.
- Digest & Pin Binding: Quarantine verification calculates crypto SHA-256 digest over raw content and matches `entry.contentDigest`. Fail closed on mismatch or revoked/yanked status.
- Zero Network Side-Effects: Operations remain 100% pure and deterministic. No hidden fetch, telemetry, background updates, or shell executions.
- Data-Only Quarantine: Data-only quarantine representation without executing code or auto-activating.

## Verification Plan

### Automated Tests

- Unit/Contract test file: `tests/engineering-quality-curated-catalog.test.ts`
  - Catalog search (by query, trust class, category, pagination).
  - Catalog inspection (exact packId, version resolution, missing pack handling).
  - Quarantine artifact verification (valid SHA-256 content digest, tampered digest rejection, revoked/yanked closed rejection).
  - Pack lock generation and comparison.
  - Pack update diffing (added/removed rules, version change classification).
  - Revocation & yanking fail-closed behavior.
  - Validator boundary testing against malformed/untrusted inputs.

### Full Pipeline Verification

- `pnpm verify` (typecheck, oxlint, format:check, vitest tests, tsc build, git diff --check)
- `pnpm verify:staged`
- `git diff --cached --check`

### Post-Implementation & Review

- Manual review of Clean Architecture, standards, and security/extension review.
- Documentation update: `DUTY_WATCH.md` and `PROJECT_STATE.md`.
- Draft PR creation via `gh pr create --draft`.
- Verification of remote GitHub Actions CI status.
