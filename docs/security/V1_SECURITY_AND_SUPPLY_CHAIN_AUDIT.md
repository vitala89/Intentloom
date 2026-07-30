# Intentloom v1.0 Security & Supply Chain Audit

Status: official security and supply chain audit for `v1.0.0`.

Date: 2026-07-29.

Authors: Vitalii Kasap (Project Lead), Antigravity AI Agent.

## Executive Summary

This document performs the **Phase 4: Security and Supply Chain** audit for the `v1.0.0` release milestone.

Intentloom is an offline-first, local-first control layer. The platform executes entirely on the local user machine without remote telemetry, hosted service reliance, hidden network calls, or cloud token persistence.

## Security Audit Matrix

| Domain                    | Security Invariant                                                                             | Verification Status          | Evidence                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local-First Boundary**  | Zero telemetry, zero external network calls during normal operations                           | ✅ PASS                      | `ADR-0008`, `THREAT_MODEL.md`                                                                                                                           |
| **Token Security**        | Session tokens held strictly in native process memory; never logged or stored on disk          | ✅ PASS                      | `packages/daemon/src/index.ts`                                                                                                                          |
| **IPC Access Control**    | Authenticated Unix socket / Named Pipe with strict RPC method whitelist                        | ✅ PASS                      | `ADR-0009`, `ADR-0032`                                                                                                                                  |
| **Read-Only Invariant**   | Inspection, doctor, diff, timeline, TUI, and MCP leave projects byte-for-byte unchanged        | ✅ PASS                      | `tests/interactive-ui.test.ts`, `tests/v1-client-surface-equivalence.test.ts`                                                                           |
| **Dependency Governance** | pnpm lockfile reproducibility, dependency review, and explicit disposition of known advisories | ✅ PASS (approved exception) | `pnpm-lock.yaml`, `package.json`, `.github/workflows/dependency-review.yml`, alert #2 (exception approved until 2026-10-29)                             |
| **Package Provenance**    | Signed npm releases and GitHub release provenance                                              | ⚠️ NOT MET (planned)         | No publish workflow exists; `npm publish --provenance` and npm trusted publishing are not configured. Gate documented in `docs/releases/PUBLISHING.md`. |
| **Incident Response**     | Rollback procedure via `.aif/migration-journal.json` and git tags                              | ✅ PASS                      | `docs/releases/MIGRATION_GUIDE_V1.md`                                                                                                                   |

## Vulnerability & Continuous Audit Policy

1. **Deterministic Local Audits**: `getSecurityAuditReport({ root })` validates project permission boundaries, sensitivity of instruction files, and file permission modes.
2. **Dependency Auditing**: GitHub Dependency Review runs on pull requests that
   change package manifests or the pnpm lockfile and fails on newly introduced
   high or critical vulnerabilities. This is a change-review control; the
   release candidate still requires a recorded green workflow run.
3. **Continuous dependency monitoring**: The active security-baseline branch
   adds `.github/dependabot.yml` for the root npm/pnpm lockfile and the Desktop
   Cargo lockfile. It uses weekly update checks with bounded open PRs; it does
   not enable auto-merge or change dependencies by itself. Dependabot security
   updates remain a separate repository setting and must be verified after
   merge.
4. **Code scanning**: The active security-baseline branch adds a CodeQL
   workflow for JavaScript/TypeScript and GitHub Actions. Rust is not included
   in this workflow; Cargo advisories remain covered by Dependabot, Dependency
   Review, and explicit compatibility assessment. The first post-merge CodeQL
   result must be retained before treating the control as release evidence.
5. **Rollback & Recovery**: In the event of a security advisory, maintainers issue immediate patch releases (`1.0.x`) and document mitigation steps in `docs/security/`.

## Approved exception: transitive `glib@0.18.5`

Status: approved by maintainer `vitala89` on 2026-07-30, recorded in
[`V1_0_RELEASE_GATE_PACKET.md`](../releases/V1_0_RELEASE_GATE_PACKET.md). The
exception is temporary and expires 2026-10-29. This section does not close or
suppress [Dependabot alert #2](https://github.com/vitala89/Intentloom/security/dependabot/2),
which remains open at medium severity.

### Scope and advisory

- Affected manifest: `apps/desktop/src-tauri/Cargo.lock`.
- Affected package: transitive `glib@0.18.5`, supplied through the GTK 0.18.x
  and WebKitGTK 2.0.2 stack used by Tauri/Wry.
- Advisory: [RustSec RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html),
  an unsound `glib::VariantStrIter` implementation affecting versions
  `>=0.15.0, <0.20.0`; the patched version is `0.20.0`.

The read-only verification on 2026-07-29 still reports Dependabot alert #2 as
`open` and `medium`, with vulnerable range `>=0.15.0, <0.20.0` and first patched
version `0.20.0`. `cargo tree --locked --invert glib@0.18.5` confirms the
current `glib 0.18.5` node is shared by the GTK 0.18.2/WebKitGTK 2.0.2 graph
through Tauri 2.11.5/Wry 0.55.1. No direct `glib`, `VariantStrIter`, or
`variant_str` reference was found in Desktop source; lockfile references are
dependency metadata, not direct source use.

### Rationale

The repository has no direct `glib`, `VariantStrIter`, or `variant_str` usage
in `apps/desktop/src-tauri` or `apps/desktop/src`. The current Tauri/Wry/
WebKitGTK versions are the latest available in their package lines, and a
direct lockfile override would leave the GTK 0.18 branch in the graph. A
coordinated stack migration would require a separate compatibility project and
cross-platform Desktop SEA validation; forcing it into the v1.0 gate would add
more release risk than the current transitive, unused API exposure.

### Compensating controls and expiry

- Keep Dependabot alert #2 visible and re-evaluate it on every Desktop
  dependency update.
- Do not add a direct `glib` dependency or use `VariantStrIter` in the Desktop
  source while this exception is active.
- Reopen the migration decision when a compatible Tauri/Wry/WebKitGTK path is
  published.
- Exception expiry/review date: **2026-10-29**, or immediately before any
  public stable Desktop release, whichever comes first.
- Owner: Intentloom project maintainer `vitala89`. Approval, owner confirmation,
  and review date are recorded in
  [`V1_0_RELEASE_GATE_PACKET.md`](../releases/V1_0_RELEASE_GATE_PACKET.md).
