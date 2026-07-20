# Architecture

## Overview

```text
catalog + profiles ──> core resolver ──> adapter contracts ──> target files
       │                    │                   │                 │
       └────────────────> validator <───────────┴──── source map + lock
```

The catalog is the sole source of reusable engineering meaning. The resolver selects and parameterizes canonical artifacts. Adapters transform the resolved model into target-specific files. The validator recomputes the model and detects malformed inputs, unsupported capabilities, drift, and unsafe write plans.

## Current repository structure

```text
packages/
  core/          Canonical model, resolver, schemas, rendering contracts
  adapters/      Shared adapter interfaces and target implementations
  cli/           Public local command surface and process adapter
  validator/     Structural validation and drift detection
  application/   Private project-operation boundary
  protocol/      Private versioned local wire contract
  daemon/        Private local-IPC process adapter
catalog/
  skills/ policies/ workflows/ templates/ schemas/
adapters/
  claude/ codex/ cursor/ copilot/
profiles/ examples/ tests/
docs/
```

All workspace packages are implemented. The public `intentloom` package bundles
the CLI and its runtime catalog/profile assets; the workspace libraries remain
private implementation packages without a public import API.

## Platform Foundation boundary

The private `@intentloom/application` workspace package owns the reusable
project-operation surface. Its `initProject`, `adoptProject`, `diffProject`,
`syncProject`, and `doctorProject` operations use explicit roots, filesystem,
transaction, validation, and result contracts. The CLI owns argument parsing,
current-working-directory defaults, output rendering, and exit-code mapping.
The application package does not depend on CLI or process behavior. See ADR-0007.

`@intentloom/protocol` is a separate private, transport-independent package. It
defines JSON-RPC 2.0-compatible versioned wire types, beginning with the read-only
`intentloom.project.doctor.v1` operation. It does not access the filesystem or
depend on application, CLI, process, or transport code. See ADR-0008.

`intentloomd` is a separate process adapter over local IPC only. It authenticates
one-use sessions before dispatching the v1 doctor request to the application
layer, and it does not expose TCP, HTTP, or a public API. Its security and
lifecycle boundary is defined in ADR-0009.

## Planned connected-project and evidence boundary

Future project connection, Git evidence, provider import, MCP, desktop, and daemon
surfaces must remain adapters over the application-operation boundary. They must
not duplicate ownership, planning, validation, transaction, or conformance logic.

```text
explicit project root + capability grant
                  ↓
       project inspection operation
                  ↓
 local Git / provider export / external MCP evidence
                  ↓
      bounded source-specific adapters
                  ↓
 vendor-neutral evidence model and local evidence store
                  ↓
 deterministic timeline and conformance operations
                  ↓
 CLI / local MCP / desktop / local daemon presentation
                  ↓
 recommendation or reviewed adoption plan
                  ↓
 existing transactional apply boundary
```

Planned implementation packages may include private `evidence`, `evidence-git`,
provider-adapter, and MCP-server modules. Provider-specific syntax, credentials,
network behavior, and MCP transport concerns stay outside canonical Core.

The first MCP transport should be local `stdio`. It exposes named, typed,
read-only operations and bounded resources. It must not expose a generic shell,
generic CLI execution, unrestricted file reads, or generic file writes.
Streamable HTTP remains a later candidate requiring a separate authentication,
tenant-isolation, retention, and network-security decision.

External provider and MCP results are untrusted evidence. They must be validated,
redacted, normalized, and labeled with source provenance and trust state before
use. External evidence, model output, prompts, and recommendations never count as
approval for a project mutation.

## Data flow and ownership

1. A profile names canonical artifacts and parameters.
2. The resolver validates and produces a normalized, tool-neutral desired state.
3. A target adapter declares capabilities, transforms only compatible content, and emits a write plan.
4. The write planner compares the plan with the installed source map and current filesystem.
5. The validator reports mismatch, drift, unsupported mappings, and conflict states before any mutation.
6. Future evidence adapters observe project execution without becoming canonical sources of engineering meaning.
7. Future conformance operations compare observed evidence with canonical workflows and keep recommendations separate from application.

No adapter may become a second canonical catalog. Tool-specific features must be represented as declared capabilities and an explicit compatibility status, not silently approximated.

## Installed-project metadata

```text
.aif/
  config.yaml              User-owned configuration and profile selection
  manifest.lock.json       Generated, pinned resolved inputs and versions
  source-map.json          Generated ownership, paths, and hashes
```

`config.yaml` is user-edited. The lock and source map are generated records: edits are reported as drift rather than silently discarded. They contain no secrets.

Future access grants and evidence records require separate schema and retention decisions. Credentials must never be stored in project metadata, generated files, evidence bundles, logs, or source maps.

## Generated-file envelope

Where a target supports comments, each file begins with an Intentloom envelope containing framework and adapter versions, canonical source path(s), generation warning, and checksum. For formats that cannot safely carry comments, equivalent metadata is kept in `source-map.json`; the adapter must document the limitation.

## Safety model

Planning is pure and local. Applying a plan is a separate action. Existing unowned files, a changed generated file, a checksum mismatch, or a path escaping project root causes a conflict. Resolution options are preview, retain, back up and replace, or explicitly cancel; there is no default replacement.

A future MCP-triggered mutation must use prepare, preview, explicit approval,
plan digest and expiry verification, root and state revalidation, and the same
transactional apply and rollback path. Read-only project connection and evidence
collection must be available independently of every mutating path.

## Context budget

Policies stay concise and always-on only when necessary. Detailed task procedures belong in skills, which are selected by description and loaded when relevant. This follows the distinction in the [Agent Skills specification](https://agentskills.io/specification) and avoids copying a large catalog into every instruction file.
