# Engineering Quality Packs, Marketplace, and Graph Plan

## Status

Implementation roadmap for Engineering Quality Packs, Checker Adapters, a curated
catalog, future marketplace controls, decomposition planning, and optional
architecture graph providers.

The plan extends the existing configurable engineering standards and architecture
profile roadmaps. It does not replace current policy, pack, extension, skill,
Project Inception, Foundation Workshop, ownership, approval, evidence, or
transaction contracts.

## Objective

Deliver one provider-neutral engineering-quality system where a user can:

- choose preferred, review, and hard code budgets;
- apply different budgets by language, file class, package, or architecture
  scope;
- prevent new debt while adopting legacy repositories incrementally;
- receive deterministic findings with evidence and provenance;
- request a behavior-preserving decomposition plan for oversized files;
- select first-party or imported style-guide packs;
- connect existing linters and static-analysis tools through bounded adapters;
- inspect and activate packs only after compatibility review;
- use Nx or another provider as architecture and task-graph evidence;
- see equivalent results through CLI, Desktop, TUI, daemon, MCP, and Neutron.

The target flow is:

```text
select quality profile
-> detect project languages, tools, and graph providers
-> resolve scoped canonical rules
-> inspect effective policy and conflicts
-> collect deterministic evidence
-> produce findings
-> prepare decomposition or configuration plan when requested
-> preview exact changes and permissions
-> explicit approval
-> transactional apply
-> rerun checkers and record evidence
```

## Architectural rules

1. The existing Engineering Standards resolver remains the canonical policy
   authority.
2. Quality guidance, tool configuration, checker execution, graph evidence, and
   remediation are separate capability classes.
3. A data-only pack cannot execute code.
4. An executable adapter cannot become trusted from documentation text alone.
5. Findings retain deterministic evidence and source provenance.
6. AI may explain or propose remediation but cannot alter measured evidence.
7. Preferred, review, hard, and legacy-baseline states remain distinct.
8. Existing oversized files use a non-growing ratchet by default.
9. Decomposition is based on responsibilities and contracts, not arbitrary line
   ranges.
10. External sources are pinned, reviewed, and never silently downloaded,
    activated, or updated.
11. Marketplace metadata inspection is read-only.
12. Installation, activation, checker execution, and remediation are separate
    approvals.
13. Nx is an optional graph provider, not a required runtime dependency.
14. Nx Cloud and remote graph upload remain disabled unless separately approved.
15. Enterprise-only third-party features cannot become hidden Intentloom
    requirements.
16. All clients consume shared application and protocol contracts.

## Current state

Intentloom already has the following documented foundation:

- repository code-quality standards;
- balanced, strict, legacy-ratchet, and custom policy profiles;
- source-file, test-file, function, complexity, nesting, and parameter budgets;
- explicit quality exceptions;
- TypeScript, Angular, React, Rust, Tauri, backend, accessibility, testing, and
  security guidance directions;
- architecture strategies and scoped discipline profiles;
- managed extension and curated skill foundations;
- Desktop declarative extension surfaces and sandbox boundaries;
- an incremental Nx adoption roadmap;
- Project Inception and Foundation Workshop quality selection;
- deterministic evidence and harness infrastructure.

The missing implementation path is a shared contract connecting those systems to
pack provenance, external imports, checker execution, graph providers, and
prepared decomposition plans.

## First vertical slice

The first implementation should remain small and read-only.

```text
balanced policy
-> classify TypeScript production and test files
-> measure formatted physical lines
-> compare against preferred, review, hard, and legacy baselines
-> return structured findings
-> prepare one responsibility-based decomposition proposal
-> inspect one built-in TypeScript guidance pack
-> consume an existing Nx graph export when present
```

The first slice should not:

- install ESLint, Nx, or another dependency;
- create or edit a configuration file;
- download an external pack;
- execute arbitrary project commands;
- run a marketplace extension;
- automatically refactor a file;
- enforce every framework rule;
- require Nx;
- use AI to decide measured line counts or severity.

