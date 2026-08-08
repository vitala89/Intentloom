# Engineering Assessments and Evidence-backed Audit Reports

## Status

Candidate open-source product direction.

This document defines how Intentloom can compose existing project inspection,
evidence, conformance, Quality Pack, Checker Adapter, architecture graph,
Foundation, Agent Workspace, Neutron, memory, plan, approval, and transaction
capabilities into reproducible engineering assessments.

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
- Quality Pack, Checker Adapter, graph-provider, approval, prepared-plan,
  transaction, and evidence contracts.

## Problem

Existing engineering tools often provide one of two incomplete experiences:

1. deterministic tools emit isolated diagnostics without a coherent project
   assessment; or
2. an AI model reads repository content and produces an authoritative-sounding
   opinion without stable evidence, provenance, reproducibility, or explicit
   uncertainty.

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
-> technical-debt projection
-> prioritized recommendations
-> target-state options
-> remediation roadmap
-> exportable engineering report
-> optional reviewed implementation plan
```

The assessment capability evaluates software, project, and system evidence. It
must not score employees, rank developers, infer individual productivity, or
become a surveillance system.

## Goals

Engineering Assessments should:

- produce explainable, evidence-backed project findings;
- distinguish deterministic evidence from derived or AI-assisted interpretation;
- compare declared architecture with observed architecture where a Foundation or
  project architecture map exists;
- reuse Quality Packs instead of hardcoding framework rules into Core;
- reuse Checker Adapters instead of replacing specialist tools;
- reuse Graph Providers without requiring Nx;
- support scoped assessment of a workspace, application, package, feature,
  domain, directory, changed files, or affected projects;
- support architecture, frontend, performance, monorepo and CI, testing,
  maintainability, security, accessibility, observability, and AI-engineering
  assessment modules;
- preserve severity, confidence, evidence quality, and priority as separate
  concepts;
- treat `insufficient-evidence` as a valid result;
- provide technical-debt grouping and dependency-aware remediation ordering;
- support multiple target-state options rather than one universal architecture;
- remain local-first, provider-neutral, read-only first, permission-bounded, and
  open source;
- expose one canonical structured result to CLI, Desktop, TUI, daemon, MCP,
  Agent Workspace, and Neutron;
- integrate future remediation through the existing prepare, preview, approve,
  revalidate, and transactional apply boundary.

## Non-goals

This direction does not create:

- a second policy or conformance engine;
- a universal architecture score;
- an autonomous refactoring agent;
- automatic dependency installation;
- unrestricted shell execution;
- mandatory Nx;
- mandatory AI or one model provider;
- mandatory cloud storage or hosted backend;
- hidden repository upload or telemetry;
- AI-generated performance measurements;
- guaranteed performance improvements;
- employee performance scoring, developer ranking, activity leaderboards, or
  productivity surveillance;
- a billing, subscription, pricing, consulting, or proprietary audit layer.

Engineering Assessments are part of the open-source Intentloom product
direction. Any future hosted or enterprise service would require a separate
product decision and architecture review and must not make the local assessment
core artificially incomplete.

## Architectural decision

Do not introduce an independent `Audit Engine` that owns policies, checkers,
graphs, or project truth.

Use an **Assessment Orchestrator** over existing canonical systems:

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
      ├── findings
      ├── unsupported / insufficient-evidence areas
      ├── debt projection
      ├── prioritization view
      ├── target-state options
      ├── remediation roadmap
      └── report model
```

The orchestrator coordinates evidence and normalizes assessment-specific output.
It does not become a new source of policy authority.

## Reused Intentloom capabilities

### Project inspection

The selected project root and bounded inspection rules remain owned by existing
project-access and application-operation contracts. Assessment must not broaden
filesystem access merely because a deeper analysis was requested.

### Project evidence

Existing local Git, provider evidence, normalized engineering events, trust
states, redaction, and provenance form part of the evidence substrate.
Assessment-specific evidence extends this substrate rather than inventing a
parallel repository crawler.

### Engineering conformance

Conformance remains the authority for comparing observed engineering workflow
evidence with canonical workflow policies. Assessment may include conformance
findings and summarize their implications, but does not reimplement conformance
rules.

### Engineering Quality Packs

Quality Packs provide versioned framework, language, discipline, architecture,
accessibility, security, testing, observability, and organization-specific
rules. Assessment Core remains domain-neutral.

Examples may eventually include:

- TypeScript;
- Angular;
- React;
- Rust;
- Tauri;
- backend/service;
- accessibility;
- security;
- testing;
- Nx;
- organization policy.

A pack may describe framework-specific checks. Core must not hardcode Angular,
React, TanStack Query, RxJS, NgRx, Zustand, or similar implementation rules.

