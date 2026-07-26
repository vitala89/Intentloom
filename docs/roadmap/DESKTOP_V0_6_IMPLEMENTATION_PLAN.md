# Desktop v0.6 Implementation Plan

Status: proposed implementation baseline.

Milestone: `v0.6.0-beta.1`.

Entry evidence: `intentloom@0.5.0-beta.1` is published under npm `next`.

Primary outcome: one useful, packaged, read-only Tauri 2 Desktop flow over the
standalone authenticated daemon, followed by TUI parity over the same
contracts.

## Why v0.6 is next

Intentloom already has a TypeScript-first core, shared application operations,
a versioned local protocol, an authenticated local daemon, CLI and MCP
surfaces, a partial `intentloom ui` presentation state, local workspace
records, reviewed planning, and a transactional apply boundary.

The largest product gap is no longer another analysis feature. It is a coherent
user-facing client that makes the existing platform visible and testable.

Stable `1.0.0` compatibility planning remains important, but the Desktop/TUI
work supplies evidence required by that later gate. A `v1.0` planning document
must not make the first Desktop client wait behind a premature stable-release
promise.

## Required architecture

```text
apps/desktop webview
        ↓
typed Desktop client and presentation models
        ↓
minimal Tauri native transport/lifecycle bridge
        ↓
authenticated Unix socket or Windows named pipe
        ↓
packages/daemon
        ↓
packages/protocol
        ↓
packages/application
        ↓
core, validator, evidence, conformance, and transactions
```

Dependency rules:

- Desktop depends on public workspace contracts. Platform packages never
  depend on Desktop.
- The webview does not read arbitrary project files.
- Rust owns native shell and transport concerns, not domain behavior.
- Desktop does not parse human CLI output or spawn arbitrary CLI commands.
- Canonical protocol types and validators have one source of truth.
- The first slice has no network dependency, telemetry, hosted account, or
  provider credential requirement.

## Verified starting inventory

| Capability                            | Application                         | Protocol                         | Daemon                  | Desktop readiness                                            |
| ------------------------------------- | ----------------------------------- | -------------------------------- | ----------------------- | ------------------------------------------------------------ |
| Authenticated local request transport | N/A                                 | Request/response envelope exists | Client and server exist | Needs lifecycle and mismatch UX                              |
| Capability discovery                  | No dedicated operation              | Missing                          | Missing                 | Required before UI routing                                   |
| Project inspect                       | Implemented                         | Implemented                      | Implemented             | Ready for integration                                        |
| Doctor                                | Implemented                         | Implemented                      | Implemented             | Ready for integration                                        |
| Interactive workspace snapshot        | Implemented                         | Missing                          | Missing                 | Optional facade, inventory first                             |
| Project diff                          | Implemented                         | Missing                          | Missing                 | Required                                                     |
| Local project timeline                | CLI/evidence path exists            | No root-bound Desktop operation  | Missing                 | Required                                                     |
| Operation cancellation and progress   | Task checkpoints exist elsewhere    | Missing for daemon calls         | Timeout only            | Required contract decision                                   |
| Structured client error taxonomy      | Partial                             | JSON-RPC validation errors only  | Partial                 | Must cover auth, mismatch, stale root, timeout, cancellation |
| Workspace conversation list/get       | Implemented                         | Missing                          | Missing                 | Follow-up                                                    |
| Workspace start/append/promote/review | Implemented                         | Missing                          | Missing                 | Follow-up, contains writes to `.aif`                         |
| Approved apply                        | Implemented through application/CLI | Missing                          | Missing                 | Later high-risk slice                                        |

This inventory must be rechecked against the current `main` at the start of
implementation. It is a planning snapshot, not a permanent compatibility
claim.

## Entry gates

Before Desktop implementation:

- [ ] This plan and its roadmap/state links are merged into `main`.
- [ ] Open PR #94 is reconciled so stable `v1.0` planning does not displace the
      approved pre-1.0 Desktop milestone.
