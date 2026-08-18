# Matt Pocock skills adoption

This record is the `aif-extension-review` for the vendored copy of
[mattpocock/skills](https://github.com/mattpocock/skills) in `.agents/skills/`
(Cursor/Codex) and `.claude/skills/` (Claude Code). `.claude/skills/<name>`
are relative symlinks into `.agents/skills/`, not a second copy.
It is project-owned engineering guidance for agents working **on Intentloom**.
It is not catalog canon, not generated adapter output, and not a product
runtime.

## Review verdict

**changes-required**, then **eligible** for the adapted subset below.

| Item             | Finding                                                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source           | GitHub `mattpocock/skills`                                                                                                                                                                                                  |
| Integrity        | SHA-256 pins in `skills-lock.json`                                                                                                                                                                                          |
| License          | MIT (notice in `.agents/skills/LICENSE` and `.claude/skills/LICENSE`)                                                                                                                                                       |
| Capability delta | Skills are markdown procedures. Several instruct commits, issue writes, `.env` / GitHub secret writes, background agents, or subagents. None of that overrides `AGENTS.md`.                                                 |
| Conflicts        | `grill-with-docs` / `domain-modeling` assume `CONTEXT.md` and `docs/adr/`. This repo uses `AGENTS.md`, `docs/decisions/`, and `AGENT_START_HERE.md`. `implement` auto-commits. Cursor triage forbids unsolicited subagents. |
| Residual risk    | Vendor text can still pull an inattentive agent off project workflow. Mitigated by this file, `.cursor/rules/grilling.mdc`, and the authority order in ADR-0051.                                                            |

Do not run `setup-matt-pocock-skills` against this repository unless a later
task explicitly remaps tracker and domain-doc paths. Default GitHub Issues plus
`CONTEXT.md` at the repo root would fork our Duty Watch and ADR layout.

## What to activate in a new session

Read `catalog/skills/aif-task-router/SKILL.md` first. Then add at most the
skills below. Explain non-obvious selections. Never run two interview skills in
the same session.

### Always consider (this repo)

| Skill             | When                                                                                     | Notes                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `grilling`        | New design, new feature with competing approaches, architecture, or triage Ambiguity = 2 | **On now.** Cursor always-apply rule. Primitive: rounds, frontier questions, recommended answers, wait. |
| `diagnosing-bugs` | Hard, intermittent, or regression bugs that need a tight red/green loop                  | Prefer over grilling. Complements `aif-debugger`.                                                       |
| `ask-matt`        | User asks which Matt flow to use                                                         | Router over this pack only. Does not replace `aif-task-router`.                                         |

### Useful on request, not auto

| Skill                           | When                                           | Why it is not auto-on                                                              |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `grill-me`                      | Stateless interview with no repo trail         | Alias of `grilling`; in a git checkout use `grilling`.                             |
| `grill-with-docs`               | Interview plus glossary/ADR paper trail        | Wrong paths (`CONTEXT.md`, `docs/adr/`). Map later if we want stateful grilling.   |
| `domain-modeling`               | Sharpening terms that will land in canon       | Write `docs/decisions/` (and existing glossary docs), not a new root `CONTEXT.md`. |
| `codebase-design`               | Module shape, seams, deep modules              | Vocabulary under TDD and architecture work.                                        |
| `tdd`                           | New behavior with an honest test seam          | Must still follow `aif-verification-gate` and atomic commits.                      |
| `code-review`                   | Review a branch or PR on Standards + Spec axes | Complements `aif-code-review`; project review skills win on security and budgets.  |
| `research`                      | User asked for cited primary-source reading    | Network and extra files; not silent.                                               |
| `handoff`                       | New harness, directory, or colleague mid-phase | Duty Watch remains the repo handoff.                                               |
| `wait-what`                     | User said the last explanation did not land    | Corrective, in-session.                                                            |
| `improve-codebase-architecture` | Explicit health/deepening pass                 | Can generate work; grill before implementing it.                                   |

### Do not auto-invoke

| Skill                                                                      | Reason                                                                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `implement`                                                                | Instructs committing from the skill; skips our branch/PR and attribution rules unless the human already asked for commits. |
| `to-spec` / `to-tickets` / `triage`                                        | Assume GitHub Issues or `.scratch/` tickets, not Duty Watch + PRs.                                                         |
| `prototype`                                                                | Throwaway branches and extra trees; only with an explicit prototype request.                                               |
| `wizard`                                                                   | Writes `.env` and GitHub secrets.                                                                                          |
| `loop-me`, `writing-fragments`, `writing-shape`, `claude-handoff`, `teach` | In-progress or off this engineering workflow.                                                                              |
| `to-questionnaire`                                                         | External questionnaire, not repo design.                                                                                   |
| `setup-matt-pocock-skills`                                                 | Would install a second tracker/docs layout.                                                                                |

## Grilling adaptations (normative)

1. Facts are the agent's job; decisions stay with the user.
2. Look up repository facts in this session. Do not spawn subagents unless the
   user asked.
3. Stop implementing until shared understanding, or until the user explicitly
   skips further grilling.
4. Do not create `CONTEXT.md` or `docs/adr/` from these skills.
5. Skip grilling on bounded one-reading work and on bugs that already have a
   failing signal.

## Update and rollback

- Bump vendor files only with a fresh `aif-extension-review` and lockfile pin.
- Rollback: revert the vendor tree and the grilling Cursor rule; first-party
  catalog skills are unchanged.
- Managed catalog import (C6–C7) remains the long-term path if these procedures
  should become generated adapters. Until then they stay project-owned copies.
