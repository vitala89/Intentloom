# Curated Engineering Skills

## Status

The curated routing slice is present in unreleased source. Check the
[release state](../releases/RELEASE_STATE.md) before assuming a published CLI
contains it.

## What it provides

Intentloom now has first-party procedures for choosing an engineering workflow,
clarifying a feature, verifying completion, and reviewing an external skill or
plugin. It also carries richer debugging, testing, plan-review, and code-review
procedures.

These are Intentloom skills, not installed copies of Superpowers or Matt Pocock
Skills. They follow project rules first and require no external plugin, hook,
telemetry, or automatic updater.

## Using skills while developing Intentloom

Repository agents follow `AGENTS.md` and read `aif-task-router` before
non-trivial work when the route is not already explicit. The router may
recommend:

- `aif-feature-discovery` for an ambiguous feature or architecture idea;
- `aif-debugger` for an observed failure or regression;
- `aif-planning-review` before a significant implementation;
- `aif-extension-review` before an external skill or plugin is adopted;
- `aif-verification-gate` before completion, commit, or pull-request claims.

You can also request one directly:

```text
Use aif-feature-discovery and interview me about this feature.
Use aif-debugger to diagnose this failure before changing code.
Use aif-extension-review on this plugin; do not install it.
Use aif-verification-gate before declaring the task complete.
```

The feature interview asks one high-value question at a time. It is not required
for a small change whose behavior and checks are already clear.

## Using skills in another project

Preview Intentloom adoption before writing:

```sh
intentloom adopt --plan
intentloom diff
intentloom sync --dry-run
```

After an approved adoption or synchronization, Intentloom generates the
canonical skills into the selected provider's repository location. Existing
project-owned instruction or skill files remain conflicts until the user chooses
how to reconcile them.

Provider destinations are documented in [Tool Adapters](TOOL_ADAPTERS.md).
Once generated, the provider discovers the skill metadata and loads the full
procedure only when selected. Providers that do not support implicit discovery
can still use a skill when the user invokes it by name.

## External skills and plugins

Do not run an unpinned installer such as `npx ...@latest` merely because a skill
looks useful. Review the candidate first:

1. identify its exact source and revision;
2. inventory instructions, scripts, hooks, network, telemetry, updates, writes,
   commits, and delegation;
3. record license and notice obligations;
4. compare requested capabilities with project policy;
5. choose referenced use, conceptual adaptation, or bundling;
6. evaluate the inactive candidate;
7. obtain explicit approval before installation or activation.

The current catalog adapts useful methods conceptually. It does not install or
activate either reviewed external plugin. See
[Curated Skill Method Sources](../reference/CURATED_SKILL_SOURCES.md).

## Expected workflow

```text
request
→ project context
→ route selection
→ optional discovery or diagnosis
→ accepted brief and plan
→ bounded implementation
→ verification and review
→ documentation and handoff
```

At every step, the skill remains procedural guidance. Actual filesystem,
process, network, credential, delegation, and publication authority comes from
the user and the active platform policy, never from the skill text.
