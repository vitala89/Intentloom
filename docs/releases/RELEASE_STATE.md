# Intentloom release state

This is the canonical capability and release-status snapshot for Intentloom.
It distinguishes code merged into `main` from artifacts published to npm.
Historical release audits and roadmap sections retain their original scope, but
this document is the source of truth for the current status.

Snapshot: 2026-07-29
Main commit: `b8f1e31` (PR #106 merged)
Release commit: `a0e0b13` (tagged `v0.5.0-beta.1`)
Workspace version: `0.5.0-beta.1`
Git tag: `v0.5.0-beta.1` (pushed)
Published npm package: `intentloom@0.5.0-beta.1` under `next`
Default npm `latest`: `intentloom@0.1.0-alpha.3`

`Implemented in main` means the capability is present in the current source
tree. `Released version` means the first npm release that contains the
capability. `Experimental` identifies optional, incomplete, or explicitly
non-stable surfaces; it does not mean that the code is absent.

| Capability                                                                                                     | Implemented in main | Released version | CLI available   | Daemon available                              | MCP available                     | Experimental            |
| -------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- | --------------- | --------------------------------------------- | --------------------------------- | ----------------------- |
| Canonical catalog, profiles, adapters, init/adopt/plan/diff/sync/doctor                                        | Yes                 | `0.1.0-beta.1`   | Yes             | Partial (authenticated doctor)                | No                                | No                      |
| Project inspection, local Git timeline, provider export, release analysis                                      | Yes                 | `0.2.0-beta.1`   | Yes             | Partial (inspection/protocol consumers)       | Yes (inspection/release analysis) | No                      |
| Engineering conformance and managed-extension schemas/governance                                               | Yes                 | `0.3.0-beta.1`   | Yes             | Yes (conformance)                             | Yes (conformance)                 | No                      |
| Structured task/session summaries, skill lifecycle/evaluation, checkpoints, profiles, delegation               | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/session reads)                | No                                | No                      |
| Optional semantic ranking                                                                                      | Yes                 | `0.4.0-beta.1`   | Yes             | No                                            | No                                | Yes (optional provider) |
| Persistent memory and security candidates M1–M4/S1–S5                                                          | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (memory/security/session reads)       | No                                | No                      |
| Read-only UI state and Agent Workspace discuss/inspect/plan/review/apply modes                                 | Yes                 | `0.4.0-beta.1`   | Yes             | Partial (shared application/daemon contracts) | No                                | Yes (surface maturity)  |
| Neutron local workspace sync and autonomous-subagent orchestration engine                                      | Yes                 | `0.4.0-beta.1`   | Yes (`neutron`) | No                                            | No                                | Yes (runtime direction) |
| Workflow variants, observed durations, conformance trends, repetition, transition intervals                    | Yes                 | `0.5.0-beta.1`   | No              | Yes                                           | No                                | No                      |
| Live provider connections, external MCP evidence ingestion, managed extension installation, HTTP MCP transport | No                  | —                | No              | No                                            | No                                | Yes (future candidates) |
| Full desktop application, model training, autonomous mutation, hosted services                                 | No                  | —                | No              | No                                            | No                                | Yes (future candidates) |

## What users receive from npm

```text
npm install intentloom@latest  ->  0.1.0-alpha.3
npm install intentloom@next    ->  0.5.0-beta.1
```

The `0.5.0-beta.1` npm artifact contains the process-intelligence capabilities
listed in the last table row. `latest` intentionally remains the historical
`0.1.0-alpha.3`; prerelease consumers should use `next` explicitly.

## Evidence

- npm registry: [`intentloom` package](https://www.npmjs.com/package/intentloom)
  reports `latest=0.1.0-alpha.3` and `next=0.5.0-beta.1`; published tarball
  shasum is `58b2e27eb66789f57c1e91cec46aea710a6fc241`.
- GitHub release: [`v0.4.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.4.0-beta.1).
- Current `main`: [PR #106](https://github.com/vitala89/Intentloom/pull/106),
  merged as `b8f1e31`; the preceding dependency-review control is in
  [PR #105](https://github.com/vitala89/Intentloom/pull/105), merged as
  `86a1aee`.
- Release tag: [`v0.5.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.5.0-beta.1)
  points to the verified release commit `a0e0b13`.
- Version source: root `package.json`, synchronized by
  `scripts/sync-version.mjs`.

Roadmap and release-audit documents should link here when they describe current
status. They may retain historical candidate scope and exit criteria, but must
not describe an already released or merged capability as an unqualified future
candidate.
