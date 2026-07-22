# Changelog

All notable changes are documented here. This project follows Keep a Changelog principles and will version released framework artifacts independently where required.

## [Unreleased]

## [0.1.0-beta.1] - 2026-07-23

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

### Notes

- Compatibility-freeze candidate: no intentional runtime, schema, lockfile, or
  generated-output contract changes; existing `.aif` and `urn:aif:*`
  identifiers remain unchanged.
- Tagging and publication require separate maintainer authorization and the
  publication checklist; this release record does not publish a package.

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
- Added normalized Claude Code, Codex, Cursor, and Copilot adapter contracts,
  real-catalog fixtures, deterministic multi-adapter merging, profile-scoped
  rules, and installed-tarball coverage.
- Added host-independent stored-path normalization and Windows path/collision
  fixtures.
- Added a Linux/macOS/Windows compatibility workflow for Node 22 and Node 24.
- Added final alpha package metadata for the public `aif-core` CLI, deterministic
  tarball checks, clean-room npm/pnpm installation coverage, and publish dry-run
  validation without publication.
- Added an npm publication-authorization checklist, trusted-publishing guardrails,
  and incident handling requirements; real publication remains blocked pending
  ownership and naming/trademark review.
- Added positional explicit-project-path support for `adopt`, `doctor`, `diff`,
  and `sync`, with a no-write regression test. The final Applye packed-CLI audit
  passed its writer, baseline-stability, determinism, and immutability checks.

### Fixed

- Fixed packaged CLI module resolution by shipping a self-contained bundled executable and runtime catalog.
- Verified packed CLI `--help` and `--version` outside the monorepo.
- Fixed adapter output dependence on selection order and duplicate shared
  destinations.
- Fixed stored-path handling for Windows separators, unsafe device names,
  Unicode/case collisions, and noncanonical traversal spellings.

### Changed

- Set the unreleased lockstep development baseline to `0.1.0-alpha.0`; `0.1.0` was an untagged bootstrap placeholder.
- Selected `aif-core` as the planned public package and retained `@aif/*`
  workspace libraries as private implementation details.
- `aif sync` now consumes the structured transaction result directly.
- Added distinct CLI exit codes for conflicts, restored transaction failures, and incomplete rollback.
- Sync output now reports consistency validation and rollback status explicitly.
- `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor` now use the shared schema-validation layer before semantic validation.
- Manifest locks now pin selected profiles, schema families, adapter versions, canonical source hashes, and generated-output hashes.
- Existing project documentation is mapped where possible instead of duplicated.
- Profile detection now reports deterministic file evidence and ambiguity explicitly.
- Set Node.js 22 as the documented and directly verified minimum across every
  workspace package and the packed CLI bundle target.

### Compatibility

- Claude Code, Codex, Cursor, and Copilot outputs are covered by direct,
  multi-adapter, profile snapshot, doctor, and packed CLI fixtures on hosted
  Linux, macOS, and Windows Node 22/24.

### Security

- Prevented sync from overwriting destinations without a verified source-map ownership record.
- Report manually modified generated files as conflicts and roll back newly created files after a recoverable write failure.
- Finalize manifest and source-map writes after generated destinations and roll back all created outputs after metadata-stage failure.
- Added resolved-path checks for existing destination parents and portable normalized collision analysis before writes.
- Added real-filesystem coverage for broken destination, parent-directory, nested adapter, and metadata symlink escapes.
- Defined deterministic collision normalization for separators, dot segments, Unicode NFC, and case-only path differences.
- Added direct manifest/source-map symlink rejection and commit-time destination revalidation against symlink substitution.
- Added explicit real-filesystem symlink-loop coverage and deterministic, provenance-complete collision reporting independent of input order.
- Added end-to-end collision-abort invariants proving generated, metadata, staging, and backup state remains byte-for-byte unchanged.
- Added structured transaction-stage results and independent rollback coverage for generated, manifest, source-map, consistency, and cleanup stages.
- Added explicit incomplete-rollback detection that preserves the original failed stage and reports all project-relative rollback failure paths.
- Added independently identifiable post-write corruption validation across generated files, manifest, and source map.
- Added full rollback for malformed, incomplete, unsafe, duplicated, or incompatible ownership metadata.
- Prevented sync transaction success when actual committed state differs from the planned transaction state.
- Prevented CLI output from presenting incomplete rollback as restored project state.
- Added safe, project-relative sync diagnostics without private generated-file contents.
- Added safe JSON/YAML parsing with duplicate-key, unsafe-tag, size, depth, BOM, Unicode, and alias protections.
- Prevented commands from writing when project metadata fails structural validation and prevented schema diagnostics from exposing private artifact contents.
- Proved that adoption dry-run and doctor never modify project files.
- Prevented adoption from inferring ownership from paths, headers, filenames, equivalent sources, or matching content.
- Added bounded project scanning that excludes heavy, binary, ignored, and external symlinked directories.

### Migration

- No migration is required for this prerelease.

## [0.1.0] - 2026-07-13

### Added

- Initial documentation-only architecture for AIF.
- Canonical-core, portable-skills, and non-destructive-adoption decisions.
- v0.1 scope, compatibility policy, threat model, and delivery roadmap.
