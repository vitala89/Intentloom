# ADR-0042: Desktop Stack and Self-Contained Daemon Distribution

- **Status**: Accepted
- **Date**: 2026-07-27
- **Milestone**: `v0.6.0-beta.1`

## Context

Intentloom v0.6 adds the official Desktop client to the existing TypeScript
platform. The current repository has no `apps/desktop` package. The daemon is a
Node-based authenticated local IPC server, the protocol is versioned, and the
application package owns the project operations that Desktop must display.

The Desktop client must support macOS, Windows, and Linux without creating a
second domain implementation or silently requiring users to install Node.js.
The webview must not receive the daemon session token or arbitrary filesystem,
shell, or network access. The first product slice is read-only and the updater
is not part of the beta release boundary.

## Decision

This ADR records the architecture accepted for the v0.6 implementation
sequence.

### Client stack

- Use **React 19.2.x**, TypeScript, and **Vite 8.1.x** for the webview.
- Use the official `@vitejs/plugin-react` 6.x integration.
- Use **Tauri 2.11.x** for the native shell and packaging boundary.
- Create one private `apps/desktop` workspace package containing the Vite
  frontend and `src-tauri` Rust project. Do not create an additional UI
  framework client or a framework abstraction.
- Do not use server-side rendering, React Server Components, a browser-hosted
  web application, or a new shared UI package until a second consumer proves
  that extraction is needed.

The versions are compatibility ranges for the v0.6 implementation branch. The
lockfile must pin the exact versions used by the first scaffold, and upgrades
must be reviewed with the Desktop validation matrix.

### Build and workspace integration

- Extend the pnpm workspace to include `apps/*` when the Desktop package is
  scaffolded.
- Vite owns frontend development and production asset generation.
- Tauri owns the native development and production commands, using Vite's
  development server in development and its static output in packaged builds.
- Frontend tests remain separate from Rust tests. The root validation contract
  gains Desktop-specific commands only after the scaffold exists.
- Production builds must not expose development-only commands, remote origins,
  broad shell permissions, or a development daemon fallback.

### Boundary and transport

The runtime boundary is:

```text
React view models
        ↓ typed Tauri command calls
minimal Rust transport and lifecycle bridge
        ↓ authenticated Unix socket or Windows named pipe
intentloomd
        ↓ versioned protocol
@intentloom/application
```

- The webview uses a typed Desktop client that validates protocol envelopes and
  operation results before rendering them.
- Rust owns native windows, directory dialogs, child-process lifecycle,
  endpoint selection, token ownership, bounded local IPC, and cleanup.
- Rust does not implement inspection, Doctor, Diff, Timeline, evidence,
  conformance, ownership, approval, or transaction rules.
- The native bridge exposes an explicit allowlist of Desktop methods and
  bounded payload sizes. It cannot become a generic shell, filesystem, or
  network bridge.
- Every project operation carries one explicit canonical root. Canonical-root
  validation remains a shared application/protocol concern; native path
  handling only supplies the selected directory and transport metadata.
- The Desktop client never parses CLI text and never spawns the CLI to obtain
  domain results.

### Daemon discovery and lifecycle

- Use an application-private runtime directory, not the selected project, for
  daemon endpoint metadata, ownership markers, and the session token.
- First attempt to attach to an existing local daemon only after a typed
  information/capability handshake confirms protocol compatibility and the
  required read-only methods.
- If no compatible daemon is available, start the packaged owned daemon with a
  fixed executable and fixed argument shape. The frontend cannot choose an
  arbitrary executable or argument list.
- Reconnect with bounded retry and an explicit disconnected state. A protocol
  mismatch, authentication failure, stale root, timeout, cancellation, or
  unsupported capability is surfaced as its own typed client state.
- On close, gracefully stop only a daemon process and endpoint owned by this
  Desktop instance. Never remove or terminate an endpoint it did not create.
- Shutdown and crash cleanup are idempotent and bounded. A timed-out cleanup
  leaves diagnostics for the user; it does not delete unrelated runtime files.

### Session-token handling

- Generate or receive the token in the native layer using an OS-secure random
  source. Keep it in native memory and an application-private token file only
  when the daemon launch contract requires a file.
- Apply restrictive permissions/ACLs to the runtime directory and token file.
- Pass only the token-file path to the owned daemon when required; never pass
  the token value through the webview, DOM, browser storage, URLs, logs,
  screenshots, crash reports, exports, or user-visible diagnostics.
- The Rust bridge adds the token to local IPC requests. Frontend requests carry
  only an operation identifier and validated parameters.

### Self-contained daemon distribution

The packaged Desktop must not depend on a separately installed Node runtime.
The first feasibility spike will package the existing compiled daemon as a
per-platform Node single-executable/sidecar artifact, using the current
esbuild-produced daemon entry point and the existing application operations.
This is a distribution change, not a Rust rewrite.

The spike must prove, on macOS, Windows, and Linux, that the artifact can:

1. start with no system Node installation;
2. bind the expected local IPC endpoint;
3. authenticate a request;
4. serve the required read-only operations;
5. shut down without leaking a process or deleting an unowned endpoint; and
6. be bundled by Tauri with reproducible, target-specific output.

If this strategy cannot be made reliable, v0.6 beta cannot silently fall back
to a system Node requirement. A different self-contained runtime strategy
requires a follow-up decision and maintainer approval before packaging work
continues.

Development may use the repository's supported Node toolchain explicitly. That
developer convenience is not a packaged-product dependency.

### Supported platforms and updater scope

- The target platform families are macOS, Windows, and Linux, matching the
  Desktop design brief and the existing cross-platform repository validation.
- Initial packaging formats and minimum OS versions are release-readiness
  decisions, not assumptions made by this ADR. The packaging phase must record
  the exact architecture matrix, installer formats, minimum versions, signing,
  and smoke-test evidence.
- v0.6 distributes direct platform packages only. Automatic update checks,
  updater endpoints, signing automation, notarization, artifact uploads, and
  release activation remain outside this ADR and require explicit maintainer
  authorization.

### Design tokens and assets

- The approved System Designer handoff and `docs/desktop/DESIGN_BRIEF.md` are
  the design source of truth.
- Semantic light/dark tokens are checked into the Desktop source as generated
  frontend artifacts; the runtime does not depend on Figma or a network design
  service.
- Typography and icon assets must be redistribution-safe, carry their license
  and attribution records, and be reviewed before inclusion in a package.
- Missing design-handoff behavior must not be invented by the implementation
  agent. Technical shell work may proceed without visual product pages, but
  visual implementation stops at the handoff boundary.

## Alternatives considered

### Angular

Angular provides a strong integrated application framework, but selecting it
would introduce a second large framework choice without a current repository
consumer. React has the smaller initial decision surface for the planned
Tauri/Vite SPA and better matches the repository's intended incremental client
boundary. Angular remains rejected for this client, not prohibited for
dogfooding projects.

### Direct webview socket access

Rejected. It would expose endpoint and credential concerns to the webview and
weaken the native security boundary. Local IPC is owned by Rust; domain
validation remains in the shared TypeScript protocol/application path.

### Spawning the CLI

Rejected. Desktop must consume structured daemon contracts and must not parse
human CLI output or create a second lifecycle path.

### Rewriting the daemon in Rust

Rejected for v0.6. It would move domain behavior across the platform boundary
and expand the change beyond the demonstrated Desktop need.

### Requiring system Node.js

Rejected for packaged builds. It makes installation behavior implicit and
breaks the self-contained Desktop requirement.

## Consequences

Positive consequences:

- One official client uses the existing daemon, protocol, and application
  operations.
- Credentials and native privileges stay outside the webview.
- The Node daemon can be distributed without a full Rust rewrite.
- The package boundary leaves room for TUI parity over the same contracts.

Costs and risks:

- The sidecar feasibility spike is a release-blocking dependency for packaged
  beta builds.
- Rust transport tests and frontend protocol tests must cover two IPC layers.
- Tauri packaging, code signing, and platform smoke tests add CI and release
  work.
- The exact protocol capability-discovery and client-error contracts are still
  Phase 1 work and cannot be inferred from the current `doctor`-only client
  helper.

## Scope exclusions

This ADR does not authorize or implement:

- `apps/desktop` scaffolding;
- protocol or daemon contract changes;
- live providers, external MCP ingestion, hosted accounts, telemetry, or
  generic terminal access;
- proposal Apply controls or repository mutation;
- automatic updater activation, publishing, signing, notarization, or release;
- a second UI framework or a shared UI package without a demonstrated
  consumer.

## Acceptance and follow-up

The maintainer accepted this ADR on 2026-07-27. Acceptance covers the
framework choice, native boundary, token handling, supported-platform scope,
and sidecar feasibility gate. It does not claim that the sidecar spike or any
Desktop runtime implementation is complete.

The next implementation PR after acceptance is the Phase 1 client-contract
freeze. The first technical spike within that sequence is the self-contained
daemon artifact feasibility test. The initial result is recorded in the
[SEA feasibility spike report](../desktop/SEA_FEASIBILITY_SPIKE.md); it must
report equivalent results for all three target platform families before
packaged Desktop work is considered ready.

## References

- [Desktop v0.6 implementation plan](../roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md)
- [Desktop design brief](../desktop/DESIGN_BRIEF.md)
- [ADR-0032: Second Client Daemon Protocol Contracts](ADR-0032-second-client-daemon-protocol-contracts.md)
- [ADR-0033: Interactive Surfaces](ADR-0033-interactive-surfaces-tui-and-desktop-shell.md)
- [Tauri frontend configuration](https://v2.tauri.app/start/frontend/)
- [Tauri capabilities](https://v2.tauri.app/reference/acl/capability/)
- [Tauri Node.js sidecar guidance](https://v2.tauri.app/learn/sidecar-nodejs/)
- [React versions](https://react.dev/versions)
- [Vite getting started](https://vite.dev/guide/)
