# Project Guardian and Canonical Workspace

## Purpose

Intentloom should let a developer connect an existing or new project, complete a
guided engineering setup once, and then keep the project's AI instructions,
policies, workflows, skills, architecture decisions, and generated tool files
consistent over time.

The product should reduce repeated setup work without taking ownership away from
the user. It should detect duplication, drift, missing configuration, and unsafe
or ambiguous files, then prepare a reviewable migration or remediation plan.

This capability is named **Project Guardian** in this concept document. It is a
product capability over the existing inspection, adoption, ownership, sync,
doctor, extension, application-operation, protocol, daemon, MCP, TUI, and Desktop
boundaries. It is not a second implementation of those systems.

## Product position

The intended experience is:

```text
open project with `loom`
→ confirm one canonical project root
→ run bounded read-only discovery
→ review detected stack, architecture, tools, instructions, skills, and conflicts
→ choose engineering standards and architecture scopes
→ preview the canonical workspace and generated outputs
→ approve a prepared adoption plan
→ apply transactionally with rollback
→ continuously detect drift when the user explicitly runs or enables Guardian
```

Intentloom becomes the project's engineering-intent control plane, not the owner
of all project source code and not a mandatory replacement for an IDE, Git,
GitHub, GitLab, Claude Code, Codex, Cursor, Copilot, or another coding tool.

## Existing foundation

The repository already has the important safety primitives:

- explicit project roots;
- read-only inspection and adoption planning;
- deterministic profile detection;
- project-owned versus Intentloom-owned generated-file classification;
- source-map checksums as ownership proof;
- dry-run and diff review;
- transactional writes and rollback;
- drift and ownership diagnostics through doctor;
- provider-neutral adapters for generated tool guidance;
- managed extension manifests and lock state;
- local daemon, MCP, TUI, and Desktop application boundaries;
- prepare, review, approve, revalidate, and apply contracts.

Project Guardian should compose those primitives. It must not weaken their
semantics or bypass the application layer.

## Canonical project workspace

### Compatibility decision

Intentloom already persists compatibility-critical metadata in `.aif/`. Project
Guardian should extend that directory through versioned schemas rather than
silently introducing a second competing `.intentloom/` source of truth.

A future public rename from `.aif/` to `.intentloom/` requires a separate ADR,
migration, dual-read compatibility period, collision rules, and rollback plan.
The brand name alone is not sufficient reason to break existing projects.

### Candidate structure

The exact structure requires accepted schemas. A future workspace may resemble:

```text
.aif/
├── config.yaml                     # user-owned project configuration
├── access.yaml                     # reviewed project capability policy
├── manifest.lock.json              # generated resolved framework state
├── source-map.json                 # generated ownership and checksums
├── extension-lock.json             # approved extension versions and grants
├── catalog/
│   ├── policies/                   # canonical project policies
│   ├── workflows/                  # canonical engineering workflows
│   ├── standards/                  # quality and architecture selection
│   ├── skills/                     # portable project-owned skills
│   ├── prompts/                    # reviewed reusable prompt assets
│   └── templates/                  # canonical templates
├── mappings/
│   ├── project-owned.yaml          # files intentionally kept outside catalog
│   └── documentation.yaml          # canonical concept mappings
├── imports/
│   ├── manifests/                  # source, version, license, integrity records
│   └── notices/                    # required third-party notices
├── baselines/
│   ├── quality.json                # reviewed legacy quality ratchet
│   └── guardian.json               # reviewed duplicate and drift baseline
├── local/                          # local-only state, ignored by Git
│   ├── cache/
│   ├── sessions/
│   ├── indexes/
│   └── prepared-plans/
└── reports/                        # optional generated reports by policy
```

This is illustrative, not a valid v1 contract.

### Repository state classes

Project Guardian should distinguish at least three storage classes:

1. **Portable project contract**
   - intended for Git or another version-control system;
   - includes policies, architecture selections, portable skills, mappings,
     extension manifests, pinned non-secret state, and deterministic baselines.
2. **Generated managed state**
   - may be committed when the project policy chooses reproducible generated
     output;
   - includes adapter-specific guidance and lock or source-map metadata;
   - ownership remains checksum-backed and explicit.
