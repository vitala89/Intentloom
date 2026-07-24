# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and
maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the
current state, records what happened during the watch, and leaves the repository
in a condition that the next watch can safely understand and continue.

## Current watch status

Status: Portable Adoption Phase 5 merged; Phase 6 provider synchronization active

Active branch: `main`

Current objective: implement provider-specific instruction derivative generation (Claude Code, Codex, Cursor, Copilot, Antigravity, Gemini CLI), drift detection, local section preservation, and provider diffing (`intentloom diff` / `intentloom sync`).

Next first action: create implementation plan for Phase 6, verify adapter generators, test drift detection and local section preservation across provider files.

## Watch rules

- Read the latest entry before starting work.
- Verify important claims against code, Git history, pull requests, releases,
  and CI.
- Never overwrite historical entries to hide mistakes or unfinished work.
- Append a new entry for each meaningful completed task or work session.
- Small typo-only changes may share one entry when performed in the same branch
  and pull request.
- Record partial work honestly. Use `incomplete` when the objective was not
  finished.
- A watch cannot be marked `complete` until required validation and
  documentation updates are finished.
- The next action must be concrete enough for a new agent to begin without
  guessing.
- Do not include secrets, credentials, private user data, or hidden
  chain-of-thought.

## Entry template

Copy the template from `docs/templates/DUTY_WATCH_ENTRY.md` and place the newest
entry directly below this section.

## Watch entries

### 2026-07-25, Portable Adoption Phase 6 provider synchronization (`intentloom sync` / `intentloom diff`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-provider-sync`
- **Objective:** Implement provider-specific instruction derivative generation, drift detection, local section preservation, pre-synchronization diffing (`intentloom diff` / `intentloom sync`), and test coverage.
- **Completed:** Verified provider instruction derivative generation across all supported adapters (`claude`, `codex`, `cursor`, `copilot`), ensured `buildTransactionMetadata` safety against missing pins, implemented CLI integration tests in `tests/cli-provider-sync.test.ts` verifying drift detection, local section preservation, diff proposals, and dry-run safety. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `tests/cli-provider-sync.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Canonical policy remains the single source of truth; provider derivative files can be regenerated without losing documented user-owned local extensions.
- **Risks or compatibility impact:** None. Completes the 6-phase Portable Adoption & Migration roadmap.
- **Next first action:** Open PR for `feat/intentloom-provider-sync`, observe CI, merge after approval.
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 5 conformance and security profiles (`intentloom conformance`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-conformance-profiles`
- **Objective:** Implement project stack profile detection (Nx, SQLite, sensitive security profiles), evidence-linked conformance evaluation, CLI routing, and test coverage.
- **Completed:** Expanded `detectProjectProfiles` in `@intentloom/application` to detect Nx monorepo (`nx`), SQLite database (`sqlite`), and sensitive security profiles (`security-sensitive`). Updated `intentloom conformance` CLI handler in `@intentloom/cli` to use `fileSystem.read` for memory filesystem compatibility. Added unit/integration test suite in `tests/cli-conformance-profiles.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-conformance-profiles.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stack detection automatically identifies Nx, SQLite, and sensitive security paths (stealth, credentials, secrets) to enforce evidence-linked deterministic conformance rules.
- **Risks or compatibility impact:** None. Backwards compatible profile expansion.
- **Next first action:** Open PR for `feat/intentloom-conformance-profiles`, observe CI, merge after approval, and prepare Phase 6 (Provider Synchronization).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 4 pack update and three-way migration (`intentloom update --plan` / `--apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-pack-update`
- **Objective:** Implement pack update planning operation `planPackUpdate`, 3-way migration comparison algorithm, CLI routing for `intentloom update --plan` and `intentloom update --apply`, and test coverage.
- **Completed:** Added `planPackUpdate` application operation in `@intentloom/application` to evaluate 3-way diffs between base pack version, project state, and target pack version. Implemented CLI routing for `intentloom update --plan` and `intentloom update --apply` supporting `--json`, `--output`, `--strict`, and `--dry-run` flags, and added unit/integration test suite in `tests/cli-pack-update.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-pack-update.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** 3-way comparison guarantees local customizations are preserved and conflicts are explicitly flagged instead of silently overwritten upon pack version upgrade. Update plans execute transactionally via `applyProjectAdoption`.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-pack-update`, observe CI, merge after approval, and prepare Phase 5 (Conformance and Security Profiles).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 3 transactional apply and rollback (`intentloom adopt --apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-apply`
- **Objective:** Implement transactional adoption execution (`intentloom adopt --apply <plan>`), expectedCurrentHash stale content guards, migration journal recording, atomic failure rollback, and test coverage.
- **Completed:** Added `applyProjectAdoption` application operation in `@intentloom/application` to validate plan envelopes, verify `expectedCurrentHash` invariants, create pre-apply file backups, execute approved operations, and append `.aif/migration-journal.json` entries. Implemented CLI routing for `intentloom adopt --apply` with `--json` and `--dry-run` flags, exit code 3 mapping for stale hash or invalid plan errors, exit code 4 for rollback recovery, and full unit/integration test suite in `tests/cli-adopt-apply.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-apply.test.ts`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stale hash mismatches immediately abort execution with exit code 3 before modifying any files. Rollback automatically restores original pre-apply file contents and removes newly created files. `.aif/migration-journal.json` records transaction history.
- **Risks or compatibility impact:** None. Backwards compatible transactional apply addition.
- **Next first action:** Open PR for `feat/intentloom-adopt-apply`, observe CI, merge after approval, and prepare Phase 4 (Pack Update & 3-Way Migration).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 2 interactive proposal (`intentloom adopt --plan`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-plan`
- **Objective:** Implement interactive adoption proposal scanning operation and `intentloom adopt --plan` CLI command.
- **Completed:** Added `planProjectAdoption` application operation in `@intentloom/application` to scan project artifacts, compute hashes, detect governance role candidates, and invoke deterministic governance adoption planner. Implemented CLI routing for `intentloom adopt --plan` supporting `--json`, `--output`, and `--strict` flags, human-readable Markdown adoption plan formatter `formatGovernanceAdoptionPlan`, and full unit/integration test suite. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-plan.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** `adopt --plan` remains strictly read-only. It scans project files without writing or deleting any target project files. `--strict` returns exit code 3 on ambiguous/conflicting findings or when automatic apply is disallowed.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-adopt-plan`, observe CI, merge after approval, and prepare Phase 3 (Transactional Apply & Rollback).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 1 contracts

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/portable-adoption-contracts`
- **Pull request:** #53
- **Objective:** Implement versioned portable-adoption contracts, deterministic
  planning primitives, runtime validation, `@intentloom/core/adoption` exports, and a synthetic Applye fixture.
