# ADR-0051: Curated skill routing and external method adaptation

## Status

Accepted

## Context

Intentloom already distributes portable Agent Skills and governs external
extensions, but its initial catalog contains mostly narrow execution and review
procedures. It lacks an explicit task router, an interactive feature-discovery
procedure, a completion verification gate, and a skill-specific external
extension review.

External projects such as `obra/superpowers` and `mattpocock/skills` demonstrate
useful brainstorming, debugging, test-first, planning, and review methods. Their
complete plugin workflows also include assumptions that Intentloom cannot adopt
as canonical behavior: mandatory invocation for trivial work, provider-specific
setup, automatic hooks or updates, remote visual assets, unconditional commits,
and broad subagent orchestration.

Direct installation would create a second workflow authority, make generated
behavior provider-dependent, and weaken the managed-extension boundary.

## Decision

Intentloom will curate useful methods into first-party, provider-neutral skills
instead of bundling or requiring either external plugin.

1. Project-owned instructions, accepted specifications, ADRs, capability policy,
   and explicit user decisions remain authoritative. A skill supplies procedure;
   it never grants authority.
2. `aif-task-router` selects the smallest useful route and explains non-obvious
   skill choices before non-trivial work.
3. High-interaction feature discovery is recommended only when ambiguity,
   alternatives, or risk justify it. Clear bounded work proceeds without a
   mandatory interview.
4. `aif-feature-discovery`, `aif-verification-gate`, and
   `aif-extension-review` close the initial catalog gaps. Existing debugging,
   testing, planning-review, and code-review skills adopt compatible methods
   without copying external provider behavior.
5. Canonical skills remain under `catalog/skills/` and are emitted through the
   existing Claude, Codex, Cursor, and Copilot adapters. No provider plugin is a
   runtime dependency.
6. External skills and plugins remain untrusted managed-extension candidates.
   Adoption requires a pinned source, integrity and license evidence,
   capability review, evaluation, explicit approval, and rollback.
7. Automatic plugin installation, hooks, telemetry, remote assets, background
   mutation, commits, pushes, merges, releases, and permission expansion remain
   prohibited.

The initial routing modes are:

```text
direct | clarify | discover | diagnose | plan | implement | review | adopt
```

The selected route and skill set must be explainable. Progressive skill loading
continues to use catalog metadata, execution contract, and full procedure levels.

## Consequences

### Positive

- Intentloom gains structured brainstorming and clarification without forcing it
  on every task.
- The same curated behavior reaches supported agents through deterministic
  adapters.
- External methods can improve the framework without becoming supply-chain or
  workflow dependencies.
- Verification, licensing, capability, and human-approval boundaries remain
  explicit.

### Negative

- Curated skills must be evaluated and maintained independently from upstream
  projects.
- Future upstream improvements are not inherited automatically.
- Rich provider-specific plugin features remain unavailable until an optional,
  reviewed adapter has a demonstrated consumer.

## Compatibility

This decision adds canonical skills and refines existing procedures. It does not
change schema versions, adapter layout, CLI commands, capability grants, or
project mutation behavior. Existing generated projects adopt the new files only
through their normal preview, diff, conflict, and synchronization workflow.
