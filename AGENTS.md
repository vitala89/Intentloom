# Intentloom repository guidance

This file is the default instruction entry for repository agents. Before every task, read `AGENT_START_HERE.md`, `PROJECT_STATE.md`, the latest entry in `DUTY_WATCH.md`, `docs/governance/ENGINEERING_PRINCIPLES.md`, and `docs/governance/AI_AGENT_WORKFLOW.md`.

Do not begin implementation from the user prompt alone. Verify current state against code, Git history, merged pull requests, releases, tests, and CI when important claims affect the task.

- Start from the specification and relevant ADRs before changing architecture.
- Keep canonical behavior provider-neutral and tool-neutral.
- Treat generated adapters as derivatives of `catalog/`; do not hand-edit generated output once it exists.
- Preserve non-destructive adoption: preview, diff, conflict detection, and backup or confirmation are mandatory for future writes.
- Do not introduce telemetry, hidden network calls, automatic hooks, automatic dependency installation, publishing, merging, or releases without explicit authorization.
- For documentation edits, run Markdown formatting checks when configured and always run `git diff --check`.
- Keep changes scoped. Do not create packages, repositories, or abstractions without a demonstrated consumer or roadmap trigger.
- Never invent completed work, test outcomes, releases, versions, pull requests, milestones, or repository state.

## Duty Watch requirement

Every meaningful task must finish with an accurate handoff in `DUTY_WATCH.md`. Update `PROJECT_STATE.md` when durable state changed, and update roadmap, ADR, changelog, migration, or reference documentation when applicable.

A task is incomplete if the implementation is finished but the project state and Duty Watch records are stale. If interrupted, record a `partial` handoff with recovery steps before optional cleanup.

The source of product scope is `docs/specs/AIF_V0_1_SPEC.md`; architecture decisions live in `docs/decisions/`. If newer approved documents supersede a historical name or direction, preserve the history and link the newer decision rather than silently rewriting it.