- [ ] The System Designer handoff is approved, or implementation is limited to
      protocol and native-shell work that does not invent visual decisions.
- [ ] A Desktop stack and distribution ADR is accepted.
- [ ] The branch begins from a verified clean `main`.

## Phase 0: Roadmap and architecture closure

### Outputs

1. Add `v0.6.0-beta.1` to the near-term roadmap between v0.5 and v1.0.
2. Record Desktop as the active product milestone in `PROJECT_STATE.md`.
3. Reconcile or supersede PR #94. Preserve useful v1 compatibility planning as
   a later release gate.
4. Add an ADR that decides:
   - UI framework and version;
   - Vite or equivalent build integration;
   - Tauri 2 workspace structure;
   - frontend-to-Rust transport boundary;
   - daemon discovery, ownership, start, attach, reconnect, and shutdown;
   - session-token handling;
   - developer and packaged daemon distribution;
   - self-contained runtime strategy for the current Node-based daemon;
   - platform support and updater scope;
   - design-token source and asset licensing.

### Decision recommendation

Evaluate React and Angular against bundle size, complex developer-tool
components, testing, Tauri integration, contributor familiarity, and long-term
maintenance. Select one in the ADR. Do not create both clients or a framework
abstraction.

The first packaged Desktop must not silently require a separately installed
Node runtime. Run an early feasibility spike for a bundled sidecar or another
self-contained distribution of the existing daemon. This does not justify a
full Rust rewrite.

### Exit gate

One accepted architecture describes how a packaged Desktop starts or attaches
to `intentloomd` on macOS, Windows, and Linux without exposing credentials or
moving domain logic into Rust.

## Phase 1: Client contract freeze

Implement contract changes before page components.

### Required operations

1. Daemon information and capability discovery
   - protocol version;
   - daemon version;
   - supported method identifiers;
   - read-only or mutating classification;
   - bounded limits;
   - compatibility result.
2. Project Inspect
3. Doctor
4. Project Diff
5. Local Timeline

Add an interactive snapshot operation only if it reduces proven duplication
without hiding the source operations.

### Required client states

- idle;
- connecting;
- starting daemon;
- ready;
- running;
- stale;
- cancelled;
- timed out;
- disconnected;
- authentication failed;
- protocol incompatible;
- unsupported capability;
- invalid or changed project root;
- bounded validation failure;
- internal failure with safe diagnostics.

### Contract rules

- Every project request carries or resolves one explicit canonical root.
- Every response preserves operation and protocol version.
- Every method has bounded input and output.
- Unsupported methods fail explicitly.
- Cancellation semantics are documented. Cancellation must not be simulated by
  hiding a still-running mutation.
- Read-only calls produce no project writes.
- The Desktop client uses protocol validators rather than unchecked casts.
- CLI, daemon, and Desktop-facing view models use the same application result.

### Tests

- request/response parsing;
- malformed and oversized payloads;
- authentication failure;
- protocol mismatch;
- unsupported method;
- timeout and cancellation;
- root containment and symlink cases;
- deterministic Inspect, Doctor, Diff, and Timeline fixtures;
- byte-for-byte read-only snapshots;
- Windows named-pipe and Unix-socket coverage.

### Exit gate

The five required operations can be invoked through one typed client against
the daemon with deterministic fixtures and explicit compatibility behavior.

## Phase 2: Tauri shell and secure daemon lifecycle

Create `apps/desktop` only after Phase 0 approves the package boundary.

### Native responsibilities

- native window and menu lifecycle;
- native directory picker;
- canonical path handoff;
- secure daemon endpoint and token ownership;
- attach to an existing compatible daemon or launch the packaged owned daemon;
- bounded local IPC request transport;
- reconnect and owned-process shutdown;
- platform packaging metadata;
- crash-safe cleanup that never deletes an endpoint it does not own.

### Webview responsibilities

