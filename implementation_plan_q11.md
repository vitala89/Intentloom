# Implementation Plan - Phase Q11: Graph-Provider Contracts

Implementation plan for **Phase Q11: Graph-provider contracts** under `docs/roadmap/ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md`.

## Goal

Provide provider-neutral, data-only normalized graph schemas, TypeScript/workspace and Nx graph providers, architecture rule validation against normalized graphs, affected scope resolution, and deterministic graph snapshot digests.

## User Review Required

> [!NOTE]
> Phase Q11 introduces provider-neutral architecture graph contracts and pure application operations. Graph provider generation operates on caller-supplied data structures (e.g. workspace declarations or exported Nx project graphs). External process execution, network calls, and Nx Cloud uploads remain strictly out of scope.

## Open Questions

None. The specifications follow the existing Clean Architecture patterns established in Q1–Q10.

## Proposed Changes

### Protocol Layer

#### [NEW] [graph-provider.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality/graph-provider.ts)

- Versioned schema URNs (`QUALITY_GRAPH_PROVIDER_SCHEMA_URN`, `QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN`).
- Types: `GraphProviderKind`, `GraphNodeType`, `GraphEdgeType`, `GraphNode`, `GraphEdge`, `EngineeringGraphSnapshot`, `EngineeringArchitectureRule`, `EngineeringGraphFinding`.

#### [NEW] [graph-provider-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/graph-provider-entry.ts)

- Re-exports `./engineering-quality/graph-provider.js`.

#### [MODIFY] [index.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality/index.ts)

#### [MODIFY] [engineering-quality-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/protocol/src/engineering-quality-entry.ts)

---

### Validator Layer

#### [NEW] [graph-provider.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality/graph-provider.ts)

- Strict runtime validators: `validateEngineeringGraphSnapshot`, `validateEngineeringArchitectureRule`.

#### [NEW] [graph-provider-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/graph-provider-entry.ts)

- Re-exports `./engineering-quality/graph-provider.js`.

#### [MODIFY] [index.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality/index.ts)

#### [MODIFY] [engineering-quality-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/validator/src/engineering-quality-entry.ts)

---

### Application Layer

#### [NEW] [graph-provider.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/graph-provider.ts)

- Pure deterministic application operations:
  - `createGraphSnapshotFromTypeScriptWorkspace`
  - `createGraphSnapshotFromNxWorkspace`
  - `validateArchitectureAgainstGraph`
  - `resolveAffectedEngineeringScopes`

#### [NEW] [graph-provider-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/graph-provider-entry.ts)

- Re-exports `./engineering-quality/graph-provider.js`.

#### [MODIFY] [index.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/index.ts)

#### [MODIFY] [engineering-quality-entry.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality-entry.ts)

---

### Test Suite

#### [NEW] [engineering-quality-graph-provider.test.ts](file:///Users/eugenekasap/WebstormProjects/Intentloom/tests/engineering-quality-graph-provider.test.ts)

- Unit and contract tests verifying:
  - TypeScript workspace graph snapshot generation & digest calculation.
  - Nx workspace graph snapshot generation & tag mapping.
  - Same architecture rule running on both TypeScript & Nx graph snapshots (exit gate).
  - Transitive affected scope resolution.
  - Validator rejection of invalid graph snapshots or rules.

## Verification Plan

### Automated Tests

- `pnpm vitest run tests/engineering-quality-graph-provider.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm verify` (full gate)
- `pnpm verify:staged`
