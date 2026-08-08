# Engineering Assessments and Evidence-backed Audit Reports

## Status

Candidate open-source product direction.

This document defines how Intentloom can compose existing project inspection,
evidence, conformance, Quality Packs, Checker Adapters, graph providers,
Foundation, Agent Workspace, Neutron, memory, planning, approval, and
transaction capabilities into reproducible engineering assessments.

It does not add a public schema, CLI command, daemon method, Desktop view, MCP
tool, dependency, network permission, runtime package, or mutation capability by
itself.

This direction extends, but does not replace:

- `PROJECT_CONNECTION_EVIDENCE_AND_MCP.md`;
- `ENGINEERING_QUALITY_PACKS_AND_CHECKER_ADAPTERS.md`;
- `FOUNDATION_WORKSHOP_AND_EVOLUTIONARY_ARCHITECTURE.md`;
- `INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md`;
- `PERSISTENT_AGENT_MEMORY.md`;
- `ENGINEERING_PROCESS_INTELLIGENCE.md`;
- `SECURITY_ANALYSIS_AND_REMEDIATION.md`;
- `ENGINEERING_CONFORMANCE_V0_3_SPEC.md`;
- the existing pack, graph, evidence, approval, plan, and transaction contracts.

## Problem

Existing engineering tooling often produces one of two incomplete outcomes.
Deterministic tools emit isolated diagnostics without a coherent project-level
assessment, while AI systems may read a repository and produce
an authoritative-sounding opinion without stable evidence, provenance,
reproducibility, or explicit uncertainty.

Intentloom should provide a third path:

```text
selected project
-> bounded inspection
-> evidence collection
-> architecture and task graph evidence
-> effective engineering policy
-> deterministic checker and conformance results
-> assessment orchestration
-> findings with provenance
-> technical debt projection
-> prioritized recommendations
-> target-state options
-> remediation roadmap
-> exportable engineering report
-> optional reviewed implementation plan
```

Assessment evaluates software, project, and system evidence. It must not score
employees, rank developers, infer individual productivity, or become a
surveillance system.

## Goals

Engineering Assessments should:

- produce explainable, evidence-backed findings;
- distinguish deterministic evidence from AI-assisted interpretation;
- compare declared architecture with observed architecture when intent exists;
- reuse Quality Packs instead of hardcoding framework rules into Core;
- reuse Checker Adapters instead of replacing specialist tools;
- reuse Graph Providers without requiring Nx;
- support workspace, application, package, feature, domain, directory,
  changed-file, affected-project, and explicit-file scopes;
- support architecture, frontend, performance, monorepo and CI, testing,
  maintainability, security, accessibility, observability, and AI-engineering
  modules;
- preserve severity, confidence, evidence quality, and priority as separate
  concepts;
- treat `insufficient-evidence` as a valid result;
- group technical debt and dependency-aware remediation order;
- provide multiple target-state options rather than one universal architecture;
- remain local-first, provider-neutral, read-only first, and permission-bounded;
- expose one canonical result to CLI, Desktop, TUI, daemon, MCP, Agent
  Workspace, and Neutron;
- use existing reviewed planning and transactional apply for future remediation.

## Non-goals

This direction does not create:

- a second policy or conformance engine;
- a universal architecture score;
- an autonomous refactoring agent;
- unrestricted shell execution;
- automatic dependency installation;
- mandatory Nx;
- mandatory AI or one model provider;
- mandatory cloud storage or a hosted backend;
- hidden repository upload or telemetry;
- AI-generated performance measurements;
- guaranteed performance improvements;
- employee performance scoring or developer ranking;
- pricing, billing, subscriptions, consulting workflows, or paywalls.

Engineering Assessments are part of the open-source Intentloom product
direction. Any future hosted or enterprise service would require a separate
product and architecture decision and must not make the local assessment core
artificially incomplete.

## Architectural decision

Do not introduce an independent `Audit Engine` that owns policies, checkers,
graphs, or project truth.

Use an Assessment Orchestrator over existing canonical systems:

```text
Project Inspection
      +
Project Evidence
      +
Graph Providers
      +
Effective Engineering Policy / Quality Packs
      +
Checker Adapter Results
      +
Engineering Conformance
      +
Foundation / Architecture Intent
      +
Optional AI Interpretation
      ↓
Assessment Orchestrator
      ↓
Canonical Assessment Result
      ├── finding projections
      ├── unsupported / insufficient-evidence areas
      ├── technical debt projection
      ├── prioritization view
      ├── target-state options
      ├── remediation roadmap
      └── report model
```