## Candidate contracts

Public schemas require ADR, compatibility, validation, migration, and threat-model
review.

Candidate artifacts:

```text
engineering-quality-policy.schema.json
engineering-quality-rule.schema.json
engineering-quality-scope.schema.json
engineering-quality-threshold.schema.json
engineering-quality-baseline.schema.json
engineering-quality-exception.schema.json
engineering-quality-finding.schema.json
engineering-quality-evidence.schema.json
engineering-quality-pack.schema.json
engineering-quality-pack-source.schema.json
engineering-quality-pack-lock.schema.json
engineering-checker-adapter.schema.json
engineering-checker-run.schema.json
engineering-checker-result.schema.json
engineering-decomposition-plan.schema.json
engineering-graph-provider.schema.json
engineering-graph-snapshot.schema.json
engineering-marketplace-entry.schema.json
```

Every persisted contract should define:

- stable identifier;
- schema version;
- project identity;
- scope identity;
- content digest;
- provenance and trust;
- compatibility range;
- size and count bounds;
- unknown-field behavior;
- secret and personal-data handling;
- migration policy;
- support policy;
- deterministic fixtures.

## Candidate application operations

### Effective policy

```text
resolveEngineeringQualityPolicy
getEffectiveEngineeringQualityPolicy
explainEngineeringQualityRule
compareEngineeringQualityPolicies
validateEngineeringQualityPolicy
```

### File classification and metrics

```text
classifyEngineeringArtifact
measureEngineeringArtifact
listEngineeringQualityBaselines
prepareEngineeringQualityBaseline
validateEngineeringQualityBaseline
```

### Findings

```text
checkEngineeringQuality
listEngineeringQualityFindings
getEngineeringQualityFinding
compareEngineeringQualityFindings
explainEngineeringQualityFinding
```

### Exceptions

```text
prepareEngineeringQualityException
approveEngineeringQualityException
revokeEngineeringQualityException
listEngineeringQualityExceptions
validateEngineeringQualityException
```

### Decomposition

```text
analyzeEngineeringResponsibilities
prepareEngineeringDecompositionPlan
compareEngineeringDecompositionOptions
validateEngineeringDecompositionPlan
resolveTaskAgainstEngineeringBudgets
```

### Packs

```text
listEngineeringQualityPacks
inspectEngineeringQualityPack
resolveEngineeringQualityPack
compareEngineeringQualityPackVersions
prepareEngineeringQualityPackImport
prepareEngineeringQualityPackActivation
verifyEngineeringQualityPack
revokeEngineeringQualityPack
```

### Checkers

```text
listEngineeringCheckerAdapters
inspectEngineeringCheckerAdapter
prepareEngineeringCheckerRun
executeEngineeringCheckerRun
normalizeEngineeringCheckerResult
compareEngineeringCheckerResults
```

### Graphs

```text
listEngineeringGraphProviders
inspectEngineeringGraphProvider
prepareEngineeringGraphSnapshot
normalizeEngineeringGraphSnapshot
compareEngineeringGraphSnapshots
validateArchitectureAgainstGraph
resolveAffectedEngineeringScopes
```

### Catalog and marketplace

```text
listEngineeringCatalogEntries
inspectEngineeringCatalogEntry
searchEngineeringCatalog
prepareEngineeringCatalogDownload
verifyEngineeringCatalogArtifact
prepareEngineeringPackUpdate
```

## Policy and threshold model

The resolver should support threshold groups rather than one global number.

Candidate threshold dimensions:

- preferred;
- review;
- hard;
- baseline;
- allowed growth;
- severity;
- blocking mode;
- file class;
- path or package scope;
- language and framework;
- new versus existing artifact;
- generated versus hand-written;
- task or release phase.

Candidate finding states:

```text
within-policy
preferred-exceeded
review-required
hard-limit-exceeded
legacy-baseline
legacy-growth
exception-active
exception-expired
unsupported-measurement
classification-required
```