- typed view-state orchestration;
- routing;
- themes and density;
- accessible components;
- rendering of validated protocol results;
- no direct token access;
- no arbitrary filesystem, shell, or network capability.

### Security tests

- token is absent from DOM, browser storage, logs, telemetry, crash reports,
  exports, and screenshots;
- endpoint ownership is verified;
- an incompatible daemon cannot be used silently;
- the app cannot request methods outside the declared allowlist;
- closing during a read-only call leaves the project unchanged;
- development-only commands are unavailable in production builds.

### Exit gate

A minimal packaged shell connects safely on all supported platforms and renders
validated daemon information without project mutation.

## Phase 3: Design system implementation

Use the approved [Desktop design brief](../desktop/DESIGN_BRIEF.md) and System
Designer handoff.

### Foundations

- semantic tokens with light and dark modes;
- typography using approved redistribution-safe assets;
- spacing, radius, elevation, density, and motion variables;
- icon set and logo assets;
- visible focus and reduced motion;
- theme selection: system, light, and dark.

### Component baseline

- application shell and project switcher;
- navigation and command palette;
- buttons and form controls;
- status and capability badges;
- banners, alerts, toasts, and tooltips;
- tabs, tables, lists, trees, and inspectors;
- modals and native-action confirmations;
- code, path, diff, and timeline primitives;
- loading, empty, stale, cancelled, disconnected, unsupported, and error
  patterns.

Do not build future product pages merely to demonstrate components.

### Exit gate

Approved tokens and components render equivalently in both themes, keyboard
navigation works, and automated accessibility checks have no unresolved
critical findings.

## Phase 4: Read-only product vertical slice

Implement in this order:

1. Launch and daemon connection
2. Welcome and onboarding
3. Project selection
4. Canonical root confirmation
5. Overview
6. Inspect
7. Doctor
8. Diff Review
9. Timeline and Releases
10. Settings and diagnostics
11. Command Palette

### Product rules

- Overview uses only verified values. Unknown values display `Not evaluated`.
- The selected root and read-only state remain visible.
- Every result exposes source and freshness.
- Doctor findings support severity/category filtering and keyboard traversal.
- Diff supports large results, non-color indicators, and unified/side-by-side
  modes.
- Timeline provides a table alternative and does not infer causality,
  bottlenecks, rework, or individual performance.
- No `Apply all`, generic terminal, account, provider, marketplace, or cloud
  action appears.

### Exit gate

A clean user can complete:

```text
Launch
→ connect
→ select and confirm project
→ Inspect
→ Doctor
→ Diff
→ Timeline
→ close
```

The selected project is byte-for-byte unchanged.

## Phase 5: Desktop Workspace follow-up

This phase begins only after the read-only slice is stable.

### First Workspace scope

- list and open project-scoped local conversations;
- display Discuss and Inspect records;
- create and review Plan artifacts;
- display affected paths, provenance, risks, permissions, and rollback
  expectations;
- export and delete local session data;
- keep model identity and network state visible when a separately approved
  provider is later configured.

Starting, appending, promoting, exporting, or deleting records changes local
Intentloom workspace data and must not be described as byte-for-byte read-only.
Each operation needs an explicit contract and UI confirmation appropriate to
its impact.

### Exclusions

- no live provider adapter without its own specification and credential design;
- no arbitrary tool execution;
- no automatic code mutation;
- no implicit approval from a model response;
- no background agent loops.

### Exit gate

One selected project can review project-scoped conversation and plan artifacts.
No action can apply a proposal or mutate project-owned code.

## Phase 6: TUI parity and hardening

After Desktop stabilizes the shared contracts, complete `intentloom ui` as a
keyboard-first interface over those same contracts.

Required:

- navigation between Inspect, Doctor, Diff, and Timeline;
- loading, empty, error, stale, disconnected, and cancelled states;
- explicit project-root confirmation;
- large diff and timeline handling;
- accessible color and non-color status;
- snapshots;
- packaged CLI runtime tests;
- CLI, daemon, Desktop, and TUI result parity fixtures.

