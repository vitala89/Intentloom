# Daemon read-only evidence

**Date:** 2026-07-19

**Scope:** Platform Foundation Phase 4

## Change

Added daemon-transport tests that execute the application doctor operation against
initialized, malformed, and symlink-sensitive projects. Each test snapshots project
state before and after the authenticated request and confirms it is unchanged.

Added a Windows-only named-pipe lifecycle test to the shared daemon suite. It will
run in the existing Windows compatibility matrix and is intentionally skipped on
non-Windows hosts.

## Release classification

This is private verification infrastructure. It needs a Git commit and journal
entry, but no user-facing CHANGELOG entry or release. Windows CI evidence remains
an explicit Platform Foundation blocker; no phase transition occurred.
