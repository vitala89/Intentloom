# Engineering Assessment Principles

## Status

Governance direction for Engineering Assessments and Evidence-backed Audit
Reports.

These principles define invariants for future assessment schemas, application
operations, CLI/daemon/MCP contracts, Desktop/TUI surfaces, Quality Packs,
Checker Adapters, graph providers, AI-assisted interpretation, report exporters,
historical comparison, and remediation planning.

They do not create runtime behavior by themselves.

## Principles

### 1. Evidence before inference

Assessment conclusions begin with bounded project evidence, deterministic
measurement, tool-backed evidence, declared architecture, and versioned policy.

AI may interpret evidence, explain trade-offs, or propose a recommendation. It
must not invent the underlying evidence.

### 2. Provenance is required for material findings

Every material finding must be traceable to one or more of:

- deterministic Intentloom evidence;
- a versioned project-state digest;
- an effective engineering rule or policy;
- a Quality Pack rule;
- a Checker Adapter result;
- a graph snapshot;
- a Foundation or approved architecture artifact;
- an explicitly identified AI-assisted interpretation record.

A finding without adequate provenance is not promoted to an authoritative
assessment conclusion.

### 3. Insufficient evidence is a valid result

Intentloom must prefer:

```text
insufficient-evidence
```

over a confident-sounding guess.

Missing, stale, conflicting, denied, malformed, partial, or unsupported evidence
must remain visible.

### 4. Deterministic and AI-assisted findings remain distinguishable

Clients must preserve whether a conclusion is:

- deterministic;
- tool-backed;
- derived;
- AI-assisted;
- review-required;
- insufficient-evidence.

A renderer must not remove this distinction for convenience.

### 5. Severity is not confidence

Severity describes potential impact if a finding is correct.

Confidence describes how strongly the available evidence supports it.

A high-severity, low-confidence finding must not become blocking merely because
its severity is high.

### 6. Evidence quality is not severity

Evidence completeness, trust, freshness, tool identity, graph completeness, and
conflicts are independent from engineering impact.

Assessment results must not collapse these dimensions into one score.

### 7. Priority is transparent and configurable

Priority may consider severity, confidence, evidence quality, blast radius,
user or developer impact, architectural blocking, security, performance,
remediation cost, and dependency order.

Any deterministic formula must expose its inputs, version, and weighting.
AI-proposed priority remains a recommendation rather than objective mathematics.

### 8. No universal architecture ideology

Intentloom evaluates a project relative to declared project intent, selected
architecture, approved Foundation, scoped Quality Packs, and custom rules.

Clean Architecture, Hexagonal Architecture, DDD, Feature-Sliced Design,
modular monoliths, microservices, microfrontends, and other styles are options,
not universal truth.

### 9. Observed structure does not define intended architecture

Directories, package names, monorepo topology, Nx tags, imports, and graph edges
are evidence.

They do not by themselves prove the intended domain model, ownership model,
runtime topology, or architecture.

### 10. Foundation defines the target when available

For a project with an approved Foundation or architecture map, assessment may
compare declared and observed architecture.

Architecture drift is a relationship between intent and evidence. It is not a
folder-style preference.

### 11. Quality Packs own specialist rules

Framework, language, discipline, accessibility, testing, security,
observability, and organization-specific rules belong in versioned Quality
Packs or other approved policy sources.

Assessment Core must remain provider-neutral and framework-neutral.

### 12. Checker Adapters normalize specialist tools

Intentloom should reuse existing project tools and reports where safe.

ESLint, TypeScript, Clippy, SARIF producers, Lighthouse, coverage tools, bundle
analyzers, profilers, and other specialist tools remain responsible for their
own measurements. Assessment consumes normalized results rather than replacing
specialist analyzers.

### 13. Tool failure is visible

A timeout, crash, denied permission, malformed report, partial result,
unsupported version, or network denial is not a clean assessment.

Tool failure must remain an explicit state.