### Checker Adapters

Checker Adapters normalize deterministic tool results into bounded Intentloom
evidence and findings.

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

- Nx project and task graphs;
- TypeScript project references;
- pnpm, npm, or Yarn workspace manifests;
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

Example:

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
microservices, microfrontends, modular monoliths, or any other style
universally.

### Agent Workspace and Neutron

Agent Workspace and Neutron consume canonical assessment data. They do not own a
second hidden assessment implementation.

They may help answer questions such as:

- Why is finding `ARCH-017` classified as high severity?
- Which evidence supports it?
- Which three remediations are currently most useful?
- What target-state alternatives exist?
- Prepare an implementation plan for one approved finding.

Model output may explain, compare, summarize, or propose. It cannot change
measured evidence, policy, severity rules, approval state, or mutation authority.

### Persistent memory

Accepted assessment summaries, reviewed decisions, resolved findings, and
historical comparisons may become project-scoped memory only through existing
trust, provenance, review, retention, export, deletion, and supersession rules.

Raw model interpretation does not silently become canonical memory.

### Approved apply and transaction boundary

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

Candidate evidence classes:

- `deterministic`: produced directly by stable Intentloom logic;
- `tool-backed`: produced by a bounded external checker or project tool;
- `derived`: computed deterministically from other evidence;
- `ai-assisted`: interpretation or classification proposed by a model;
- `review-required`: useful hypothesis that requires explicit human review;
- `insufficient-evidence`: the requested conclusion cannot be supported.

These are assessment provenance classes, not severity levels.

Every material assessment conclusion should be traceable to evidence references,
rule references, graph snapshots, tool versions, configuration digests, or an
explicit AI interpretation record.

## Canonical assessment model

The first implementation should define a versioned canonical assessment result
without prematurely replacing existing conformance or quality schemas.

Candidate top-level shape:

```yaml
schemaVersion: 1
assessmentId: assessment:2026-08-08:example
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

This example is illustrative. A public schema requires ADR, threat review,
validator, compatibility, fixture, migration, size-limit, and support-policy
work.

## Finding integration

Intentloom already has conformance and engineering-quality finding directions.
Assessment should not create a competing generic `Finding` type if existing
schemas can be safely extended or wrapped.

The assessment layer needs a stable cross-domain projection that can reference
the original source finding.

Candidate projection:

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
assessment projection supplies cross-domain presentation, prioritization, debt,
and report context.

## Severity, confidence, evidence quality, and priority

These dimensions must remain separate.

### Severity

Severity describes potential engineering impact if the finding is correct.
Candidate levels may be:

- critical;
- high;
- medium;
- low;
- informational.

Exact levels and blocking semantics must be owned by versioned policy.

### Confidence

Confidence describes how strongly the available evidence supports the finding.
A high-severity, low-confidence hypothesis is not automatically a blocker.

Candidate levels:

- high;
- medium;
- low;
- unknown.

### Evidence quality

Evidence quality describes source completeness and trust.

Candidate factors include:

- deterministic versus inferred source;
- content digest binding;
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

Any formula must be transparent, versioned, inspectable, configurable where
appropriate, and accompanied by its inputs. AI-generated priority should be
labeled as a recommendation rather than presented as objective mathematics.

## Assessment scopes

Assessment should accept an explicit scope:

- workspace;
- application;
- package or library;
- feature;
- domain or bounded context;
- directory;
- changed files;
- affected projects;
- explicit file set.

A graph provider may resolve affected scopes, but the user-selected root and
scope remain authoritative. Assessment must not expand to sibling repositories
or unrelated projects silently.

## Assessment profiles

Candidate execution profiles:

- `quick`: bounded deterministic checks and existing evidence only;
- `standard`: normal project evidence, quality, graph, and checker coverage;
- `deep`: broader approved read-only evidence collection and optional
  AI-assisted interpretation;
- `custom`: explicit module and evidence selection.

A profile changes depth and enabled capabilities. It must not silently change
canonical engineering rules or weaken safety policy.

## Architecture Assessment

Architecture Assessment compares observed project structure and dependency
relationships with the architecture selected or declared by the user or
project.

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
custom project model. The active architecture determines the relevant rules.

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
- TanStack Query / React Query;
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

Framework-specific knowledge belongs in Quality Packs, checker adapters, and
specialized graph providers, not in Assessment Core.

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
configuration, URL or scenario where applicable, tool version, and project-state
digest.

### Baseline comparison

Performance comparison is explicit:

```text
baseline
-> change
-> measurement
-> comparison
```

Candidate representation:

| Metric         | Before | After |
| -------------- | ------ | ----- |
| LCP            | 4.1 s  | 1.8 s |
| Bundle         | 2.8 MB | 1.7 MB |
| Memory         | 420 MB | 270 MB |
| Initial render | 2.4 s  | 1.1 s |

Values in documentation examples are illustrative only. Runtime reports must
come from collected evidence.

Comparisons must reject or qualify materially incompatible environments rather
than claiming improvement from incomparable samples.

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
- test pyramid evidence;
- release automation;
- duplicated pipelines;
- dependency cycles;
- unnecessary rebuilds;
- workspace ownership.

The term `developer productivity` refers only to system-level friction such as
build latency, duplicate work, flaky checks, slow feedback loops, or unclear
ownership. It must not be converted into developer rankings or individual
activity metrics.

Affected analysis may accelerate feedback only after its completeness is proven.
It does not replace authoritative full security, compatibility, release, or
publication gates prematurely.

## AI Engineering Assessment

AI Engineering Assessment evaluates the controls around AI-assisted software
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
not a marketing score and must not rate individual developers by how they use AI.

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

The system should expose why an item is ordered ahead of another, including
policy inputs, dependency order, blockers, evidence quality, and estimated cost.

A recommended order may be overridden by the user. User overrides should be
recorded as decisions rather than silently rewriting assessment evidence.

## Target-state options

Material remediation may offer multiple target states.

Typical options:

- **Option A: Minimal remediation**: remove the immediate risk with the least
  structural change;
- **Option B: Incremental architecture improvement**: reduce debt while
  preserving staged migration;
- **Option C: Target architecture migration**: move toward a larger approved
  architecture change when evidence and project goals justify it.

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

The assessment result may produce a dependency-aware roadmap such as:

```text
Immediate
Next
Later
```

or:

```text
Phase 0
Phase 1
Phase 2
Phase 3
```

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

Candidate report sections:

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

Candidate renderers may later include:

- JSON;
- Markdown;
- HTML;
- PDF.

The first implementation should prioritize the canonical JSON/report contract.
PDF generation is not required for the initial assessment milestone.

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

The optimization must preserve a path to a full assessment and must not silently
omit findings whose dependency reach cannot be determined reliably.

## Privacy and local-first behavior

Default assessment behavior:

- repository content remains local;
- no hidden telemetry;
- no hidden network access;
- external models require explicit provider and data-handling permissions;
- secrets are redacted before persistence, export, or provider transmission;
- evidence is project-scoped;
- exported reports are produced only by explicit user action;
- raw private repository content is not uploaded merely to render a report;
- no user repository or assessment becomes training data by default.

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

A future Desktop presentation may include:

```text
Project
└── Assessments
    ├── Overview
    ├── Architecture
    ├── Quality
    ├── Performance
    ├── Testing
    ├── Monorepo / CI
    ├── AI Engineering
    ├── Technical Debt
    ├── Recommendations
    └── Roadmap
```

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
not contain assessment logic.

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
rule, finding projection, recommendation, option, roadmap, and report.

Software-specific modules may add source graphs, package graphs, framework
packs, build evidence, or browser metrics. Future non-software engineering
disciplines should be able to contribute other evidence and rule providers
without changing the core provenance and review model.

## Compatibility considerations

The documentation phase changes no public contract.

Before implementation, an ADR should decide:

- whether an assessment schema wraps existing finding schemas or introduces a
  shared finding envelope;
- stable assessment and evidence reference identifiers;
- severity and confidence vocabularies;
- report schema versioning;
- policy and pack version binding;
- historical-comparison compatibility rules;
- size and count limits for findings, evidence references, graph snapshots, and
  reports;
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

The following require implementation-phase ADR work rather than being silently
resolved in documentation:

1. Should the assessment layer expose a shared finding envelope, or only stable
   references to existing domain-specific finding contracts?
2. Which evidence reference identity survives checker reruns and historical
   comparison?
3. Which severity vocabulary can compose conformance, security, quality, and
   architecture findings without flattening their domain semantics?
4. How are performance environments normalized before two metrics are considered
   comparable?
5. Which graph completeness guarantees are required before architecture drift or
   affected-scope claims can be deterministic?
6. Which AI-assisted classifications may be persisted before human review?
7. Where should project-local assessment snapshots live, if persisted at all,
   without making them canonical project intent?

## Open-source boundary

Engineering Assessments, architecture assessment, canonical reports, evidence
provenance, and local report generation are open-source product capabilities.

This direction contains no paywall, billing, pricing, consulting, or commercial
service design.

A future optional hosted, team, or enterprise service may be considered only
through a separate non-binding product decision after the open-source contracts
are mature. Such a service must not redefine the local open-source assessment
semantics.
