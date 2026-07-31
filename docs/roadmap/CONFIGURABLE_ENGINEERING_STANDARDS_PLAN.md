# Configurable Engineering Standards Plan

## Status

Planned product increment. This document does not add a new valid configuration
field or CLI command yet. Schema, protocol, migration, security, and
compatibility work must land before any proposed examples become accepted
contracts.

## Problem

Intentloom can already select technology profiles and generate guidance for
multiple coding tools, but projects need a more explicit way to choose how code
should be structured, limited, tested, and reviewed.

A team may want, for example:

- SOLID and Clean Architecture guidance without unnecessary abstractions;
- a maximum source-file size and a lower preferred target;
- function complexity, nesting, and parameter budgets;
- mandatory regression tests for bug fixes;
- Angular, TypeScript, Rust, Tauri 2, backend, or security-specific guidance;
- a strict greenfield policy or a gradual legacy-code ratchet;
- the same effective policy in CLI, MCP, Desktop, TUI, and generated agent
  instructions.

Today these choices can be written manually, but they are not yet a canonical,
versioned, resolved product contract.

## Product decision

Add **Engineering Standards Profiles** as a layered, provider-neutral Intentloom
capability.

The model has three layers:

1. **Mandatory platform baseline**
   - security, ownership, provider neutrality, explicit roots, evidence before
     mutation, human approval, compatibility, and truthful reporting;
   - cannot be disabled by a project quality preset.
2. **Project quality profile**
   - maintainability principles, code budgets, complexity budgets, testing
     expectations, exception policy, and legacy migration mode;
   - selected by the user and stored in a versioned, user-owned contract.
3. **Domain packs**
   - TypeScript, Angular, Rust, Tauri 2, backend/API, testing, accessibility,
     security-sensitive, and future domains;
   - additive, versioned, source-attributed, and compatibility-aware.

This does not conflict with Intentloom's current architecture. It strengthens the
canonical catalog and conformance model while keeping CLI, MCP, Desktop, and TUI
as clients over shared application and protocol contracts.

## Non-negotiable boundary

User choice may tune maintainability and testing rules. It must not disable:

- project-root containment;
- ownership and generated-file safety;
- transaction preview and rollback requirements;
- explicit approval for mutation;
- credential and secret protections;
- provider neutrality;
- compatibility and migration checks;
- truthful evidence and uncertainty reporting;
- the prohibition on hidden network, telemetry, shell, hook, or dependency
  installation behavior.

A preset named `relaxed` or `legacy` means gradual maintainability enforcement,
not relaxed security.

## Candidate policy model

The accepted schema should represent stable rule IDs rather than free-form prompt
text. A future versioned contract may express concepts similar to:

```yaml
schemaVersion: "1"
profile: balanced
architecture:
  principles:
    - solid
    - clean-boundaries
    - composition-over-inheritance
    - kiss
    - yagni
codeBudgets:
  sourceFile:
    preferredLines: 250
    hardLines: 400
  testFile:
    preferredLines: 400
    hardLines: 700
  function:
    preferredLines: 40
    hardLines: 80
    preferredComplexity: 10
    reviewComplexity: 15
    preferredMaxNesting: 3
testing:
  behaviorChangesRequireTests: true
  bugFixesRequireRegressionTests: true
  boundaryContractTests: true
legacy:
  mode: ratchet
  oversizedFilesMayGrow: false
domainPacks:
  - typescript
  - angular
  - rust
  - tauri
exceptions:
  requireReason: true
  requireReviewTrigger: true
```

This example is illustrative only. It is not valid in `.aif/config.yaml` until an
accepted schema and migration define its location and compatibility rules.

## Presets

Initial candidate presets:

### Balanced

Default for established projects. Uses maintainability targets, hard upper
limits, required behavior tests, and a ratchet for existing oversized files.

### Strict

For greenfield or high-assurance work. Lower budgets, stronger complexity checks,
selective strict lints, and no new exceptions without explicit approval.

### Legacy ratchet

For mature repositories with existing debt. Existing violations are baselined,
may not worsen, and are reduced incrementally when touched. New files follow the
balanced limits.

### Custom

Starts from a named preset and records explicit overrides. It must not allow a
custom value to bypass the mandatory platform baseline.

## Domain-pack requirements

Each domain pack must include:

- a stable pack ID and semantic version;
- supported language/framework/tool compatibility ranges;
- canonical rule IDs with severity and rationale;
- primary-source references and a last-reviewed date;
- deterministic generated guidance;
- optional deterministic checks;
- known conflicts and precedence rules;
- migration notes for changed or removed rules;
- tests proving equivalent resolution across supported clients.

Candidate first-party packs:

- `typescript`
- `frontend`
- `angular`
- `rust`
- `tauri-2`
- `backend-api`
- `testing`
- `accessibility`
- `security-sensitive`

External packs may be supported through the managed-extension lifecycle. They
must not be silently downloaded, executed, or trusted.

## CLI experience

Candidate read-only commands:

```bash
intentloom standards init --profile balanced
intentloom standards show --effective
intentloom standards check --root .
intentloom standards explain source-file-hard-limit
intentloom standards diff --profile strict
```

Candidate reviewed mutation flow:

```text
select preset and domain packs
→ resolve canonical effective policy
→ preview configuration and generated guidance
→ validate compatibility
→ user approves
→ transactional write
→ doctor and standards check
```

The CLI must return versioned structured results. Human output is rendered from
the same result used by Desktop, TUI, daemon, and MCP.

## Desktop experience

Add an **Engineering Standards** area to Settings and project onboarding.