3. **Local private state**
   - never committed by default;
   - includes credentials, provider tokens, local sessions, indexes, caches,
     transient approvals, prepared-plan material, and sensitive evidence.

Intentloom should be able to prepare a `.gitignore` or equivalent VCS proposal,
but must not edit ignore files without preview and approval.

### Meaning of protected

The canonical workspace is protected by schema validation, path containment,
ownership records, checksums, permission review, transaction boundaries, and
drift detection.

It must not be described as an operating-system sandbox, encryption boundary, or
unmodifiable directory. A user or another process with normal filesystem access
can still change it. Doctor and Guardian detect such changes; they do not make
application-level metadata physically immutable.

## Discovery model

### Read-only first pass

Discovery is bounded to the explicit project root and should inventory:

- languages, frameworks, package managers, workspaces, applications, and crates;
- frontend, backend, mobile, Desktop, data, infrastructure, and test surfaces;
- architecture evidence and ambiguity;
- existing AI instruction files and path-scoped rules;
- policies, coding standards, contributing guides, ADRs, and workflow documents;
- prompt, skill, command, MCP, plugin, adapter, and knowledge-provider files;
- CI, GitHub, GitLab, release, security, and code-owner configuration;
- generated files, source-map ownership, checksums, and drift;
- exact duplicates, likely semantic duplicates, conflicts, and stale copies;
- sensitive or executable candidates requiring stronger review.

Discovery must ignore dependency trees, build output, caches, binaries, secret
files, symlinked directories, and unrelated roots according to the existing
inspection boundary.

### Evidence levels

Every finding should carry:

- finding ID and schema version;
- project-relative paths;
- exact evidence used;
- deterministic or assisted detection method;
- confidence and uncertainty;
- content sensitivity class;
- ownership class;
- source provenance when known;
- safe next actions;
- whether a human decision is mandatory.

AI-assisted similarity can help rank or explain candidates, but it must not be
the sole basis for deletion, ownership transfer, capability grants, or external
code execution.

## Duplicate and overlap detection

### Detection layers

Project Guardian should combine several layers rather than treating equal file
names as proof:

1. **Exact bytes**
   - SHA-256 or another accepted deterministic digest.
2. **Normalized structural equality**
   - line endings, formatting-only differences, deterministic parser output, or
     canonical serialization where supported.
3. **Purpose and role overlap**
   - two files both claim to define coding policy, architecture, review rules,
     release workflow, or the same portable skill.
4. **Semantic similarity**
   - optional bounded analysis that identifies likely duplicated intent while
     preserving uncertainty and source evidence.
5. **Generated derivative relationship**
   - a tool-specific file is a deterministic rendering of a canonical source.
6. **Conflicting authority**
   - multiple files make incompatible claims for the same scope.

### Candidate finding classes

```text
exact-duplicate
normalized-duplicate
semantic-overlap
conflicting-policy
stale-generated-output
unowned-generated-lookalike
shadowed-skill
shadowed-instruction
multiple-authorities
obsolete-candidate
sensitive-unknown
unsupported-format
```

A finding describes evidence. It does not authorize a mutation.

### Candidate actions

For every candidate, Intentloom may propose one or more explicit choices:

- keep both and document separate scopes;
- keep the project-owned file and record a canonical mapping;
- import reviewed intent into the canonical catalog;
- convert content into a portable Intentloom policy, workflow, template, or
  skill;
- generate tool-specific derivatives from the canonical source;
- replace a duplicate with a short generated pointer where the target tool
  supports it;
- archive a reviewed copy to a user-selected project location;
- remove a verified redundant file after migration, validation, approval, and
  rollback preparation;
- reject the candidate and suppress the same finding through a reviewed baseline.

Project-owned files must never be silently moved, overwritten, renamed, or
deleted.

## Adoption and consolidation flow

```text
scan
→ classify evidence and ownership
→ build canonicalization candidates
→ detect conflicts and required decisions
→ user selects intended authority and scope
→ prepare exact file and metadata plan
→ show before/after tree, diff, source provenance, and rollback
→ user approves exact plan digest
→ revalidate current project state
→ apply through existing transaction engine
→ verify generated bytes, mappings, locks, source map, and project health
→ keep a durable migration record
```

