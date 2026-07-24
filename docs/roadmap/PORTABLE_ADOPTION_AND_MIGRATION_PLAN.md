# Portable Adoption and Migration Plan

This plan turns Duty Watch from repository-local governance into a reusable
Intentloom capability for existing projects.

## Phase 1: contracts and reference fixture

- define canonical governance roles independently from filenames;
- define adoption-plan, operation, ownership, exception, validation, and
  migration-journal schemas;
- add a portable Duty Watch pack contract;
- add an Applye reference fixture representing an already mature AIF-era
  project;
- test that adoption maps `docs/product/CURRENT_STATE.md` instead of creating
  `PROJECT_STATE.md`;
- test exact duplicates, role duplicates, partial overlap, provider derivatives,
  and ambiguous files;
- require dry-run output and zero writes during inspection.

Exit criteria:

- the same fixture produces a deterministic plan;
- no user-owned file is overwritten or deleted;
- every proposed operation has evidence, risk, preview, and approval class;
- a second dry run after apply is empty.

## Phase 2: interactive adoption proposal

- implement `intentloom adopt --plan` as read-only analysis;
- implement human-readable and JSON plan output;
- allow role remapping and selected approvals;
- support keep-local, merge, replace-generated, defer, reject, and
  intentional-exception decisions;
- block stale plans using expected hashes;
- require explicit confirmation for destructive or executable changes.

Exit criteria:

- a user can review and approve individual operations;
- ambiguous mappings cannot be auto-applied;
- rejected and deferred decisions are recorded without modifying project files.

## Phase 3: transactional apply and rollback

- apply approved operations in one transaction;
- create backups and a recovery journal;
- preserve local sections and ownership boundaries;
- validate paths, symlinks, project root, and secret redaction;
- implement full rollback and interrupted-transaction recovery.

Exit criteria:

- injected failures restore the exact pre-apply tree;
- partially written migrations cannot be reported as successful;
- repeated apply is idempotent.

## Phase 4: pack update and three-way migration

- store installed pack identity, version, canonical hashes, local overrides, and
  exceptions;
- compare old pack, current project, and new pack;
- generate safe fast-forwards, semantic merges, conflicts, deprecations, and
  removals;
- never overwrite local changes merely because the pack version increased;
- add `intentloom update --plan` and selected apply.

Exit criteria:

- unchanged projects update without prompts except required confirmations;
- locally customized projects receive targeted conflict proposals;
- accepted exceptions are not repeatedly proposed unless relevant inputs
  changed.

## Phase 5: conformance and security profiles

- evaluate branch, commit, PR, CI, state update, Duty Watch, validation, privacy,
  and security evidence;
- distinguish verified, missing, failed, unavailable, manual-required, and
  accepted-risk findings;
- add project profiles for TypeScript, Angular, Nx, Rust, Tauri, SQLite, and
  mixed stacks;
- add an Applye profile for sensitive career data, provider keys, Tauri IPC,
  migrations, external sources, and CLI bridges.

Exit criteria:

- conformance findings link to concrete repository evidence;
- security-sensitive changes select stronger gates automatically but do not run
  hidden network operations;
- no AI judgement alone can mark a required deterministic gate as passed.

## Phase 6: provider synchronization

- generate provider-specific instruction derivatives from canonical project
  roles;
- support Claude Code, Codex, Cursor, Copilot, Antigravity, Gemini CLI, and
  future adapters through versioned generators;
- detect drift and preserve user-owned provider additions;
- show diffs before synchronization.

Exit criteria:

- canonical policy remains the source of truth;
- provider files can be regenerated without losing documented local extensions;
- unsupported provider behavior is reported rather than guessed.

## Commands under consideration

```text
intentloom inspect
intentloom adopt --plan
intentloom adopt --apply <plan>
intentloom update --plan
intentloom update --apply <plan>
intentloom diff
intentloom sync --plan
intentloom doctor
intentloom conformance
intentloom rollback <transaction>
```

Exact CLI names remain subject to existing command compatibility and
implementation audit.

## Non-goals

- silently rewriting mature repositories;
- enforcing one filename layout;
- installing dependencies or hooks by default;
- auto-committing, pushing, opening PRs, merging, publishing, or releasing;
- using generated provider files as independent sources of truth;
- claiming security guarantees from documentation alone.
