# Project Bootstrap, Guardian, and Interactive CLI Plan

## Status

Planned product increment. This document does not add a valid command alias,
interactive-shell contract, workspace schema, Guardian operation, background
service, extension installation flow, or mutation permission.

The plan builds on the implemented project inspection, adoption, ownership,
synchronization, doctor, extension-governance, MCP, daemon, TUI, Desktop, and
Agent Workspace foundations.

## Product outcome

A developer should be able to enter a project and run:

```bash
loom
```

or the canonical command:

```bash
intentloom
```

When attached to a terminal, the command opens a project-scoped interactive
Intentloom session. The session guides project discovery, onboarding, standards,
architecture, tools, skills, MCP integrations, duplicate resolution, drift
review, and prepared plans.

The normal command surface remains available for automation:

```bash
intentloom inspect --root . --json
intentloom adopt --root . --dry-run
intentloom doctor --root . --json
intentloom guard check --root . --format sarif
```

`intentloom` remains the canonical executable name in documentation, CI,
structured integrations, support output, and compatibility contracts. `loom` is
a convenience alias for humans.

## Command naming decision

### Candidate package binary mapping

A future package version may expose both names to the same entrypoint:

```json
{
  "bin": {
    "intentloom": "dist/intentloom.cjs",
    "loom": "dist/intentloom.cjs"
  }
}
```

This is technically straightforward, but it still requires:

- package and release compatibility review;
- installation tests for npm, pnpm, Linux, macOS, and Windows;
- detection and documentation of executable-name collisions;
- packaged-runtime and uninstall verification;
- help and diagnostic output that clearly reports the canonical product name;
- no claim that Intentloom owns the generic word “loom” outside its installed
  executable alias.

When `loom` conflicts with another executable, the user can continue using
`intentloom`. The installer must not remove or replace unrelated binaries.

### TTY behavior

Candidate behavior:

- `loom` in an interactive terminal opens the project session;
- `intentloom` in an interactive terminal may open the same session after a
  compatibility decision;
- no-argument execution in CI or non-interactive stdin must not wait forever;
- non-TTY invocation returns deterministic help or requires an explicit command;
- `--help`, `--version`, and all existing subcommands remain stable;
- `--no-interactive` disables shell entry explicitly.

## Interactive session

### Session header

The shell should always display:

- canonical project root;
- current branch or detached state when local Git access is approved;
- Intentloom and protocol versions;
- active quality, architecture, technology, and discipline profiles;
- selected provider and model when an Agent Workspace provider is enabled;
- network state;
- current capabilities and approval mode;
- Guardian status and highest-severity findings;
- extension trust and health summary.

### Deterministic commands

Candidate commands inside the shell:

```text
/help
/project
/inspect
/onboard
/adopt
/doctor
/guard
/diff
/sync
/standards
/architecture
/skills
/extensions
/mcp
/agents
/plan
/review
/apply
/history
/settings
/exit
```

Slash commands map to typed application operations. They must not be translated
into arbitrary shell commands.

### Natural-language mode

Natural language is optional and available only when an explicit provider is
configured. It may:

- explain findings;
- ask onboarding questions;
- propose architecture and standards;
- prepare a skill or extension inspection;
- create a reviewable plan;
- explain a diff or conflict;
- suggest the next safe operation.

It may not count as approval, execute arbitrary commands, install dependencies,
change capabilities, expose credentials, commit, merge, release, deploy, or
publish.

## Onboarding modes

### Quick recommended

For a developer who wants a good default quickly:

```text
select root
→ read-only scan
→ show detected project summary
→ recommend the simplest supported profile
→ show important conflicts and required decisions
→ preview canonical workspace and generated outputs
→ approve adoption
```

### Guided

Ask practical questions rather than requiring architecture vocabulary:

- Is this a new or existing project?
- Which applications and deployables exist?
- Which coding tools should receive generated guidance?
- Which engineering disciplines work in the repository?
- Is the project local-first, offline-capable, web, mobile, Desktop, backend,
  data, ML, embedded, or hybrid?