The orchestrator coordinates evidence and normalizes assessment-specific output.
It does not become a new source of policy authority.

## Existing Intentloom capabilities reused

### Project inspection

The selected project root and bounded inspection rules remain owned by existing
project-access and application-operation contracts. Assessment must not broaden
filesystem access merely because deeper analysis was requested.

### Project Evidence

Existing local Git evidence, provider evidence, normalized engineering events,
trust states, redaction, and provenance form part of the evidence substrate.
Assessment-specific evidence extends this substrate rather than inventing a
parallel repository crawler.

### Engineering Conformance

Conformance remains the authority for comparing observed engineering workflow
evidence with canonical workflow policies. Assessment may include conformance
findings and summarize their implications, but it does not reimplement
conformance rules.

The current conformance model already distinguishes verified violations from
missing, ambiguous, and unsupported evidence. Assessment should preserve those
semantics instead of flattening them into one generic failure state.

### Engineering Quality Packs

Quality Packs provide versioned framework, language, discipline, architecture,
accessibility, security, testing, observability, and organization-specific
rules. Assessment Core remains domain-neutral.

Candidate first-party packs may include:

- TypeScript;
- Angular;
- React;
- Rust;
- Tauri;
- backend and service boundaries;
- accessibility;
- security;
- testing;
- Nx;
- organization policy.

A pack may describe framework-specific checks. Core must not hardcode Angular,
React, TanStack Query, RxJS, NgRx, Zustand, or similar implementation rules.

### Checker Adapters

Checker Adapters normalize deterministic specialist-tool results into bounded
Intentloom evidence and findings.

Candidate assessment inputs include:

- TypeScript diagnostics;
- ESLint JSON;
- Clippy JSON;
- SARIF;
- test reports;
- coverage reports;
- Lighthouse reports;
- bundle-analyzer reports;
- build and task timings;
- repository-native CI artifacts.

A checker failure, timeout, unsupported version, malformed output, or denied
permission is an assessment fact. It must not be converted into a clean result.

### Graph Providers

Graph Providers supply observed projects, packages, files, tasks, ownership
scopes, and dependency edges.

Candidate providers include:

- Nx project and task graph exports;
- TypeScript project references;
- pnpm, npm, and Yarn workspace manifests;
- import graphs;
- Cargo workspace and crate metadata;
- explicit Intentloom architecture maps;
- future language-specific graph providers.

Nx remains optional. Repository topology and graph edges are evidence, not proof
of intended architecture.

### Foundation and Project Inception

Foundation supplies declared or approved target architecture, quality scenarios,
constraints, accepted coupling, decision horizons, and change scenarios.

For an existing project, assessment can compare:

```text
declared architecture
vs
observed architecture
```

For example:

```text
Declared:
UI -> Application -> Domain -> Infrastructure

Observed:
UI -> Infrastructure

Assessment:
architecture drift with dependency-edge evidence
```

The project-defined architecture is the reference. Intentloom must not prefer
Clean Architecture, Feature-Sliced Design, DDD, Hexagonal Architecture,
microservices, microfrontends, modular monoliths, or another style universally.

### Agent Workspace and Neutron

Agent Workspace and Neutron consume canonical assessment data. They do not own a
second hidden assessment implementation.

They may help answer questions such as:

- Why is finding `ARCH-017` classified as high severity?
- Which evidence supports it?
- Which remediations are currently most useful?
- What target-state alternatives exist?
- Prepare an implementation plan for one selected finding.

Model output may explain, compare, summarize, or propose. It cannot change
measured evidence, policy, severity rules, approval state, or mutation authority.

### Persistent memory

Accepted assessment summaries, reviewed decisions, resolved findings, and
historical comparisons may become project-scoped memory only through existing
trust, provenance, review, retention, export, deletion, and supersession rules.

Raw model interpretation does not silently become canonical memory.

### Approved Apply and transaction boundary

Assessment itself is read-only.

Future remediation uses the existing sequence:

```text
finding
-> remediation proposal
-> reviewed plan
-> exact diff
-> explicit approval
-> current-state revalidation
-> transactional apply
-> verification
-> evidence
```

A finding never grants write authority.

## Evidence-first assessment pipeline

The canonical sequence is:

