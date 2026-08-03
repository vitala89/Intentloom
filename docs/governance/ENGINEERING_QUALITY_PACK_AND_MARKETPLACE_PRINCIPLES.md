# Engineering Quality Pack and Marketplace Principles

## Status

Governance direction for configurable engineering standards, Quality Packs,
Checker Adapters, decomposition planning, architecture graph providers, curated
catalogs, and any future marketplace capability.

These principles do not create runtime behavior by themselves. They define the
boundaries that future schemas, packages, clients, and implementation pull
requests must preserve.

## Principles

### 1. Measured evidence is not a model opinion

File size, complexity, graph edges, checker output, and policy thresholds are
resolved from versioned deterministic definitions and evidence.

AI may explain a finding or propose remediation. It must not invent, suppress,
change, or approve measured evidence.

### 2. Small files are a means, not the goal

A line budget is a maintainability guardrail. It must not encourage compressed
code, arbitrary splitting, unnecessary abstractions, generic helper modules, or
hidden transaction ordering.

Cohesion, dependency direction, public behavior, testability, and safety remain
more important than satisfying a number cosmetically.

### 3. Preferred, review, hard, and legacy states remain distinct

A preferred threshold produces guidance. A review threshold requires evidence. A
hard threshold may block plan or apply. A legacy baseline tracks existing debt.

Clients must not flatten these states into one red or green status.

### 4. Existing debt is not precedent

An oversized existing file does not justify oversized new files.

Legacy adoption should normally use a non-growing ratchet:

- no new violation;
- no growth of an existing violation;
- decomposition or a reviewed exception when meaningfully touched;
- incremental reduction rather than a mandatory rewrite.

### 5. Exceptions are explicit and bounded

A quality exception records:

- exact rule and scope;
- current value and threshold;
- reason;
- safety and compatibility implications;
- responsible owner or area;
- expiry, review trigger, or concrete follow-up.

Exceptions are not silent, global, permanent by default, or automatically copied
to neighboring code.

### 6. Decomposition preserves behavior and contracts

A decomposition plan should identify responsibilities, seams, dependency
direction, public API impact, tests, migration order, and rollback.

Intentloom must not split a file at arbitrary line ranges or introduce a package,
service, interface, or abstraction merely to reduce line count.

### 7. A finding does not authorize a fix

```text
finding
!= remediation approval
!= source mutation permission
!= commit permission
```

Assisted remediation remains behind a prepared plan, exact diff, current-state
revalidation, explicit approval, transaction safety, and rollback.

### 8. Canonical rules use stable identities

Enforceable policy uses stable rule IDs, versions, scopes, measurement
semantics, provenance, and migration rules.

Free-form prompt text may explain policy but is not the canonical enforcement
contract.

### 9. Guidance, configuration, execution, graph evidence, and remediation are

separate capabilities

A documentation pack cannot execute code. A tool configuration pack does not gain
permission to install itself. A checker finding does not gain remediation rights.
A graph provider does not define intended architecture. A remediation recipe does
not gain mutation authority.

### 10. External text is untrusted input

Documentation, repositories, package metadata, manifests, marketplace
descriptions, and imported configurations may contain mistakes or malicious
instructions.

They are parsed under bounded inputs, retain provenance, and cannot override
Intentloom security, ownership, approval, compatibility, or transaction rules.

### 11. External sources are pinned and reproducible

An imported pack records an exact package version, Git commit, signed registry
artifact, local content digest, or reviewed snapshot.

Mutable `latest`, branch-only, or URL-only references are insufficient for
reproducible enforcement.

### 12. No silent network activity

Catalog browsing, source import, pack download, update checks, graph upload, and
checker network access require disclosed network state and applicable approval.

Local-first behavior and offline inspection remain supported where possible.

### 13. No silent install or activation

Download, install, activation, project configuration, checker execution, and
remediation are separate lifecycle steps.

A user selecting a style guide does not automatically approve dependency
installation, configuration changes, CI changes, or executable code.

### 14. Data-only is the default extension class

The first catalog should prefer declarative, data-only packs.

Executable third-party checkers or remediation extensions require a stronger
sandbox, capability, signing, supply-chain, revocation, support, and incident
response model. They must not run in the Core process by default.

### 15. Marketplace trust is visible and scoped

First-party, curated third-party, organization-private, and local-unverified
artifacts have different trust states.

Organization trust does not become global trust. Popularity, download count, or a
publisher name alone is not sufficient evidence.

### 16. Integrity and publisher identity are different facts

A checksum proves content identity. A signature may bind an artifact to a key. A
verified publisher binds that key to an identity under a defined trust policy.

Clients must not represent one of these facts as proof of all three.