- Are independent team ownership or deployments required?
- Which standards should be strict now and which should use a legacy ratchet?
- Which files are current authorities for architecture, coding policy, release,
  security, and testing?
- Should generated guidance and portable project contracts be committed?
- Which extensions, skills, and MCP servers are already used?

### Expert

Allow explicit selection of:

- architecture axes and path scopes;
- quality budgets and exceptions;
- technology packs and discipline perspectives;
- adapters and generated destinations;
- ownership and documentation mappings;
- Guardian enforcement levels;
- CI output and severity policy;
- extension capabilities and trust decisions;
- local-only versus version-controlled workspace state.

### Import existing decisions

Read existing ADRs, contribution guides, AI instructions, framework files,
workspace graphs, extension manifests, and user-selected documentation as
untrusted evidence. Prepare mappings and conflicts instead of assuming authority
from filenames or prose.

## Bootstrap scan

The first onboarding scan is read-only and bounded. It produces a structured
inventory of:

- project topology and detected profiles;
- architecture candidates with evidence and confidence;
- applications, packages, crates, deployables, and path scopes;
- current AI coding tools and their instruction surfaces;
- policies, standards, workflows, ADRs, templates, prompts, and skills;
- MCP servers, plugins, adapters, knowledge providers, and local integrations;
- GitHub, GitLab, CI, release, security, and ownership configuration;
- generated files and current Intentloom ownership state;
- exact duplicates, semantic overlaps, conflicting authorities, and stale
  generated outputs;
- local-only or sensitive files that should not be committed;
- missing recommended project contracts.

The result is a proposal, not a migration.

## Canonicalization decisions

### One canonical meaning, multiple compatible outputs

Intentloom should aim for one canonical source for each accepted engineering
concept and scope, while generating tool-specific derivatives where required.

Examples:

```text
.aif/catalog/policies/code-review.yaml
    ├── AGENTS.md section
    ├── CLAUDE.md section
    ├── .github/copilot-instructions.md section
    └── Cursor path-scoped rule
```

A user may intentionally keep a project-owned source outside `.aif/`. In that
case Intentloom records a reviewed mapping instead of copying or claiming the
file.

### Migration states

Each candidate should resolve to one explicit state:

```text
keep-project-owned
map-as-authority
import-to-canonical
adapt-to-portable
reference-external
manage-generated-output
archive-after-migration
remove-after-verified-migration
ignore-with-reviewed-baseline
blocked
```

No state transition happens from similarity alone.

### Before and after review

The adoption plan should show:

- current and proposed project trees;
- every created, modified, moved, archived, or removed path;
- current ownership and proposed ownership;
- exact source-to-output lineage;
- duplicate groups and conflict resolution;
- Git and ignore-file impact;
- extension source, license, integrity, scripts, and capabilities;
- tests, doctor checks, and post-write validation;
- rollback boundary and irreversible effects;
- plan digest and expiry.

## Guardian operations

### Candidate CLI

```bash
loom guard scan
loom guard findings
loom guard explain FINDING_ID
loom guard check
loom guard baseline --dry-run
loom guard plan --finding FINDING_ID
loom guard watch
```

The final command names require protocol and compatibility review.

### Startup behavior

Opening `loom` should run a fast bounded health summary by default. Deeper
semantic or extension analysis should be user-invoked or scheduled explicitly.
The shell must remain responsive and cancellable.

A cached result may be displayed only with its project-state digest and age. The
user must be able to request a fresh scan.

### Watch mode

`loom guard watch` is an explicit foreground operation in its first version. A
future daemon-backed watch mode must show active state, roots, resource limits,
network mode, and cancellation controls. It must not silently become a startup
service or system-wide watcher.

### CI gate

Candidate provider-neutral commands:

```bash
loom guard check --severity error --format json
loom guard check --severity warning --format sarif
loom standards check --changed
loom conformance check --workflow pull-request
```

