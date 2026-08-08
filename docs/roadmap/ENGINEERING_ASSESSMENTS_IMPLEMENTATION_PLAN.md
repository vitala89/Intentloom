# Engineering Assessments Implementation Plan

## Status

Documentation-only implementation roadmap for the open-source Engineering
Assessments and Evidence-backed Audit Reports direction.

The plan introduces no runtime contract, public CLI command, schema, protocol,
package, dependency, daemon method, Desktop view, MCP tool, network permission,
filesystem mutation, release, or publication change.

The owning concept is
`docs/concepts/ENGINEERING_ASSESSMENTS_AND_AUDIT_REPORTS.md` and the governing
invariants are in
`docs/governance/ENGINEERING_ASSESSMENT_PRINCIPLES.md`.

## Objective

Deliver a provider-neutral, read-only-first assessment capability that composes
existing Intentloom inspection, evidence, Quality Pack, Checker Adapter, graph,
conformance, Foundation, Agent Workspace, Neutron, memory, planning, approval,
and transaction boundaries.

The first useful vertical slice should answer:

```text
What is demonstrably true about this selected project,
which engineering rules does that evidence relate to,
what cannot yet be verified,
and what should the user review next?
```

It should not begin by asking an LLM to read the repository and invent an audit.

## Sequencing rules

1. Reuse existing evidence and finding contracts before introducing new ones.
2. Define canonical assessment contracts before adding presentation surfaces.
3. Read-only deterministic assessment precedes AI-assisted interpretation.
4. Quality Packs own framework and discipline knowledge.
5. Checker Adapters own bounded external-tool normalization.
6. Graph Providers own observed graph evidence; Nx remains optional.
7. Foundation and project architecture intent own the target architecture.
8. Severity, confidence, evidence quality, and priority remain separate.
9. `insufficient-evidence` is a valid terminal state.
10. Reports precede remediation automation.
11. Remediation uses existing proposal, plan, diff, approval, revalidation, and
    transactional apply infrastructure.
12. CLI, Desktop, TUI, daemon, MCP, and Agent Workspace consume one shared
    application result.
13. Historical and affected assessment are optimizations after the full snapshot
    model is stable.
14. No employee scoring or developer ranking is introduced at any phase.

## A0. Existing capability audit and ADR scope

### Purpose

Confirm which current contracts can be reused directly and identify the minimum
new public surface.

### Work

- inventory project-inspection results and project-state digests;
- inventory engineering evidence and provenance contracts;
- inventory engineering-quality and conformance findings;
- inventory Checker Adapter and graph-provider candidate contracts;
- inventory Foundation architecture-map and quality-scenario candidates;
- inventory current report, analysis, memory, plan, and proposal contracts;
- document exact CLI/application/daemon/MCP compatibility boundaries;
- decide whether an ADR is required for a shared assessment envelope and report
  contract.

### Exit gate

A reviewed capability map identifies reused contracts, missing contracts, and
all proposed public-schema changes before implementation starts.

## A1. Canonical assessment envelope

### Purpose

Define the smallest versioned assessment result that can reference existing
domain findings without replacing them.

### Candidate contracts

- assessment identity and schema version;
- explicit project and scope identity;
- assessment profile and enabled modules;
- project-state digest;
- start and completion timestamps;
- input policy, pack, checker, and graph references;
- assessment status;
- source finding references;
- unsupported and insufficient-evidence areas;
- provenance summary.

### Required review

- ADR for public schema ownership;
- validator and unknown-field behavior;
- size and count bounds;
- migration and support policy;
- deterministic fixtures;
- redaction and retention rules.

### Exit gate

A fixture-backed assessment envelope can represent a read-only run without
introducing a generic competing policy engine.

## A2. Evidence reference normalization

### Purpose

Allow an assessment result to reference deterministic, tool-backed, derived,
AI-assisted, review-required, and insufficient evidence consistently.

### Work

- define stable evidence-reference identity;
- bind evidence to project state and scope;
- preserve source tool/provider version and configuration digest;
- represent stale, partial, conflicting, malformed, unsupported, and denied
  evidence;
- define evidence quality without changing source evidence;
- reuse secret redaction and project isolation.

### Exit gate

