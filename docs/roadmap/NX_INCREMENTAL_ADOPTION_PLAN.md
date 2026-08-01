# Nx Incremental Adoption Plan for Intentloom

## Status

Planned repository-tooling increment. The current documentation branch does not
add Nx, `nx.json`, plugins, cache configuration, workspace targets, CI changes,
Nx Cloud, generators, release tooling, or runtime dependencies.

This plan extends the public monorepo evolution direction. It does not replace
pnpm workspaces, TypeScript project references, existing build scripts, release
workflows, or the application architecture.

## Decision

Intentloom should evaluate and, when evidence supports it, adopt Nx
incrementally as a local project-graph and task-orchestration layer over the
existing workspace.

The intended relationship is:

```text
pnpm
  owns dependency installation and workspace linking

TypeScript project references and package scripts
  remain the current build and type contract

Nx
  may add project graph, task graph, affected execution, local caching,
  dependency-boundary visibility, and later reviewed generators
```

The project should not be rewritten into a new repository structure merely to
“become an Nx repository.”

## Current verified workspace shape

Intentloom currently uses:

- one public pnpm workspace covering `packages/*` and `apps/*`;
- TypeScript project references through `tsc -b`;
- Vitest;
- custom build scripts for CLI, daemon, and MCP artifacts;
- Tauri and Desktop-specific scripts;
- package and release verification;
- VitePress documentation;
- GitHub Actions compatibility, security, dependency, packaging, and release
  workflows.

The root build script currently begins with:

```text
node scripts/sync-version.mjs
```

before TypeScript and artifact builds. This is a material constraint because a
task that intentionally mutates tracked or generated version state must not be
marked cacheable as though it were a pure build.

## Objectives

An Nx pilot should provide measurable value in at least several of these areas:

- understand package and application dependencies through a project graph;
- run typecheck, tests, builds, and validation only for affected projects and
  dependants;
- reduce repeated local and CI work through safe local caching;
- provide a standard task graph for contributors and agents;
- identify invalid dependency direction;
- help Neutron select focused project context;
- support path-aware CI without duplicating dependency logic in shell scripts;
- improve future package and application generators after contracts stabilize;
- improve monorepo growth without requiring a hosted account.

## Non-objectives

The Nx increment is not intended to:

- replace pnpm;
- move or rename packages merely for convention;
- rewrite core, application, protocol, daemon, Desktop, MCP, or CLI code;
- replace existing build scripts before parity is proven;
- adopt Nx Cloud by default;
- require telemetry or an online account;
- replace GitHub Actions security and release controls;
- change the public npm package contents;
- make Nx a runtime dependency of the published CLI;
- force user projects to use Nx;
- use Nx project names as security or authorization identities.

## Architectural constraints

### Local-first by default

The first adoption uses local computation and local cache only.

Nx Cloud, remote caching, distributed execution, or hosted analytics require a
separate privacy, security, cost, credential, retention, and availability
decision. They must remain disabled unless explicitly selected.

### Existing commands remain authoritative during the pilot

`pnpm verify` and the current release workflows remain the source of release
truth until Nx parity is proven and separately approved.

Candidate Nx commands initially wrap or invoke existing project scripts rather
than reimplementing their business logic.

### Cache only pure and reproducible tasks

Before a target becomes cacheable, verify:

- declared inputs cover every relevant file and environment dependency;
- outputs are explicit;
- the task does not mutate unrelated state;
- no secret or user-local path enters cache artifacts;
- no hidden network call affects output;
- equivalent inputs produce equivalent outputs;
- restoration from cache cannot bypass validation or security checks.

Tasks involving release publication, signing, provider writes, local credentials,
Git mutation, dependency installation, version synchronization, or environment
approval are not cacheable by default.

### No security authority from cache

A cached test or build result is evidence of the recorded inputs, not an
authorization decision. Sensitive release and security gates may require fresh
execution according to policy.

### Published artifacts remain reproducible

Adding Nx must not change:

- CLI tarball files;
- package manifests;
- executable entry points;
- daemon or MCP artifact behavior;
- source-map or ownership semantics;
- release provenance;
- supported platform matrix.

Any intentional change requires independent compatibility evidence.

## Pilot design

### Minimal dependencies

The first implementation should add only the Nx packages required for core
workspace orchestration. Additional plugins require evidence that their inferred
behavior is understood and useful.

Avoid installing broad framework plugins solely because applications use React,
Vite, or Tauri.

### Candidate initial files

```text
nx.json
package.json script additions
project declarations only where inference is insufficient
.gitignore local cache entry, when required
```

Do not introduce generated workspace files that duplicate existing package
metadata without a clear owner.