- **Completed:** Added governance roles, ownership classes, findings, operations,
  validations, exceptions, migration journal, and adoption plan types. Added
  stable serialization, deterministic identifiers, a deterministic read-only
  governance planner, plan-envelope validation, path-sort fix, vitest/tsconfig aliases, an Applye fixture, and tests.
- **Files changed:** `packages/core/src/adoption.ts`, `packages/core/package.json`, `tests/adoption-contracts.test.ts`, `tests/fixtures/adoption/applye.json`, `tsconfig.base.json`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** All 589 tests across 51 test suites passed. Compatibility CI run #30127658406 passed on Node 22/24 on Ubuntu, macOS, and Windows. Merged into `main`.
- **Decisions:** Phase 1 remains deterministic and read-only. `@intentloom/core/adoption` subpath export established.
- **Risks or compatibility impact:** None. Fully backwards compatible read-only contracts.
- **Open issues or blockers:** None. Phase 1 complete.
- **Next first action:** Begin Portable Adoption Phase 2: interactive adoption proposal and `intentloom adopt --plan` CLI command.
- **Evidence:** merged PR #53 commit `f2cf5d6` and GitHub Actions run #30127658406.

### 2026-07-24, Portable Duty Watch adoption and migration contract

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `feat/portable-duty-watch-adoption`
- **Pull request:** #52
- **Objective:** Define how Intentloom safely adopts and updates mature existing
  projects, using Applye as the first reference consumer.
- **Completed:** Defined the analysis-first adoption lifecycle, canonical role
  mapping, duplicate classification, proposal and approval model, transactional
  apply, three-way pack updates, rollback, conformance, security profiles,
  provider synchronization, portable Duty Watch pack contract, and Applye
  reference fixture expectations.
- **Files changed:** `docs/concepts/PORTABLE_DUTY_WATCH_ADOPTION.md`,
  `docs/roadmap/PORTABLE_ADOPTION_AND_MIGRATION_PLAN.md`,
  `catalog/packs/duty-watch/README.md`,
  `docs/fixtures/APPLYE_DUTY_WATCH_ADOPTION.md`, and `DUTY_WATCH.md`.
- **Validation:** Compatibility CI passed before final merge preparation. The
  branch was rebuilt directly on current `main` to remove stacked-branch merge
  conflicts without changing the approved documentation scope.
- **Decisions:** Adoption uses canonical roles rather than fixed filenames.
  Existing project-owned files are mapped and preserved. Pack updates use a
  three-way comparison between the old pack, current project, and new pack.
  Ambiguous, destructive, executable, privacy, and security changes require
  explicit approval.
- **Risks or compatibility impact:** This watch defines contracts only. It does
  not claim the planner, pack runtime, transactional migration, conformance
  engine, or security automation are already implemented.
- **Open issues or blockers:** Phase 1 runtime schemas, planner code, fixtures,
  and tests remain unimplemented.
- **Next first action:** Implement the adoption-plan and ownership schemas plus
  deterministic Applye fixture tests.
- **Evidence:** merged PR #51, PR #52, branch history, and CI results.

### 2026-07-24, Duty Watch governance foundation

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `docs/duty-watch-agent-handoff`
- **Pull request:** #51
- **Objective:** Create a default project context and handoff system for Claude
  Code, Codex, Antigravity, and other repository agents.
- **Completed:** Added the mandatory entrypoint, durable project state, Duty
  Watch log, governance documents, templates, and repository agent rules.
- **Files changed:** `AGENT_START_HERE.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`,
  governance and template files, and `AGENTS.md`.
- **Validation:** Required compatibility checks passed before merge.
- **Decisions:** The handoff system is named Duty Watch. `PROJECT_STATE.md`
  stores durable state, while `DUTY_WATCH.md` stores chronological handoffs.
  Documentation updates are part of Definition of Done.
- **Open issues:** Portable adoption and migration remained follow-up work.
- **Next action:** Define portable Duty Watch adoption for existing projects.
- **Evidence:** merged PR #51 and repository history.
