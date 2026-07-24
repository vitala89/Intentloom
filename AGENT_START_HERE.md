# Intentloom Agent Entry Point

This is the mandatory starting point for every AI agent and human contributor
working in this repository.

## Before any task

Read, in order:

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `DUTY_WATCH.md`
4. `docs/governance/ENGINEERING_PRINCIPLES.md`
5. `docs/governance/AI_AGENT_WORKFLOW.md`
6. The relevant specification, ADRs, roadmap documents, package documentation,
   and code for the requested task

Do not begin implementation from the user prompt alone.

## Required opening check

Before changing files, state internally or in the task plan:

- the current project phase and active milestone;
- the last completed duty watch entry;
- how the task fits the roadmap;
- which architectural boundaries it may affect;
- which validations and documentation updates will be required.

If repository evidence conflicts with `PROJECT_STATE.md` or `DUTY_WATCH.md`,
stop treating those files as authoritative, inspect Git history, pull requests,
tests, and code, then correct the stale state as part of the task.

## Required closing check

A task is not complete until the agent has:

- implemented or documented the requested change;
- run the relevant validation;
- reviewed the resulting diff;
- updated `PROJECT_STATE.md` when the durable current state changed;
- appended or updated `DUTY_WATCH.md` with the completed work and next handoff;
- updated roadmap, ADR, migration notes, or changelog when applicable;
- created commits and a pull request according to repository workflow.

Never claim completion without evidence. Never invent completed milestones, test
results, versions, pull requests, or repository state.