```text
Selected Project
        ↓
Project Inspection
        ↓
Evidence Collection
        ↓
Architecture / Task Graph
        ↓
Quality Policy + Conformance
        ↓
Tool Reports
        ↓
Assessment Orchestration
        ↓
Findings
        ↓
Technical Debt Map
        ↓
Prioritized Recommendations
        ↓
Target-state Options
        ↓
Remediation Roadmap
        ↓
Engineering Assessment Report
        ↓
Optional Reviewed Implementation Plan
```

The pipeline is intentionally not:

```text
LLM reads repository
-> LLM writes authoritative audit
```

## Evidence classes

Assessment should preserve evidence origin and confidence rather than flattening
all inputs into prose.

Candidate provenance classes are:

- `deterministic`, produced directly by stable Intentloom logic;
- `tool-backed`, produced by a bounded external checker or project tool;
- `derived`, computed deterministically from other evidence;
- `ai-assisted`, interpretation or classification proposed by a model;
- `review-required`, a useful hypothesis requiring explicit human review;
- `insufficient-evidence`, a conclusion that cannot currently be supported.

These are provenance classes, not severity levels.

Every material conclusion should be traceable to evidence references, rule
references, graph snapshots, tool versions, configuration digests, or an
explicit AI interpretation record.

## Canonical assessment model

The first implementation should define a versioned canonical assessment result
without replacing existing conformance or quality schemas prematurely.

An illustrative top-level shape is:

```yaml
schemaVersion: 1
assessmentId: assessment:example
projectId: project:example
scope:
  kind: workspace
profile: standard
startedAt: 2026-08-08T12:00:00Z
completedAt: 2026-08-08T12:00:05Z
inputs:
  projectStateDigest: sha256:...
  foundationRevision: optional
  qualityPolicyDigest: sha256:...
  graphSnapshots: []
  checkerRuns: []
summary:
  status: completed-with-gaps
findings: []
unsupportedAreas: []
debtMap: {}
recommendations: []
targetStateOptions: []
roadmap: {}
report:
  canonicalReportVersion: 1
provenance: {}
```

This is not a valid public schema until an ADR, validator, compatibility policy,
fixtures, migration rules, limits, and threat review are accepted.

## Finding integration

Intentloom already has conformance and engineering-quality finding directions.
Assessment should not create a competing generic `Finding` type if existing
schemas can be safely referenced.

The assessment layer needs a stable cross-domain projection that can point to
the original source finding.

An illustrative projection is:

```yaml
id: ARCH-017
sourceFindingRef: engineering-quality:architecture.dependency-direction:...
category: architecture
severity: high
confidence: high
evidenceQuality: strong
title: Infrastructure dependency crosses application boundary
scope:
  project: checkout
  files:
    - packages/checkout/src/...
evidenceRefs:
  - evidence:dependency-edge:...
ruleRef:
  id: architecture.dependency-direction
  source: project-foundation
impact:
  - high coupling
  - difficult isolated testing
  - migration risk
recommendationRefs:
  - recommendation:introduce-port
provenance:
  classification: deterministic
  graphProvider: nx
  graphSnapshotDigest: sha256:...
```

The original source result remains authoritative for its own domain. The
assessment projection adds cross-domain presentation, prioritization, debt, and
report context.

## Severity, confidence, evidence quality, and priority

These dimensions must remain separate.

### Severity

Severity describes potential engineering impact if the finding is correct.
Candidate levels may include critical, high, medium, low, and informational.
Exact levels and blocking semantics must be owned by versioned policy.

### Confidence

Confidence describes how strongly the available evidence supports the finding.
A high-severity, low-confidence hypothesis is not automatically a blocker.
Candidate levels may include high, medium, low, and unknown.

### Evidence quality

Evidence quality describes source completeness and trust.

Candidate factors include:

- deterministic versus inferred source;
- content-digest binding;
- tool version and configuration availability;
- graph completeness;
- timestamp and scope completeness;
- conflicting evidence;
- stale evidence;
- unsupported paths or tools.

### Priority

Priority is a decision aid, not a synonym for severity.

It may consider:

- severity;
- confidence;
- evidence quality;
- blast radius;
- user impact;
- developer impact;
- architectural blocking;
- security impact;
- performance impact;
- remediation complexity;
- dependency order.

Any formula must be transparent, versioned, inspectable, and configurable where
appropriate. AI-generated priority must be labeled as a recommendation rather
than objective mathematics.

## Assessment scopes

Assessment should accept an explicit scope such as:

- workspace;
- application;
- package or library;
- feature;
- domain or bounded context;
- directory;
- changed files;
- affected projects;
- explicit file set.