### 14. Graph Providers are evidence providers

Nx, TypeScript project references, workspace manifests, import graphs, Cargo
metadata, and explicit architecture maps may provide graph evidence.

No graph provider gains policy authority merely by being selected.

### 15. Nx is optional

Assessment must work for non-Nx repositories.

Intentloom must not install Nx, migrate a repository to Nx, enable Nx Cloud, or
require a hosted account merely to perform an assessment.

### 16. Performance numbers require provenance

LCP, INP, CLS, bundle size, memory, request counts, build times, test times, and
other metrics must come from measured evidence.

AI must not invent performance metrics, baselines, improvements, or guarantees.

### 17. Baseline comparisons require compatible context

A before/after comparison must preserve the relevant environment, scenario,
tool version, configuration, project state, and measurement method.

Materially incompatible measurements are qualified or rejected rather than
presented as improvement or regression.

### 18. Read-only first

The first assessment implementation is observation only:

```text
inspect
-> collect
-> analyze
-> report
```

Assessment must not automatically rewrite project files.

### 19. A finding does not authorize remediation

```text
finding
!= remediation approval
!= project write permission
!= dependency install permission
!= commit permission
```

Remediation remains behind proposal, plan, exact diff, explicit approval,
current-state revalidation, transaction safety, rollback, and verification.

### 20. Human authority remains explicit

A user may accept, reject, defer, reprioritize, or choose among target-state
options.

AI explanation, model confidence, checker output, or assessment severity does
not become human approval.

### 21. External tools are least privilege

Checker and graph execution must declare and bound tool identity, version,
arguments, project root, filesystem scope, environment, network mode, timeout,
output size, and result protocol.

Read-only assessment tools do not inherit project write access or secrets by
default.

### 22. No hidden uploads

Repository content, evidence, traces, source maps, reports, prompts, and
assessment snapshots must not be uploaded silently.

External models, providers, or hosted tools require explicit network and
data-handling permission.

### 23. Local-first is the default

Basic project assessment, canonical findings, and local report generation must
not require a cloud account, hosted backend, telemetry service, or remote
storage.

### 24. No mandatory AI

Deterministic assessment paths remain usable when no model provider is
configured.

AI-assisted interpretation is an optional capability over canonical evidence.

### 25. Secrets are excluded and redacted

Assessment must preserve existing project-root, ignored-path, credential,
redaction, provider, and memory boundaries.

Secrets must not enter exported reports, logs, prompts, caches, or persisted
assessment snapshots merely because deeper analysis was requested.

### 26. Project scope is explicit

Assessment is bound to one selected project root and one explicit assessment
scope.

Workspace, application, package, feature, domain, directory, changed-file, or
affected-project scopes must not silently expand to unrelated repositories.

### 27. Profiles change depth, not truth

`quick`, `standard`, `deep`, or future custom profiles may select evidence depth,
modules, tool runs, and optional interpretation.

Profiles must not hide policy precedence or silently redefine canonical rules.

### 28. Technical debt is a projection over findings

The Technical Debt Map groups and relates traceable findings. It must not create
new unreferenced problems merely to make a report look comprehensive.

### 29. Complexity estimates are labeled as estimates

Remediation complexity, migration effort, blast radius, and similar values may
be useful planning inputs.

When they are not deterministically measured, they must remain estimates with
method and confidence visible.

### 30. Recommendations are not guarantees

A recommendation may reduce an identified risk or improve alignment with a
selected architecture.

Intentloom must not promise that a remediation will guarantee performance,
scalability, maintainability, security, or business outcomes.

### 31. Multiple target states are allowed

Material architectural remediation should support alternatives such as minimal,
incremental, and target-state migration where appropriate.

The system should show trade-offs and allow the user to decide.

### 32. Historical comparisons preserve context

Assessment A and Assessment B are comparable only when the system can explain
relevant differences in scope, policy, packs, tools, graph providers,
configuration, project state, and environment.

Historical trend views must not erase changed methodology.

