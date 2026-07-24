# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the current state, records what happened during the watch, and leaves the repository in a condition that the next watch can safely understand and continue.

## Current watch status

Status: awaiting merge of the Duty Watch governance system

Active branch: `docs/duty-watch-agent-handoff`

Current objective: establish mandatory project entry, engineering principles, agent workflow, durable project state, and session handoff rules.

Next first action after merge: audit the daemon and protocol implementation against `PROJECT_STATE.md` and the public monorepo evolution roadmap.

## Watch rules

- Read the latest entry before starting work.
- Verify important claims against code, Git history, pull requests, releases, and CI.
- Never overwrite historical entries to hide mistakes or unfinished work.
- Append a new entry for each meaningful completed task or work session.
- Small typo-only changes may share one entry when performed in the same branch and pull request.
- Record partial work honestly. Use `incomplete` when the objective was not finished.
- A watch cannot be marked `complete` until required validation and documentation updates are finished.
- The next action must be concrete enough for a new agent to begin without guessing.
- Do not include secrets, credentials, private user data, or hidden chain-of-thought.

## Entry template

Copy the template from `docs/templates/DUTY_WATCH_ENTRY.md` and place the newest entry directly below this section.

## Watch entries

### 2026-07-24, Duty Watch governance foundation

- **Status:** in progress
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `docs/duty-watch-agent-handoff`
- **Objective:** Create a default project context and handoff system for Claude Code, Codex, Antigravity, and other repository agents.
- **Completed:** Created the branch and began adding the mandatory entrypoint, durable project state, Duty Watch log, governance documents, and templates.
- **Files changed:** `AGENT_START_HERE.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`, governance and template files, plus `AGENTS.md` and documentation index updates.
- **Validation:** Repository diff and required CI must be reviewed after all files are committed.
- **Decisions:** The handoff system is named Duty Watch. `PROJECT_STATE.md` stores durable state; `DUTY_WATCH.md` stores chronological handoffs. Documentation updates are part of Definition of Done.
- **Open issues:** Final diff, CI, pull request, review, and merge remain pending.
- **Next action:** Complete the governance files, update `AGENTS.md`, create the pull request, and record the final status in this entry or a follow-up entry.
- **Evidence:** branch and commit history in this repository.
