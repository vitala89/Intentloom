# Intentloom v1.0 Security & Supply Chain Audit

Status: official security and supply chain audit for `v1.0.0`.

Date: 2026-07-29.

Authors: Vitalii Kasap (Project Lead), Antigravity AI Agent.

## Executive Summary

This document performs the **Phase 4: Security and Supply Chain** audit for the `v1.0.0` release milestone.

Intentloom is an offline-first, local-first control layer. The platform executes entirely on the local user machine without remote telemetry, hosted service reliance, hidden network calls, or cloud token persistence.

## Security Audit Matrix

| Domain                    | Security Invariant                                                                             | Verification Status           | Evidence                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| **Local-First Boundary**  | Zero telemetry, zero external network calls during normal operations                           | ✅ PASS                       | `ADR-0008`, `THREAT_MODEL.md`                                                         |
| **Token Security**        | Session tokens held strictly in native process memory; never logged or stored on disk          | ✅ PASS                       | `packages/daemon/src/index.ts`                                                        |
| **IPC Access Control**    | Authenticated Unix socket / Named Pipe with strict RPC method whitelist                        | ✅ PASS                       | `ADR-0009`, `ADR-0032`                                                                |
| **Read-Only Invariant**   | Inspection, doctor, diff, timeline, TUI, and MCP leave projects byte-for-byte unchanged        | ✅ PASS                       | `tests/interactive-ui.test.ts`, `tests/v1-client-surface-equivalence.test.ts`         |
| **Dependency Governance** | pnpm lockfile reproducibility, dependency review, and explicit disposition of known advisories | ⚠️ PENDING exception approval | `pnpm-lock.yaml`, `package.json`, `.github/workflows/dependency-review.yml`, alert #2 |
| **Package Provenance**    | Signed npm releases and GitHub release provenance                                              | ✅ PASS                       | `docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md`                                    |
| **Incident Response**     | Rollback procedure via `.aif/migration-journal.json` and git tags                              | ✅ PASS                       | `docs/releases/MIGRATION_GUIDE_V1.md`                                                 |

## Vulnerability & Continuous Audit Policy

1. **Deterministic Local Audits**: `getSecurityAuditReport({ root })` validates project permission boundaries, sensitivity of instruction files, and file permission modes.
2. **Dependency Auditing**: GitHub Dependency Review runs on pull requests that
   change package manifests or the pnpm lockfile and fails on newly introduced
   high or critical vulnerabilities. This is a change-review control; the
   release candidate still requires a recorded green workflow run.
3. **Rollback & Recovery**: In the event of a security advisory, maintainers issue immediate patch releases (`1.0.x`) and document mitigation steps in `docs/security/`.

## Proposed exception: transitive `glib@0.18.5`

Status: proposed; maintainer approval is pending. This section does not close
or suppress [Dependabot alert #2](https://github.com/vitala89/Intentloom/security/dependabot/2).

### Scope and advisory

- Affected manifest: `apps/desktop/src-tauri/Cargo.lock`.
- Affected package: transitive `glib@0.18.5`, supplied through the GTK 0.18.x
  and WebKitGTK 2.0.2 stack used by Tauri/Wry.
- Advisory: [RustSec RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html),
  an unsound `glib::VariantStrIter` implementation affecting versions
  `>=0.15.0, <0.20.0`; the patched version is `0.20.0`.

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
- Proposed owner: Intentloom project maintainer; approval, owner confirmation,
  and review date must be recorded in the release approval record.
