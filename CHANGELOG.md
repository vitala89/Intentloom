# Changelog

All notable changes are documented here. This project follows Keep a Changelog principles and will version released framework artifacts independently where required.

## [Unreleased]

### Added

- Documented a future Engineering Process Intelligence direction based on local workflow evidence, deterministic conformance checking, workflow variants, and bottleneck analysis.
- Added explicit privacy, provenance, scope, delivery-order, and non-goal boundaries so the direction does not imply a general enterprise process-mining platform or v0.1 implementation commitment.
- Added a staged post-v0.1 plan for explicit project connection, read-only inspection, local Git evidence, GitHub and GitLab export adapters, timeline analysis, and later live provider access.
- Documented a local-first Intentloom MCP Server direction with typed tools and resources over the existing application boundary, plus a later external MCP Client evidence path.
- Defined planned MCP safety boundaries: no generic shell or CLI execution, read-only `stdio` first, external results treated as untrusted evidence, and prepare-preview-approve-revalidate requirements before any mutation.
- Added the private Platform Foundation: a reusable application-operation
  boundary, versioned doctor protocol, local-IPC `intentloomd`, and an explicit
  doctor-only daemon client with a token-file boundary.
- Added a dogfooding evidence template for the minimal, TypeScript, and
  sanitized existing-project scenarios required before beta.
- Added sanitized records for a minimal multi-adapter installation and read-only
  TypeScript and Angular + Tauri adoption scenarios.
- Recorded the reviewed, applied TypeScript adoption transaction and its
  healthy, idempotent post-write verification.
- Added explicit, persisted adoption mappings for project-owned generated
  destinations and authoritative existing documentation.
- Recorded the reviewed, applied Angular + Tauri adoption transaction and its
  healthy, idempotent post-write verification.

### Fixed

- Prevented `doctor` from reporting owned, current multi-adapter instruction
  roots as a project-owned instruction conflict.
- Prevented `doctor` from validating project-owned provider skills as
  Intentloom-generated Agent Skills.

### Changed

- Aligned architecture, roadmap, versioning, contribution, and release-process
  documentation with the implemented alpha repository and repeatable delivery
  workflow.
- Recorded that alpha.4 documentation/release-hygiene and alpha.5
  fixture/adapter-compatibility gates are met in unreleased `main`; no version
  or publication is implied.
- Aligned prerelease dist-tag policy with the npm requirement that an initial
  package record retains `latest` until a stable release supersedes it.
- Extended the future architecture and threat model for explicit project roots,
  access capabilities, evidence provenance, provider credentials, MCP trust,
  cross-project isolation, and replay-safe approved plans.

### Security

- Restricted the private daemon surface to authenticated, bounded local IPC and
  preserved read-only doctor semantics across direct and daemon CLI modes.
- Established future invariants for bounded local Git commands, least-privilege
  provider access, root-bound MCP capabilities, credential exclusion, and
  transactional approval for any MCP-triggered write.

## [0.1.0-alpha.3]

### Changed

- Publish canonical GitHub repository, homepage, and issue tracker metadata.
- Include the expanded public project README and actionable private security
  reporting policy.
- Include the cross-platform Windows adoption-path test fix and compatibility
  verification across Ubuntu, macOS, and Windows on Node.js 22 and 24.

### Notes

- No intentional runtime or schema changes; existing `.aif` and `urn:aif:*`
  compatibility identifiers remain unchanged.
- This remains an alpha release.

## [0.1.0-alpha.2] - 2026-07-15

### Changed

- Renamed AIF to Intentloom before the first public npm publication. The planned
  public package is now `intentloom` and its CLI command is `intentloom`.
- Renamed private workspace implementation packages from `@aif/*` to
  `@intentloom/*` and updated generated adapter-facing names.
- Retained `.aif`, `urn:aif:*`, ownership labels, and schema identifiers as
  compatibility-sensitive v0.1 persisted protocol values.

### Historical note

- `0.1.0-alpha.1` remains an unpublished AIF technical release-readiness
  milestone. Its `v0.1.0-alpha.1` tag is unchanged.

## [0.1.0-alpha.1] - 2026-07-15

### Added

- Canonical policies, workflows, templates, portable Agent Skills, schemas, profiles, adapters, validator, and local CLI implementation are present in the repository.
- Documentation guides, examples, and initial integration-style tests.
- Added versioned JSON Schemas for AIF configuration, ownership metadata, feature briefs, context packs, change requests, technical-debt entries, and Agent Skill metadata.
- Added reusable structural validation with stable machine-readable diagnostics and an additional AIF Agent Skill policy layer.
- Added deterministic adoption proposals for existing repositories.
- Added expanded doctor diagnostics for partial, stale, conflicting, and corrupted AIF installations.
- Added reusable adoption and doctor fixture matrices, including packed-runtime coverage.