The policy should define whether a state is advisory, warning, blocking for plan,
blocking for apply, or blocking only for release.

## Artifact classification

Before measuring a file, Intentloom should classify it using deterministic
project evidence and reviewed configuration.

Candidate precedence:

1. explicit path classification;
2. generated-file ownership metadata;
3. known generated or vendored path rules;
4. package or architecture scope;
5. language and filename conventions;
6. user confirmation when ambiguous.

A source file must not become exempt merely because it contains a comment saying
it is generated.

Candidate classifications:

- hand-written production source;
- hand-written test source;
- generated source;
- vendored source;
- declarative configuration;
- schema or protocol;
- fixture or data table;
- snapshot;
- migration;
- public export surface;
- documentation;
- unknown.

Unknown classification should not silently receive the most permissive budget.

## Deterministic file metrics

The first built-in checker should measure formatted physical lines without
mutating the project.

Required behavior:

- use the project-approved formatter result when available without writing it;
- otherwise use a stable line-count definition;
- include comments and blank lines when the active policy says physical lines;
- exclude binary files and bounded unsupported inputs;
- identify line-ending normalization;
- bind evidence to a content digest;
- report unsupported classification or parser cases truthfully;
- remain deterministic across supported platforms.

Later metrics may include:

- function and method lines;
- cyclomatic complexity;
- nesting depth;
- positional parameter count;
- exported symbol count;
- import fan-in and fan-out;
- dependency cycles;
- architecture-boundary violations;
- test and contract evidence;
- security and accessibility findings.

Each metric requires a versioned definition and parser/tool compatibility range.

## Legacy baseline and ratchet

The baseline lifecycle should be explicit:

```text
inventory current findings
-> classify legitimate exemptions
-> review remaining violations
-> create exact baseline with content and policy identities
-> reject new violations
-> reject growth
-> require decomposition or exception when touched
-> remove entries as debt decreases
-> expire or migrate stale baseline formats
```

A baseline entry should include:

- rule ID and version;
- exact scope;
- measured value;
- content or structural digest;
- reason and ownership;
- creation date;
- review trigger;
- permitted growth, normally zero;
- related decomposition follow-up;
- current status.

Baseline creation is not automatic acceptance of debt. The user reviews which
violations become tracked legacy state.

## Projected-growth planning

Before code generation or editing, task planning should inspect current metrics
and expected change shape.

Candidate result:

```yaml
path: packages/example/src/handler.ts
currentLines: 284
reviewLines: 300
hardLines: 400
estimatedGrowth:
  minimum: 35
  likely: 70
confidence: medium
finding: likely-review-threshold-crossing
recommendedPlanChange:
  kind: extract-before-feature
```

The estimate should never be presented as a measured final result.

If projected growth likely crosses a hard limit, candidate behavior is:

- add a decomposition step before feature work;
- propose a new cohesive module;
- choose a narrower implementation option;
- request a reviewed exception;
- stop planning when safe decomposition requires an unresolved architecture
  decision.

## Decomposition planner

The first planner should operate read-only and produce alternatives.

### Evidence collection

Collect bounded evidence from:

- imports and exports;
- functions, classes, types, and constants;
- side-effect boundaries;
- public consumers;
- tests and fixtures;
- architecture scopes;
- graph edges;
- ownership metadata;
- current policy and exceptions;
- trusted provider history when explicitly available.

### Responsibility model

Candidate responsibility groups:

- domain model;
- application operation;
- validation;
- serialization and protocol;
- persistence;
- filesystem;
- process or shell;
- provider or network;
- transport;
- UI rendering;
- state orchestration;
- configuration;
- public exports;
- generated mapping;
- test fixtures.

### Candidate decomposition options

- minimal extraction needed to avoid budget growth;
- recommended cohesive decomposition;
- broader architecture cleanup only when evidence justifies it;
- keep together with rationale;
- defer with ratchet and follow-up;
- exception with expiry.

