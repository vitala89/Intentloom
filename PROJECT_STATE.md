# Intentloom Project State

Last verified: 2026-07-29

This file records the durable current state of the project. It is not a
chronological log. Session history and handoff details belong in
`DUTY_WATCH.md`.

## Product identity

Intentloom is an independent, open-source, provider-neutral infrastructure
framework for reliable agentic engineering workflows. Applye is a separate
product consumer and is not part of Intentloom.

## Repository model

The selected direction is one public monorepo. The CLI, daemon, protocol, SDK,
MCP support, schemas, adapters, validator, memory contracts, security contracts,
and future official Desktop application are intended to evolve in the same
public repository unless a documented legal, operational, or lifecycle boundary
later justifies separation.

## Current phase

`v0.5.0-beta.1` is released through Git tag and npm `next`. The `v0.6.0-beta.1`
product milestone (Tauri 2 read-only Desktop application, WCAG 2.x a11y,
cancellation, Command Palette, Settings & Diagnostics, TUI parity, and
three-platform SEA sidecar CI verification) has completed implementation, testing,
and readiness auditing (`docs/desktop/V0_6_READINESS_AUDIT.md`). The v1.0
compatibility phases 1–4 are now merged into `main`; the active gate is Phase 5,
the stable-release evidence and approval audit.

The project must avoid premature structural migration. New applications,
packages, and repository boundaries are introduced only when roadmap triggers
and real consumers justify them.

## Current implementation baseline

- Public package and CLI foundations exist from the earlier AIF stage.
- The prepared historical release line includes `0.1.0-alpha.1`.
- Core release-readiness work previously covered packaged CLI runtime,
  filesystem safety, ownership and synchronization, rollback handling, schema
  validation, adoption and doctor fixtures, adapters, cross-platform
  compatibility, and explicit-path read-only verification.
- The repository carries architecture and roadmap documents for project
  connection, evidence, MCP, interactive surfaces, Agent Workspace, Neutron,
  persistent memory, security analysis, engineering process intelligence,
  public monorepo evolution, controlled agent learning, and portable Duty Watch adoption.
- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), transactional apply & rollback engine `intentloom adopt --apply` (Phase 3), pack update 3-way migration `intentloom update` (Phase 4), conformance & security profiles `intentloom conformance` (Phase 5), provider synchronization `intentloom sync` / `intentloom diff` (Phase 6), Memory & Security Candidates M1–M4, S1–S5, Daemon Protocol Contracts for Second Clients, Read-Only Interactive Surfaces TUI, Agent Workspace Discuss & Inspect Modes, Agent Workspace Plan, Review & Apply Modes, and Neutron Autonomous Subagent Orchestration & Local Workspace Sync Engine are merged into `main`.
- v1.0 compatibility phases 1–4 are merged into `main`: ADR-0043 and contract tests, the v1 migration/protocol guide and upgrade tests, client-surface equivalence evidence and tests, and the security/supply-chain audit and tests.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Active focus

1. Execute Phase 5 of `V1_0_STABLE_COMPATIBILITY_PLAN.md`: assemble the v1.0
   readiness audit, compatibility/support evidence, migration and dogfooding
   records, and maintainer release approval on one verified `main` commit.
2. Reconcile remaining v0.6 follow-up hardening (legacy-handler root coverage,
   application-level cancellation/progress, Workspace RPC coverage, dialog focus
   trap, and automated axe-core/Playwright checks) without reopening the closed
   read-only milestone or changing the provider-neutral platform boundary.
3. Keep bottleneck inference, remote ingestion, model-based judgments, and any
   autonomous mutation behind separate approved specifications and threat review.

## Architectural invariants

- Platform first, interfaces second.
- Desktop depends on public platform contracts. Platform code never depends on
  Desktop.
- All interactive surfaces use shared application operations rather than
  duplicating domain logic.
- Evidence precedes mutation.
- Potentially destructive actions require explicit human approval.
- Local-first and provider-neutral behavior are defaults.
- No hidden telemetry, network calls, hooks, or dependency installation.
- Protocols and schemas have one canonical source of truth.
- Backward compatibility and safe migration are explicit concerns.

## Current blockers and unknowns

- Any expansion to bottleneck, performance, causal, actor, repository-reading, persisted, remote, or model-assisted analysis requires a new ADR, specification, and threat review.
- PR #84 through PR #108 are merged in the local history; current `main` is
  verified at `542633a` and tracks `origin/main`.
