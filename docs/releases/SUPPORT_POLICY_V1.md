# Intentloom v1.0 Support Policy

Status: Approved by maintainer on 2026-07-30 for `v1.0.0` release baseline.

Date: 2026-07-30.

## Scope

This policy defines the support boundary for the first stable
Intentloom release. It applies to the local platform contract and documented
client surfaces; it does not create a hosted service, telemetry requirement,
or support SLA.

## Supported contract

- The documented `intentloom` CLI commands and flags follow the SemVer and
  deprecation rules in [ADR-0043](../decisions/ADR-0043-v1-stable-compatibility-contract-and-deprecation-policy.md).
- The versioned local daemon protocol `v1` supports the capability-discovery,
  Inspect, Doctor, Diff, and Timeline methods defined by the protocol contract.
- `.aif/` configuration and metadata migrations are non-destructive and must
  preserve project-owned files, subject to the migration evidence in
  [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md).
- Node.js 22 is the supported minimum. Node.js 24 is part of the verified
  compatibility matrix.
- The supported host matrix is macOS, Linux, and Windows as recorded in the
  [compatibility matrix](../compatibility/COMPATIBILITY_MATRIX.md). A release
  record must identify the exact CI run used for the candidate release.

## Client and provider boundaries

CLI, TUI, MCP stdio, and Desktop are clients over shared application and
protocol operations. A client-specific presentation defect does not change the
canonical domain contract. Provider-specific formats remain governed by the
compatibility matrix; undocumented or private provider behavior is unsupported.

The following remain experimental or future capabilities and are not part of
the stable support promise unless separately approved:

- live provider connections and external MCP evidence ingestion;
- managed extension installation and hosted services;
- model training, autonomous mutation, and unrestricted shell access;
- optional semantic ranking, Neutron runtime direction, and Workspace mutation
  surfaces beyond their documented read-only contracts.

## Deprecation and security handling

- A deprecated CLI flag, command, or protocol capability remains supported for
  at least two minor releases and receives an explicit warning and migration
  note before removal.
- Security reports follow the repository [security policy](../../SECURITY.md).
  Maintainers assess the report, document affected versions and mitigations,
  and use a patch release or an explicit advisory when remediation is ready.
- This project makes no response-time or availability promise unless a future
  maintainer decision records one explicitly.
- Rollback and recovery procedures must remain documented before a release that
  changes `.aif/` schemas or public protocol behavior.

## Release-state separation

Merged code, release tags, and npm artifacts are separate evidence boundaries.
The v1.0 support promise is active for approved release candidate `65f3886`.

Current pre-release artifacts and their provenance are recorded in
[RELEASE_STATE.md](RELEASE_STATE.md).

## Approval record

- Maintainer: Vitalii (vitala89)
- Approved commit: `65f3886`
- Approval date: 2026-07-30
- Release/tag authorization: Approved for `v1.0.0`
