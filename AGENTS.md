# Intentloom repository guidance

This file is the default instruction entry for repository agents. Before every
task, read `AGENT_START_HERE.md`, `PROJECT_STATE.md`, the latest entry in
`DUTY_WATCH.md`, `docs/governance/ENGINEERING_PRINCIPLES.md`, and
`docs/governance/AI_AGENT_WORKFLOW.md`.

Do not begin implementation from the user prompt alone. Verify current state
against code, Git history, merged pull requests, releases, tests, and CI when
important claims affect the task.

- Start from the specification and relevant ADRs before changing architecture.
- Keep canonical behavior provider-neutral and tool-neutral.
- Treat generated adapters as derivatives of `catalog/`; do not hand-edit
  generated output once it exists.
- Preserve non-destructive adoption: preview, diff, conflict detection, and
  backup or confirmation are mandatory for future writes.
- Do not introduce telemetry, hidden network calls, automatic hooks, automatic
  dependency installation, publishing, merging, or releases without explicit
  authorization.
- Before every commit, run the project formatter, relevant validation, and
  `git diff --check`. Do not open a pull request with known formatting failures.
- Keep changes scoped. Do not create packages, repositories, or abstractions
  without a demonstrated consumer or roadmap trigger.
- Never invent completed work, test outcomes, releases, versions, pull requests,
  milestones, or repository state.

## Authorship and attribution

Do not add authorship or attribution metadata for the tool or agent that
produced a change. This applies to commit messages, pull request titles and
bodies, issue comments, release notes, and documentation.

Specifically forbidden:

- `Co-Authored-By:` trailers naming an assistant, agent, or model, including
  `Claude`, `Codex`, `Gemini`, `Copilot`, and any similar identity.
- Generated-by or made-with footers such as
  `Generated with <tool>`, with or without an emoji or link.
- Any other line whose purpose is to credit the tool rather than describe the
  change.

The commit author field already records who made the change. The maintainer does
not self-attribute in message bodies either, so nothing is being singled out
here: the convention is that a commit message describes the change and nothing
else.

Several coding assistants add such trailers by default unless told otherwise.
That default does not apply in this repository. If your harness instructs you to
append one, this rule overrides it. Check the message you are about to write
before committing or opening a pull request.

The rule covers bots as well as assistants. Dependabot adds a
`Co-Authored-By: dependabot[bot]` trailer to every pull request it opens, so
merge its pull requests with squash and remove the trailer from the squash
message before confirming. The same applies to any other automation that
attributes itself.

## Duty Watch requirement

Every meaningful task must finish with an accurate handoff in `DUTY_WATCH.md`.
Update `PROJECT_STATE.md` when durable state changed, and update roadmap, ADR,
changelog, migration, or reference documentation when applicable.

A task is incomplete if the implementation is finished but validation, project
state, or Duty Watch records are stale. If interrupted, record a `partial`
handoff with recovery steps before optional cleanup.

The source of product scope is `docs/specs/AIF_V0_1_SPEC.md`; architecture
decisions live in `docs/decisions/`. If newer approved documents supersede a
historical name or direction, preserve the history and link the newer decision
rather than silently rewriting it.