- npm currently reports `latest=0.1.0-alpha.3` and `next=0.5.0-beta.1`.
- Workspace packages are synchronized to `0.5.0-beta.1`; Git tag
  `v0.5.0-beta.1` is pushed and npm publication is complete.
- Published tarball registry shasum is
  `58b2e27eb66789f57c1e91cec46aea710a6fc241`; the current Desktop branch
  restored its locked dependencies and passes the local build and full test
  suite.
- PR #91 did not land the Desktop/TUI roadmap intent on `main`; PR #95
  recovered the Desktop design and execution baseline from clean `main` and
  merged it as commit `7025051`.
- PR #94 is merged as commit `7402687`; the resulting v1 compatibility plan is
  now active, with phases 1–4 completed and Phase 5 remaining.
- The v1.0 readiness audit and support policy are drafted in
  `docs/releases/V1_0_READINESS_AUDIT.md` and
  `docs/releases/SUPPORT_POLICY_V1.md`. Maintainer approval, release-candidate
  verification, refreshed/accepted v1 dogfooding evidence, and a green
  dependency-review workflow run remain open. The equivalent PR dependency
  review control is now defined in `.github/workflows/dependency-review.yml`;
  its release-gate result must be retained before the stable gate can close.
- PR #105 is merged as `86a1aee`; its Dependency Review, Compatibility, and
  Desktop SEA Feasibility checks passed. Dependabot alert #1 for
  `fast-uri@3.1.3` is closed after the lockfile remediation to `3.1.4`.
- PR #106 is merged as `b8f1e31`; its documentation-only Compatibility checks
  passed and reconciled the post-merge Phase 5 state.
- PR #107 is merged as `88d6f6b`; its documentation-only Compatibility checks
  passed and recorded the GTK/WebKit compatibility assessment.
- PR #108 is merged as `542633a`; its documentation-only Compatibility checks
  passed and recorded the upstream availability evidence.
- Dependabot alert #2 remains open at medium severity for `glib@0.18.5` in
  `apps/desktop/src-tauri/Cargo.lock`; GitHub reports `0.20.0` as the first
  patched version. A read-only Cargo tree assessment confirms it is shared by
  the GTK 0.18.x/WebKit 2.0.2 stack through Tauri/Wry; a direct `glib 0.20`
  override would leave the vulnerable 0.18 branch and is not acceptable. A
  read-only crates.io check reports the current published Tauri 2.11.5, Wry
  0.55.1, and WebKitGTK 2.0.2 versions already in the lockfile, so no
  compatible upstream point upgrade is currently available. A separate
  coordinated stack migration or explicit maintainer exception is required
  before the stable release gate can close. The recommended near-term path is
  a time-bounded scoped exception because the repository has no direct use of
  the affected `VariantStrIter` API; maintainer approval is still pending.
- ADR-0042 is accepted. The macOS arm64 SEA feasibility run and local Tauri
  `.app`/`.dmg` package smoke passed, including embedded sidecar hash and
  catalog-resource verification. The repository history records the
  three-platform GitHub Actions feasibility run as green in `57ff1d9`, and
  `V0_6_READINESS_AUDIT.md` records the resulting readiness claim. A private
  `apps/desktop` Tauri/React/Vite shell scaffold now exists with Unix native
  lifecycle, token ownership, canonical project selection, bounded IPC, and a
  Tokio Windows named-pipe source path; remaining work is follow-up hardening,
  not the closed v0.6 packaging gate.
- The latest post-merge compatibility run for `main` has one Windows Node 24
  timeout in `tests/adapter-packed-process.test.ts`; the other matrix jobs
  passed. This is an existing validation warning, not a Desktop implementation
  result.
- The accepted UI framework, Tauri boundary, daemon lifecycle, token ownership,
  and self-contained packaged daemon strategy are recorded in ADR-0042. The
  System Designer handoff is approved, Phase 1 contracts are validated, and
  the native bridge is connected to the fixed daemon launch/attach boundary;
  the webview now renders validated daemon information, Inspect identity,
  Doctor findings, and ProjectDiff changes in connected read-only Overview,
  Inspect, Doctor, and Diff Review views. Timeline and cross-platform transport
  remain follow-up work.