### Required plan evidence

Each option should show:

- source responsibilities;
- destination modules;
- dependency direction;
- public API impact;
- test movement or preservation;
- transaction and ordering risk;
- migration order;
- expected file-size result;
- graph impact;
- compatibility and rollback;
- assumptions and confidence.

The planner must not create a generic `utils`, `helpers`, or `common` module as a
line-count escape hatch.

## Checker adapter protocol

The checker protocol should support two modes.

### Consume existing evidence

Intentloom reads a bounded report already produced by CI or the project.

Examples:

- ESLint JSON;
- TypeScript diagnostics;
- SARIF;
- Clippy JSON;
- test reports;
- coverage reports;
- dependency graph exports.

This is the safest first integration because Intentloom does not execute the tool.

### Execute bounded checker

Intentloom prepares and runs an approved command under an explicit capability
contract.

Required controls:

- exact executable and version;
- trusted source or project-local binary identity;
- allowed arguments;
- explicit project root;
- read path allowlist;
- write paths, normally empty;
- environment allowlist;
- no inherited secrets by default;
- network disabled by default;
- timeout, output, memory, and process bounds;
- cancellation;
- stable output protocol;
- cache isolation;
- truthful partial or failed status.

An adapter should prefer a project-pinned tool over downloading its own version.

## Initial checker adapters

Candidate delivery order:

1. built-in file metrics;
2. consume existing ESLint JSON;
3. consume TypeScript compiler diagnostics;
4. consume SARIF;
5. consume Clippy JSON;
6. run project-pinned ESLint read-only;
7. run project-pinned TypeScript typecheck;
8. additional language-specific adapters based on demand.

No initial adapter should install the underlying tool.

## Quality pack source adapters

Candidate source adapters:

- built-in first-party pack;
- exact npm package version;
- exact Git commit and path;
- signed organization registry artifact;
- local file or directory;
- reviewed documentation URL snapshot;
- imported legacy configuration.

The adapter produces a source snapshot and provenance record. It does not directly
activate rules.

## External guide normalization

External documentation should be converted into candidate rule mappings.

```text
source paragraph or configuration rule
-> source citation and version
-> candidate canonical rule ID
-> enforcement class
-> severity proposal
-> scope proposal
-> conflicts and ambiguity
-> human review
```

Enforcement classes:

- deterministic built-in;
- existing checker-backed;
- new checker adapter required;
- review checklist;
- guidance only;
- unsupported;
- organization decision required.

The normalization process should retain source text references without copying
large copyrighted documents into a pack.

## First-party pack candidates

### Base quality

- file and function budgets;
- complexity and nesting;
- legacy ratchet;
- testing expectations;
- exception policy.

### TypeScript

- strict type safety;
- explicit async and error states;
- public contract discipline;
- framework-independent core boundaries;
- TypeScript compiler and typescript-eslint mappings.

### Angular

- official structure and naming guidance;
- feature-oriented organization;
- focused components;
- dependency injection and reactive-state guidance;
- Angular-specific checker mappings where deterministic.

### React

- component and hook purity;
- immutable props and state;
- effect and event boundaries;
- lint and Strict Mode guidance;
- React-specific checker mappings.

### Rust

- formatting and Clippy;
- ownership and error boundaries;
- production panic restrictions;
- capability and unsafe-code review.

### Tauri 2

- capability and permission inventory;
- least privilege;
- IPC validation;
- native-webview boundary checks;
- packaging and cross-platform evidence.

### Nx workspace

- project graph evidence;
- tag-based dependency constraints;
- affected project and task resolution;
- cycles and forbidden dependency directions;
- local-only graph behavior by default.

## Catalog phases

### Curated catalog v1

Only metadata and data-only first-party packs.

Capabilities:

- list;
- search;
- inspect;
- compare versions;
- show source and license;
- show compatibility and conflicts;
- download preview;
- verify digest;
- prepare activation.

