# Platform Foundation readiness audit

**Date:** 2026-07-19

**Scope:** Platform Foundation Phase 6

## Verdict

PASS for the current alpha track at main commit
`db11c595ebf48c8a4708e785870ad167469507a0`.

The local formatting, typecheck, lint, build, full test suite, package dry-run,
and diff check passed. The test suite reported 38 files, 541 passing tests, and
3 platform-gated skips. The public `intentloom@0.1.0-alpha.3` tarball contains
only the declared CLI bundle, catalog, profiles, license, README, and package
metadata. The hosted compatibility matrix passed on Ubuntu, macOS, and Windows
with Node 22 and 24 both before and after merge to main.

The application boundary, versioned doctor protocol, local IPC lifecycle,
authentication, framing and connection limits, read-only behavior, and opt-in
CLI daemon contract are covered by the accepted ADRs and tests. No runtime
network client, automatic hook, dependency installation, or daemon lifecycle
management was introduced.

## npm dist-tag clarification

The npm registry currently maps the alpha release to both `next` and `latest`.
The repository owner authorized removal of `latest` and completed npm web
authentication. The registry then rejected the removal with `400` because a
package record must retain `latest`. This is an npm registry invariant, not an
authorization or package defect. The release policy now records the compatible
rule: publish prereleases under `next`; the first prerelease remains `latest`
until a verified stable release supersedes it; do not move `latest` for later
prereleases after stable exists.

## Follow-up

GitHub Actions reports a non-blocking Node 20 deprecation annotation for the
configured third-party actions, although the matrix passes. Handle action-major
version updates in a separate CI-maintenance change.

## Release classification

Documentation-only evidence record. No version, tag, package publication, or
registry state changes are included.