A graph provider may resolve affected scopes, but the selected project root and
scope remain authoritative. Assessment must not expand to sibling repositories
or unrelated projects silently.

## Assessment profiles

Candidate execution profiles are:

- `quick`, for bounded deterministic checks and existing evidence;
- `standard`, for normal project, quality, graph, and checker coverage;
- `deep`, for broader approved read-only evidence and optional AI interpretation;
- `custom`, for explicit module and evidence selection.

A profile changes depth and enabled capabilities. It must not silently change
canonical engineering rules or weaken safety policy.

## Architecture Assessment

Architecture Assessment compares observed project structure and dependency
relationships with the architecture selected or declared by the user or project.

Candidate checks, where applicable, include:

- project and workspace structure;
- frontend and backend layering;
- domain and feature boundaries;
- dependency direction;
- dependency cycles;
- package and public API boundaries;
- coupling and cohesion;
- shared, common, or utils concentration;
- state ownership and data flow;
- dependency inversion;
- framework-to-domain leakage;
- scalability and maintainability risks;
- modular-monolith boundaries;
- microservice or microfrontend contracts;
- Nx tags and module-boundary evidence;
- custom architecture constraints.

Architecture styles may include DDD, Feature-Sliced Design, Clean Architecture,
Hexagonal Architecture, modular monoliths, microservices, microfrontends, or a
custom project model. The active architecture determines relevant rules.

A directory name alone does not prove an architecture violation.

## Frontend Architecture Assessment

Frontend assessment remains pack-driven.

Candidate capabilities include:

- Angular;
- React;
- Next.js;
- Vue when an approved pack exists;
- component architecture;
- state ownership and state management;
- data fetching and caching;
- TanStack Query and React Query;
- RxJS;
- Angular Signals;
- NgRx;
- Zustand;
- routing;
- microfrontends;
- design systems;
- reusable components;
- Web Components;
- accessibility;
- bundle architecture;
- test architecture;
- observability;
- performance;
- large dataset handling.

Framework-specific knowledge belongs in Quality Packs, Checker Adapters, and
specialized Graph Providers, not in Assessment Core.

## Performance Assessment

Performance Assessment consumes measured evidence. It does not invent numbers.

Candidate evidence sources include:

- Lighthouse;
- Web Vitals;
- Chrome performance traces;
- HAR files;
- bundle analyzers;
- source-map analysis;
- React Profiler;
- Angular performance tooling;
- browser memory profiles;
- long-task reports;
- network waterfalls;
- CI performance results;
- Nx task timings;
- build timings;
- test timings.

Candidate metrics include:

- LCP;
- INP;
- CLS;
- total and initial bundle size;
- lazy chunks;
- initial render;
- memory;
- long tasks;
- request count;
- transferred bytes;
- build duration;
- test duration.

Every metric needs provenance such as source artifact, timestamp, environment,
configuration, scenario, tool version, and project-state digest.

### Baseline comparison

Performance comparison is explicit:

```text
baseline
-> change
-> measurement
-> comparison
```

A report may show measured values such as LCP, bundle size, memory, and initial
render before and after a change. Example numbers in documentation are never
runtime evidence.

Comparisons must reject or qualify materially incompatible environments instead
of claiming improvement from incomparable samples.

## Monorepo and Developer Productivity Assessment

This module evaluates project-system behavior, not employee productivity.

Candidate areas include:

- Nx;
- pnpm, npm, and Yarn workspaces;
- TypeScript project references;
- Cargo workspaces;
- monorepo boundaries;
- project and task graphs;
- affected projects;
- local caching;
- build and CI performance;
- flaky tests;
- dependency boundaries;
- test-pyramid evidence;
- release automation;
- duplicated pipelines;
- dependency cycles;
- unnecessary rebuilds;
- workspace ownership.

The term `developer productivity` refers only to system-level friction such as
build latency, duplicate work, flaky checks, slow feedback loops, or unclear
ownership. It must not be converted into developer rankings or individual
activity metrics.

Affected analysis may accelerate feedback only after completeness is proven. It
does not replace authoritative security, compatibility, release, or publication
gates prematurely.

## AI Engineering Assessment

AI Engineering Assessment evaluates controls around AI-assisted software
development.

Candidate evidence sources include repository instructions, Intentloom policies,
agent configuration, skills, MCP manifests, approved extension metadata,
permission grants, session records, review evidence, test results, and bounded
provider metadata.

Candidate systems include:

- Claude Code;
- Codex;
- ChatGPT;
- Cursor;
- GitHub Copilot;
- MCP clients and servers;
- project-specific agents;
- Neutron;
- skills and plugins.

Candidate assessment questions include:

- Is there one discoverable project context and canonical engineering intent?
- Are architecture and quality rules versioned and reviewable?
- Can agents bypass architecture boundaries or quality gates?
- Is unrestricted shell or filesystem access exposed?
- Are secrets and provider credentials protected?
- Are model and tool permissions explicit and bounded?
- Are generated changes reviewed before mutation?
- Are tests and conformance checks part of the workflow?
- Is persistent project memory scoped, reviewable, exportable, and deletable?
- Are duplicate or conflicting agent instructions visible?
- Is provenance retained for material agent decisions and changes?
- Can workflows be reproduced from stable configuration and evidence?

The output describes engineering controls around AI-assisted development. It is
not a marketing score and must not rate individual developers by AI usage.

## Technical Debt Map

The Technical Debt Map is a projection over findings, not a separate source of
truth.

Candidate groups include:

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

For each finding, the debt projection may include:

- severity;
- confidence;
- evidence quality;
- blast radius;
- affected projects and scopes;
- estimated remediation complexity;
- prerequisites;
- dependencies on other remediation items;
- recommended order.

Complexity estimates are estimates, not measured facts, unless backed by an
explicit deterministic metric.

## Prioritized recommendations

Recommendations should be explainable and reversible where possible.

The system should expose why one item is ordered ahead of another, including
policy inputs, dependency order, blockers, evidence quality, and estimated cost.

A recommended order may be overridden by the user. User overrides should be
recorded as decisions instead of silently rewriting assessment evidence.

## Target-state options

Material remediation may offer multiple target states.

Typical options are:

- minimal remediation, removing the immediate risk with least structural change;
- incremental architecture improvement, reducing debt through staged migration;
- target architecture migration, when broader change is justified by evidence.

Each option should include:

- advantages;
- disadvantages;
- risks;
- estimated complexity;
- affected scopes;
- prerequisites;
- migration order;
- compatibility impact;
- rollback or exit points;
- evidence and assumptions.

Neutron may explain or compare options. The user chooses the target state.

## Remediation roadmap

The assessment result may produce a dependency-aware roadmap such as
`Immediate`, `Next`, and `Later`, or a phase-based sequence.

The roadmap does not require calendar dates.

Candidate metadata includes:

- prerequisites;
- finding dependencies;
- affected packages and paths;
- recommended tests;
- migration checkpoints;
- rollback considerations;
- verification evidence required to close a finding.

A remediation roadmap is a plan input, not approval to mutate the repository.

## Canonical assessment report

Define one provider-neutral report model first. Rendering formats remain
adapters.

Candidate report sections are:

1. Executive Summary
2. Project Context
3. Assessment Scope
4. Methodology
5. Evidence Sources
6. Architecture Overview
7. Critical Findings
8. High-priority Findings
9. Medium-priority Findings
10. Technical Debt Map
11. Performance Baseline, when available
12. Testing Assessment
13. Maintainability Assessment
14. Security, Accessibility, and Observability, where applicable
15. AI Engineering Assessment, where applicable
16. Target-state Options
17. Prioritized Recommendations
18. Remediation Roadmap
19. Risks
20. Assumptions
21. Unsupported or Unverified Areas
22. Appendix and Evidence References

Candidate renderers may later include JSON, Markdown, HTML, and PDF.

The first implementation should prioritize the canonical JSON and report
contract. PDF generation is not required for the initial assessment milestone.

## Historical comparison

A later comparison operation may compare two assessment snapshots with compatible
scope and methodology.

Candidate output includes:

- fixed findings;
- new findings;
- worsened findings;
- improved findings;
- changed evidence quality;
- performance metric deltas;
- architecture drift;
- technical-debt trend.

Historical comparison must preserve assessment version, policy version, graph
provider version, checker versions, environment, scope, and project-state
context. Different configurations must not be presented as directly comparable
without qualification.

## Incremental and affected assessment

A future read-only optimization may use changed files and graph evidence:

```text
baseline assessment
-> development
-> changed files
-> affected graph
-> bounded reassessment
```

This remains user-controlled. It is not mandatory background monitoring.

The optimization must preserve a path to full assessment and must not silently
omit findings whose dependency reach cannot be determined reliably.

## Privacy and local-first behavior

Default assessment behavior is:

