# Engineering Quality Packs: Phase Q12 Nx Graph and Boundary Integration

## Overview

Implement Phase Q12 (Nx Graph and Boundary Integration) from `ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md` on top of merged Phase Q11 (#264).

Phase Q12 provides:

1. **Protocol Layer (`packages/protocol`)**:
   - `QUALITY_NX_GRAPH_SCHEMA_URN` (`urn:intentloom:schema:engineering-nx-graph:v1`) and `QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN` (`urn:intentloom:schema:engineering-nx-boundary-rule:v1`).
   - Canonical types: `NxWorkspaceMetadata`, `NxProjectDefinition`, `NxTargetDefinition`, `NxBoundaryRule`, `NxGraphAcquisitionMode` (`"cached-graph" | "project-metadata" | "bounded-export" | "unsupported"`), `NxDependencyCause`, `NxGraphFinding`.

2. **Validator Layer (`packages/validator`)**:
   - Strict runtime validators: `validateNxWorkspaceMetadata`, `validateNxBoundaryRule`, `validateNxGraphFinding`.

3. **Application Layer (`packages/application`)**:
   - `detectNxWorkspace`: Inspects repository files (`nx.json`, `workspace.json`, `project.json`, `package.json`, `node_modules/.cache/nx`) to detect Nx workspaces read-only without executing package managers or network calls.
   - `acquireNxGraphSnapshot`: Safely acquires Nx graph snapshots using fallback modes (cached graph artifact -> project metadata files -> bounded export preview -> unsupported).
   - `validateNxModuleBoundaries`: Evaluates Nx tag boundary constraints (`onlyDependOnLibsWithTags`, `bannedExternalImports`, `depConstraints`) against snapshot edges, capturing exact dependency causes (e.g. source file or target edge).
   - `resolveNxAffectedProjects`: Determines affected projects using Nx graph traversal and change paths.

4. **Test Suite (`tests/engineering-quality-nx-graph.test.ts`)**:
   - Unit tests covering Nx workspace detection, multi-mode acquisition, tag/boundary violation enforcement with cause tracking, affected project resolution, and validator schema boundaries.

---

## Triage Assessment (AGENT_TASK_TRIAGE_POLICY.md)

- **Score:** 6/10 (Blast Radius: 2, Ambiguity: 1, Risk: 1, Verification: 2, Unknowns: 0)
- **Tier:** Mid Tier / High Effort
- **Model:** Antigravity Pro (High Effort)
- **Stop Condition:** `pnpm verify` green, `PROJECT_STATE.md` and `DUTY_WATCH.md` updated, staged quality checks verified, committed (`feat(quality): add nx graph and boundary integration (#265)`), pushed to `origin`, draft PR #265 created, and GitHub Actions CI verified.

---

## Proposed Changes

### `packages/protocol`

#### [NEW] [`packages/protocol/src/engineering-quality/nx-graph.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality/nx-graph.ts)

#### [NEW] [`packages/protocol/src/nx-graph-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/nx-graph-entry.ts)

#### [MODIFY] [`packages/protocol/src/engineering-quality/index.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality/index.ts)

#### [MODIFY] [`packages/protocol/src/engineering-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality-entry.ts)

---

### `packages/validator`

#### [NEW] [`packages/validator/src/engineering-quality/nx-graph.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality/nx-graph.ts)

#### [NEW] [`packages/validator/src/nx-graph-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/nx-graph-entry.ts)

#### [MODIFY] [`packages/validator/src/engineering-quality/index.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality/index.ts)

#### [MODIFY] [`packages/validator/src/engineering-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality-entry.ts)

---

### `packages/application`

#### [NEW] [`packages/application/src/engineering-quality/nx-graph.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/nx-graph.ts)

#### [NEW] [`packages/application/src/nx-graph-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/nx-graph-entry.ts)

#### [MODIFY] [`packages/application/src/engineering-quality/index.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/index.ts)

#### [MODIFY] [`packages/application/src/engineering-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality-entry.ts)

---

### Tests & Documentation

#### [NEW] [`tests/engineering-quality-nx-graph.test.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/tests/engineering-quality-nx-graph.test.ts)

#### [MODIFY] [`PROJECT_STATE.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/PROJECT_STATE.md)

#### [MODIFY] [`DUTY_WATCH.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/DUTY_WATCH.md)

---

## Verification Plan

### Automated Tests

- `pnpm vitest run tests/engineering-quality-nx-graph.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `npx prettier --check`
- `pnpm verify` (full repository verification gate)
- `pnpm verify:staged && git diff --cached --check`

### Remote CI Verification

- Push branch `feat/engineering-quality-q12-nx-graph-boundary-integration`
- Create draft PR #265
- Verify all 25 GitHub Actions check runs complete with SUCCESS.