### Candidate initial commands

```bash
pnpm nx graph
pnpm nx show projects
pnpm nx run-many -t typecheck
pnpm nx run-many -t test
pnpm nx affected -t typecheck,test
pnpm nx affected --graph
```

Root convenience scripts may later include:

```json
{
  "scripts": {
    "nx": "nx",
    "graph": "nx graph",
    "affected": "nx affected",
    "verify:affected": "nx affected -t typecheck,test,build"
  }
}
```

These are candidates, not current public commands.

## Project model

Every package or application should resolve to one stable project identifier.
The identifier is a build-graph name, not an ownership or security principal.

Candidate metadata includes:

- root path;
- source root;
- project type;
- tags;
- implicit and explicit dependencies;
- task definitions;
- inputs and outputs;
- cache policy;
- affected dependants;
- owning package manifest where applicable.

Avoid manually duplicating dependencies that Nx can derive reliably from
package and TypeScript references. Explicit metadata should exist when it adds a
real architectural constraint or fixes an ambiguity.

## Task strategy

### Typecheck

Current source of truth:

```text
tsc -b --pretty false
```

Candidate incremental approach:

1. preserve root typecheck;
2. define project-level typecheck targets only where TypeScript project
   references support stable boundaries;
3. compare diagnostics and exit behavior;
4. verify affected execution includes all downstream public-contract consumers;
5. keep a periodic full typecheck gate.

### Tests

Current source of truth:

```text
vitest run
```

Candidate approach:

- identify whether tests can be assigned deterministically to packages;
- preserve cross-package and integration suites as explicit shared projects or
  full-workspace gates;
- never omit tests merely because changed-file ownership is unclear;
- use affected test execution as acceleration, not the only release evidence,
  until coverage is proven.

### Build

Current root build includes version synchronization and custom artifact scripts.

Before caching or splitting:

1. inventory which step writes which files;
2. separate pure compilation and bundling from version synchronization;
3. make outputs explicit;
4. confirm CLI, daemon, MCP, Desktop, and docs consumers;
5. verify byte-identical artifacts;
6. define a non-cacheable release preparation target separately.

Candidate future split:

```text
sync-version          non-cacheable mutation
build:ts              pure when verified
build:cli             pure when verified
build:daemon          pure when verified
build:mcp             pure when verified
build:desktop          platform-specific
build:docs             pure when verified
build                  orchestration target
```

The exact names require implementation review.

### Formatting and validation

Repository-wide formatting and governance checks may remain root targets when
project attribution would be misleading.

Do not force every script into project-level execution if the operation is
intentionally global.

### Release and publication

Nx Release may be evaluated later, but it must not replace the current trusted
publishing workflow merely because Nx provides release features.

Any release-tooling pilot must preserve:

- exact package version authority;
- changelog and migration policy;
- dry-run default;
- trusted publishing and provenance;
- environment approval;
- immutable published versions;
- dist-tag policy;
- tarball verification;
- rollback and failure reporting.

## Dependency boundaries

Nx tags and dependency constraints may encode existing Intentloom architecture,
for example:

```text
scope:core
scope:application
scope:protocol
scope:adapter
scope:desktop
scope:tooling
runtime:node
runtime:browser
runtime:rust-bridge
publishable:yes|no
```

Candidate direction:

```text
core cannot depend on CLI, Desktop, daemon, MCP, or provider integrations
application cannot depend on presentation clients
protocol remains transport-independent
Desktop depends through client and protocol boundaries
provider and extension adapters remain outside canonical core
```

Tag enforcement should reflect accepted architecture, not invent a new one. The
first phase should report violations before making them blocking.

## Nx and Neutron

Nx may become one evidence source for Neutron and Project Guardian.

Candidate read-only operation:

```text
inspectNxWorkspace
```

Possible output:

- project graph;
- affected projects for a reviewed change set;
- task graph;
- project tags and declared boundaries;
- target availability;
- cacheability declaration;
- graph diagnostics.

Neutron may use the graph to focus context and tests. It must not treat Nx output
as complete proof of runtime architecture, ownership, permissions, or deployment
impact.

A direct local adapter is preferred for deterministic graph inspection. An
optional Nx MCP integration may be supported later through the managed extension
lifecycle, with explicit version, source, capabilities, network state, and
provenance.

## CI strategy

### Pilot CI

Initially run Nx in observation mode alongside existing full checks:

```text
existing full verification
+
Nx graph and affected calculation report
```

Compare:

- projects selected;
- projects omitted;
- execution time;
- cache hits;
- correctness;
- cross-platform behavior;
- contributor usability.

### Progressive acceleration

