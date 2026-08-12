# Intentloom dogfooding record: workspace starter scaffold

**Date:** 2026-08-12
**Intentloom version:** `0af87a1` (main) + W8 Core branch
**Scenario:** typescript
**Project:** Deterministic pnpm workspace starter generated through Foundation Workshop extensible blueprint and scaffold prepare/validate/apply fixtures
**Profile and adapters:** Foundation Workshop; engineering workspace scaffold apply
**Environment:** Node 22, macOS (local developer checkout)

## Commands and evidence

- `pnpm vitest run tests/foundation-scaffold-workspace.test.ts tests/inception-workspace-scaffold.test.ts`: exit 0; workspace plan includes `packages/core`, `packages/react`, `packages/testing`, `examples/vanilla-basic`, `examples/react-basic`, optional local-only `nx.json`
- `prepareProjectScaffold` + `validateWorkspaceScaffoldPlan`: exit via test harness; inward dependency invariants pass (packages do not reference `examples/`)
- `applyFoundationProjectScaffold` on empty root: covered by existing W7 apply fixtures; workspace plans reuse the same transactional boundary
- No dependency installation, Git init, remote creation, or CI provider actions were executed (explicit non-goal)

## Compatibility observations

- Generated paths: pnpm workspace root, scoped package manifests, TypeScript project references, examples consuming packages via `workspace:*`
- Schema/config compatibility: foundation scaffold plan digest + template id `typescript-pnpm-workspace-starter@1`
- Adapter-specific behavior: none; deterministic application-layer generation only
- Unexpected output: none in fixture path; isolated package install verification remains a follow-up manual step outside automated scaffold generation

## Conclusion

Pass with follow-up

Workspace starter generation and invariants are verified deterministically through Foundation + I7/W8 fixtures. A follow-up manual pnpm install/build in a clean directory remains recommended before calling W8 fully dogfooded on a real filesystem project.