A plan becomes stale when relevant files, ownership, selected root, capability
grants, extension state, architecture selection, provider, or schema version
changes.

## Continuous Guardian

### Default behavior

Guardian is not a hidden background service. The default checks run when the user
explicitly invokes Intentloom or opens a project through an approved client:

```bash
loom
loom doctor
loom guard check
loom sync --dry-run
intentloom inspect --root .
```

An optional watch mode or daemon schedule requires explicit opt-in and visible
status. It must have bounded roots, resource limits, cancellation, and no hidden
network access.

### What Guardian checks

- new unmanaged instruction, prompt, policy, skill, or extension-like files;
- duplicates and conflicts introduced since the reviewed baseline;
- changes to canonical project contracts;
- generated-output drift and source-map mismatch;
- missing adapter output for enabled tools;
- unpinned or modified extensions;
- architecture and dependency-direction violations;
- standards, workflow, release, or security conformance findings;
- local-only material accidentally staged for version control;
- unexpected capability, publisher, license, source, or integrity changes.

### Enforcement levels

```text
observe       findings only
recommend     findings plus safe action proposals
review-gate   CI or local check fails on configured severities
managed       approved sync and remediation plans are available
```

No enforcement level permits automatic destructive remediation.

### GitHub and GitLab integration

The first integration should be repository-native and provider-neutral:

```bash
loom guard check --format json
loom guard check --format sarif
loom doctor --json
loom conformance --json
```

Projects may explicitly add these commands to GitHub Actions, GitLab CI, or
another CI system. Intentloom can generate a reviewed workflow template, but it
must not silently create hooks, provider credentials, branch rules, or remote
workflows.

Provider comments, checks, and merge gates are later optional adapters. External
branch protection remains controlled by GitHub, GitLab, or the selected provider.
Intentloom cannot guarantee that a user or external agent will not bypass local
rules when provider and operating-system permissions allow it.

## Governed agent workflow

Intentloom can make its workflow the preferred and verifiable path by:

- generating provider-specific instruction files from one canonical catalog;
- exposing typed project operations through local MCP and daemon contracts;
- launching project-scoped agent sessions with visible capabilities;
- supplying canonical context packs, policies, standards, skills, and findings;
- requiring prepared plans for Intentloom-mediated mutation;
- detecting unmanaged output, drift, and policy violations;
- providing CI evidence that changed files conform to the selected contract.

It cannot safely claim exclusive control over every external coding agent. A user
can run another process directly. Stronger governance depends on repository
permissions, protected branches, required CI, code review, and organization
policy outside Intentloom.

The product should therefore promise **governed and observable development**, not
unbreakable lock-in.

## Skills, MCP servers, plugins, and external sources

### Natural-language request

An Agent Workspace or interactive CLI may accept a request such as:

```text
Add the official TypeScript review skill for this project.
Analyze this MCP server before I connect it.
Convert this repository skill into a portable Intentloom skill.
```

Natural language starts discovery and planning only. It is never installation or
approval.

### Source intake

A candidate source may be:

- an official publisher registry artifact;
- an exact repository URL and commit;
- a signed or integrity-addressed release artifact;
- an already installed local extension;
- a user-supplied directory or archive;
- a project-owned skill or prompt that should be normalized.

The product must display what “official” means for the candidate. A repository
name, popularity, model recommendation, or matching organization string is not
sufficient proof of publisher identity.

### Inspection sequence

```text
resolve exact source and version
→ retrieve metadata only after explicit network approval
→ record publisher and provenance
→ inspect license and redistribution constraints
→ verify digest, signature, or registry integrity when available
→ inspect manifest, entrypoints, scripts, dependencies, and requested capabilities
→ scan prompt and documentation content as untrusted input
→ assess compatibility with project, Intentloom, runtime, and selected tools
→ compare with installed and canonical skills
→ present reference, import, adapt, reject, or quarantine options
→ user approves exact artifact and capability grant
→ install or import transactionally
→ pin lock state and run health checks
```