### Curated third-party v2

Add reviewed third-party data-only packs with pinned sources and compatibility
fixtures.

### Organization registries v3

Support private, signed, organization-scoped catalogs with explicit trust roots.

### Executable marketplace v4

Consider executable checker and remediation packages only after sandbox,
signature, permissions, revocation, update, isolation, and support contracts are
proven.

An unrestricted executable marketplace is not required for the product to be
useful.

## Catalog metadata

Candidate entry fields:

```text
id
name
summary
publisher
trustClass
packClass
version
sourceIdentity
contentDigest
signature
license
compatibility
capabilities
networkBehavior
filesystemBehavior
executable
postInstallBehavior
conflicts
supportStatus
publishedAt
reviewedAt
revokedAt
```

Unknown executable or network behavior should block activation.

## Install and activation lifecycle

```text
inspect metadata
-> select exact version
-> prepare download
-> disclose network and storage
-> download into quarantine
-> verify digest and signature
-> validate schema and compatibility
-> inspect capabilities and dependencies
-> preview normalized rules and conflicts
-> user approves install
-> install into user-local or organization store
-> separately prepare project activation
-> preview effective-policy diff
-> user approves activation
-> transactional project write
-> verification
```

Updates follow the same lifecycle. No pack should auto-update because its source
published a new version.

## Pack lock and reproducibility

A project should be able to record exact active pack identities without storing
credentials or private registry tokens.

Candidate lock evidence:

```yaml
packs:
  - id: intentloom/typescript
    version: 1.0.0
    digest: sha256:...
    source: first-party
  - id: example-org/frontend
    version: 2.4.1
    digest: sha256:...
    source: organization-registry
```

Resolution should fail truthfully when a pinned artifact is unavailable or
revoked. It should not silently substitute another version.

## Nx graph integration

### Detection

Intentloom may detect an existing Nx workspace from bounded repository evidence.
Detection does not install Nx or activate a provider.

### Read-only acquisition

Candidate acquisition order:

1. consume a previously generated project graph artifact;
2. consume project metadata files when sufficient;
3. run a project-pinned Nx graph export with approval;
4. report unsupported when a safe graph cannot be produced.

### Normalized graph

The normalized graph should represent:

- project nodes;
- package, application, library, and tool classifications;
- source roots;
- tags;
- dependency edges and edge type;
- files or evidence responsible for an edge when available;
- targets and task dependencies;
- affected sets;
- external nodes;
- cycles;
- provider version and graph digest.

### Conformance use

Intentloom can apply provider-neutral rules over normalized graph evidence:

- allowed dependency direction;
- tag compatibility;
- bounded-context boundaries;
- public contract requirements;
- forbidden direct application-to-application imports;
- cycle policy;
- ownership and review requirements;
- task-specific affected scope resolution.

### Open-source default

For JavaScript and TypeScript Nx projects, the initial plan may integrate existing
open-source Nx graph and module-boundary capabilities.

Language-agnostic Nx conformance features that require an enterprise license are
optional licensed integrations. Intentloom should not represent them as free or
required.

### Intentloom workspace pilot

Intentloom's own repository should use the already approved incremental Nx pilot:

```text
baseline current pnpm and tsc behavior
-> add project graph visibility
-> model existing targets
-> keep pnpm verify authoritative
-> validate pure tasks before caching
-> observe affected analysis
-> add boundary tags and rules
-> integrate quality graph evidence
```

The mutating root version-synchronization step must remain outside a cacheable
pure build target until split and proven safe.

## Non-Nx graph providers

A project without Nx should still receive architecture evidence.

Candidate provider order:

- explicit Intentloom architecture map;
- TypeScript project references;
- pnpm, npm, Yarn, or other workspace relationships;
- package manifests;
- static import analysis;
- Cargo metadata;
- framework-specific project metadata;
- organization graph import.

The normalized result should preserve provider limitations and confidence.

