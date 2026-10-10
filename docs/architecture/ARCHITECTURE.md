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
apps/
  desktop/       Tauri presentation adapter
packages/
  core/          Canonical model, resolver, schemas, rendering contracts
  adapters/      Shared adapter interfaces and target implementations
  application/   Application and use-case boundary
  cli/           Public local command surface and process adapter
  daemon/        Private local-IPC process adapter
  protocol/      Private versioned local wire contract
  validator/     Structural validation and drift detection
catalog/
  skills/ policies/ workflows/ templates/ schemas/
profiles/ examples/ tests/ docs/ scripts/
```

All workspace packages are implemented. The public `intentloom` package bundles
the CLI and its runtime catalog/profile assets; the workspace libraries remain
private implementation packages without a public import API.

`catalog/` and `profiles/` stay beside `packages/`. They are not package
internals. `tests/` holds cross-package and integration coverage. `scripts/`
holds repository tooling. Historical Engineering Quality implementation plans
live under
[docs/archive/implementation-plans/](../archive/implementation-plans/README.md)
and are not current roadmap authority. The documentation index is
[docs/README.md](../README.md).

## Dependency direction

Workspace dependencies follow the packages as they are declared:

```text
Desktop client
        ↓
@intentloom/protocol, through the Tauri transport
        ↓
authenticated local daemon
        ↓
application use cases
        ↓
core, validator, protocol, adapters, and evidence packages
```

`@intentloom/desktop` depends on `@intentloom/protocol` and the Tauri API. It
does not depend on application, core, or daemon. `@intentloom/daemon` depends
on application and protocol. `@intentloom/application` depends on core,
validator, protocol, adapters, and the evidence packages. `@intentloom/validator`
depends on core and protocol. Protocol and core do not depend on other
workspace packages.

Protocol is the versioned contract shared by the desktop client and the daemon.
It is not a process sitting between the daemon and application. The daemon maps
an authenticated protocol request onto an application use case.

```text
Presentation and process adapters
        ↓
application use cases
        ↓
core / validator / stable protocol contracts
```

CLI, TUI, and MCP call application use cases directly. Desktop does not.

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

## Connected-project and evidence boundary

Project connection, Git evidence, provider import, MCP, desktop, TUI, and daemon
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
 CLI / TUI / local MCP / desktop / local daemon presentation
                  ↓
 recommendation or reviewed adoption plan
                  ↓
 existing transactional apply boundary
```

Provider-specific syntax, credentials, network behavior, and MCP transport concerns stay outside canonical Core.

The first MCP transport is local `stdio`. It exposes named, typed, read-only operations and bounded resources. It must not expose a generic shell, generic CLI execution, unrestricted file reads, or generic file writes.
Streamable HTTP remains a later candidate requiring a separate authentication,
tenant-isolation, retention, and network-security decision.

External provider and MCP results are untrusted evidence. They must be validated,
redacted, normalized, and labeled with source provenance and trust state before
use. External evidence, model output, prompts, and recommendations never count as
approval for a project mutation.

## Interactive presentation boundary

The normal CLI remains the authoritative non-interactive interface. The
terminal UI and Desktop application are presentation adapters.

```text
CLI / terminal UI / MCP
              ↓
@intentloom/application
              ↓
core / validator / protocol / evidence / conformance / transactions

Desktop
  ↓
desktop client
  ↓
Tauri
  ↓
authenticated local daemon
  ↓
application use cases
```

Interactive surfaces must not parse human-oriented CLI text or implement their own filesystem, ownership, evidence, conformance, planning, approval, or transaction behavior. Equivalent input and project state must produce equivalent structured results across CLI, TUI, MCP, daemon, and desktop surfaces.

The terminal UI should remain a local Node.js-compatible presentation layer. The desktop should communicate through the standalone daemon and versioned protocol. A local or hosted web interface is a separate future decision because it adds browser lifecycle, ports, authentication, origin, transport, and network-security boundaries.

### Desktop source layout

Desktop remains a presentation adapter. Feature folders under
`apps/desktop/src/features/` group product capability, presentation, and
client-side interaction. They do not own business invariants. Placement
rules, the `views/` ratchet, Neutron's semantic subfeatures, and shell
composition live in
[REACT_BEST_PRACTICES.md](../governance/REACT_BEST_PRACTICES.md).
The shell composes public feature entrypoints in one window. It is not a
URL router and it does not own feature behavior.

```text
Desktop shell
  ↓
feature entrypoint
  ↓
desktop client
  ↓
Tauri transport
  ↓
authenticated local daemon
  ↓
application use cases
```

