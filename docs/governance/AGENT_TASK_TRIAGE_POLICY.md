# Agent Task Triage Policy

This document is the **single, tool-neutral canon** for how any agent working
in this repository - Claude Code, Codex, or anything else named in
`docs/governance/AI_AGENT_WORKFLOW.md` - decides how much model, reasoning
effort, delegation, and token budget a task deserves before starting it. The
rubric, thresholds, and gate commands below have exactly one home: here. Each
tool carries only a short pointer to this file in its own instruction surface
(see "Carriers, per tool"), never a copy of the table - copies drift, and the
drift is invisible until two agents disagree about the same task.

**Scope note.** This is dev-tooling for agents _working on_ Intentloom's own
codebase - which coding-agent model and effort to spend on a given task. It is
unrelated to `docs/governance/PROJECT_INCEPTION_MODEL_AND_NX_PRINCIPLES.md`
§10-13, which defines "model / reasoning effort / provider" as product-facing
concepts Intentloom (via Neutron) exposes to _its own_ end users. Do not
conflate the two when reading either document.

**Relationship to `aif-task-router`.** `catalog/skills/aif-task-router`
answers "which Intentloom skill/workflow route does this request need"
(`direct`/`clarify`/`discover`/`plan`/`implement`/`review`/`adopt`). This
document answers a different question - "which model, effort, subagent plan,
and budget does the chosen work deserve." The two run side by side; neither
replaces the other.

## Rubric (Intentloom-specific axis wording)

| Axis             | 0                       | 1                                                               | 2                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Blast radius** | one file, or text only  | 2-5 files                                                       | 6+ files, or a change to `catalog/` (canonical spec, ADR-0001), a package's public barrel (`packages/*/src/index.ts` and equivalent entry points), the local daemon protocol (ADR-0008), the MCP stdio boundary (ADR-0017), or `apps/desktop/src-tauri` capability/IPC surface |
| **Ambiguity**    | one honest reading      | small gaps, safe defaults exist                                 | two readings that lead to materially different work                                                                                                                                                                                                                            |
| **Risk**         | none                    | user-visible behaviour                                          | privacy, security, a migration, money, irreversible, or outward-facing (release, publish, adapter export)                                                                                                                                                                      |
| **Verification** | nothing to run          | `pnpm typecheck`, `pnpm lint` (oxlint), or a scoped `pnpm test` | the full `pnpm verify` gate (`typecheck && lint && format:check && test && build && git diff --check`), Rust checks (`cargo fmt`/`cargo test`/Clippy) for `apps/desktop/src-tauri`, or a manual walkthrough                                                                    |
| **Unknowns**     | area known, paths given | a few targeted reads                                            | needs discovery or a map before planning (matches `aif-task-router`'s `discover` route)                                                                                                                                                                                        |

## Routing table (portable, by role)

| Score | Model tier | Effort  | Delegation                                                 | Budget               |
| ----- | ---------- | ------- | ---------------------------------------------------------- | -------------------- |
| 0-2   | cheapest   | lowest  | none                                                       | small                |
| 3-4   | mid        | medium  | none                                                       | moderate             |
| 5-6   | mid        | high    | at most one read-only scout, if the tool has delegation    | larger               |
| 7-8   | frontier   | high    | scout + reviewer, read-only, if the tool has delegation    | large                |
| 9-10  | frontier   | highest | decision gate first, then scout and reviewer, if available | announce it up front |

Role names, not vendor model names - this table stays true across tools. Each
carrier below maps role to the tool's own verified names.

## Carriers, per tool

**Claude Code** (verified from this session's own `Agent` tool schema, not
memory): carrier is `~/.claude/skills/task-triage/SKILL.md`, a **global**
skill (applies to every project on this machine, not versioned in this
repository). Model tiers: `haiku` = cheapest, `sonnet` = mid, `opus` =
frontier, `fable` = cheapest-low-latency alternate. `Agent`'s `model` param
sets a **subagent's** model per call; there is no `effort` param on `Agent` -
effort is fixed per subagent-type definition or set via `Workflow`'s
`agent(prompt, {effort})`. The main session's own model and effort are the
user's to change, not the agent's. Enforcement mechanism: see "Enforcement"
below.

**Codex** (per Codex's documented `AGENTS.md` convention - **unverified** in
this session, since this session runs as Claude Code, not Codex; confirm
against Codex's own docs before relying on it): carrier is this
repository's `AGENTS.md` itself, read automatically at session start.
Placement matters more than wording - state the triage step near the top of
`AGENTS.md`, since Codex has no per-prompt injection point to fall back on if
attention drifts over a long session. Codex chooses its model and effort at
launch, not at runtime, so its output here is a **recommendation the human
acts on**, not a setting the agent applies to itself.

**Cursor / Antigravity / Copilot / anything else:** no evidence this
repository is worked on from these tools today (no `.cursor/rules/`,
`GEMINI.md`, or `.github/copilot-instructions.md` exist at the time of
writing). If one of these is added, give it a matching short carrier
paragraph here - pointing at this same canon - rather than duplicating the
rubric or routing table into that tool's own instruction file.

## Adjustments specific to this repository

- **Ambiguity = 2 -> decision gate = `aif-feature-discovery`**, not
  `aif-grilling` (that name belongs to a different project; the global skill
  previously hardcoded it and has been genericized).
- **Risk = 2 -> name the specialist review**: `aif-security-review` for
  security/auth-boundary changes, `aif-privacy-review` for data-handling
  changes, `aif-extension-review` before adopting any external skill or
  plugin. All three are required by `AGENTS.md` regardless of triage score.
- **Verification axis 2 -> run `pnpm verify`**, the same command required
  before every push by `.githooks/pre-push` and the `Governance` CI workflow.
  Triage does not invent a new gate; it names the existing one.
- **Unknowns = 2 -> one read-only scout**, not the main session reading
  `packages/application/src/index.ts` (a known oversized file) end to end.

## Enforcement

**Deterministic for one person, advisory for the repository.** In Claude
Code, a `UserPromptSubmit` hook already fires on every prompt and injects a
short reminder to run this triage - confirmed live in this session. That hook
lives in the _user's own_ `~/.claude/settings.json` (global, personal), not
in this repository, so it is real and deterministic for that one person on
that one machine, and invisible to any other contributor or a fresh checkout.
Absent that personal hook, enforcement falls back to the skill's own trigger
description (`description:` frontmatter in
`~/.claude/skills/task-triage/SKILL.md`) - a well-attended prompt, not a
guarantee.

No **repository-versioned** hook exists. `AGENTS.md` forbids introducing
"automatic hooks... without explicit authorization," and a project-level
`UserPromptSubmit` hook is exactly that kind of mechanism. When authorized, it
would live in a versioned `.claude/settings.json` at the repo root (none
exists today - only a personal, non-authoritative
`.claude/settings.local.json`) and would make triage deterministic for every
contributor, not just whoever already has a personal hook. Until that
authorization is given, treat repository-wide enforcement as advisory.

Codex has no per-prompt injection point at all (per Codex's own convention -
unverified in this session). Its only lever is placement: state the triage
step as one of the first things `AGENTS.md` says, since there is nothing to
re-inject it mid-session if attention drifts.

## Worked example

```
Triage 4/10 (radius 1 · ambiguity 0 · risk 1 · verify 2 · unknowns 0)
Harness: Claude Code · Model: sonnet · Effort: medium
Subagents: none · Gate: none · Context: this file + the two files it edits
Budget: ~60k output · Stop when: docs written, cross-link added, live triage pasted
```

Cheapest thing that would lower this further: nothing - ambiguity and unknowns
are already at floor.
