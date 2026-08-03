# Engineering Quality Packs and Checker Adapters

## Status

Candidate product direction that extends the existing configurable engineering
standards, architecture profiles, managed extensions, Project Inception, and
Foundation Workshop systems.

This document extends, but does not replace:

- `docs/governance/CODE_QUALITY_STANDARDS.md`;
- `docs/roadmap/CONFIGURABLE_ENGINEERING_STANDARDS_PLAN.md`;
- `docs/roadmap/ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`;
- `docs/roadmap/NX_INCREMENTAL_ADOPTION_PLAN.md`;
- the pack, skill, extension, approval, ownership, evidence, and transaction
  contracts.

It does not add a public command, schema, package marketplace, executable plugin,
network permission, or project mutation capability by itself.

## Purpose

Intentloom should let a project define measurable engineering expectations and
apply them consistently through CLI, Desktop, TUI, MCP, daemon, Neutron, and
supported coding-agent adapters.

A user should be able to choose or customize:

- preferred, review, and hard file-size budgets;
- function, method, complexity, nesting, and parameter budgets;
- behavior for existing oversized files;
- decomposition expectations;
- testing, documentation, accessibility, security, and compatibility rules;
- language and framework guidance;
- deterministic checker integrations;
- repository and architecture graph providers;
- organization-owned or curated external standards packs.

The effective policy should be understandable before it is enforced. A rule must
show where it came from, which scope it applies to, how it is measured, whether it
can block work, and what a safe remediation path looks like.

## Existing foundation

Intentloom already defines candidate quality budgets and a configurable standards
model.

The current balanced direction includes:

- preferred production source-file size of 250 formatted physical lines;
- refactoring review above 300 lines;
- hard limit of 400 lines for a new or substantially changed production file;
- preferred test-file size of 400 lines and hard limit of 700 lines;
- preferred function size of 40 lines and hard limit of 80 lines;
- preferred cyclomatic complexity of 10 and review threshold of 15;
- preferred nesting depth of 3;
- a non-growing legacy ratchet for existing oversized files;
- explicit, scoped, reviewable exceptions;
- balanced, strict, legacy-ratchet, and custom policy profiles;
- first-party technology and domain packs;
- Nx-style project graphs and module-boundary checks as a repository option.

The missing layer is a complete contract connecting those policies to imported
style guides, deterministic tools, decomposition plans, a curated catalog, and
optional architecture graph providers.

## Core decision

Add a provider-neutral **Engineering Quality Pack** model and a separate
**Checker Adapter** model.

```text
human or organization intent
-> canonical quality rules
-> effective scoped policy
-> deterministic evidence collection
-> findings
-> explanation and remediation proposal
-> reviewed plan
-> explicit approval
-> optional mutation
```

Guidance, deterministic checks, executable tools, graph providers, and mutation
recipes are different capability classes. They must not be collapsed into one
plugin type.

## Pack and adapter classes

### 1. Quality guidance pack

A guidance pack contains normalized, versioned engineering rules and explanatory
material.

Examples:

- TypeScript maintainability guidance;
- Angular structure and naming guidance;
- React component and hook guidance;
- accessibility practices;
- secure coding practices;
- organization naming and documentation conventions;
- an adapted external style guide.

A guidance pack is data. It may influence generated instructions and planning,
but it does not execute project code or tools.

### 2. Tool configuration pack

A configuration pack maps canonical rules to a known tool configuration format.

Examples:

- an ESLint shareable configuration;
- a TypeScript compiler-options profile;
- a Stylelint configuration;
- a formatter configuration;
- a Clippy lint selection;
- a test-runner policy profile.

Installing a configuration pack is a reviewed project mutation. Activating it may
change CI behavior and therefore requires compatibility preview and explicit
approval.

### 3. Checker adapter

A checker adapter invokes or consumes a deterministic tool and translates its
results into Intentloom findings.

Candidate adapters include:

- TypeScript compiler diagnostics;
- ESLint and typescript-eslint;
- Stylelint;
- Rustfmt and Clippy;
- language-specific formatters and linters;
- dependency, license, vulnerability, or secret scanners;
- repository-native test and coverage reports;
- custom organization checkers with a bounded machine-readable protocol.

A checker adapter is not trusted merely because the underlying tool is popular.
Its command, version, inputs, outputs, environment, filesystem scope, network
state, timeout, and permissions must be visible and bounded.

### 4. Architecture graph provider

A graph provider supplies projects, packages, files, tasks, ownership scopes, and
dependency edges.

