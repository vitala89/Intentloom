# Project Connection, Evidence, and MCP

## Purpose

Intentloom should be able to connect to an explicitly selected software project, inspect it safely, understand how its engineering workflow has evolved, and expose bounded Intentloom capabilities to compatible AI tools.

This direction combines three related capabilities:

1. local project connection and inspection;
2. local and provider-supplied engineering evidence;
3. a Model Context Protocol (MCP) integration boundary.

They share the same application operations, safety rules, evidence model, and human-approval boundary. They must not become three independent implementations.

## Product position

Intentloom remains a local-first, vendor-neutral engineering-intent framework.

The extension described here adds an observation and integration layer:

```text
selected project
      ↓
explicit access policy
      ↓
project inspection + local Git evidence
      ↓
optional provider evidence
      ↓
workflow timeline + conformance
      ↓
recommendations and reviewed adoption plans
      ↓
CLI / desktop / daemon / MCP clients
```

Intentloom does not become a general remote administration agent, a shell gateway, an employee-monitoring product, or a hosted process-mining platform.

## Current foundation

The current repository already provides most of the required architectural seams:

- `@intentloom/application` owns reusable project operations;
- the CLI is a process adapter over the application layer;
- `@intentloom/protocol` defines versioned, transport-independent requests;
- `intentloomd` exposes authenticated local IPC only;
- adoption, diff, sync, and doctor already use explicit project roots;
- dry-run, ownership, source-map, path-safety, and transactional-write rules are established;
- Engineering Process Intelligence documents a future direction for events, evidence, timelines, trust states, and conformance.

The missing work is a formal project-access contract, evidence-source implementations, stable inspection operations, and MCP-specific adapters.

## User journeys

### Connect and inspect a local project

```text
user selects project root
→ Intentloom describes requested capabilities
→ user approves read scopes
→ bounded inspection runs
→ project profile, documents, tools, and adoption readiness are reported
→ no file is changed
```

Candidate CLI experience:

```bash
intentloom inspect /path/to/project
intentloom connect /path/to/project --dry-run
intentloom access show /path/to/project
```

`connect` should be a guided orchestration command, not a new source of business logic. Internally it composes inspection, access review, and an adoption dry-run.

### Analyze local Git history

```text
explicit project root
→ read-only Git commands
→ normalized engineering events
→ deterministic case timeline
→ local report
```

The first supported case should be a release. Later cases may include pull requests, changes, incidents, migrations, and agent tasks.

### Import GitHub or GitLab evidence

The first provider milestone should accept explicit exports rather than credentials:

```bash
intentloom evidence import --provider github --file github-export.json
intentloom evidence import --provider gitlab --file gitlab-export.json
```

Only after schemas, normalization, redaction, deduplication, and provenance are stable should live read-only provider access be considered.

### Use Intentloom from an MCP client

A compatible AI tool may start a local Intentloom MCP server:

```bash
intentloom mcp serve --stdio --root /path/to/project
```

The server exposes typed, bounded operations. It must not expose arbitrary shell execution or unrestricted CLI invocation.

## Project access model

### Explicit root

Every operation is bound to one explicit canonical project root. Relative paths are resolved inside that root. Sibling repositories, parent directories, external symlink targets, and undeclared roots are inaccessible through the operation contract.

### Capability categories

Candidate capabilities are:

```text
project.files.read
project.metadata.write
generated.files.write
git.history.read
provider.metadata.read
network.provider.connect
process.readonly.git
```

Capabilities must be specific. Avoid broad names such as `filesystem`, `network`, or `execute`.

### Default policy

The default connected-project session is read-only:

- project inspection is allowed;
- bounded local Git history may be allowed explicitly;
- network access is disabled;
- scripts and package-manager commands are disabled;
- project files are not changed;
- recommendations do not imply permission to apply them.

### Configuration and credentials

A future project access file may record reviewed capability choices, but must not store credentials. The persisted contract should be schema-versioned and user-owned.

Candidate location:

```text
.aif/access.yaml
```

Provider tokens belong in environment variables, an operating-system keychain, or another explicitly documented secret store. They must not be written to `.aif`, logs, evidence bundles, reports, prompts, or generated files.