The desktop client speaks `@intentloom/protocol`. Tauri carries that local
call. The daemon authenticates the session and dispatches the request.

## Agent and Neutron boundary

The future agent workspace introduces conversation, task state, provider adapters, context selection, and model orchestration, but it does not grant models independent authority over the project.

```text
user conversation
      ↓
project-scoped agent session
      ↓
Neutron provider-neutral runtime
      ↓
explicit hosted or local model adapter
      ↓
typed Intentloom tools and bounded resources
      ↓
application operations / local MCP / daemon protocol
      ↓
reviewed plan → explicit approval → revalidation → transaction
```

Neutron begins as an Intentloom-native runtime rather than a foundation model. The runtime owns provider-neutral context, policy, workflow, skill, planning, evidence, conformance, capability, approval, session, and evaluation behavior. Documentation must expose the underlying provider and model identity whenever third-party weights are used.

### Application Neutron layout

`@intentloom/application` remains the use-case layer. Neutron application code lives under `packages/application/src/neutron/` and is grouped by the product language: session, context, graph, scheduler, tools, and mutation. Folder names follow the ubiquitous language in [DOMAIN_MODELING.md](../governance/DOMAIN_MODELING.md). Node execution is `scheduler/node/` because preflight calls scheduler selection, validation, and transitions while the scheduler calls node execution. A sibling `node/` directory would cycle.

```text
packages/application/src/neutron/
  session/                 Session runtime, turns, activity, review exposure
  context/                 Context assembly, collectors, N2 hook, N3 prompt context
  graph/                   Graph projection and graph-mutation orchestration
  scheduler/               Scheduling policy, leases, retry, timeout, waves
    node/                  Node capabilities, preflight, run, execution, result
  tools/                   Read-only tool registry, router, and authorization
  mutation/
    proposal/              Proposal capability and digest bindings
    review/                Authoritative review artifact, payload store, currentness
    approval/              Host approval issue and approve-and-apply composition
    apply/                 Approved Apply transaction, preflight, durable record
    status/                Durable status lookup and link
    verification/          Post-Apply verification and verification retry
    undo/                  User Undo eligibility, snapshot, plan, and execution
```

The Neutron root keeps only package entrypoints and Neutron-wide modules: the N1 runtime contract, the N2 read-only loop, the project fingerprint shared by session and mutation, and the scheduler and graph-mutation composition barrels. There is no `neutron/index.ts` that re-exports the implementation. Package subpath names (`@intentloom/application/neutron-session` and the other Neutron exports) stay stable; their files live at the paths above.

Mutation stages stay distinct. Proposal, review, approval, Apply, status, verification, and user Undo are separate directories. Approval is not Apply. A status record is not authority to Apply or Undo. Verification is not Apply. `verification/` includes internal rollback evidence from a failed Apply. `undo/` is user Undo. Undo is not that internal rollback, and it does not rewrite original Apply history. The graph Apply bridge, review payload store, materialization currentness, and graph mutation evidence live under `mutation/` because review and Apply own those contracts. Graph orchestration depends on them.

Session, context, graph, scheduler (including node), tools, and mutation are the cycle boundary. Imports between those directories are an explicit allowlist and must stay acyclic. Mutation stages share one transaction record, so imports among `mutation/*` stay inside that one subfeature. Host durable state is the session host port: the session runtime accepts the directory and passes it into mutation operations.

### Protocol Neutron layout

`@intentloom/protocol` owns stable versioned messages, RPC requests and responses, schema identifiers, and client-visible lifecycle shapes. Application Neutron code owns use cases and orchestration. The protocol tree follows that public contract language. It does not mirror `packages/application/src/neutron/`.

```text
packages/protocol/src/neutron/
  runtime/                 Neutron-wide session, context, tool, task-graph, and event contracts
  session/                 Session and turn RPC, plus activity summaries
  graph/                   Graph snapshot and graph RPC
  mutation/                Proposal, preflight, and graph-linked evidence shared across stages
    proposal/              Proposal candidate
    review/                Review artifact, review view, and review RPC
    approval/              Approval record, approval intent, and approve-and-apply RPC
    apply/                 Apply result and durable transaction record
    status/                Read-only status query and result
    verification/          Post-Apply verification evidence and verification retry
    undo/                  User Undo intent, preflight, snapshot, and execution
```