Candidate providers include:

- Nx project and task graph exports;
- TypeScript project references;
- package-manager workspace relationships;
- import graphs;
- Cargo workspace and crate metadata;
- explicit organization architecture maps;
- future language-specific graph adapters.

A graph provider is evidence. It does not define intended architecture by itself.
Detected edges are compared with approved architecture and quality rules.

### 5. Remediation recipe

A remediation recipe describes a bounded transformation or plan template.

Examples:

- split an oversized orchestration module by responsibility;
- extract a framework-independent application operation;
- replace a cross-boundary import with a declared contract;
- add a missing regression test;
- move generated code into a declared generated scope.

A recipe may propose edits, but it never receives mutation authority from the
finding that triggered it. Prepared plan, exact diff, current-state revalidation,
explicit approval, transaction safety, and rollback remain required.

## Canonical rule identity

Every enforceable rule should use a stable rule ID rather than free-form prompt
text.

A candidate rule record includes:

```yaml
id: source-file-lines
version: 1.0.0
category: maintainability
measurement: formatted-physical-lines
scopeKinds:
  - production-source
thresholds:
  preferred: 250
  review: 300
  hard: 400
legacyBehavior: non-growing-ratchet
severity:
  preferredExceeded: advisory
  reviewExceeded: warning
  hardExceeded: blocking
remediation:
  - inspect-responsibilities
  - prepare-decomposition-plan
provenance:
  type: intentloom-first-party
  sourceVersion: 1.0.0
```

This example is illustrative. It is not a valid public schema until an ADR,
validator, compatibility policy, and migration are accepted.

## Policy layers and precedence

The effective engineering policy should resolve these layers in order:

1. mandatory Intentloom safety and compatibility baseline;
2. organization policy;
3. project quality profile;
4. architecture scopes;
5. technology, framework, and discipline packs;
6. path or package overrides;
7. reviewed exceptions;
8. task-specific evidence and temporary plan constraints.

A lower layer may make a maintainability rule stricter when permitted. It must not
weaken security, ownership, approval, project-root, secret, provider-neutrality,
compatibility, or transaction requirements.

Conflicts must be explicit. The resolver should never silently choose whichever
pack was loaded last.

Candidate conflict states:

- `compatible`;
- `compatible-with-override`;
- `redundant`;
- `ambiguous`;
- `conflicting`;
- `unsupported`;
- `requires-user-decision`;
- `requires-specialist-review`.

## Scoped code budgets

Line and complexity budgets should be configurable by file class and scope.

Candidate file classes:

- production source;
- test source;
- generated source;
- vendored source;
- declarative configuration;
- schema or protocol definition;
- fixture or test data;
- snapshot;
- barrel or public export surface;
- migration;
- documentation;
- organization-specific custom class.

Candidate scope selectors:

- repository;
- workspace project;
- application;
- package or crate;
- bounded context;
- feature area;
- directory or glob;
- language;
- framework;
- generated path;
- explicitly named file.

The same numeric threshold should not be forced on every file class. A generated
schema, a table-driven fixture, a public export surface, and a stateful production
orchestration module have different review risks.

## Budget states

A measured artifact should resolve to one of these states:

### Within preferred budget

No size finding is produced.

### Preferred budget exceeded

The artifact remains valid, but Intentloom reports an advisory and asks whether
the current responsibility is still cohesive.

### Review threshold exceeded

The task or pull request requires explicit review evidence. The user should see:

- current value;
- threshold;
- growth introduced by the proposed change;
- responsibilities detected or declared;
- decomposition options;
- reason to keep the artifact together when applicable.

### Hard budget exceeded

For a new or substantially changed file, plan or apply should fail closed unless:

- the file class is exempt by policy;
- a narrower scope defines a reviewed different budget;
- a valid exception exists;
- the user explicitly approves an exception with evidence.

### Legacy baseline exceeded

An existing oversized file is recorded as debt, not as precedent.

The default legacy ratchet should:

- preserve the current measured baseline;
- reject new violations;
- reject growth of the existing violation;
- require decomposition or an exception when meaningfully touched;
- remove the baseline entry as the file is reduced;
- avoid forcing a repository-wide rewrite.

## Projected-growth preflight

Before writing code, Intentloom should estimate whether the prepared task is
likely to cross a configured budget.

The estimate is advisory because exact line count is unavailable before the diff
exists. It should use evidence such as:

- current formatted line count;
- planned responsibilities;
- expected new operations, types, branches, and tests;
- similar modules;
- requested generated artifacts;
- active decomposition follow-ups.

If a hard limit is likely to be crossed, the plan should normally place a
behavior-preserving extraction before or inside the feature task.

The final finding still uses the measured formatted result, not the estimate.

## Decomposition analysis

An oversized file should not be split at arbitrary line boundaries. Intentloom
should prepare a decomposition analysis based on responsibilities and contracts.

Candidate evidence:

- public exports and consumers;
- imported dependencies;
- side effects and privileged operations;
- state ownership;
- domain and application operations;
- transport, rendering, filesystem, network, and provider concerns;
- functions and types that change together;
- test coverage and fixtures;
- dependency cycles;
- architecture-scope ownership;
- change history when trusted provider evidence is available;
- generated versus hand-written regions.

A decomposition proposal should include:

1. responsibilities currently mixed in the file;
2. candidate seams;
3. proposed destination modules;
4. dependency direction before and after;
5. public API compatibility strategy;
6. test-preservation steps;
7. transaction or ordering risks;
8. migration sequence;
9. expected budget effect;
10. rollback and stopping points.

Candidate outcomes:

- keep cohesive file and record rationale;
- extract pure transformations;
- extract protocol or schema contracts;
- extract adapter-specific I/O;
- extract application operations;
- split tests by behavior or boundary;
- introduce a declared package boundary;
- defer with a non-growing baseline and follow-up;
- request a reviewed exception.

A decomposition recommendation is not an automatic refactor.

## Plan and pull-request integration

Every prepared implementation plan should resolve the effective quality policy
for affected paths.

Candidate plan evidence:

```text
active policy and packs
-> affected files and graph scopes
-> current metrics and baselines
-> projected growth
-> required checks
-> decomposition needs
-> exceptions
-> acceptance criteria
-> exact verification commands
```

When the resulting diff exists, Intentloom should compare planned and measured
quality evidence.

A pull request summary may include:

- source and test-file budgets;
- functions or complexity above review thresholds;
- legacy files touched and whether they grew;
- decomposition completed or deferred;
- active packs and checker versions;
- graph-boundary findings;
- exceptions and review triggers;
- checks and tests run.

## Imported style guides and best practices

Users should be able to import or select external standards without treating raw
text as a trusted executable policy.

Candidate source types:

- an official documentation URL;
- a Git repository and exact commit;
- a package and exact version;
- a local file or directory;
- an organization registry;
- a curated Intentloom catalog entry.

Candidate examples:

- official TypeScript and typescript-eslint guidance;
- official Angular guidance;
- official React rules and lint guidance;
- an Airbnb-style ESLint shareable configuration;
- an internal company style guide;
- a security or accessibility standard;
- a repository-specific architecture convention.

Import should follow this lifecycle:

```text
select source
-> disclose network and trust state
-> fetch exact version or commit
-> verify integrity and license metadata
-> parse as untrusted input
-> map candidate rules to canonical IDs
-> show unsupported and ambiguous statements
-> preview conflicts and effective policy
-> user approves import
-> user separately approves activation or project writes
```

Intentloom must not claim that every sentence in a style guide is mechanically
enforceable. Rules should be classified as:

- deterministic;
- tool-backed;
- review-required;
- explanatory;
- unsupported;
- conflicting;
- organization-decision-required.

## Source provenance

Every imported pack should record:

- pack ID and version;
- source type and canonical identity;
- exact package version, commit, or content digest;
- publisher or organization identity when verified;
- license and redistribution status;
- retrieval date;
- last reviewed date;
- compatibility ranges;
- normalized rule mapping;
- unsupported source sections;
- local modifications;
- signature or checksum evidence when available;
- update and revocation policy.

A mutable `latest` reference is insufficient for reproducible enforcement.

## Curated catalog and future marketplace

Intentloom should start with a curated catalog, not an unrestricted executable
marketplace.

Candidate trust classes:

### First-party verified

Maintained in the Intentloom repository, versioned, tested, source-attributed, and
included in release verification.

### Curated third-party

Reviewed metadata and rule mapping, pinned source, integrity evidence, license
review, compatibility tests, and no automatic execution.

### Organization-private

Published by a configured organization or local registry. Trust is scoped to that
organization and does not become global Intentloom trust.

### Local unverified

Imported from a local path or user-selected source. It remains explicitly
unverified until reviewed and approved.

Executable checker or remediation packages require a stronger trust and
permission model than data-only guidance packs.

