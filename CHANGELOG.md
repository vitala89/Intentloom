# Changelog

All notable changes are documented here. This project follows Keep a Changelog principles and will version released framework artifacts independently where required.

## [Unreleased]

### Added

- Canonical policies, workflows, templates, portable Agent Skills, schemas, profiles, adapters, validator, and local CLI implementation are present in the repository.
- Documentation guides, examples, and initial integration-style tests.
- Added versioned JSON Schemas for AIF configuration, ownership metadata, feature briefs, context packs, change requests, technical-debt entries, and Agent Skill metadata.
- Added reusable structural validation with stable machine-readable diagnostics and an additional AIF Agent Skill policy layer.
- Added deterministic adoption proposals for existing repositories.
- Added expanded doctor diagnostics for partial, stale, conflicting, and corrupted AIF installations.
- Added reusable adoption and doctor fixture matrices, including packed-runtime coverage.

### Fixed

- Fixed packaged CLI module resolution by shipping a self-contained bundled executable and runtime catalog.
- Verified packed CLI `--help` and `--version` outside the monorepo.

### Changed

- Set the unreleased lockstep development baseline to `0.1.0-alpha.0`; `0.1.0` was an untagged bootstrap placeholder.
- Defined provisional `@aif/*` package metadata; npm name availability remains unverified and publishing remains blocked.
- `aif sync` now consumes the structured transaction result directly.
- Added distinct CLI exit codes for conflicts, restored transaction failures, and incomplete rollback.
- Sync output now reports consistency validation and rollback status explicitly.
- `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor` now use the shared schema-validation layer before semantic validation.
- Manifest locks now pin selected profiles, schema families, adapter versions, canonical source hashes, and generated-output hashes.
- Existing project documentation is mapped where possible instead of duplicated.
- Profile detection now reports deterministic file evidence and ambiguity explicitly.

### Compatibility

- Claude Code, Codex, Cursor, and Copilot outputs are unit-layout tested; clean CLI fixture verification remains a release blocker.

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

- No published migration is available; release readiness is currently blocked.

## [0.1.0] - 2026-07-13

### Added

- Initial documentation-only architecture for AIF.
- Canonical-core, portable-skills, and non-destructive-adoption decisions.
- v0.1 scope, compatibility policy, threat model, and delivery roadmap.