- Inspect and Doctor have application, protocol, and daemon paths. The
  `intentloom.daemon.info.v1` discovery contract now reports enabled methods,
  read-only/mutating classification, bounded limits, daemon version, and exact
  protocol compatibility. Project Diff and root-bound local Timeline now have
  typed protocol/client/daemon paths over existing read-only application
  operations, including bounded Timeline inputs and stale-root- Application-level transport cancellation delivered: `desktopClient` call() races
  `invoke()` against an `AbortSignal`, matching PHASE1_CONTRACTS.md. A compact
  `.cancel-button` renders in the topbar during any loading operation (`isConnecting`,
  `inspectStatus`, `diffStatus`, `timelineStatus`), calling `cancelOperation()`.
- Command Palette (`⌘K` / `Ctrl+K`) & Settings View delivered: global keyboard shortcut
  opens an accessible filterable command modal (`CommandPaletteModal`) with instant
  search, arrow navigation, and enter execution for all 6 views and primary actions.
  Settings & Diagnostics view renders theme settings, daemon IPC diagnostics,
  project data boundary declaration, and a keyboard shortcuts cheat sheet. All Phase 4
  items of `DESKTOP_V0_6_IMPLEMENTATION_PLAN.md` are complete. Full deterministic validation,
  legacy-handler root coverage, application-level cancellation/progress,
  complete project-operation error mapping, and Workspace RPC coverage still
  require implementation work.
- The System Designer handoff is approved by the maintainer on 2026-07-27;
  visual implementation may begin within ADR-0042 boundaries.
- The read-only Desktop shell now renders connected data across all five
  approved views: Overview, Inspect, Doctor, Diff Review, and Timeline. The
  Timeline view covers quality badges (complete/bounded/unavailable), findings
  chips, a keyboard-accessible event table (source/trust/timestamp/commit/paths),
  a detail panel per event, quality notice banners for bounded and unavailable
  results, and all nine lifecycle states. No apply, mutation, shell, or network
  access was added. Timeline state is cleared on root change to prevent stale
  data across views.
- Root Confirmation UX is implemented: a backdrop-blur overlay appears when
  the user attempts to switch the project root while any view holds loaded data.
  The overlay lists the views that will be cleared and offers "Change project" or
  "Keep current". The confirmation is skipped when no data is loaded (first
  selection). Reconnect Retry Depth is implemented: `connectDaemon` performs one
  automatic retry (1500ms delay) on transient `disconnected` errors, with a
  visible amber notice in the Overview. Protocol mismatch and root errors are not
  retried automatically.
- macOS SEA feasibility spike validated locally: SEA blob (392 kB) injected into
  a 105 MB `intentloomd-sea` executable via `postject@1.0.0-alpha.6`. Daemon
  started from the SEA binary, responded to a Doctor request (`protocolVersion:
1`, `exitCode: 3`, 5 findings), shut down gracefully, and removed its Unix
  socket. `pnpm desktop:prepare-sidecar` copied the SEA binary to
  `apps/desktop/src-tauri/resources/intentloomd` (105 MB, 0755). Tauri macOS
  `.app` with packaged sidecar produced at 114 MB with sidecar embedded at
  `Contents/Resources/resources/intentloomd`. The `desktop-sea-feasibility.yml`
  CI workflow expanded with Linux apt deps, Rust toolchain + cache, SEA
  assertion step, conditional Tauri bundle steps (Linux .deb / macOS .app),
  and artifact upload. Windows CI runs sidecar boundary verification only
  (no code signing available for full bundle).

## Current milestone

The v0.5 Engineering Process Intelligence increment and v0.6 Desktop
implementation/readiness gates are complete. The active product direction is
the `1.0.0` stable compatibility release gate, Phase 5.

Expected outputs:

- v1.0 readiness audit and stable support policy;
- compatibility matrix and verified `v0.5.0-beta.1`/`v0.6.0-beta.1` upgrade evidence;
- client-surface equivalence, security, supply-chain, and rollback evidence;
- dogfooding records and maintainer release approval;
- one verified `main` commit suitable for a future v1.0 tag and publication.

## Next platform milestone

Start the [v1.0 stable release gate](docs/roadmap/V1_0_STABLE_COMPATIBILITY_PLAN.md)
by inventorying the required Phase 5 evidence and identifying any unsupported
claims. The Desktop discovery/error and Diff/Timeline slices remain recorded in
[PHASE1_CONTRACTS.md](docs/desktop/PHASE1_CONTRACTS.md), while the packaged
readiness evidence is recorded in [V0_6_READINESS_AUDIT.md](docs/desktop/V0_6_READINESS_AUDIT.md).
Do not tag or publish v1.0 until all Phase 5 outputs are reviewed and approved
on one verified `main` commit.

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