Every material assessment projection can trace back to its original evidence or
explicitly state that sufficient evidence does not exist.

## A3. Read-only architecture assessment vertical slice

### Purpose

Prove the assessment architecture with one deterministic, high-value module.

### Initial scope

- explicit workspace or package scope;
- existing architecture map or selected architecture profile when available;
- one or more graph snapshots;
- dependency direction;
- dependency cycles;
- package or public API boundaries;
- architecture drift;
- graph completeness diagnostics.

### Constraints

- no Nx requirement;
- no folder-name-only architecture conclusions;
- no AI-generated dependency edges;
- no automatic remediation;
- no universal architecture ideology.

### Exit gate

The same project state, policy, graph snapshot, and options produce equivalent
structured results on supported platforms.

## A4. Assessment finding projection

### Purpose

Define cross-domain presentation without discarding source finding semantics.

### Work

- stable assessment finding ID;
- source finding reference;
- category;
- scope;
- evidence references;
- rule reference;
- severity;
- confidence;
- evidence quality;
- impact summary;
- recommendation references;
- provenance classification.

### Exit gate

Conformance, engineering-quality, architecture, and future specialist findings
can appear in one report while their source contracts remain authoritative.

## A5. Technical Debt Map

### Purpose

Project assessment findings into a dependency-aware debt view rather than a flat
issue list.

### Work

Group findings into:

- architecture;
- dependencies;
- maintainability;
- testing;
- performance;
- security;
- accessibility;
- observability;
- build and CI;
- AI engineering;
- documentation;
- legacy constraints;
- dependency health.

Add projection metadata for blast radius, affected scopes, estimated remediation
complexity, prerequisites, remediation dependencies, and recommended order.

### Exit gate

Debt grouping is derived from traceable findings and does not create new
unreferenced facts.

## A6. Transparent prioritization

### Purpose

Provide useful ordering without pretending that severity alone is priority or
that a weighted score is objective truth.

### Work

- define configurable priority factors;
- expose every input used by an ordering rule;
- separate deterministic ordering constraints from advisory weighting;
- support user override with recorded rationale;
- mark AI-proposed priority as recommendation;
- add fixtures for high-severity/low-confidence and low-severity/high-blocking
  cases.

### Exit gate

A user can explain why item A is before item B and can override the order without
changing underlying evidence.

## A7. Canonical report model

### Purpose

Define a machine-readable report contract before adding multiple renderers.

### Candidate sections

- executive summary;
- project context;
- scope and methodology;
- evidence sources;
- architecture overview;
- findings by priority and severity;
- technical debt map;
- performance baseline when present;
- testing and maintainability;
- security, accessibility, and observability where applicable;
- AI engineering where applicable;
- target-state options;
- recommendations;
- remediation roadmap;
- risks and assumptions;
- unsupported and unverified areas;
- appendix and evidence references.

### Exit gate

A stable JSON report can be validated independently from its human renderer.

## A8. Read-only CLI assessment surface

### Purpose

Expose the first stable automation surface only after application contracts are
ready.

### Candidate UX

```text
intentloom assess
intentloom assess architecture
intentloom assess --profile quick
intentloom assess --profile standard --json
```

Names are not approved until existing CLI naming and compatibility rules are
reviewed.

### Requirements

- structured application operation first;
- versioned machine-readable JSON;
- explicit root and scope;
- cancellation leaves project bytes unchanged;
- no command executes remediation;
- human text is a renderer over the structured result.

### Exit gate

CLI JSON fixtures are stable and equivalent to the underlying application
operation.

## A9. Quality Pack integration

### Purpose

Enable framework, language, architecture, testing, accessibility, security, and
organization rules without hardcoding them in Assessment Core.

### Work

- resolve effective pack set and versions;
- expose rule provenance;
- detect conflicts and unsupported rules;
- support scoped rules;
- ensure profiles control assessment depth rather than hiding rule precedence.

### Exit gate

At least one first-party technology pack contributes assessment rules through
the existing quality-policy path without adding framework imports to Core.

## A10. Checker Adapter integration

### Purpose

Normalize deterministic specialist-tool output under bounded permissions.

### Initial adapters or report consumers

Prefer existing project outputs first, for example:

- TypeScript diagnostics;
- ESLint JSON or SARIF;
- Clippy JSON;
- test and coverage reports.

### Requirements

- exact tool identity/version;
- bounded inputs and outputs;
- explicit process/network/filesystem permissions;
- timeout and cancellation;
- malformed and partial result states;
- project-state binding;
- no automatic tool installation.

### Exit gate

Tool output becomes evidence without the assessment layer needing tool-specific
business logic.

## A11. Graph Provider integration

### Purpose

Support architecture and affected-scope analysis across different workspace
technologies.

### Candidate providers

- Nx export;
- TypeScript project references;
- workspace manifests;
- import graph;
- Cargo metadata;
- explicit architecture map.

### Exit gate

Architecture assessment operates with at least two graph-provider paths and does
not require Nx.

## A12. Performance evidence and baseline comparison

### Purpose

Add provenance-complete performance assessment without invented measurements.

### Candidate inputs

- Lighthouse and Web Vitals;
- HAR;
- bundle reports;
- browser performance and memory profiles;
- React or Angular profiler exports;
- build, CI, task, and test timings.

### Work

- normalize environment and scenario identity;
- define comparable versus incomparable baselines;
- preserve source artifacts and tool versions;
- calculate transparent deltas;
- prevent AI-generated metric values;
- represent missing baseline or incompatible environment explicitly.

### Exit gate

A before/after comparison is reproducible from retained evidence and refuses
unsupported comparisons.

## A13. Monorepo and CI assessment

### Purpose

Assess project-system friction and architecture without evaluating individual
people.

### Candidate capabilities

- workspace topology;
- dependency cycles;
- project and task graphs;
- affected completeness;
- local caching configuration;
- unnecessary rebuilds;
- duplicated CI pipelines;
- flaky-test evidence;
- test-pyramid evidence;
- release automation;
- workspace ownership;
- build and test latency.

### Exit gate

Findings describe project or system behavior and contain no employee or developer
productivity scoring.

## A14. AI Engineering assessment

### Purpose

Evaluate engineering controls around AI-assisted development.

### Candidate checks

- discoverable project context;
- canonical engineering rules;
- architecture-boundary enforcement;
- shell, filesystem, network, and secret permissions;
- provider/model/tool visibility;
- generated-change validation;
- tests and review workflow;
- persistent project memory boundaries;
- duplicate or conflicting agent instructions;
- skills and plugin provenance;
- MCP permissions;
- diff and approval workflow;
- reproducibility and session provenance.

### Constraints

- no scoring of individual developers;
- no hidden collection of agent usage;
- no provider favoritism;
- no mandatory model;
- no new permission granted by the assessment itself.

### Exit gate

The module can explain control gaps using repository and Intentloom evidence and
can return `insufficient-evidence` where configuration is external or unknown.

## A15. Target-state options and remediation roadmap

### Purpose

Turn findings into reviewable choices without collapsing assessment into one
automatic solution.

### Work

Support options such as:

- minimal remediation;
- incremental architecture improvement;
- target architecture migration.

Each option records advantages, disadvantages, risks, complexity estimate,
affected scopes, prerequisites, migration order, compatibility implications,
and rollback or exit points.

The roadmap supports dependency-aware `Immediate/Next/Later` or phase-based
ordering without mandatory calendar estimates.

### Exit gate

The user can select a target state while retaining rejected alternatives and
their evidence.

## A16. Agent Workspace and Neutron integration

### Purpose

Allow conversational explanation over canonical assessment data.

### Candidate questions

- explain one finding;
- show supporting evidence;
- compare target-state options;
- explain priority ordering;
- identify unsupported areas;
- prepare an implementation plan for an explicitly selected finding.

### Requirement

Agent Workspace must call shared assessment operations. It must not infer a
second hidden assessment from arbitrary repository reads.

### Exit gate

Conversational answers reference canonical finding/evidence IDs and clearly mark
new AI-assisted interpretation.

## A17. Desktop and TUI assessment workspaces

### Purpose

Render the shared assessment model after CLI/application contracts stabilize.

### Candidate Desktop sections

- Overview;
- Architecture;
- Quality;
- Performance;
- Testing;
- Monorepo / CI;
- AI Engineering;
- Technical Debt;
- Recommendations;
- Roadmap.