- repository content remains local;
- telemetry is not required;
- network access is explicit;
- external models require provider and data-handling permissions;
- secrets are redacted before persistence, export, or provider transmission;
- evidence is project-scoped;
- report export occurs only through explicit user action;
- raw private repository content is not uploaded merely to render a report;
- repositories and assessments do not become training data by default.

Assessment permissions remain capabilities, not model instructions.

## Read-only first implementation boundary

The first implementation increment should support only:

```text
inspect
-> collect
-> analyze
-> report
```

It must not automatically rewrite project files.

A future CLI surface may resemble:

```bash
intentloom assess
intentloom assess architecture
intentloom assess performance
intentloom assess monorepo
intentloom assess ai-engineering
intentloom assess --profile standard --json
```

These names are candidates only. Existing CLI compatibility and naming rules
must be reviewed before a public command is added.

The eventual machine-readable output must be versioned and stable according to
Intentloom compatibility policy.

## Desktop surface

A future Desktop presentation may include an Assessments workspace with Overview,
Architecture, Quality, Performance, Testing, Monorepo and CI, AI Engineering,
Technical Debt, Recommendations, and Roadmap views.

A finding may drill down through:

```text
finding
-> evidence
-> affected files and projects
-> graph
-> rule
-> recommendation
-> prepare remediation plan
```

Desktop remains a client over shared application and daemon contracts. It must
not contain assessment business logic.

## CLI, TUI, daemon, MCP, and Agent Workspace

All surfaces consume the same canonical assessment result.

- CLI provides deterministic automation and stable JSON output.
- TUI provides interactive read-only navigation.
- daemon transports versioned assessment operations.
- MCP exposes typed, bounded assessment tools and resources when approved.
- Desktop renders assessment workspaces.
- Agent Workspace and Neutron explain and plan from canonical assessment data.

No client parses another client's human output.

## Extensibility and non-software disciplines

Assessment Core should use provider-neutral concepts such as scope, evidence,
rule reference, finding projection, recommendation, option, roadmap, and report.

Software-specific modules may add source graphs, package graphs, framework packs,
build evidence, or browser metrics. Future non-software engineering disciplines
should be able to contribute other evidence and rule providers without changing
the core provenance and review model.

## Compatibility considerations

This documentation phase changes no public contract.

Before implementation, an ADR should decide:

- whether an assessment schema wraps existing finding schemas or introduces a
  shared finding envelope;
- stable assessment and evidence-reference identifiers;
- severity and confidence vocabularies;
- report schema versioning;
- policy and pack version binding;
- historical-comparison compatibility rules;
- limits for findings, evidence references, graph snapshots, and reports;
- unknown-field behavior;
- redaction and retention rules;
- daemon, CLI JSON, and MCP compatibility surfaces.

Implementation must preserve the existing v1 support and migration policy.

## Security and threat-model requirements

Before runtime implementation, threat review must cover at least:

- hostile repository text and prompt injection;
- malicious or oversized checker output;
- symlink and project-root escape;
- secret and credential exposure;
- external model transmission;
- checker process permissions;
- network permissions;
- graph poisoning or incomplete graphs;
- malicious SARIF, HAR, trace, source-map, or report inputs;
- report injection in Markdown or HTML renderers;
- assessment-cache isolation;
- historical-data retention;
- stale-baseline comparison;
- remediation-plan privilege escalation.

External tools remain least-privileged and permission-bounded.

## Open architecture questions

The following questions require implementation-phase ADR work instead of being
silently resolved in this concept:

1. Should the assessment layer expose a shared finding envelope, or only stable
   references to existing domain-specific finding contracts?
2. Which evidence-reference identity survives checker reruns and historical
   comparison?
3. Which severity vocabulary can compose conformance, security, quality, and
   architecture findings without flattening domain semantics?
4. How are performance environments normalized before metrics are comparable?
5. Which graph completeness guarantees are required before architecture drift
   or affected-scope claims can be deterministic?
6. Which AI-assisted classifications may be persisted before human review?
7. Where should project-local assessment snapshots live, if persisted at all,
   without making them canonical project intent?

## Open-source boundary

Engineering Assessments, architecture assessment, canonical reports, evidence
provenance, technical-debt projection, and local report generation are
open-source product capabilities.

This direction contains no paywall, billing, pricing, consulting, or commercial
service design.

A future optional hosted, team, or enterprise service may be considered only
through a separate non-binding product decision after the open-source contracts
are mature. Such a service must not redefine local open-source assessment
semantics.
