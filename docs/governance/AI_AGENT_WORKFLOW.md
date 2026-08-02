# AI Agent Duty Watch Workflow

This workflow applies to Claude Code, Codex, Antigravity, Gemini CLI, IDE
agents, and any other agent operating in this repository.

## 1. Accept the watch

Before implementation:

1. Read `AGENTS.md`.
2. Read `AGENT_START_HERE.md`.
3. Read `PROJECT_STATE.md`.
4. Read the latest entry in `DUTY_WATCH.md`.
5. Read `ENGINEERING_PRINCIPLES.md`, `CODE_QUALITY_STANDARDS.md`, and relevant
   specifications, ADRs, roadmaps, code, tests, and Git history.
6. Identify the current milestone, requested outcome, affected boundaries,
   risks, required validation, and applicable domain guidance.

Do not rely on the user prompt as the sole source of project context.

## 2. Verify the charted position

Compare documentation claims with repository evidence. If they conflict, treat
code, tests, Git history, merged pull requests, releases, and current CI as
evidence, then update stale documentation.

Record uncertainty rather than inventing an answer.

## 3. Plan the watch

Create a scoped plan that states:

- intended outcome;
- files or packages likely affected;
- architectural contracts involved;
- current formatted size and responsibilities of touched implementation files;
- expected file growth and planned extraction points;
- relevant TypeScript, Angular, Rust, Tauri, backend, security, accessibility,
  or testing guidance;
- required unit, contract, integration, compatibility, process, or UI tests;
- validation commands;
- documentation and handoff updates;
- whether a code-quality exception or human approval is required before
  mutation.

Avoid unrelated refactors and premature abstractions. Do not postpone obvious
module decomposition until after adding behavior to an already oversized file.

## 4. Perform the work

