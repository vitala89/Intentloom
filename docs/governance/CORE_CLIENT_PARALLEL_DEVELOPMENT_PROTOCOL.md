# Core and Client Parallel Development Protocol

## Status

Governance protocol for coordinating Intentloom Core, daemon, CLI, Desktop, TUI,
MCP, and dogfooding work while the Engineering Workspace is developed.

This protocol supplements the Engineering Workspace implementation plan. It does
not add runtime behavior, public commands, schemas, daemon methods, permissions,
or project mutation.

## Purpose

Intentloom should be able to develop Core capabilities and user-facing clients
in parallel without forcing artificial lockstep and without allowing clients to
invent domain behavior that Core has not defined.

The coordinating agent must always answer two practical questions:

1. What is the next correct Core task?
2. What Desktop and CLI/TUI work can safely proceed now from the same verified
   baseline?

If client work is not currently safe, the agent must say so explicitly and state
which Core contract or capability must land first.

## Source-of-truth order

Before giving implementation advice, an agent must inspect the current state in
this order:

1. current `main` and repository head;
2. open pull requests and recently merged overlapping pull requests;
3. `PROJECT_STATE.md`;
4. `DUTY_WATCH.md`;
5. the relevant roadmap and concept documents;
6. exact application operations, protocol contracts, daemon methods, CLI
   commands, Desktop/TUI viewmodels, MCP tools, fixtures, and tests;
7. capability and release-state documentation.

A roadmap checkbox or old conversation is not enough to declare a capability
available.

## Capability synchronization states

Every candidate capability must be classified as one of these states before
parallel work begins.

### `ready-now`

The required application operation and versioned contract are merged into
`main`. Desktop and CLI/TUI may implement or integrate the client slice now.

### `ready-against-frozen-fixture`

The Core contract is reviewed and frozen in an active Core PR or accepted
versioned fixture. Client implementation may proceed in parallel against that
exact contract.

The fixture must include success, empty, stale, cancelled, unsupported,
permission, validation, and safe failure states where applicable.

### `core-first`

The semantics, schema, operation identity, validation, safety boundary, or
required result shape are not stable. Core must define and freeze them first.

Client code must not compensate by inventing temporary business logic.

### `integration-pending`

Core and client implementations both exist, but parity tests, transport wiring,
capability discovery, or documentation reconciliation are still incomplete.

### `blocked`

A security, architecture, compatibility, threat-model, release, or product gate
prevents implementation.

### `future`

The capability is intentionally outside the current delivery phase.

## Mandatory coordination report

Whenever the user asks questions such as "where did we stop?", "what should we
do next?", "can Desktop proceed?", or "give me the next agent prompt", the
coordinating agent must produce a report based on fresh repository evidence.

Recommended structure:

```text
Current Engineering Workspace phase: Wn
Verified main: <commit>
Relevant active PRs: <PRs or none>

CORE
Current completed capability:
- ...

Next Core task:
- ...

CLIENTS: DESKTOP + CLI/TUI
Ready now:
- ...

Safe in parallel against frozen contracts:
- ...

Must wait for Core:
- ...

Integration pending:
- ...

Blocked / future:
- ...

Next synchronization checkpoint:
- ...
```

The report must not create work merely to keep both streams active. If no useful
client work is safe, say `Desktop/CLI should wait for <specific Core gate>`.

Likewise, if Core can continue into a non-conflicting next capability while a
client integration is finishing, the report should state that explicitly.

## Prompt handoff contract

When parallel work is useful, the coordinating agent should provide two separate
execution prompts from the same verified baseline.

### Core agent prompt must include

- repository and exact starting baseline;
- current Engineering Workspace phase;
- relevant merged and open PRs;
- accepted contract names and versions;
- Core-owned packages and files;
- exact schemas, validators, application operations, daemon methods, fixtures,
  tests, and documentation expected from the slice;
- compatibility and migration considerations;
- explicit non-goals;
- client-owned files that the Core agent must not modify unless the contract
  requires a coordinated change;
- exit gate;
- verification commands;
- required `PROJECT_STATE.md` / `DUTY_WATCH.md` reconciliation when durable truth
  changes.

### Desktop + CLI/TUI agent prompt must include

- repository and exact starting baseline;
- current Engineering Workspace phase;
- exact Core contract, schema, operation, daemon RPC, viewmodel, or frozen fixture
  it consumes;
