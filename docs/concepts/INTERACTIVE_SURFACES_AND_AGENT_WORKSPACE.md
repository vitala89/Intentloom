# Interactive Surfaces and Agent Workspace

## Purpose

Intentloom should support progressively richer user interfaces without creating independent implementations of project inspection, evidence analysis, conformance, planning, ownership, or filesystem mutation.

The existing command-oriented CLI remains the stable automation and expert interface. An optional terminal UI and a future desktop agent workspace are presentation and orchestration adapters over the same application-operation boundary.

## Product surfaces

### Command-line interface

The normal CLI remains the authoritative non-interactive interface for local development, scripts, CI, reproducible documentation, and troubleshooting.

### Interactive terminal UI

A future optional terminal UI may provide a keyboard-first guided experience through an entry point such as:

```bash
intentloom ui
```

Candidate capabilities include:

- explicit project-root selection and confirmation;
- guided initialization and adoption;
- project inspection and adapter-readiness views;
- structured doctor findings and remediation guidance;
- generated-file ownership and drift views;
- unified and side-by-side diff review;
- Git timeline, release analysis, and engineering conformance navigation;
- extension compatibility, capability, integrity, license, and update previews;
- reviewed prepare, preview, approve, and revalidate flows for future mutations.

The TUI must consume structured operation results. It must not parse human CLI output or reproduce filesystem, evidence, validation, ownership, conformance, or transaction logic.

A small TypeScript rendering layer compatible with the existing Node.js runtime may be evaluated. Framework-specific dependencies must remain outside core and application packages.

A hosted or embedded browser interface is not required for the first terminal milestone. It would add server, authentication, port, browser-lifecycle, and network-security concerns without yet providing enough value over a native terminal experience.

### Desktop application

The desktop application is a local presentation and orchestration layer over the standalone daemon, versioned protocol, and application operations. It does not replace the CLI, core, local MCP server, or daemon.

Candidate views include:

- Projects;
- Agent Workspace;
- Intent Catalog;
- Architecture and Feature Briefs;
- Plans and Tasks;
- Project Health;
- Diff Review;
- Timeline and Releases;
- Conformance;
- Skills, MCP Servers, Knowledge Providers, and Extensions;
- Knowledge Graph;
- Provider, Privacy, and Permission Settings.

## Agent workspace

The agent workspace should let a user collaboratively clarify product intent, design architecture, inspect a selected project, create reviewed plans, and eventually apply approved project changes through the existing transaction boundary.

The workspace should support bounded modes instead of starting with one unrestricted autonomous agent:

1. **Discuss**: requirements, trade-offs, architecture, and system-design assistance without project mutation.
2. **Inspect**: typed read-only project, doctor, timeline, evidence, conformance, and knowledge operations.
3. **Plan**: feature briefs, context packs, architecture proposals, task graphs, test plans, and exact change plans.
4. **Review**: affected paths, diffs, risks, tests, permissions, policy impact, provenance, and rollback behavior.
5. **Apply approved plan**: a later capability that verifies plan identity, digest, expiry, project root, ownership, capability scope, permissions, and current state before transactional application.

The intended workflow is:

```text
user conversation
      ↓
project-scoped agent session
      ↓
provider-neutral model adapter
      ↓
typed Intentloom tools and bounded resources
      ↓
application operations / local MCP / daemon protocol
      ↓
reviewed plan → explicit approval → revalidation → transaction
```

## Provider-neutral model contract

Intentloom should not initially train or require its own foundation model. The agent workspace should define a vendor-neutral provider contract that can support explicitly configured hosted models, approved local model runtimes, and compatible coding-agent or MCP adapters where licensing and security allow.

Provider identity, model identity and version, capabilities, configuration digest, network mode, data-handling mode, and current permission grant must remain visible to the user.

Credentials must be stored outside project metadata, evidence bundles, generated files, logs, manifests, source maps, and exported sessions.

## Safety boundaries

- Every session is bound to one explicitly selected project root and capability grant.
- No unrestricted shell, generic CLI execution, or arbitrary filesystem browsing is exposed to the model.
- Network access is provider-specific, visible, revocable, and disabled when not required.
- Prompts, model output, external MCP results, and provider responses never count as approval.
- Proposed mutations show exact paths, diffs, tests, policy impact, permissions, provenance, and rollback behavior.
- Stale plans are rejected after relevant project, ownership, digest, provider, permission, or capability changes.
- Conversation and agent evidence retention is explicit, project-isolated, exportable, and deletable.
- Autonomous dependency installation, credential changes, commits, pull requests, merges, releases, deployments, and publication remain disabled until separately designed and reviewed.

## Delivery sequence

1. Stabilize structured read-only application operations and protocol coverage.
2. Add an optional terminal UI for inspect, doctor, diff, timeline, release analysis, conformance, and extension review.
3. Build a read-only desktop shell over the daemon and versioned protocol.
4. Add project-scoped local conversation and session records.
5. Define provider-neutral model and agent-session contracts.
6. Add Discuss, Inspect, and Plan modes using typed read-only tools.
7. Add reviewed artifact generation for briefs, context packs, architecture proposals, and prepared plans.
8. Add diff review and explicit approval UX.
9. Add safe plan application only after mutation protocol and threat-review gates are met.
10. Consider multi-agent delegation, remote transports, background tasks, hosted interfaces, and autonomous workflows only as separate later decisions.

## First milestone exit criteria

- CLI, TUI, MCP, daemon, and desktop return equivalent structured results for the same operation and project state.
- Cancelling or closing an interface leaves the project byte-for-byte unchanged.
- The first desktop agent milestone supports one selected project, one explicitly configured provider, and read-only typed tools.
- Generated briefs and plans preserve provenance and remain reviewable before storage or application.
- No model response can directly mutate files, execute arbitrary commands, merge, release, deploy, or publish.
- Session data can be exported and deleted locally.

## Non-goals

- replacing normal CLI commands;
- replacing established IDEs;
- cloning every behavior of Claude Code, Codex, Cursor, or another vendor agent;
- training an Intentloom foundation model as a prerequisite;
- unrestricted terminal emulation;
- hidden background execution;
- mandatory accounts, telemetry, or cloud storage;
- autonomous commits, pull requests, merges, releases, deployments, or publication.