Intentloom may generate reviewed GitHub Actions or GitLab CI templates. It does
not create provider credentials, protected branches, or required checks without
explicit provider-side authorization.

## Agent-mediated development

### Preferred workflow

```text
user opens project through `loom`
→ Intentloom resolves canonical context
→ selected coding agent connects through generated guidance, MCP, or provider adapter
→ agent inspects and plans through typed operations
→ project changes are reviewed through Intentloom findings and policy
→ CI checks canonical drift and conformance
```

### Practical enforcement

Intentloom can:

- generate instructions telling supported agents to read canonical context;
- expose project-scoped MCP resources and tools;
- launch or coordinate explicitly supported agent adapters later;
- require prepared plans for Intentloom-mediated writes;
- detect unmanaged instructions, duplicated skills, and generated drift;
- provide CI checks and machine-readable evidence.

Intentloom cannot guarantee that every external process routes through it. Strong
enforcement requires repository permissions, required CI, protected branches,
review rules, and organization policy.

## Skill and extension assistant

### Candidate interaction

```text
user: Add a skill for Angular accessibility reviews.
Intentloom:
  1. searches only approved sources after network consent;
  2. lists exact candidates and publisher evidence;
  3. inspects license, integrity, scripts, dependencies, and capabilities;
  4. compares candidates with current skills;
  5. offers reference, managed install, portable import, custom adaptation, or reject;
  6. previews exact project and lock changes;
  7. waits for explicit approval.
```

### Official-source policy

A source may be labelled official only when publisher evidence is available from
an accepted registry, verified repository relationship, signed release,
publisher metadata, or another documented trust mechanism.

The assistant must not infer official status from search ranking, stars, a
similar name, generated text, or model confidence.

### Portable custom skill

When the user requests an Intentloom-customized skill:

- user-owned original content can be normalized directly;
- third-party content can be copied or modified only when the license permits;
- upstream source, exact version or commit, license, notices, digest, and
  modification history remain recorded;
- unsupported executable helpers are removed or isolated unless separately
  approved;
- provider-specific instructions are separated from portable canonical meaning;
- deterministic fixtures prove generated adapter output;
- updates compare upstream changes with local modifications through a reviewed
  three-way migration.

## Desktop experience

Add a guided **Project Setup** flow and a persistent **Guardian** area.

Candidate setup steps:

```text
Select Project
→ Access Review
→ Scan
→ Project Summary
→ Architecture and Standards
→ Tools and Agent Surfaces
→ Duplicate and Authority Review
→ Skills, MCP, and Extensions
→ Git and CI Policy
→ Preview Canonical Workspace
→ Apply and Verify
```

Candidate Guardian views:

- project health and last scan;
- canonical workspace browser;
- duplicate and conflict groups;
- generated ownership and drift;
- standards and architecture findings;
- skills, MCP servers, plugins, trust, and capability deltas;
- CI readiness;
- prepared plans, diffs, approvals, and rollback status;
- migration and legacy-ratchet progress.

Desktop consumes the same structured operations as CLI, TUI, daemon, and MCP.

## MCP surface

First increment, read-only:

```text
intentloom_project_bootstrap_scan
intentloom_guardian_scan
intentloom_guardian_findings
intentloom_duplicate_group_explain
intentloom_canonical_workspace_show
intentloom_skill_candidate_inspect
intentloom_extension_candidate_inspect
intentloom_bootstrap_plan
```

Resources may include:

```text
intentloom://project/bootstrap-summary
intentloom://project/guardian/findings
intentloom://project/canonical-workspace
intentloom://project/duplicate-groups
intentloom://project/extensions
```

No generic shell, arbitrary file read, unrestricted URL download, or direct
mutation tool is added.

## Delivery phases

### Phase 1: decisions and contracts

- Accept an ADR for the `loom` alias and interactive TTY behavior.
- Accept an ADR for canonical workspace expansion under `.aif/`.
- Define bootstrap inventory, duplicate group, authority mapping, Guardian
  finding, baseline, and prepared migration schemas.