`runtime/` is the Neutron-wide contract module. Session, graph, and mutation depend on it. Runtime imports none of them. Graph snapshot and graph RPC stay under `graph/`. `neutron-graph-mutation.ts` stays at the mutation root because that one module owns both graph-linked proposal evidence and graph-linked Apply evidence. `NeutronMutationProposal` and preflight stay in `neutron-mutation.ts`, which is also the stable `@intentloom/protocol/neutron-mutation` re-export. `proposal/` holds the proposal-candidate contract. The approve-and-apply RPC stays under `approval/` with the approval intent it accepts. Apply's result and transaction record stay under `apply/`. `verification/` holds the existing post-Apply verification evidence and verification-retry contracts. User Undo stays under `undo/`.

There is no `packages/protocol/src/neutron/index.ts`. Package subpath names stay `@intentloom/protocol/neutron-runtime`, `neutron-mutation`, `neutron-session`, and `neutron-graph`. Their files live at the paths above. The package root still exposes Neutron RPC symbols through `workspace-daemon-request.ts`.

Runtime, session, graph, and mutation are the protocol cycle boundary. Imports between those directories are an explicit allowlist and must stay acyclic. Imports among `mutation/*` stay inside mutation. Three file cycles already existed and remain: the mutation contract with approval and the review artifact, the status result with its body parser, and Undo execution with its checker. Protocol modules define and parse contracts. They do not execute mutation, touch the filesystem, issue approval, or call application or daemon code.

### Validator Neutron layout

`@intentloom/validator` owns deterministic validation of Neutron contracts. It checks protocol shapes, schema invariants, canonical digest inputs, path sets, lifecycle consistency, review artifacts, approval intent, Apply records, verification evidence, and session, activity, graph, and runtime payloads. It does not orchestrate sessions, issue approval, mutate the filesystem, dispatch daemon requests, or call providers. Validation stays fail closed.

```text
packages/validator/src/neutron/
  runtime/                 Runtime session, adapter, N2, N3, and runtime-record validation
  session/                 Session RPC and turn-activity validation
  graph/                   Graph snapshot validation
  mutation/                Proposal, preflight, canonical digest, path set, transaction record
    proposal/              Proposal candidate
    review/                Review artifact, review digest, and review RPC
    approval/              Approval record and approval intent
    apply/                 Apply result
    verification/          Post-Apply verification evidence and its digest
```

`neutron-runtime-helpers.ts` remains a private runtime parser module. Session, graph, and mutation import it. `neutron-mutation-review-rpc-helpers.ts` remains the private review-RPC parser. Canonical digest, exact path-set comparison, and the durable transaction record stay at the mutation root because proposal, review, approval, Apply, verification, and the Undo restoration claim share them. The transaction record checks the Apply result and the optional Undo restoration claim, so Apply alone does not own it. There is no validator `undo/` or `status/` directory: those stages have no separate validator modules.

There is no `packages/validator/src/neutron/index.ts`. Package subpath names stay `@intentloom/validator/neutron-runtime`, `neutron-mutation`, `neutron-session`, `neutron-graph`, `neutron-runtime-n2`, and `neutron-runtime-n3`. Their files live at the paths above. `packages/validator/src/index.ts` does not re-export Neutron.

Runtime, session, graph, and mutation are the validator cycle boundary. Imports between those directories are an explicit allowlist and must stay acyclic. Runtime imports none of the others. Imports among `mutation/*` stay inside mutation. Validator Neutron modules depend on `@intentloom/core` and `@intentloom/protocol`. They do not import application, daemon, CLI, Desktop, React, Tauri, or a provider SDK, and they do not read the filesystem or the network.

### Daemon Neutron layout

`@intentloom/daemon` is the authenticated local process adapter. Neutron daemon code maps protocol requests onto host application operations. It owns IPC composition, request dispatch, and handler binding. It does not own mutation invariants, protocol schemas, the approval model, or validation rules. `handlers` is the transport term for that binding.

```text
packages/daemon/src/neutron/
  neutron-workspace-dispatch.ts   Neutron-wide request composition
  session/                        Session and turn RPC, plus capability composition
  graph/                          Graph RPC
  mutation/
    review/                       Review list and review get
    approval/                     Approve-and-apply
    status/                       Read-only status
    verification/                 Verification retry
```

`neutron-workspace-dispatch.ts` is the Neutron composition root. It routes an authenticated request to the handler family and resolves the canonical project root. It does not hold domain rules. Session handlers bind session and turn methods and assemble the capability list by calling the graph and mutation binders. That composition is one-way: graph and mutation handlers do not import session or the dispatcher.