- Work in a dedicated branch.
- Name the branch after the change, not the agent or tool, using
  `<type>/<short-kebab-description>`. Use a change-type prefix such as
  `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `build/`, `ci/`,
  `perf/`, `security/`, `release/`, or `revert/`. Never use actor, model,
  harness, or assistant prefixes such as `codex/`, `claude/`, `agent/`, or
  `bot/`; `main` and `v*` are reserved protected refs.
- Preserve platform boundaries and public contracts.
- Keep changes reviewable and reversible.
- Add or update tests with behavior changes.
- Keep new hand-written production files within the documented code-size
  budgets.
- Do not increase an existing oversized implementation file without extracting a
  cohesive responsibility or recording an approved exception and concrete
  decomposition follow-up.
- Keep side effects behind narrow typed interfaces and preserve dependency
  direction toward stable contracts.
- Use SOLID and Clean Architecture to reduce coupling and clarify responsibility,
  not to create abstractions without a demonstrated consumer or boundary.
- Do not silently install dependencies, enable telemetry, contact external
  services, publish, merge, or release without authorization.

## 5. Validate

Run the strongest relevant checks available, including as applicable:

- formatting and linting;
- type checking;
- unit, integration, compatibility, and end-to-end tests;
- package build and packaged-runtime checks;
- formatted file and function budget review;
- dependency-direction and cross-layer import checks;
- Rust `cargo fmt`, tests, and selected Clippy checks;
- Tauri capability, permission, scope, IPC, and command-allowlist review;
- `git diff --check`;
- manual review of the final diff.

Record commands and outcomes accurately. Failed or unavailable checks must be
documented. A code-quality exception must include the measured value, limit,
reason, scope, owner or responsible area, and expiry or review trigger.

## 6. Update the ship's records

Before declaring completion:

- update `PROJECT_STATE.md` when durable state changed;
- append a Duty Watch entry describing work, evidence, unfinished items, and the
  exact next action;
- update roadmap status when a milestone or trigger changed;
- update ADRs when an architectural decision changed;
- update changelog or migration notes when user-visible or release-relevant
  behavior changed;
- update reference documentation when contracts or commands changed;
- record decomposition follow-ups and remove obsolete quality exceptions when
  applicable.

Documentation is part of Definition of Done.

## 7. Complete the duty checklist

Before creating the final commit or opening a pull request, confirm:

- [ ] the project formatter completed successfully;
- [ ] Markdown and lint checks passed when configured;
- [ ] relevant tests, type checks, builds, or compatibility checks passed;
- [ ] new and substantially changed implementation files satisfy the documented
      code-size and function budgets;
- [ ] existing oversized files did not grow, or the approved exception and
      decomposition evidence are recorded;
- [ ] dependency direction and test seams remain explicit;
- [ ] `git diff --check` passed;
- [ ] the final diff was reviewed for unrelated or unsafe changes;
- [ ] commit and pull request text contains no agent, model, tool, or bot
      attribution metadata;
- [ ] `PROJECT_STATE.md` was updated when durable state changed;
- [ ] `DUTY_WATCH.md` contains an accurate handoff;
- [ ] roadmap, ADR, changelog, migration, and reference documents were updated
      when applicable;
- [ ] failed or unavailable validation is explicitly recorded;
- [ ] the next agent has one concrete, executable first action.

A known formatting, validation, or unapproved hard-limit failure must not be
hidden by opening a pull request. If a check cannot be completed, record the
limitation and mark the watch `partial` or `blocked` when it prevents truthful
completion.

## 8. Commit discipline and pull request

Every commit must be an atomic, independently reviewable logical change.
Atomic does not mean one file: implementation, its regression or behavior tests,
and documentation required to keep the contract true belong together. Unrelated
features, refactors, formatting sweeps, CI changes, release metadata, and
roadmap updates belong in separate commits unless one is required for the same
behavior to work.

Commit subjects use:

```text
<type>(<optional-scope>): <imperative summary>
```

Supported types are `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`,
`ci`, `perf`, `revert`, `release`, and `security`. Breaking changes use `!`.
Commit bodies explain intent, compatibility, risks, or follow-up only when the
subject is not sufficient. Agent, model, tool, and bot attribution is forbidden.

Install the repository hooks once per checkout with `pnpm hooks:install`.
`commit-msg` validates the subject and attribution policy; `pre-commit` checks
staged formatting, whitespace, and production-file budgets; `pre-push` runs the
full `pnpm verify` suite. The same commit and diff policy is checked in the
`Governance` pull-request workflow, so hooks are a fast local guard rather than
the only enforcement point.

Before committing or pushing, the agent must inspect the staged diff, run the
relevant checks, and record failures or unavailable checks in Duty Watch. A
pull request may contain a short series of atomic commits, but no commit may
mix independent concerns merely because they are being reviewed together.

## 9. Commit and open the pull request

The pull request must describe:

- objective and scope;
- important decisions;
- affected architecture and dependency direction;
- file decomposition performed or intentionally deferred;
- code-quality budgets and any approved exceptions;
- validation performed;
- risks and compatibility impact;
- documentation and Duty Watch updates;
- remaining follow-up work.

Commit messages and pull request text describe the change only. They must not
contain `Co-Authored-By` trailers, generated-with footers, or other attribution
for an assistant, model, agent, tool, or bot.

Do not mark the watch complete merely because files were edited. Completion
requires a reviewable repository state and truthful handoff.

## 10. Relieve the watch

The final Duty Watch entry must contain:

- status: complete, partial, blocked, or rolled back;
- branch, commits, and pull request;
- what was completed;
- what was intentionally not completed;
- validations and their results;
- code-budget exceptions and decomposition follow-ups;
- decisions and assumptions;
- blockers and warnings;
- one concrete next first action;
- evidence links or identifiers.

A new agent must be able to continue without reconstructing the previous session
from chat history.

## Emergency and interruption rule

If a session ends unexpectedly, update `DUTY_WATCH.md` before any optional
cleanup. Mark the entry `partial` and record uncommitted work, failing tests,
risky state, code-budget exceptions, and recovery steps.

## Prohibited handoff behavior

Never:

- claim a task, milestone, test, merge, or release completed without evidence;
- erase a previous watch entry to conceal an error;
- include credentials or private data;
- paste hidden reasoning or model chain-of-thought;
- leave vague next steps such as "continue implementation";
- transfer responsibility without identifying the repository's actual current
  state.
