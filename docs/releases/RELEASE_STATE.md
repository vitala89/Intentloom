# Intentloom release state

This is the canonical capability and release-status snapshot for Intentloom.
It distinguishes code merged into `main` from artifacts published to npm.
Historical release audits and roadmap sections retain their original scope, but
this document is the source of truth for the current status.

Snapshot: 2026-07-26  
Main commit: `83941ab` (PR #86 merged)  
Workspace development version: `0.4.0-beta.1`  
Published npm package: `intentloom@0.4.0-beta.1` under `next`  
Default npm `latest`: `intentloom@0.1.0-alpha.3`

`Implemented in main` means the capability is present in the current source
tree. `Released version` means the first npm release that contains the
capability. `Experimental` identifies optional, incomplete, or explicitly
non-stable surfaces; it does not mean that the code is absent.

| Capability                                                                                                     | Implemented in main | Released version                                      | CLI available   | Daemon available                              | MCP available                     | Experimental              |
| -------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------- | --------------- | --------------------------------------------- | --------------------------------- | ------------------------- |
| Canonical catalog, profiles, adapters, init/adopt/plan/diff/sync/doctor                                        | Yes                 | `0.1.0-beta.1`                                        | Yes             | Partial (authenticated doctor)                | No                                | No                        |
| Project inspection, local Git timeline, provider export, release analysis                                      | Yes                 | `0.2.0-beta.1`                                        | Yes             | Partial (inspection/protocol consumers)       | Yes (inspection/release analysis) | No                        |
| Engineering conformance and managed-extension schemas/governance                                               | Yes                 | `0.3.0-beta.1`                                        | Yes             | Yes (conformance)                             | Yes (conformance)                 | No                        |
| Structured task/session summaries, skill lifecycle/evaluation, checkpoints, profiles, delegation               | Yes                 | `0.4.0-beta.1`                                        | Yes             | Partial (memory/session reads)                | No                                | No                        |
| Optional semantic ranking                                                                                      | Yes                 | `0.4.0-beta.1`                                        | Yes             | No                                            | No                                | Yes (optional provider)   |
| Persistent memory and security candidates M1–M4/S1–S5                                                          | Yes                 | `0.4.0-beta.1`                                        | Yes             | Partial (memory/security/session reads)       | No                                | No                        |
| Read-only UI state and Agent Workspace discuss/inspect/plan/review/apply modes                                 | Yes                 | `0.4.0-beta.1`                                        | Yes             | Partial (shared application/daemon contracts) | No                                | Yes (surface maturity)    |
| Neutron local workspace sync and autonomous-subagent orchestration engine                                      | Yes                 | `0.4.0-beta.1`                                        | Yes (`neutron`) | No                                            | No                                | Yes (runtime direction)   |
| Workflow variants, observed durations, conformance trends, repetition, transition intervals                    | Yes                 | Not released; merged into `main` after `0.4.0-beta.1` | No              | Yes                                           | No                                | No (accepted, unreleased) |
| Live provider connections, external MCP evidence ingestion, managed extension installation, HTTP MCP transport | No                  | —                                                     | No              | No                                            | No                                | Yes (future candidates)   |
| Full desktop application, model training, autonomous mutation, hosted services                                 | No                  | —                                                     | No              | No                                            | No                                | Yes (future candidates)   |

## What users receive from npm

```text
npm install intentloom@latest  ->  0.1.0-alpha.3
npm install intentloom@next    ->  0.4.0-beta.1
```

The `0.4.0-beta.1` npm artifact contains the capabilities listed as released
above. The process-intelligence summary operations in the last table row are in
`main` after that tag and require a later release before they are available from
npm. The root workspace and all lockstep workspace packages report
`0.4.0-beta.1` during development; this is not evidence that every current
`main` change is already published.

## Evidence

- npm registry: [`intentloom` package](https://www.npmjs.com/package/intentloom)
  reports `latest=0.1.0-alpha.3` and `next=0.4.0-beta.1`.
- GitHub release: [`v0.4.0-beta.1`](https://github.com/vitala89/Intentloom/releases/tag/v0.4.0-beta.1).
- Current merge: [PR #86](https://github.com/vitala89/Intentloom/pull/86), merged
  as `83941ab`.
- Version source: root `package.json`, synchronized by
  `scripts/sync-version.mjs`.

Roadmap and release-audit documents should link here when they describe current
status. They may retain historical candidate scope and exit criteria, but must
not describe an already released or merged capability as an unqualified future
candidate.
