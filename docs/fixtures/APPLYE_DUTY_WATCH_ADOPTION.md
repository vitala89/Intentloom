# Applye Duty Watch Adoption Reference

This fixture documents the expected analysis result for the private Applye
repository without copying private source content into Intentloom.

## Detected project profile

- Nx monorepo;
- Angular and TypeScript frontend;
- Tauri 2 and Rust backend;
- SQLite migrations;
- local-first privacy-sensitive product;
- opt-in AI providers and local CLI bridges;
- existing AIF-era agent governance;
- existing operational state, roadmap, phased plan, changelog, design system,
  and provider instructions.

## Expected canonical mappings

- `agent-entrypoint` maps to `AGENT_START_HERE.md`; create it on first adoption,
  then manage it through reviewed updates.
- `working-agreement` maps to `AGENTS.md`; preserve it and merge only approved
  Duty Watch sections.
- `durable-project-context` maps to `PROJECT_CONTEXT.md`; map the existing file
  and do not duplicate it.
- `operational-project-state` maps to `docs/product/CURRENT_STATE.md`; never
  create a competing `PROJECT_STATE.md`.
- `duty-watch-log` maps to `DUTY_WATCH.md`; create it on first adoption and
  append thereafter.
- `validation-policy` maps to `docs/governance/VALIDATION_MATRIX.md`; create it
  from the detected stack, then preserve project customization.
- `provider-instructions:claude` maps to `CLAUDE.md`; classify it as a provider
  derivative with project-owned extensions.
- `roadmap` maps to `ROADMAP.md`.
- `execution-plan` maps to `STEP_BY_STEP_PLAN.md`.
- `changelog` maps to `CHANGELOG.md`.

## Expected first-adoption findings

- existing state and context files already fulfil canonical Intentloom roles;
- adding `PROJECT_STATE.md` would create a role duplicate and must not be
  proposed;
- `CLAUDE.md` repeats some canonical policy intentionally and should be treated
  as a provider derivative, not deleted;
- Applye needs project-specific validation for Angular, Nx, Rust, SQLite, Tauri,
  privacy, security, provider integrations, and native desktop checks;
- existing AIF instructions must be upgraded incrementally rather than replaced
  wholesale.

## Expected update behavior

When the Duty Watch pack changes, Intentloom should compare the previously
installed pack, current Applye files, and the new pack.

Examples:

- a new universal safety rule can be proposed as a section-level merge into
  `AGENTS.md`;
- an updated Claude adapter can be proposed for the managed region of
  `CLAUDE.md`, while preserving Applye-specific token and attribution rules;
- a new validation category can be proposed in the validation matrix without
  replacing existing commands;
- a renamed default state file must produce no change because Applye's accepted
  role mapping remains valid;
- a deprecated duplicated instruction should be proposed for consolidation,
  with both versions shown and no deletion until approval.

## Required acceptance tests

1. First plan is read-only and proposes no duplicate operational state file.
2. Applying an approved plan changes only approved paths.
3. A repeated plan after apply is empty.
4. Local edits inside project-owned regions survive a pack update.
5. Managed-region drift is detected and shown as a diff.
6. Ambiguous role assignment blocks automatic apply.
7. A simulated write failure restores the original repository tree.
8. A stale approved plan is rejected when an expected file hash changed.
9. Secrets and private user data are redacted from reports.
10. Accepted exceptions are remembered and are not re-proposed without changed
    evidence.

This reference fixture is a contract for future automated fixtures and tests. It
does not claim that the planner and migration engine already implement these
behaviors.
