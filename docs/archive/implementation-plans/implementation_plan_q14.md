# Engineering Quality Packs: Phase Q14 Desktop and TUI

## Overview

Implement Phase Q14 (Desktop and TUI) from `ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md` on top of merged Phase Q13 (#266).

Phase Q14 provides:

1. **Desktop & TUI Viewmodels (`packages/application/src/engineering-quality/viewmodel.ts`)**:
   - `buildQualityStandardsViewModel`: Effective policy, threshold limits, artifact classifications, active findings, baseline preview state, and decomposition plan options.
   - `buildQualityCatalogViewModel`: Catalog entries, trust class, versioning, digests, capability flags, activation approval states, and update diff previews.
   - `buildQualityCheckersViewModel`: Built-in checker adapters, format support, project-pinned run previews, and normalized findings.
   - `buildQualityGraphViewModel`: Graph provider metadata, node/edge topology, affected projects, module boundary violations, and accessible tree/table alternatives.
2. **Accessible Renderers & Approval Previews (`packages/application/src/engineering-quality/viewmodel-renderers.ts`)**:
   - Structured Desktop view state representations for rich UI components.
   - Accessible TUI tree/table text renderers for terminal clients.
   - Approval preview renderers for baseline exceptions, external pack activations, and decomposition plans.

3. **Test Suite (`tests/desktop-tui-engineering-quality.test.ts`)**:
   - Tests validating Desktop & TUI viewmodels, equivalence with CLI results across identical project fixtures, accessible alternative trees, and approval previews.

---

## Triage Assessment (AGENT_TASK_TRIAGE_POLICY.md)

- **Score:** 6/10 (Blast Radius: 2, Ambiguity: 1, Risk: 1, Verification: 2, Unknowns: 0)
- **Tier:** Mid Tier / High Effort
- **Model:** Antigravity Pro (High Effort)
- **Stop Condition:** `pnpm verify` green, `PROJECT_STATE.md` and `DUTY_WATCH.md` updated, staged quality checks verified, committed (`feat(quality): add desktop and tui viewmodels (#267)`), pushed to `origin`, draft PR #267 created, and GitHub Actions CI verified.

---

## Proposed Changes

### `packages/application`

#### [NEW] [`packages/application/src/engineering-quality/viewmodel.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/viewmodel.ts)

#### [NEW] [`packages/application/src/engineering-quality/viewmodel-renderers.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/viewmodel-renderers.ts)

#### [NEW] [`packages/application/src/quality-viewmodel-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/quality-viewmodel-entry.ts)

#### [MODIFY] [`packages/application/src/engineering-quality/index.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/index.ts)

#### [MODIFY] [`packages/application/src/engineering-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality-entry.ts)

---

### Tests & Documentation

#### [NEW] [`tests/desktop-tui-engineering-quality.test.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/tests/desktop-tui-engineering-quality.test.ts)

#### [MODIFY] [`PROJECT_STATE.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/PROJECT_STATE.md)

#### [MODIFY] [`DUTY_WATCH.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/DUTY_WATCH.md)

---

## Verification Plan

### Automated Tests

- `pnpm vitest run tests/desktop-tui-engineering-quality.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `npx prettier --check`
- `pnpm verify` (full repository verification gate)
- `pnpm verify:staged && git diff --cached --check`

### Remote CI Verification

- Push branch `feat/engineering-quality-q14-desktop-tui-viewmodels`
- Create draft PR #267
- Verify all 25 GitHub Actions check runs complete with SUCCESS.