The first Desktop slice should provide:

- preset selection;
- detected and manually selected domain packs;
- code-size and complexity budgets;
- testing requirements;
- legacy-ratchet mode;
- an effective-policy preview;
- conflicts and unsupported-rule explanations;
- proposed exceptions with reason and review trigger;
- read-only conformance findings grouped by file, rule, severity, and domain;
- a diff before any configuration or generated guidance is written.

Desktop must not implement a second resolver. It consumes the same application
operation and protocol result as CLI and MCP.

## MCP surface

The first MCP increment is read-only.

Candidate resources:

```text
intentloom://standards/catalog
intentloom://standards/effective
intentloom://standards/findings
intentloom://standards/domain-packs
```

Candidate tools:

```text
intentloom_engineering_standards_show
intentloom_engineering_standards_check
intentloom_engineering_standard_explain
intentloom_engineering_standards_diff
```

Candidate prompt:

```text
intentloom_plan_policy_compliant_change
```

MCP resources provide context, tools perform bounded typed operations, and
prompts provide user-invoked workflow templates. No MCP tool may expose arbitrary
file reads, shell execution, unrestricted CLI invocation, hidden network access,
or direct mutation.

An external documentation MCP may be configured later as an optional evidence
source. Intentloom must record its identity, version, network state, trust class,
and provenance. External text is untrusted context, not an automatically enforced
rule.

## Deterministic checks

The first checker should focus on facts that can be measured without an LLM:

- formatted physical file lines;
- function and method lines where the parser supports the language;
- cyclomatic complexity where deterministic tooling is available;
- import and package dependency direction;
- forbidden cross-layer imports;
- presence of changed-behavior tests when evidence can be established;
- Rust format and selected Clippy results;
- Tauri capability, permission, command, and scope inventory;
- explicit exception validity and expiry.

AI may later explain findings or propose a decomposition plan, but the finding
itself must retain deterministic evidence and rule provenance.

## Existing-code migration

Intentloom itself already contains oversized implementation modules, especially
`packages/application/src/index.ts`. Enabling a strict repository-wide hard
failure immediately would create a large unsafe rewrite and contradict the
principle of evidence-driven incremental change.

Use a ratchet:

1. inventory current violations;
2. store a reviewed baseline with rule IDs and measured values;
3. reject new violations;
4. reject growth of existing violations;
5. require extraction or a reviewed exception when an oversized module is
   meaningfully changed;
6. remove baseline entries as modules are decomposed;
7. start decomposition with files that mix public contracts, orchestration,
   filesystem effects, protocol validation, and unrelated feature areas.

The first Intentloom decomposition candidate is
`packages/application/src/index.ts`. Split it incrementally into cohesive
application operations and public contract modules while preserving the package's
current import contract through deliberate exports and compatibility tests.

## Delivery phases

### Phase 1: decision and schemas

- Accept an ADR for the layered standards model.
- Define policy, preset, domain-pack, exception, finding, and effective-policy
  schemas.
- Define configuration location and migration from current schema version 1.
- Threat-model external packs and documentation sources.

### Phase 2: canonical resolver

- Add first-party shared standards and initial domain packs to the canonical
  catalog.
- Implement deterministic inheritance, override, conflict, and compatibility
  resolution.
- Add golden fixtures for balanced, strict, legacy, and custom profiles.

### Phase 3: read-only conformance

- Inventory current repository violations.
- Implement the baseline and ratchet model.
- Add deterministic source-size, dependency-direction, exception, Rust, and
  Tauri checks.
- Produce machine-readable findings with evidence and remediation.

### Phase 4: CLI and generated guidance

- Add read-only `show`, `check`, `explain`, and `diff` operations.
- Add reviewed initialization and configuration planning.
- Generate effective, domain-scoped agent guidance without vendor-specific
  meaning in the canonical catalog.

### Phase 5: MCP and daemon

- Expose the accepted read-only operations through versioned daemon and MCP
  contracts.
- Prove CLI, daemon, and MCP result equivalence.

### Phase 6: Desktop and TUI

- Add preset/domain-pack selection and effective-policy review.
- Add findings, exceptions, and migration progress views.
- Preserve preview, approval, and transactional application boundaries.

### Phase 7: optional assisted remediation

- Add bounded decomposition and test-plan proposals.
- Keep edits behind prepared-plan identity, current-state revalidation, explicit
  approval, transaction safety, and rollback.
- Do not add autonomous refactoring, merging, release, or publishing.

## Acceptance criteria

The increment is complete when:

- one user-owned, versioned policy selection resolves deterministically;
- the same effective policy is visible through CLI, daemon, MCP, Desktop, and
  TUI;
- supported adapters generate equivalent guidance from the same canonical rules;
- new and changed files are checked against code budgets;
- existing debt uses a non-growing baseline and can be reduced incrementally;
- Angular, Rust, and Tauri domain packs record versioned primary-source
  provenance;
- exceptions are explicit, reviewable, scoped, and expiring or trigger-based;
- security and mutation boundaries cannot be disabled by a quality preset;
- all write paths remain previewed, validated, approved, transactional, and
  reversible.

## Non-goals

This increment does not:

- claim that one architecture is correct for every project;
- require interfaces, repositories, services, or classes for their own sake;
- enforce code-coverage percentages as a substitute for useful tests;
- rewrite all existing large files at once;
- use an LLM as the source of truth for measurable findings;
- silently connect to documentation MCP servers;
- allow arbitrary shell, filesystem, network, or project mutation;
- make Desktop or MCP a separate implementation of policy resolution.