### 33. Incremental assessment is user-controlled

Changed-file and affected-project assessment may accelerate feedback after its
correctness is proven.

It must not become mandatory hidden background monitoring and must retain a
safe fallback to full assessment.

### 34. One canonical assessment result serves every client

CLI, Desktop, TUI, daemon, MCP, Agent Workspace, and Neutron consume shared
application and protocol contracts.

No client may implement a hidden assessment resolver, private severity rule, or
separate evidence model.

### 35. Agent Workspace explains canonical data

Agent Workspace may answer why a finding exists, show evidence, compare options,
or prepare a remediation plan.

It must reference canonical assessment and evidence identities and label any new
AI-assisted interpretation.

### 36. Memory does not silently upgrade model opinion

Assessment summaries, decisions, and historical records may enter persistent
project memory only through existing trust, review, retention, redaction,
export, deletion, and supersession rules.

Repeated model output does not become canonical truth through repetition.

### 37. Reports are renderers over canonical facts

JSON, Markdown, HTML, PDF, Desktop views, and TUI views render the same
assessment model.

A renderer must not alter severity, confidence, evidence quality, unsupported
areas, or provenance to create a cleaner narrative.

### 38. Export is explicit

Report export is a user action.

Intentloom must not silently publish, email, upload, or share project assessment
results.

### 39. Report formats require injection safety

Markdown, HTML, PDF, and other renderers must treat repository content,
checker output, model output, links, paths, and metadata as untrusted input.

Human-readable export must not introduce script execution, unsafe links, or
hidden external fetches.

### 40. Assessment rules are versioned

Every enforceable assessment rule uses stable identity, version, scope,
measurement semantics, provenance, and migration policy.

Free-form prompt instructions may explain a rule but are not the enforcement
contract.

### 41. Reproducibility is pursued, not fabricated

For the same project state, scope, policy, tool versions, graph snapshots, and
options, deterministic assessment components should produce equivalent results
on supported platforms.

Where external tools, runtime environments, or AI models prevent strict
reproducibility, that limitation is visible.

### 42. Open-source assessment remains complete

Architecture assessment, evidence provenance, canonical findings, technical debt
projection, local reports, and core assessment contracts are open-source product
capabilities.

No billing, pricing, paywall, consulting workflow, or proprietary-only core
assessment path is introduced through these principles.

### 43. Assessment evaluates systems, not people

Intentloom may assess code, architecture, dependencies, CI, testing,
performance, accessibility, security controls, observability, documentation,
and AI-engineering workflows.

It must not produce employee productivity scores, developer rankings,
individual activity profiles, attendance metrics, keystroke tracking, or hidden
performance evaluations.

### 44. Organization context does not become employee surveillance

Future enterprise responsibility and approval graphs may explain which scope
requires review or approval.

They must not be repurposed to attribute technical debt, CI latency, findings,
or assessment scores to individuals for performance management.

### 45. Compatibility is an explicit contract

Any public assessment schema, JSON output, daemon method, MCP tool, report
contract, or persisted snapshot requires compatibility, migration, size-limit,
unknown-field, support, and deprecation policy consistent with Intentloom's v1
contract.

## Required implementation evidence

A pull request that implements assessment runtime capability should state:

- which existing Intentloom contracts are reused;
- which new contract, if any, is introduced and why reuse was insufficient;
- exact project and assessment scope;
- rule and Quality Pack versions;
- evidence and graph sources;
- checker identity, version, permissions, timeout, and output bounds;
- deterministic versus AI-assisted result classes;
- severity, confidence, evidence-quality, and priority semantics;
- unsupported and insufficient-evidence behavior;
- secret, retention, export, and network behavior;
- tests proving read-only operation where applicable;
- CLI/application/daemon/MCP/Desktop equivalence for implemented surfaces;
- compatibility and migration impact;
- why no employee-scoring or surveillance behavior was introduced;
- whether an ADR or threat review was required.
