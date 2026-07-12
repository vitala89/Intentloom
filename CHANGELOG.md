# Changelog

All notable changes are documented here. This project follows Keep a Changelog principles and will version released framework artifacts independently where required.

## [Unreleased]

### Added

- Canonical policies, workflows, templates, portable Agent Skills, schemas, profiles, adapters, validator, and local CLI implementation are present in the repository.
- Documentation guides, examples, and initial integration-style tests.

### Fixed

- Fixed packaged CLI module resolution by shipping a self-contained bundled executable and runtime catalog.
- Verified packed CLI `--help` and `--version` outside the monorepo.

### Changed

- Set the unreleased lockstep development baseline to `0.1.0-alpha.0`; `0.1.0` was an untagged bootstrap placeholder.
- Defined provisional `@aif/*` package metadata; npm name availability remains unverified and publishing remains blocked.

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

### Migration

- No published migration is available; release readiness is currently blocked.

## [0.1.0] - 2026-07-13

### Added

- Initial documentation-only architecture for AIF.
- Canonical-core, portable-skills, and non-destructive-adoption decisions.
- v0.1 scope, compatibility policy, threat model, and delivery roadmap.