### 17. Updates are reviewed changes

A new pack or checker version may change rules, severity, compatibility,
capabilities, dependencies, network behavior, or output.

Updates require an exact version, effective-policy diff, compatibility review,
and approval. No silent fallback or automatic replacement is allowed.

### 18. Revocation must be truthful

A revoked or yanked artifact remains visible in project evidence. Intentloom
should explain impact and migration options rather than silently substituting a
new version.

### 19. Licenses and redistribution are part of compatibility

Imported style guides, configurations, parsers, binaries, and marketplace
artifacts require visible license and redistribution status.

Intentloom must not copy or redistribute third-party content merely because it is
publicly accessible.

### 20. Checker execution is least privilege

A checker run declares exact tool identity, version, arguments, project root,
read and write paths, environment, network, timeout, output bounds, and expected
result protocol.

Read-only checkers receive no project write access or inherited secrets by
default.

### 21. Existing project tools are preferred

When safe and compatible, a checker adapter should consume an existing report or
use a project-pinned tool rather than downloading and introducing a second tool
version.

Intentloom should not become a universal replacement for ESLint, TypeScript,
Clippy, CodeQL, or other specialist analyzers.

### 22. Tool failure is reported honestly

Timeout, cancellation, unsupported version, partial output, malformed report,
network denial, or tool crash remain visible terminal states.

A failed checker must not be reported as a clean project.

### 23. Nx is optional

Nx may provide project graph, task graph, affected, tags, targets, and dependency
evidence for an Nx workspace.

Intentloom must also support non-Nx repositories and must not install or migrate a
project to Nx from detection alone.

### 24. Nx Cloud is opt-in

No remote caching, graph upload, analytics, or Nx Cloud connection is enabled by
default through Intentloom.

Local graph inspection and local-only operation remain the default.

### 25. Licensed capabilities are explicit

A third-party feature that requires an enterprise or commercial license is an
optional licensed adapter. It cannot become a hidden default dependency or be
represented as universally available.

Intentloom may implement provider-neutral conformance over normalized graph
evidence without requiring that licensed feature.

### 26. Repository topology is not runtime architecture

A monorepo, Nx workspace, package graph, or directory shape is evidence about
source organization. It does not prove modularity, bounded contexts,
microservices, microfrontends, or intended ownership.

Architecture conclusions require approved project intent and reviewed evidence.

### 27. Affected analysis does not replace complete gates prematurely

Affected project and task information may accelerate feedback after it is proven
accurate for the repository.

Authoritative full verification, security, compatibility, release, and
publication gates remain until an accepted decision safely changes them.

### 28. Quality policy cannot weaken the platform baseline

Balanced, strict, legacy, custom, organization, framework, or marketplace packs
must not disable:

- project-root containment;
- ownership and generated-file protections;
- secret and credential handling;
- provider neutrality;
- compatibility and migration checks;
- evidence before mutation;
- explicit approval;
- transaction and rollback;
- truthful failure reporting;
- no hidden network or installation behavior.

### 29. Clients remain equivalent

CLI, Desktop, TUI, daemon, MCP, Neutron, and coding-agent guidance consume shared
application and protocol results.

No client may have a hidden resolver, marketplace trust rule, checker permission,
or mutation authority unavailable to the others.

### 30. Quality data must not become employee surveillance

Repository findings may support maintainability, risk, and migration decisions.
They must not become individual developer productivity scores, activity
leaderboards, keystroke monitoring, presence tracking, or hidden performance
profiles.

## Required implementation evidence

A pull request implementing these capabilities should state:

- which pack or adapter class it adds;
- canonical rule IDs and versions;
- input, output, and size bounds;
- provenance and trust handling;
- network and filesystem behavior;
- executable and dependency identity;
- compatibility and migration behavior;
- failure and cancellation states;
- security fixtures;
- client parity evidence;
- which actions remain read-only;
- which future mutation permissions are explicitly not included.

## Required review for executable extensions

A pull request adding a third-party executable checker or remediation extension
requires evidence for:

- accepted sandbox or process-isolation boundary;
- least-privilege capabilities;
- publisher identity and artifact integrity;
- dependency and supply-chain review;
- secret isolation;
- path and symlink containment;
- archive and resource bounds;
- network policy;
- timeout and cancellation;
- update, revocation, and emergency disablement;
- support and incident-response ownership;
- explicit maintainer authorization.

## Review rule

A marketplace or quality feature is not considered safe because it has a friendly
UI, a known package name, or a successful model-generated explanation.

The evidence is deterministic contracts, bounded capabilities, visible
provenance, reproducible artifacts, explicit approval boundaries, compatibility
tests, security fixtures, and truthful failure behavior.