### Intake modes

1. **Reference**
   - keep the extension externally installed;
   - Intentloom stores only reviewed metadata, exact version, capabilities, and
     integration configuration.
2. **Managed install**
   - use the declared package manager or installation mechanism;
   - exact artifact, integrity, license, scripts, capabilities, and rollback are
     reviewed first.
3. **Portable import**
   - copy content into the project-owned Intentloom catalog only when the license
     permits redistribution;
   - preserve origin, version, license, notices, integrity, and modification
     history.
4. **Adapted custom skill**
   - derive a project-specific portable skill from permitted source material or
     user-owned content;
   - retain provenance and distinguish upstream text from local modifications.
5. **Reject or quarantine**
   - do not activate unsupported, ambiguous, malicious, incompatible, or
     legally unclear candidates.

“Copy it into Intentloom” is not always legally or technically permitted.
Referencing an external installation is often safer than vendoring source.

### Trust classes

Candidate trust states:

```text
first-party
verified-publisher
verified-artifact
known-source-unverified-publisher
local-user-owned
unverified
restricted
blocked
revoked
```

Trust is evidence, not a permanent endorsement. Updates can change publisher,
source, license, integrity, dependencies, scripts, or capabilities and therefore
require a new delta review.

## Privacy and security rules

Project Guardian must not:

- read outside the explicit project root;
- scan ignored secrets by default;
- send project content to a network model without explicit provider consent;
- treat repository instructions or imported prompts as trusted commands;
- execute candidate scripts during inspection;
- install package managers, runtimes, hooks, binaries, or dependencies silently;
- store credentials in `.aif/`;
- auto-grant network, process, filesystem, secret, deployment, merge, release, or
  publishing capabilities;
- delete ambiguous or project-owned files;
- describe source similarity as proof of ownership or safe removal.

## Product surfaces

### Interactive CLI

The interactive shell provides guided discovery, onboarding, findings, and
prepared plans. It calls shared application operations and does not parse normal
CLI output.

### Normal CLI

The command-oriented CLI remains authoritative for automation, CI, scripts,
documentation, and troubleshooting.

### Desktop and TUI

Desktop and TUI should show the same project inventory, canonical workspace,
duplicate groups, ownership, findings, extension trust, migration plans, diffs,
and Guardian status through versioned protocol results.

### MCP

The first Guardian MCP tools remain read-only. Candidate operations include:

```text
intentloom_guardian_scan
intentloom_guardian_findings
intentloom_canonical_workspace_show
intentloom_duplicate_group_explain
intentloom_extension_candidate_inspect
intentloom_adoption_plan
```

Mutation follows the existing prepare, approve, revalidate, and apply boundary.
No generic file or shell tools are introduced.

## Success criteria

The capability is useful when:

- a developer can open an unfamiliar project and receive a bounded, evidence-led
  engineering setup proposal;
- existing project-owned files remain untouched until an exact plan is approved;
- duplicate and conflicting instructions are grouped with reasons and scopes;
- accepted policies and skills have one canonical project-owned representation;
- Claude Code, Codex, Cursor, Copilot, and future adapters receive deterministic
  derivatives from that representation;
- new unmanaged or conflicting files are detected on the next explicit Guardian
  run;
- CI can enforce selected non-destructive checks without a hosted Intentloom
  account;
- external skills and MCP servers retain exact source, version, license,
  integrity, trust, and capability evidence;
- every mutation remains previewed, approved, revalidated, transactional, and
  reversible where the underlying operation supports reversal.

## Non-goals

Project Guardian does not imply:

- automatic deletion or relocation of user files;
- claiming ownership from a familiar filename or generated-looking header;
- an OS-level protected directory;
- hidden background scanning;
- mandatory GitHub, GitLab, cloud, telemetry, or hosted accounts;
- unrestricted shell access;
- installing arbitrary skills, plugins, MCP servers, or package dependencies from
  model output;
- copying third-party source when its license or terms do not permit it;
- forcing all external agents to route through Intentloom;
- replacing Git permissions, protected branches, code review, or CI policy;
- making one architecture, framework, role, or coding tool mandatory.