A future marketplace entry should show:

- pack class;
- publisher and trust state;
- version and compatibility;
- requested capabilities;
- network and filesystem behavior;
- executable versus data-only status;
- source and license;
- integrity and signature evidence;
- test and support status;
- known conflicts;
- update history;
- revocation or yanking state.

## Marketplace safety boundary

The marketplace must not become an arbitrary package-manager install button.

Default behavior:

- browsing and metadata inspection are read-only;
- no hidden download;
- no hidden dependency installation;
- no postinstall scripts;
- no arbitrary shell execution;
- no automatic project configuration changes;
- no automatic activation after installation;
- no automatic update;
- no silent replacement of a pinned pack;
- no remote policy override without project review.

A downloaded executable extension should be quarantined until compatibility,
integrity, permissions, and user approval are complete.

## Checker execution boundary

A checker run should declare:

- adapter ID and version;
- tool identity and exact version;
- executable source;
- arguments;
- working directory and allowed project root;
- readable paths;
- writable paths, normally none for a check;
- environment-variable allowlist;
- network state;
- timeout and output limits;
- cancellation behavior;
- expected output protocol;
- cache behavior;
- result provenance.

Read-only checking must not mutate source, lockfiles, caches inside the project,
or configuration unless the user separately approves a mutation plan.

When a tool cannot operate read-only, Intentloom should disclose that limitation
and use a disposable isolated workspace where supported.

## Finding model

A normalized finding should include:

```yaml
ruleId: source-file-lines
ruleVersion: 1.0.0
scope: packages/application/src/example.ts
severity: warning
state: review-threshold-exceeded
measured:
  value: 336
  unit: formatted-physical-lines
threshold:
  review: 300
  hard: 400
evidence:
  checker: intentloom-file-metrics
  checkerVersion: 1.0.0
  contentDigest: sha256:...
provenance:
  packId: intentloom/typescript-balanced
  packVersion: 1.0.0
remediation:
  kind: decomposition-plan
```

AI may explain the finding, but must not change its measured evidence or severity.

## Nx graph provider

Nx can be integrated as an optional graph and task-evidence provider for
Nx-enabled repositories.

Candidate read-only inputs:

- project graph JSON;
- task graph JSON;
- project metadata;
- tags and declared boundaries;
- affected projects and tasks;
- dependency edges;
- files responsible for an edge when Nx exposes that evidence;
- target definitions and cache metadata.

Candidate uses:

- visualize applications, libraries, and dependencies;
- detect cycles and forbidden dependency directions;
- resolve which quality and architecture scopes affect a task;
- narrow checks to affected projects when safe;
- explain why a project is affected;
- validate tag-based module boundaries;
- compare observed and approved architecture;
- enrich Desktop Architecture Map and Foundation stress tests.

Nx remains optional. Intentloom must support non-Nx projects through other graph
providers.

## Nx boundaries and licensing

The default open-source integration should rely on capabilities available in the
Nx workspace tooling and supported open-source boundary rules.

Intentloom must not make an enterprise-only Nx feature a hidden requirement.
Language-agnostic Nx conformance capabilities may require an Nx Enterprise
license and should therefore be represented as an optional licensed adapter, not
as the default Intentloom checker.

Intentloom may provide its own provider-neutral graph conformance rules over
normalized graph evidence.

Nx integration must not:

- require Nx Cloud;
- enable remote caching by default;
- upload project graph or source metadata without approval;
- replace pnpm workspaces or TypeScript project references automatically;
- restructure a repository from detection alone;
- imply that repository topology is runtime architecture;
- grant mutation authority;
- silently install Nx into a non-Nx project.

## Candidate configuration

```yaml
engineering:
  profile: balanced
  budgets:
    productionSource:
      preferredLines: 250
      reviewLines: 300
      hardLines: 400
    testSource:
      preferredLines: 400
      hardLines: 700
    function:
      preferredLines: 40
      hardLines: 80
      preferredComplexity: 10
      reviewComplexity: 15
      preferredMaxNesting: 3
  legacy:
    mode: non-growing-ratchet
  packs:
    - id: intentloom/typescript
      version: 1.0.0
    - id: intentloom/react
      version: 1.0.0
  checkers:
    - id: eslint
      mode: consume-existing
    - id: intentloom-file-metrics
  graphProviders:
    - id: nx
      mode: auto-detect-read-only
```

This example is illustrative only. It is not valid configuration until accepted
schemas and migrations define the contract.