## CLI roadmap

### Read-only policy and findings

```bash
intentloom standards show --effective
intentloom standards check --root .
intentloom standards explain RULE_ID
intentloom standards findings --changed
intentloom standards baseline preview
intentloom standards decomposition plan PATH
```

### Packs

```bash
intentloom packs list
intentloom packs search QUERY
intentloom packs inspect PACK_ID@VERSION
intentloom packs import SOURCE --dry-run
intentloom packs verify PACK_ID@VERSION
intentloom packs diff PACK_ID@OLD PACK_ID@NEW
intentloom packs activate PACK_ID@VERSION --dry-run
intentloom packs update PACK_ID --to VERSION --dry-run
intentloom packs revoke PACK_ID@VERSION
```

### Checkers

```bash
intentloom checkers list
intentloom checkers inspect CHECKER_ID
intentloom checkers consume REPORT --adapter ADAPTER_ID
intentloom checkers run CHECKER_ID --root . --dry-run
```

### Graphs

```bash
intentloom graph providers
intentloom graph detect
intentloom graph inspect --provider nx
intentloom graph export --provider nx --format json
intentloom graph affected --base BASE --head HEAD
intentloom architecture validate --graph-provider nx
```

Stable automation forms use `--json` and versioned structured results.

## Desktop roadmap

### Engineering Standards

- profile and scope editor;
- preferred, review, hard, and legacy thresholds;
- artifact classification;
- findings and evidence;
- legacy baseline and exception review;
- decomposition alternatives;
- exact checker run preview.

### Quality Pack Catalog

- first-party and curated entries;
- installed, active, update-available, revoked, and incompatible states;
- publisher and trust information;
- source, version, digest, signature, and license;
- rule preview and effective-policy diff;
- capabilities and executable status;
- separate install and activation approval.

### Architecture Map

- graph-provider selection;
- project and task graph;
- dependency edge explanation;
- affected projects;
- cycles and boundary findings;
- selected-file effective policy;
- accessible tree and table alternatives.

Desktop must consume shared operations and must not execute marketplace code in
the renderer.

## TUI, daemon, MCP, and Neutron roadmap

- expose the same effective policy and findings;
- expose pack and checker metadata;
- expose bounded graph snapshots;
- allow read-only decomposition planning;
- keep download, execution, activation, and remediation behind explicit
  capabilities and approval;
- keep AI output advisory;
- prove result equivalence across clients.

## Delivery phases

### Q0. Inventory and ADR boundary

- map existing standards, architecture, pack, skill, extension, graph, evidence,
  approval, and transaction contracts;
- accept terminology for pack classes and adapters;
- define which store owns installed packs;
- define relation to Foundation and Blueprint approval;
- threat-model external sources and executable extensions.

Exit gate:

- no duplicate policy resolver, extension host, or marketplace trust store is
  proposed;
- guidance, configuration, execution, graph, and remediation permissions are
  separate.

### Q1. Versioned quality contracts

- policy, rule, scope, threshold, classification, baseline, exception, finding,
  evidence, and result schemas;
- deterministic validators and fixtures;
- migration and unknown-field policy.

Exit gate:

- a model-free fixture resolves a scoped policy and validates a finding.

### Q2. Artifact classifier and file metrics

- explicit and inferred file classes;
- formatted physical line measurement;
- preferred, review, hard, and baseline states;
- content digest and cross-platform fixtures.

Exit gate:

- identical repository content produces equivalent findings on supported
  platforms.

### Q3. Legacy baseline and ratchet

- baseline preview and approval;
- non-growing behavior;
- expired and stale baseline detection;
- baseline reduction and removal.

Exit gate:

- new violations and growth of existing violations fail according to policy while
  untouched debt remains visible.

### Q4. Task and pull-request integration

- projected-growth evidence;
- affected-path policy resolution;
- plan acceptance criteria;
- final diff comparison;
- pull-request evidence rendering.

Exit gate:

- a task likely to exceed a hard limit receives a visible plan conflict before
  mutation.

### Q5. Read-only decomposition planner

- responsibility analysis;
- dependency and public API evidence;
- minimal, recommended, keep-together, defer, and exception options;
- test-preservation and migration steps.

Exit gate:

- an oversized fixture produces a coherent plan without arbitrary line splitting
  or mutation.

### Q6. First-party quality packs

- base quality;
- TypeScript;
- Angular;
- React;
- Rust;
- Tauri 2;
- testing, accessibility, and security-sensitive guidance;
- primary-source provenance and compatibility ranges.

Exit gate:

- first-party packs resolve deterministically and do not duplicate conflicting
  rule meanings.

### Q7. Checker report ingestion

- ESLint JSON;
- TypeScript diagnostics;
- SARIF;
- Clippy JSON;
- stable normalization and deduplication;
- bounded report size and untrusted-input handling.

Exit gate:

- imported reports become normalized findings without executing project tools.

### Q8. Bounded checker execution

- project-pinned executable resolution;
- command and environment preview;
- read-only sandbox or isolation where available;
- timeout, cancellation, output bounds, and truthful failures.

Exit gate:

- one checker runs without dependency installation, hidden network, project
  mutation, or secret inheritance.

### Q9. External pack import

- package, Git, local, organization-registry, and documentation snapshot sources;
- exact pinning and digest;
- provenance, license, compatibility, and rule normalization;
- import and activation as separate approvals.

Exit gate:

- an external data-only pack can be imported, reviewed, pinned, and activated
  without executing code.

### Q10. Curated catalog

- read-only catalog search and inspection;
- first-party metadata;
- verified downloads and quarantine;
- pack lock and update diff;
- revocation and yanking state.

Exit gate:

- a catalog entry can be inspected and verified without automatic installation or
  activation.

### Q11. Graph-provider contracts

- normalized graph schema;
- TypeScript/workspace provider;
- Nx provider;
- provider limitations and confidence;
- graph digest and snapshots.

Exit gate:

- the same architecture rule can operate on normalized Nx and non-Nx graph
  fixtures.

### Q12. Nx graph and boundary integration

- project and task graph acquisition;
- affected-scope resolution;
- dependency causes when available;
- tag and boundary rule mapping;
- OSS default and optional enterprise adapter distinction.

Exit gate:

- an Nx project produces read-only graph findings without Nx Cloud or repository
  restructuring.

### Q13. CLI and JSON surface

- policy, findings, baseline, decomposition, pack, checker, and graph commands;
- stable exit codes and machine-readable output;
- no hidden writes.

Exit gate:

- the full read-only workflow operates through the packaged CLI.

### Q14. Desktop and TUI

- standards, catalog, checker, decomposition, and graph views;
- accessible alternatives;
- approval previews;
- shared application operations.

Exit gate:

- Desktop and TUI return equivalent policy and finding state as CLI.

### Q15. Daemon and MCP

- versioned resources and bounded tools;
- client parity fixtures;
- no arbitrary shell, download, installation, or mutation tool.

Exit gate:

- CLI, daemon, and MCP results are equivalent for the same project fixture.

### Q16. Assisted remediation

- prepared decomposition and configuration plans;
- exact diffs;
- current-state revalidation;
- transactional application and rollback;
- verification after apply.

Exit gate:

- no finding can directly authorize a source change.

### Q17. Organization catalogs

- private trust roots;
- signed metadata and artifacts;
- organization policy composition;
- access, retention, revocation, and audit controls.

Exit gate:

- organization trust remains scoped and credentials are not stored in project
  metadata.

### Q18. Executable marketplace decision

- evaluate whether demand justifies third-party executable checkers or recipes;
- require sandbox, permissions, supply-chain, signature, revocation, support, and
  incident-response evidence;
- accept or reject an unrestricted marketplace through an ADR.

Exit gate:

- executable marketplace capability is not enabled merely because the data-only
  catalog exists.

## Verification strategy

### Contract fixtures

- balanced greenfield TypeScript project;
- strict project with lower limits;
- legacy repository with oversized files;
- generated and vendored files;
- ambiguous classification;
- scoped package override;
- active and expired exception;
- incompatible packs;
- revoked pack;
- stale baseline;
- unsupported checker output.

### Decomposition fixtures

- cohesive long table-driven module;
- mixed domain and filesystem module;
- oversized public export surface;
- large test file with unrelated behavior groups;
- transaction orchestration that should remain visible;
- framework component mixing domain behavior;
- cyclic package boundary;
- existing legacy module with zero-growth feature change.

Fixtures should prove that the planner does not always recommend splitting.

### Pack fixtures

- first-party data-only pack;
- exact package-version import;
- pinned Git commit import;
- local unverified pack;
- unsupported license;
- digest mismatch;
- ambiguous rule mapping;
- conflicting Angular and organization convention;
- update with breaking rule changes;
- revoked version.

### Checker fixtures

- complete and partial ESLint reports;
- malformed and oversized reports;
- SARIF with unsupported locations;
- checker timeout;
- cancellation;
- attempted project write;
- inherited secret denial;
- hidden network denial;
- non-zero exit with usable findings;
- version mismatch.

### Graph fixtures

- pnpm workspace;
- TypeScript project references;
- Nx applications and libraries;
- dependency cycle;
- forbidden tag dependency;
- affected project explanation;
- missing edge cause;
- stale graph digest;
- enterprise-only adapter unavailable;
- non-Nx equivalent architecture rule.

### Security fixtures

- malicious pack manifest;
- path traversal in archive;
- symlink escape;
- archive bomb;
- postinstall script;
- prompt injection in documentation;
- executable disguised as data-only pack;
- signature mismatch;
- publisher identity confusion;
- revoked trust root;
- credential leakage in checker environment;
- unbounded tool output;
- marketplace metadata poisoning.

### Client parity

CLI, Desktop, TUI, daemon, MCP, and Neutron should return equivalent effective
policy, finding identity, provenance, graph evidence, and approval state.

## Initial release gate

The first public increment should require:

- versioned policy and finding contracts;
- artifact classification;
- deterministic file metrics;
- preferred, review, hard, and legacy states;
- reviewed baseline workflow;
- one read-only decomposition plan;
- one first-party TypeScript quality pack;
- CLI JSON output;
- cross-platform fixtures;
- no external download;
- no checker execution;
- no project mutation.

## Later release gate for external packs

External import should require:

- source pinning and digest;
- provenance and license records;
- quarantine;
- schema and compatibility validation;
- conflict preview;
- separate import and activation approvals;
- pack lock;
- update diff;
- revocation handling;
- security corpus.

## Later release gate for checker execution

Checker execution should require:

- exact tool identity;
- project-root binding;
- read-only default;
- environment and secret isolation;
- network disclosure and default denial;
- timeout, cancellation, output, and process bounds;
- deterministic result normalization;
- compatibility and support documentation;
- cross-platform evidence.

## Later release gate for marketplace executables

Executable third-party packages should require:

- accepted sandbox architecture;
- least-privilege capability model;
- publisher identity and signing;
- reproducible artifact verification;
- dependency and supply-chain review;
- revocation and emergency disablement;
- incident-response process;
- support and compatibility policy;
- explicit maintainer authorization.

## Non-goals for the first increments

- arbitrary third-party code execution;
- automatic style-guide scraping;
- automatic dependency installation;
- automatic Nx migration;
- Nx Cloud activation;
- mandatory enterprise licenses;
- organization-wide remote policy override;
- autonomous decomposition or refactoring;
- silent CI changes;
- individual developer scoring;
- using file size as the only quality measure;
- treating every warning as a blocker;
- replacing specialist linters and analyzers;
- merging, releasing, or publishing from a quality finding.
