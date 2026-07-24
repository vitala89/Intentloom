# AI Agent Duty Watch Workflow

This workflow applies to Claude Code, Codex, Antigravity, Gemini CLI, IDE agents, and any other agent operating in this repository.

## 1. Accept the watch

Before implementation:

1. Read `AGENTS.md`.
2. Read `AGENT_START_HERE.md`.
3. Read `PROJECT_STATE.md`.
4. Read the latest entry in `DUTY_WATCH.md`.
5. Read `ENGINEERING_PRINCIPLES.md` and relevant specifications, ADRs, roadmaps, code, tests, and Git history.
6. Identify the current milestone, requested outcome, affected boundaries, risks, and required validation.

Do not rely on the user prompt as the sole source of project context.

## 2. Verify the charted position

Compare documentation claims with repository evidence. If they conflict, treat code, tests, Git history, merged pull requests, releases, and current CI as evidence, then update stale documentation.

Record uncertainty rather than inventing an answer.

## 3. Plan the watch

Create a scoped plan that states:

- intended outcome;
- files or packages likely affected;
- architectural contracts involved;
- validation commands;
- documentation and handoff updates;
- whether human approval is required before mutation.

Avoid unrelated refactors and premature abstractions.

## 4. Perform the work

- Work in a dedicated branch.
- Preserve platform boundaries and public contracts.
- Keep changes reviewable and reversible.
- Add or update tests with behavior changes.
- Do not silently install dependencies, enable telemetry, contact external services, publish, merge, or release without authorization.

## 5. Validate

Run the strongest relevant checks available, including as applicable:

- formatting and linting;
- type checking;
- unit, integration, compatibility, and end-to-end tests;
- package build and packaged-runtime checks;
- `git diff --check`;
- manual review of the final diff.

Record commands and outcomes accurately. Failed or unavailable checks must be documented.

## 6. Update the ship's records

Before declaring completion:

- update `PROJECT_STATE.md` when durable state changed;
- append a Duty Watch entry describing work, evidence, unfinished items, and the exact next action;
- update roadmap status when a milestone or trigger changed;
- update ADRs when an architectural decision changed;
- update changelog or migration notes when user-visible or release-relevant behavior changed;
- update reference documentation when contracts or commands changed.

Documentation is part of Definition of Done.

## 7. Commit and open the pull request

The pull request must describe:

- objective and scope;
- important decisions;
- validation performed;
- risks and compatibility impact;
- documentation and Duty Watch updates;
- remaining follow-up work.

Do not mark the watch complete merely because files were edited. Completion requires a reviewable repository state and truthful handoff.

## 8. Relieve the watch

The final Duty Watch entry must contain:

- status: complete, partial, blocked, or rolled back;
- branch, commits, and pull request;
- what was completed;
- what was intentionally not completed;
- validations and their results;
- decisions and assumptions;
- blockers and warnings;
- one concrete next first action;
- evidence links or identifiers.

A new agent must be able to continue without reconstructing the previous session from chat history.

## Emergency and interruption rule

If a session ends unexpectedly, update `DUTY_WATCH.md` before any optional cleanup. Mark the entry `partial` and record uncommitted work, failing tests, risky state, and recovery steps.

## Prohibited handoff behavior

Never:

- claim a task, milestone, test, merge, or release completed without evidence;
- erase a previous watch entry to conceal an error;
- include credentials or private data;
- paste hidden reasoning or model chain-of-thought;
- leave vague next steps such as "continue implementation";
- transfer responsibility without identifying the repository's actual current state.