## Candidate CLI experience

```bash
intentloom standards show --effective
intentloom standards check --root .
intentloom standards explain source-file-lines
intentloom standards baseline create --dry-run
intentloom standards exceptions list
intentloom standards decomposition plan PATH

intentloom packs list
intentloom packs inspect PACK_ID
intentloom packs import --source SOURCE --dry-run
intentloom packs diff PACK_ID@OLD PACK_ID@NEW
intentloom packs activate PACK_ID@VERSION --dry-run
intentloom packs verify PACK_ID@VERSION

intentloom checkers list
intentloom checkers inspect CHECKER_ID
intentloom checkers run CHECKER_ID --root . --json

intentloom graph providers
intentloom graph inspect --provider nx
intentloom graph export --provider nx --format json
intentloom architecture validate --graph-provider nx
```

All write operations remain prepared, previewed, validated, approved,
transactional, and reversible.

## Desktop experience

The Engineering Standards and Architecture Map areas should include:

- effective policy by project, package, path, or selected task;
- preferred, review, and hard budgets;
- current legacy baselines and trend without individual productivity scoring;
- findings grouped by rule, file, package, and architecture scope;
- decomposition proposals and expected impact;
- installed and available packs;
- source, version, trust, license, and capabilities for each pack;
- checker inventory and exact command preview;
- pack update diff and conflict preview;
- Nx or other graph-provider selection;
- dependency and task graphs;
- accessible tree and table alternatives to every graph;
- approval preview before configuration or source changes.

Desktop consumes shared application operations. It must not implement a second
policy resolver, marketplace client, or checker runner.

## TUI, daemon, and MCP parity

All clients should receive the same structured effective policy, findings,
provenance, graph evidence, conflicts, exceptions, and prepared plans.

Candidate read-only MCP resources:

```text
intentloom://standards/effective
intentloom://standards/findings
intentloom://packs/catalog
intentloom://packs/installed
intentloom://checkers/catalog
intentloom://graphs/effective
```

Candidate bounded tools:

```text
intentloom_engineering_standards_check
intentloom_engineering_standard_explain
intentloom_quality_pack_inspect
intentloom_quality_pack_import_preview
intentloom_checker_run
intentloom_graph_inspect
intentloom_decomposition_plan
```

No MCP operation may expose arbitrary shell execution, unrestricted package
installation, hidden network access, or direct mutation.

## Relationship to Foundation Workshop

Foundation Workshop should ask only project-relevant quality questions, such as:

- Is the project greenfield or legacy?
- Which languages, frameworks, and runtimes are planned?
- Is a monorepo or Nx project graph required?
- Which architecture boundaries must be enforced?
- Which official or organization standards are mandatory?
- Are strict limits required immediately or should existing debt use a ratchet?
- Which checker tools already exist in the project?
- Are external packs allowed, and from which trust sources?

The approved Foundation and Blueprint should record the selected quality profile,
packs, graph providers, and adoption mode. They should not install tools or mutate
configuration merely because a recommendation was accepted.

## Success criteria

The first useful increment proves that:

- preferred, review, and hard budgets resolve deterministically by scope;
- new violations and growth of legacy violations are distinguishable;
- generated and exempt files are classified explicitly;
- a decomposition plan is responsibility-based and preserves public behavior;
- findings retain rule, checker, source, version, digest, and threshold evidence;
- external style guides can be imported as untrusted, pinned, reviewable packs;
- a data-only pack cannot execute code;
- checker execution is bounded and separately approved from installation;
- a curated catalog can operate without an unrestricted executable marketplace;
- Nx graph evidence can enrich checks without making Nx mandatory;
- CLI, Desktop, TUI, daemon, MCP, and Neutron expose equivalent state;
- no quality profile can weaken mandatory safety or mutation boundaries.

## Non-goals

This direction does not promise:

- one universal line limit for every language or file class;
- automatic correctness from small files;
- arbitrary splitting to satisfy a number;
- automatic activation of every external best practice;
- treating raw documentation as executable policy;
- executing unknown marketplace code in the Core process;
- automatic dependency installation;
- automatic refactoring, commit, merge, release, or publication;
- making Nx mandatory for every project;
- requiring Nx Cloud or Nx Enterprise;
- replacing ESLint, TypeScript, Clippy, CodeQL, or other specialist tools;
- using an LLM as the source of truth for measurable findings;
- weakening project ownership, security, compatibility, approval, or transaction
  boundaries.