Only after evidence:

1. use affected tasks on ordinary pull requests;
2. retain scheduled or release full-workspace gates;
3. trigger shared consumers when protocol, schemas, public types, build tooling,
   root config, or lockfiles change;
4. treat unknown impact as full-workspace impact;
5. make cache provenance visible in logs.

### Remote cache

Remote cache is a separate later decision. Requirements include:

- opt-in;
- tenant and repository isolation;
- encryption;
- credential storage;
- cache poisoning defenses;
- retention and deletion;
- regional residency where required;
- outage fallback;
- cost controls;
- auditability;
- no source, secrets, or sensitive artifacts beyond approved policy.

## Delivery phases

### NX0. Baseline and ADR

Record:

- current full build, test, typecheck, docs, and CI durations;
- current package/application graph;
- current outputs and mutations;
- release artifact hashes;
- expected benefits and rollback plan;
- local-only cache decision.

Exit gate: the pilot has measurable success criteria and no hidden migration
scope.

### NX1. Minimal local workspace

Add:

- pinned Nx dependency;
- minimal `nx.json`;
- project discovery;
- graph and show-project commands;
- no remote cache;
- no release changes;
- no task replacement.

Exit gate: project graph is stable across supported platforms and does not
change runtime or package output.

### NX2. Read-only task graph

Model existing typecheck, test, build, docs, and validation commands without
changing the authoritative scripts.

Exit gate: Nx reports the expected graph and target availability.

### NX3. Safe local caching pilot

Choose one pure target with explicit inputs and outputs, likely a narrow package
build or deterministic documentation build after verification.

Exit gate: cache hit and miss outputs are byte-identical, secret-free, and
cross-platform safe where applicable.

### NX4. Affected analysis

Add affected calculation and compare it against known dependency fixtures.

Exit gate: public-contract, protocol, schema, root-config, lockfile, and tooling
changes include all required consumers; unknown impact fails toward broader
execution.

### NX5. Optional CI acceleration

Use affected tasks on selected pull-request jobs while retaining full release and
scheduled verification.

Exit gate: no missed regression in representative fixtures and measurable CI
benefit.

### NX6. Architecture boundary reporting

Add reviewed tags and non-blocking dependency findings.

Exit gate: rules reflect existing approved architecture and have no false
ownership or permission semantics.

### NX7. Contributor and agent experience

Document common commands, graph interpretation, cache behavior, troubleshooting,
and how agents should select affected tasks.

Exit gate: a new contributor can use Nx without knowing internal custom scripts
or requiring a cloud account.

### NX8. Evaluate generators and release tooling

Only after stable graph and task contracts, evaluate:

- package generators;
- application generators;
- Project Inception scaffold integration;
- Nx Release;
- optional managed Nx MCP adapter;
- remote cache.

Each requires a separate decision and evidence.

## Success metrics

Possible metrics:

- local no-change verification time;
- affected feature-change verification time;
- CI duration and compute usage;
- project-graph correctness;
- cache hit rate for approved pure tasks;
- number of duplicated path filters removed;
- number of architecture violations detected;
- contributor setup steps;
- artifact reproducibility;
- regression escape rate.

Faster execution is not sufficient if correctness, transparency, local-first
behavior, or maintainability worsens.

## Rollback plan

The pilot must be removable without restructuring the repository.

Rollback should consist of:

- remove Nx dependencies and configuration;
- remove optional scripts and CI observation jobs;
- remove local cache artifacts;
- restore no source or package moves because none were required;
- continue using existing pnpm and TypeScript commands.

If rollback requires moving packages back or reconstructing build logic, the
pilot expanded too far before proving value.

## Initial acceptance criteria

Nx adoption is accepted for continued use when:

- pnpm remains the workspace and dependency authority;
- existing full verification still passes;
- published artifacts are unchanged unless intentionally reviewed;
- project and task graphs are deterministic;
- selected cache targets are proven pure and reproducible;
- Nx Cloud and telemetry are not required;
- affected analysis is conservative for unknown impact;
- Windows, Linux, and macOS behavior is verified where relevant;
- release, security, ownership, and approval boundaries remain unchanged;
- measurable local or CI benefit justifies maintenance cost;
- the integration can still be removed without repository restructuring.

## Non-goals for the first pilot

- Nx Cloud;
- distributed CI;
- repository restructuring;
- replacing all scripts with executors;
- automatic generator use;
- changing public package versions;
- changing trusted publication;
- making Nx mandatory for projects managed by Intentloom;
- treating cache hits as security approval;
- treating project tags as human authorization;
- adding Nx to the runtime dependency graph of published Intentloom artifacts.