Approve-and-apply stays under `approval/`. The handler accepts the approval-intent request and invokes the host `approveAndApplyNeutronMutation` operation. Status calls `getNeutronMutationStatus` and stays read-only. Verification retry calls `retryNeutronMutationVerification` and cannot Apply. There is no daemon `apply/` or `undo/` directory and no `recovery/` bucket.

Each handler binds `NeutronSessionRuntime` from the application session module. That existing host-only type import is the application surface. Daemon Neutron code does not import Desktop, CLI, React, Tauri, or the validator package. `node:net` stays on the workspace dispatcher because that module is the socket adapter.

`intentloomd` process lifecycle is outside the Neutron tree.
`listenLocalDaemonEndpoint` in `packages/daemon/src/local-daemon-endpoint.ts`
creates the close handle, runs `beforeListen`, and only then binds. The binary
registers SIGINT and SIGTERM inside `beforeListen`, so a signal that arrives
once the endpoint exists can still call `daemon.close()`. That registration
does not unlink an endpoint before bind. Windows named pipes use the same
order. This is process lifecycle, not a Neutron domain module.

Potential future implementation packages may include private agent protocol, agent session, provider adapter, orchestration, benchmark, and evaluation modules. These modules must not access arbitrary files or execute a generic shell. Every project operation remains typed, root-bound, capability-bounded, and subject to application validation.

Model output, prompts, tool recommendations, external MCP data, and evaluator scores never count as approval. Capability enforcement, ownership validation, path safety, plan verification, and transactional writes remain deterministic system responsibilities outside model weights and prompts.

Any later custom Neutron model training requires benchmark evidence, licensed and provenance-complete data, explicit user opt-in for private contributions, derivative-model attribution, and separate safety and release review. Model training is not a prerequisite for the desktop agent workspace.

## Data flow and ownership

1. A profile names canonical artifacts and parameters.
2. The resolver validates and produces a normalized, tool-neutral desired state.
3. A target adapter declares capabilities, transforms only compatible content, and emits a write plan.
4. The write planner compares the plan with the installed source map and current filesystem.
5. The validator reports mismatch, drift, unsupported mappings, and conflict states before any mutation.
6. Evidence adapters observe project execution without becoming canonical sources of engineering meaning.
7. Conformance operations compare observed evidence with canonical workflows and keep recommendations separate from application.
8. Interactive and agent surfaces consume structured operations without becoming alternative sources of project truth.
9. Future agent plans must pass the same ownership, validation, approval, revalidation, transaction, and rollback boundaries as direct CLI plans.

No adapter may become a second canonical catalog. Tool-specific features must be represented as declared capabilities and an explicit compatibility status, not silently approximated.

## Installed-project metadata

```text
.aif/
  config.yaml              User-owned configuration and profile selection
  manifest.lock.json       Generated, pinned resolved inputs and versions
  source-map.json          Generated ownership, paths, and hashes
```

`config.yaml` is user-edited. The lock and source map are generated records: edits are reported as drift rather than silently discarded. They contain no secrets.

Future access grants, agent sessions, provider configuration, and evidence records require separate schemas and retention decisions. Credentials must never be stored in project metadata, generated files, evidence bundles, logs, source maps, or exported sessions.

## Generated-file envelope

Where a target supports comments, each file begins with an Intentloom envelope containing framework and adapter versions, canonical source path(s), generation warning, and checksum. For formats that cannot safely carry comments, equivalent metadata is kept in `source-map.json`; the adapter must document the limitation.

## Safety model

Planning is pure and local. Applying a plan is a separate action. Existing unowned files, a changed generated file, a checksum mismatch, or a path escaping project root causes a conflict. Resolution options are preview, retain, back up and replace, or explicitly cancel; there is no default replacement.

A future MCP- or agent-triggered mutation must use prepare, preview, explicit approval,
plan digest and expiry verification, root, permission, capability, ownership, and
state revalidation, and the same transactional apply and rollback path. Read-only
project connection, evidence collection, conversation, and planning must be
available independently of every mutating path.

Private project repositories, conversations, prompts, generated artifacts, evidence, or telemetry must not be used for model training by default. Any future contribution flow requires explicit opt-in, redaction, retention, deletion, provenance, and dataset-governance contracts.

## Context budget

Policies stay concise and always-on only when necessary. Detailed task procedures belong in skills, which are selected by description and loaded when relevant. This follows the distinction in the [Agent Skills specification](https://agentskills.io/specification) and avoids copying a large catalog into every instruction file.

Agent context construction must also remain selective and provenance-aware. A model should receive only the bounded project resources, policies, skills, evidence, and files required for the current task and capability grant.
