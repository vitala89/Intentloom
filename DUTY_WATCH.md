# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and
maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the
current state, records what happened during the watch, and leaves the repository
in a condition that the next watch can safely understand and continue.

## Current watch status

Status: Portable Adoption Phase 1 implementation awaiting CI

Active branch: `feat/portable-adoption-contracts`

Current objective: implement deterministic portable-adoption contracts and the
synthetic Applye reference fixture.

Next first action: observe PR CI, correct any contract, type, formatting, or test
failure, then complete the watch and merge after approval.

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

### 2026-07-24, Portable Adoption Phase 1 contracts

- **Status:** partial
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `feat/portable-adoption-contracts`
- **Objective:** Implement versioned portable-adoption contracts, deterministic
  planning primitives, runtime validation, and a synthetic Applye fixture.
- **Completed:** Added governance roles, ownership classes, findings, operations,
  validations, exceptions, migration journal, and adoption plan types. Added
  stable serialization, deterministic identifiers, a deterministic read-only
  governance planner, plan-envelope validation, an Applye fixture, and tests for
  role mapping, provider derivatives, duplicate-state prevention, ambiguity, and
  path safety. Updated the active project milestone.
- **Files changed:** `packages/core/src/adoption.ts`,
  `packages/core/package.json`, `tests/adoption-contracts.test.ts`,
  `tests/fixtures/adoption/applye.json`, `PROJECT_STATE.md`, and
  `DUTY_WATCH.md`.
- **Validation:** Local execution was unavailable because the execution
  environment could not resolve GitHub for a clean clone. GitHub Compatibility
  CI is required before this watch can be complete.
- **Decisions:** Phase 1 remains deterministic and read-only. Existing filenames
  map to canonical roles. Equal-confidence source-of-truth candidates produce an
  ambiguous finding and disable automatic apply. No mutation engine, network
  access, hooks, or dependency installation was added.
- **Risks or compatibility impact:** The new contracts are exported through the
  `@intentloom/core/adoption` subpath. Runtime plan parsing currently validates
  the versioned envelope, while planner construction validates artifact paths,
  hashes, ownership, and confidence values.
- **Open issues or blockers:** CI, final diff review, and PR merge remain pending.
- **Next first action:** Open the pull request, observe all compatibility jobs,
  fix any failures, and then mark this entry complete.
- **Evidence:** branch commits, upcoming pull request, and GitHub Actions.

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