- Desktop, CLI, and TUI owned surfaces;
- capability discovery behavior;
- loading, empty, stale, cancellation, timeout, unsupported, validation,
  permission, approval, and safe-error states;
- accessibility and keyboard requirements;
- parity tests against canonical fixtures;
- prohibition on parsing human CLI output;
- prohibition on reimplementing Core validation, policy, assessment, ownership,
  approval, transaction, or rollback logic;
- explicit non-goals;
- exit gate and verification commands.

Both prompts must cite the same capability identifiers and contract versions.
If a shared contract changes, the old client prompt is stale until explicitly
reconciled.

## Ownership boundary

Core leads when work introduces or changes:

- canonical semantics;
- protocol/schema contracts;
- validation and deterministic resolution;
- evidence truth;
- permissions or capabilities;
- approval state;
- plan identity, digest, or expiry;
- transaction or rollback behavior;
- daemon method identity;
- compatibility or migration rules.

Desktop and CLI/TUI may lead when Core already exposes stable structured state
and the remaining work is:

- presentation;
- navigation;
- filtering and grouping;
- accessible visualization;
- interaction state;
- command rendering;
- command help for already implemented capability;
- error and cancellation presentation;
- parity wiring.

A client may discover that one extra field is needed, but the field becomes a
Core contract change rather than client-local derived truth when it affects
canonical semantics.

## Synchronization checkpoints

A fresh synchronization pass is required:

1. before starting a new W-phase;
2. after a Core contract PR is opened;
3. after that Core PR is merged;
4. before a client PR leaves draft;
5. before an integration/parity PR;
6. whenever a shared contract changes;
7. whenever `main` advances with overlapping work;
8. before declaring the phase complete;
9. before generating new execution prompts for another agent.

At each checkpoint compare actual contract IDs, schemas, fixtures, daemon methods,
CLI command availability, Desktop/TUI viewmodels, MCP surfaces, tests, and docs.
Do not infer readiness from branch names alone.

## Parallel cadence

Parallelism is encouraged when it reduces elapsed development time, but it is not
an objective by itself.

Preferred cadence:

```text
Core starts capability
        ↓
contract / fixture becomes reviewable and frozen
        ↓
Desktop + CLI/TUI may start in parallel
        ↓
Core implementation lands
        ↓
client integration continues
        ↓
parity / integration checkpoint
        ↓
capability complete
```

Core does not need to wait for every client screen before starting the next
non-conflicting Core slice. Desktop/CLI does not need to wait for full runtime
completion when the exact contract is already frozen.

Different capabilities may therefore be at different synchronization states at
the same time.

## Example

Suppose W1 Inception contracts are in a reviewed Core PR and fixtures are frozen.
The coordinating agent may report:

```text
W1 Inception
Core: ready-against-frozen-fixture, runtime PR still open
Desktop/CLI: safe to implement session shell and renderers now

W2 Foundation
Core: core-first, no stable Foundation contract yet
Desktop/CLI: do not implement functional Foundation screens yet
```

After the W1 Core PR merges:

```text
W1 Inception
Core: ready-now
Desktop/CLI: integration-pending

W2 Foundation
Core: may begin if it does not change W1 contracts
Desktop/CLI: wait for W2 frozen fixtures, while finishing W1 integration
```

This is the intended form of parallel progress.

## AI and agent UX dependency

Desktop and CLI AI surfaces must consume the same Agent Workspace, Neutron,
planning, evidence, approval, and permission contracts as other clients.

A client agent must not create a private "Desktop AI" or "CLI AI" domain engine.
It may build the conversational and interactive presentation once the required
provider-neutral Core operations and contracts are available or frozen.

If the AI workflow requires a capability that Core does not yet expose, the
correct status is `core-first`, not an ad-hoc client workaround.

## Completion rule

A capability is not complete merely because Core tests pass or a Desktop screen
looks correct. Completion requires the strongest applicable combination of:

- Core/application correctness;
- protocol/schema validation;
- daemon capability and transport wiring when applicable;
- CLI machine-readable parity;
- Desktop/TUI parity where in scope;
- accessibility where visual UX exists;
- failure and cancellation coverage;
- documentation truth;
- current Project State and Duty Watch reconciliation;
- dogfooding or integration evidence required by the phase.

This protocol exists to keep parallel development fast without allowing the
project to fork into incompatible Core, Desktop, and CLI interpretations.