### Exit gate

Equivalent inputs produce equivalent structured results in CLI, daemon,
Desktop, and TUI. Cancellation and exit leave the project unchanged.

## Phase 7: Approved Apply, separate security gate

Do not include Apply in the first read-only slice.

Before exposing it, prove:

```text
prepare
→ exact paths and diff
→ explicit human approval
→ plan identity and digest
→ expiry
→ canonical root
→ ownership
→ permissions and capability
→ current project state
→ transactional apply or reject
→ rollback evidence
```

This phase requires a threat-model update, dedicated ADR/specification review,
adversarial tests, and a separate maintainer approval. Model output, external
evidence, prompt text, endpoint availability, or a previous broad permission
never counts as approval.

## Phase 8: Packaging, dogfooding, and release

### Required evidence

- development and production builds;
- macOS, Windows, and Linux package smoke tests;
- clean installation without a preinstalled Node runtime if the ADR requires a
  self-contained bundle;
- daemon start, attach, mismatch, reconnect, and shutdown tests;
- read-only vertical-slice end-to-end test;
- accessibility review;
- Intentloom repository dogfooding;
- Applye or sanitized Angular/Tauri project dogfooding;
- minimal TypeScript project dogfooding;
- installation, troubleshooting, privacy, and uninstall documentation;
- release-state matrix update;
- `v0.6.0-beta.1` readiness audit.

Release, tag, npm publication, desktop artifact upload, signing, notarization,
and updater activation remain explicit external actions. They require separate
maintainer authorization.

## Pull request sequence

Keep the work reviewable. Do not implement the milestone in one pull request.

| PR  | Scope                                                   | Must not include             |
| --- | ------------------------------------------------------- | ---------------------------- |
| A   | Roadmap recovery, state, plan, architecture ADR         | Runtime code                 |
| B   | Capability discovery and client error contracts         | Desktop UI                   |
| C   | Diff and Timeline daemon contracts                      | Tauri or design system       |
| D   | `apps/desktop`, Tauri transport, daemon lifecycle spike | Product pages                |
| E   | Tokens, themes, shell, shared components                | Future pages                 |
| F   | Select project, Overview, Inspect, Doctor               | Diff apply                   |
| G   | Diff and Timeline product views                         | Mutation                     |
| H   | Workspace review surfaces                               | Live provider or apply       |
| I   | TUI parity and hardening                                | New independent domain logic |
| J   | Approved Apply security slice                           | Release or publish           |
| K   | Packaging, dogfooding, readiness documentation          | Automatic release            |

Every meaningful PR updates `DUTY_WATCH.md`. Update `PROJECT_STATE.md`, roadmap,
ADRs, references, and release records when durable truth changes.

## Required validation

Use the strongest applicable set:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm pack:cli
git diff --check
```

Desktop phases also require the commands selected in the stack ADR, expected to
include Rust formatting, Rust linting, Rust tests, frontend unit tests,
accessibility checks, end-to-end tests, and platform package smoke tests.

Record unavailable checks honestly. Do not mark a phase complete because only
the UI appears correct.

## Milestone completion

`v0.6.0-beta.1` is complete only when:

- a packaged Desktop connects to the authenticated local daemon;
- one canonical project root completes the full read-only vertical slice;
- Inspect, Doctor, Diff, and Timeline use validated shared contracts;
- both themes and keyboard navigation are usable;
- cancellation, disconnect, mismatch, and recovery are proven;
- Desktop and hardened TUI return equivalent structured results;
- project bytes remain unchanged throughout the read-only flows;
- Workspace review, if included, cannot apply project mutations;
- platform tests and dogfooding evidence are recorded;
- release-state, compatibility, roadmap, and Duty Watch records are accurate.

Approved Apply may ship later than the first v0.6 beta if its security gate is
not complete. Its absence must be explicit rather than hidden behind a disabled
control.
