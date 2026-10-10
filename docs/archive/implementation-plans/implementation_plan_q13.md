# Engineering Quality Packs: Phase Q13 CLI and JSON Surface

## Overview

Implement Phase Q13 (CLI and JSON Surface) from `ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md` on top of merged Phase Q12 (#265).

Phase Q13 provides:

1. **CLI Commands (`apps/cli` / `packages/application`)**:
   - `intentloom quality` / `intentloom standards`: `show --effective`, `check --root .`, `explain <RULE_ID>`, `baseline preview`, `decomposition plan <PATH>`.
   - `intentloom packs`: `list`, `search <QUERY>`, `inspect <PACK_ID@VERSION>`, `verify <PACK_ID@VERSION>`, `diff <PACK_ID@OLD> <PACK_ID@NEW>`.
   - `intentloom checkers`: `list`, `inspect <CHECKER_ID>`, `consume <REPORT_PATH> --adapter <ADAPTER_ID>`, `run <CHECKER_ID> --root . --dry-run`.
   - `intentloom graph`: `detect`, `inspect --provider <nx|ts>`, `affected --base <BASE> --head <HEAD>`.
2. **Output & Exit Codes**:
   - Machine-readable `--json` output format for all commands.
   - Stable exit codes: `0` for success / within-policy, `1` for errors / policy violations.
   - Zero hidden mutations or file writes.

3. **Test Suite (`tests/cli-engineering-quality.test.ts`)**:
   - Tests covering all quality CLI subcommands, `--json` serialization, human output formatting, exit codes, and non-mutation assertions.

---

## Triage Assessment (AGENT_TASK_TRIAGE_POLICY.md)

- **Score:** 6/10 (Blast Radius: 2, Ambiguity: 1, Risk: 1, Verification: 2, Unknowns: 0)
- **Tier:** Mid Tier / High Effort
- **Model:** Antigravity Pro (High Effort)
- **Stop Condition:** `pnpm verify` green, `PROJECT_STATE.md` and `DUTY_WATCH.md` updated, staged quality checks verified, committed (`feat(quality): add cli and json surface (#266)`), pushed to `origin`, draft PR #266 created, and GitHub Actions CI verified.

---

## Proposed Changes

### `packages/application` / `apps/cli`

#### [NEW] [`packages/application/src/engineering-quality/cli-commands.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/cli-commands.ts)

#### [NEW] [`packages/application/src/cli-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/cli-quality-entry.ts)

#### [MODIFY] [`packages/application/src/engineering-quality/index.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality/index.ts)

#### [MODIFY] [`packages/application/src/engineering-quality-entry.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/packages/application/src/engineering-quality-entry.ts)

---

### Tests & Documentation

#### [NEW] [`tests/cli-engineering-quality.test.ts`](file:///Users/eugenekasap/WebstormProjects/Intentloom/tests/cli-engineering-quality.test.ts)

#### [MODIFY] [`PROJECT_STATE.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/PROJECT_STATE.md)

#### [MODIFY] [`DUTY_WATCH.md`](file:///Users/eugenekasap/WebstormProjects/Intentloom/DUTY_WATCH.md)

---

## Verification Plan

### Automated Tests

- `pnpm vitest run tests/cli-engineering-quality.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `npx prettier --check`
- `pnpm verify` (full repository verification gate)
- `pnpm verify:staged && git diff --cached --check`

### Remote CI Verification

- Push branch `feat/engineering-quality-q13-cli-json-surface`
- Create draft PR #266
- Verify all 25 GitHub Actions check runs complete with SUCCESS.