### Application policy versus sandboxing

Intentloom can enforce its own root and capability checks, but a normal CLI process still has the operating-system permissions of the user who launched it. Documentation must not describe application-level restrictions as a complete OS sandbox.

A future desktop application may add stronger process isolation or operating-system folder grants, but that is a separate security milestone.

## Inspection boundary

A future `inspectProject` operation should be read-only and deterministic for the same project state and options.

Candidate output:

- detected profile and confidence;
- supported tool adapters;
- existing instruction files;
- documentation concepts and ambiguities;
- project-owned and generated ownership state;
- local Git availability and summary, when approved;
- adoption readiness;
- safe recommendations;
- machine-readable findings.

Inspection must use bounded evidence. It must not:

- execute project scripts;
- install dependencies;
- parse repository prose as trusted instructions;
- read ignored secrets by default;
- traverse dependencies, build output, caches, vendor trees, or symlinked directories;
- send project content to a network service.

## Engineering evidence sources

### Local Git source

Local Git is the first evidence source because it is available without provider credentials or network access.

A Git process adapter should:

- invoke `git` directly without a shell;
- use a fixed allowlist of read-only arguments;
- set an explicit working directory;
- use timeouts and output limits;
- sanitize the environment;
- disable prompts and interactive behavior;
- avoid hooks and configuration mutation;
- reject fetch, pull, push, checkout, reset, clean, config writes, and arbitrary subcommands.

Candidate evidence includes commits, parents, branches, tags, merge relationships, timestamps, author-safe identifiers, and changed project-relative paths.

Commit messages and identities are sensitive and should be excluded or redacted unless a specific analysis requires them and the user explicitly requests them.

### Provider export sources

GitHub and GitLab export adapters should normalize provider records into the vendor-neutral engineering-event schema.

Candidate records include:

- pull or merge requests;
- reviews and approvals;
- CI checks and pipelines;
- releases and deployments;
- issue or change links;
- tag and commit provenance.

Provider payloads are untrusted input. Every normalized event retains source provenance and trust state.

### Live provider sources

Live provider adapters are later, explicit, read-only, least-privilege integrations. They should be implemented outside canonical core and only after export-first dogfooding.

No background polling, hidden network access, mandatory cloud storage, or automatic cross-repository collection is implied.

## MCP Server role

Intentloom should expose a local MCP server as another adapter over `@intentloom/application`.

```text
MCP client
    ↓ stdio
@intentloom/mcp-server
    ↓ typed operation call
@intentloom/application
    ↓
core / validator / adapters / evidence
```

The MCP package must not call the CLI binary and parse stdout. CLI and MCP should invoke the same application operations directly.

### Initial read-only tools

Candidate tools:

```text
intentloom_project_inspect
intentloom_project_doctor
intentloom_project_diff
intentloom_adoption_plan
intentloom_detect_profile
intentloom_git_summary
intentloom_git_timeline
intentloom_release_readiness
intentloom_workflow_conformance
```

Tool names, input schemas, output schemas, limits, and error codes must be versioned before they are treated as compatible public behavior.

### Resources

Candidate MCP resources:

```text
intentloom://project/summary
intentloom://project/profile
intentloom://project/findings
intentloom://project/git/timeline
intentloom://project/release/readiness
intentloom://workflows/release
intentloom://policies/code-review
```

Resources provide bounded context. They must not expose arbitrary files or raw provider payloads.

### Prompts

Guided MCP prompts may later compose stable tools and resources for adoption, release review, Git-history analysis, or workflow investigation. Prompts are convenience workflows, not an authorization mechanism.

### Prohibited MCP tools

Intentloom must not expose generic capabilities such as:

```text
run_command(command)
execute_shell(args)
execute_cli(args)
read_any_file(path)
write_any_file(path, content)
```

A coding agent must not gain more authority merely because it connected through MCP.

## Safe mutation protocol

Mutating MCP tools are a later milestone. They require a two-step contract:

```text
prepare
→ return reviewed paths, diff, plan identifier, digest, and expiry
→ explicit human approval
→ apply the exact plan
```

Before applying, Intentloom revalidates:

- project root identity;
- current file state;
- ownership metadata;
- plan digest;
- plan expiry;
- approved capability scope;
- symlink and path boundaries;
- transaction safety.

A recommendation, prompt, external MCP result, provider event, or local endpoint connection can never count as approval.

## MCP Client role

Intentloom may later consume evidence from external MCP servers, for example GitHub or GitLab integrations. This is separate from exposing the Intentloom MCP server.

External MCP results are untrusted provider evidence:

```text
external MCP result
→ schema validation
→ size and capability limits
→ redaction
→ normalization
→ provenance attachment
→ trust classification
→ local evidence store
```

An external MCP server must not directly trigger adoption, sync, merge, release, or file mutation.

## Transport strategy

### Phase 1: local stdio

The first MCP transport is local `stdio`. It does not open a port, matches the local-first product model, and lets the client manage process lifetime.

### Phase 2: daemon bridge

After operation contracts stabilize, an MCP process may optionally use authenticated local IPC to `intentloomd`. This is useful for a desktop application and multiple local clients, but is not required for the first MCP server.

### Phase 3: Streamable HTTP

HTTP transport is a separate future security milestone. It requires authentication, tenant and repository isolation, rate limits, auditability, data-retention rules, and a new network threat review. It must not be enabled merely by adding MCP support.

## Proposed package boundaries

Candidate packages:

```text
packages/evidence/          Vendor-neutral events, bundles, trust, timeline
packages/evidence-git/      Restricted local Git evidence source
packages/providers/         GitHub/GitLab export and later live adapters
packages/mcp-server/        MCP tools, resources, prompts, stdio transport
packages/mcp-client/        Optional external MCP evidence ingestion, later
```

Dependencies should flow inward:

```text
CLI / daemon / desktop / MCP
            ↓
      application operations
            ↓
core / validator / adapters / evidence contracts
```

Canonical core must not depend on providers, MCP, CLI, daemon, desktop, or network transports.

## Candidate schemas

Possible future schemas:

```text
project-access.schema.json
project-inspection.schema.json
engineering-event.schema.json
evidence-bundle.schema.json
workflow-timeline.schema.json
conformance-report.schema.json
provider-connection.schema.json
mcp-capability.schema.json
approved-plan.schema.json
```

Schema creation must follow an ADR and compatibility decision. Listing a schema here does not commit v0.1 to it.

## Delivery sequence

1. Specify access capabilities, consent, exclusion, and root semantics.
2. Extract or add a stable read-only `inspectProject` application operation.
3. Specify engineering-event, evidence-bundle, provenance, and trust schemas.
4. Add deterministic inspection and evidence fixtures with byte-for-byte read-only tests.
5. Implement restricted local Git evidence collection.
6. Implement GitHub and GitLab export importers.
7. Add a local stdio MCP server with read-only inspection and doctor tools.
8. Build one deterministic release timeline and evidence-quality report.
9. Implement rule-based release conformance and dogfood it against Intentloom and a sanitized existing project.
10. Consider live, least-privilege, read-only provider adapters.
11. Consider external MCP evidence ingestion with validation, redaction, provenance, trust classification, and explicit capability allowlists.
12. Consider safe prepare/approve/apply MCP mutation.
13. Add workflow variants and bottleneck analysis only after evidence quality and privacy boundaries are proven.
14. Consider Streamable HTTP only after a dedicated security review.

## Initial success criteria

The first useful combined milestone should prove:

- a user can select one project and see the exact read capabilities requested;
- inspection and local Git collection are byte-for-byte read-only;
- a deterministic release timeline can be produced locally;
- an MCP client can invoke the same inspection and doctor operations as the CLI;
- CLI and MCP structured results are equivalent;
- no generic shell, arbitrary file, implicit network, or hidden telemetry capability exists;
- no recommendation or external evidence can mutate project state.

## Non-goals

This direction does not initially include:

- replacing the CLI or local daemon;
- exposing a remote shell;
- arbitrary filesystem access;
- automatic package installation or project-script execution;
- mandatory accounts, cloud storage, or telemetry;
- autonomous pull requests, merges, releases, or remediation;
- organization-wide employee monitoring;
- a general GitHub, GitLab, or MCP proxy;
- a Celonis-compatible enterprise process-mining platform.