- Define local-private versus portable-versioned storage policy.
- Threat-model semantic analysis, imported prompts, external artifacts, watch
  mode, CI, and agent mediation.

### Phase 2: alias and shell foundation

- Add the `loom` package binary alias.
- Add packaged install, uninstall, collision, and platform tests.
- Implement a deterministic interactive shell over existing read-only
  application operations.
- Preserve non-interactive behavior and cancellation.

### Phase 3: bootstrap inventory

- Compose existing inspect, doctor, adoption, extension, standards, and
  architecture operations into one read-only bootstrap result.
- Add bounded inventory fixtures for new, mature, monorepo, polyglot, and legacy
  projects.
- Add evidence, confidence, sensitivity, provenance, and ambiguity fields.

### Phase 4: canonical workspace and mappings

- Add accepted schemas for catalog, mappings, baselines, local state, and import
  provenance.
- Implement version-control recommendations and ignore-file planning.
- Preserve existing `.aif` and `urn:aif:*` compatibility.

### Phase 5: duplicate and authority engine

- Implement exact and normalized deterministic detection first.
- Add purpose-overlap detection with explicit evidence.
- Add optional AI-assisted semantic grouping only after privacy and benchmark
  gates.
- Implement reviewed authority choices and suppression baselines.

### Phase 6: prepared consolidation

- Build exact canonicalization and migration plans.
- Reuse ownership, preview, digest, approval, revalidation, transaction, and
  rollback contracts.
- Add archive and remove actions only after source and generated-output
  verification.

### Phase 7: Guardian and CI

- Add explicit scan, findings, explain, check, and baseline operations.
- Add JSON and SARIF output.
- Add reviewed GitHub Actions and GitLab CI templates.
- Add foreground watch mode before considering daemon scheduling.

### Phase 8: skill and extension assistant

- Add explicit-source discovery and inspection.
- Reuse managed-extension manifest, lock, license, integrity, capability, update,
  removal, and health contracts.
- Add portable import and adapted custom skill flows with provenance and license
  gates.

### Phase 9: Desktop and TUI

- Add Project Setup and Guardian views.
- Prove CLI, TUI, Desktop, daemon, and MCP result equivalence.
- Add keyboard and accessibility coverage.

### Phase 10: optional governed agent launch

- Evaluate supported provider adapters that launch project-scoped sessions.
- Keep providers replaceable and authority explicit.
- Do not introduce unrestricted terminal emulation or generic shell access.

## Acceptance criteria

The product increment is complete when:

- `loom` and `intentloom` resolve to the same packaged CLI without breaking
  existing automation;
- interactive no-argument behavior is safe for TTY and non-TTY environments;
- onboarding scans one explicit root without changing project bytes;
- the user sees detected technologies, architectures, tools, skills, extensions,
  duplicates, conflicts, and uncertainty before adoption;
- the canonical workspace has versioned ownership and storage-class rules;
- project-owned files are never claimed, moved, replaced, or deleted without an
  exact approved plan;
- duplicate removal requires verified canonical output and rollback preparation;
- Guardian detects new unmanaged or conflicting files on an explicit later run;
- CI can check drift without a cloud account or hidden network access;
- external skills and extensions retain source, publisher, version, integrity,
  license, capabilities, and trust evidence;
- natural-language requests cannot install or mutate without exact approval;
- all clients return equivalent structured results for the same project state;
- supported agents can consume canonical project context while bypass remains
  truthfully detectable rather than falsely claimed impossible.

## Non-goals

This increment does not:

- automatically delete, move, or rewrite user files;
- make `.aif/` physically immutable or encrypted;
- force every external development tool through Intentloom;
- replace Git, GitHub, GitLab, IDEs, terminals, or coding agents;
- install hooks, dependencies, MCP servers, plugins, runtimes, or binaries
  silently;
- treat model recommendations as publisher verification or user approval;
- copy third-party skills or source without license permission;
- enable hidden background scanning or mandatory telemetry;
- expose arbitrary shell, filesystem, URL download, deployment, merge, release,
  or publishing tools.