### Exit gate

Desktop, TUI, and CLI show equivalent core facts for the same assessment result.

## A18. Historical comparison

### Purpose

Compare assessment snapshots without losing methodology context.

### Work

- fixed, new, worsened, and improved findings;
- changed evidence quality;
- metric deltas;
- architecture drift;
- technical-debt trend;
- compatibility checks across assessment, policy, pack, checker, graph, and
  environment versions.

### Exit gate

Incompatible snapshots are qualified or rejected rather than presented as a
false trend.

## A19. Incremental and affected assessment

### Purpose

Accelerate user-triggered reassessment after the full snapshot contract is
proven.

### Work

- changed-file scope;
- affected graph;
- dependency reach;
- conservative fallback to full assessment;
- stale-baseline detection;
- explicit user-triggered execution.

### Exit gate

Incremental results are demonstrably equivalent to the relevant projection of a
full assessment for supported scenarios.

## A20. Remediation planning integration

### Purpose

Connect selected findings to existing safe planning and Approved Apply
infrastructure without granting mutation rights to assessment.

### Work

- prepare remediation proposal;
- bind plan to finding, evidence, project-state digest, and target-state choice;
- show exact affected paths, tests, policy impact, permissions, and rollback;
- require explicit approval and revalidation;
- record verification evidence after apply.

### Exit gate

A stale or changed project rejects the plan, and no finding can bypass approval
or transaction checks.

## A21. Report renderers and export

### Purpose

Add human-readable formats only after the canonical report model is stable.

### Candidate order

1. JSON;
2. Markdown;
3. HTML;
4. PDF only after HTML/report-sanitization and packaging concerns are resolved.

### Requirements

- explicit export action;
- secret and path redaction policy;
- report-injection hardening;
- stable evidence references;
- no hidden upload or hosted renderer requirement.

### Exit gate

Rendered reports preserve the same canonical facts and clearly label omitted,
redacted, unsupported, and AI-assisted content.

## A22. Stabilization and public contract

### Purpose

Promote assessment contracts only after real project evidence and compatibility
coverage exist.

### Required evidence

- deterministic fixtures;
- at least one TypeScript project;
- at least one framework-specific project through Quality Packs;
- at least one non-Nx workspace;
- at least one Nx workspace when Nx support is claimed;
- cross-platform CLI/application equivalence;
- daemon/MCP/Desktop equivalence for implemented surfaces;
- security and privacy threat review;
- migration and support policy;
- report and historical-comparison compatibility tests;
- explicit unsupported-area fixtures;
- evidence that AI is optional for deterministic assessment paths.

### Exit gate

The public assessment contract has documented compatibility guarantees and no
known path that can turn a finding directly into unapproved mutation.

## Suggested first implementation PR sequence

The first implementation should remain smaller than the full roadmap:

1. **Assessment contract ADR and capability audit**: A0-A1.
2. **Evidence references and architecture slice**: A2-A3.
3. **Finding projection and debt/report foundation**: A4-A7.
4. **Read-only CLI JSON surface**: A8.
5. **Quality Pack and graph integration**: A9-A11.

Performance, monorepo/CI, AI Engineering, Desktop, historical comparison, and
remediation planning should follow only after the first read-only architecture
slice is stable.

## ADRs likely required

At minimum, implementation should consider separate ADRs for:

- canonical assessment/report contract and ownership;
- shared finding projection versus source-finding references;
- evidence identity and historical-comparison semantics;
- performance environment comparability;
- project-local assessment persistence and retention;
- any checker execution that expands current process/network capabilities;
- any AI-assisted assessment persistence before human review.

Not every phase requires a new ADR. Reusing an accepted existing boundary should
be documented as reuse rather than creating another decision record.

## Explicitly deferred

This roadmap does not authorize:

- runtime implementation in this documentation PR;
- package or schema changes;
- new dependencies;
- new CLI commands;
- daemon or MCP changes;
- Desktop implementation;
- background monitoring;
- autonomous remediation;
- automatic dependency installation;
- cloud upload;
- pricing, billing, subscriptions, consulting, or paywalls;
- release, tag, or publication changes.
