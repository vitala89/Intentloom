# v0.5 Candidate Release Readiness Audit

Audit date: 2026-07-27. Scope: the Engineering Process Intelligence increment
merged in `main` at `83941ab` and carried into the release-state merge commit
`f546b76`.

## Executive summary

The v0.5 candidate implementation scope is present in `main` and covered by
accepted ADRs, versioned protocol contracts, pure application analysis, and
authenticated local daemon handlers. It is not yet a release: workspace
packages still report `0.4.0-beta.1`, npm `next` still points to `0.4.0-beta.1`,
and no v0.5 tag or npm publication is authorized.

This audit is therefore a readiness baseline, not a release approval.

## Candidate scope

| Capability                    | Contract and implementation evidence                                                           | CLI | Daemon | MCP | Boundary                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | --- | ------ | --- | ------------------------------------------ |
| Workflow variant summary      | ADR-0037, `WORKFLOW_VARIANT_SUMMARY_V0_1_SPEC.md`, `summarizeWorkflowVariants`                 | No  | Yes    | No  | Deterministic sequence counts only         |
| Observed duration metrics     | ADR-0038, `WORKFLOW_DURATION_METRICS_V0_1_SPEC.md`, `summarizeWorkflowDurations`               | No  | Yes    | No  | Elapsed case duration only                 |
| Conformance trend summary     | ADR-0039, `CONFORMANCE_TREND_SUMMARY_V0_1_SPEC.md`, `summarizeConformanceTrend`                | No  | Yes    | No  | Caller-supplied reports only               |
| Workflow repetition summary   | ADR-0040, `WORKFLOW_REPETITION_SUMMARY_V0_1_SPEC.md`, `summarizeWorkflowRepetitions`           | No  | Yes    | No  | Repetition is not labelled rework or retry |
| Observed transition intervals | ADR-0041, `WORKFLOW_TRANSITION_INTERVALS_V0_1_SPEC.md`, `summarizeWorkflowTransitionIntervals` | No  | Yes    | No  | Adjacent timestamp intervals only          |

All five operations remain local, read-only, deterministic, project-scoped,
and provider-neutral. They do not infer waiting time, rework, bottlenecks,
productivity, quality, causality, actor performance, remote evidence,
persistence, or model judgments.

## Verification matrix

| Gate                                       | Status  | Evidence or remaining action                                                                                                                                              |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR and specification coverage             | PASS    | ADR-0037 through ADR-0041 and matching v0.1 specifications are merged                                                                                                     |
| Protocol/application/daemon implementation | PASS    | Canonical protocol methods, pure analysis operations, application bridges, and authenticated daemon routing are in `main`                                                 |
| Deterministic tests                        | PASS    | Process-intelligence focused tests and the merged baseline full suite passed before the release-state documentation work; PR #87 CI also passed all 12 compatibility jobs |
| Workspace version synchronization          | PENDING | Run `scripts/sync-version.mjs` for `0.5.0-beta.1` only after the release decision is approved                                                                             |
| Release changelog and release-state update | PENDING | Add the v0.5 section and change the main/npm boundary only after version preparation                                                                                      |
| Build, pack, and dry-run publication       | PENDING | Run `pnpm build`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag next --access public` from `packages/cli`                                                 |
| Git tag and npm publication                | BLOCKED | Requires explicit maintainer authorization, npm ownership/permissions, and a successful readiness review                                                                  |

## Release blockers and non-goals

- The current published artifact remains `intentloom@0.4.0-beta.1` under
  `next`; npm `latest` remains `0.1.0-alpha.3`.
- A v0.5 release must not silently add CLI or MCP claims for operations that
  currently expose only protocol, application, and daemon surfaces.
- Waiting-time semantics, rework classification, bottleneck inference, causal
  analysis, live providers, external MCP ingestion, persistence, and model
  interpretation remain outside this candidate.
- No version bump, tag, npm publication, dist-tag change, or trusted-publishing
  configuration is performed by this audit.

## Verdict

**Implementation baseline ready for release review; publication not yet
authorized.** The next action is to review this audit, decide whether the
five bounded operations are the intended v0.5 scope, then prepare the version
and release artifacts under the publishing checklist.
