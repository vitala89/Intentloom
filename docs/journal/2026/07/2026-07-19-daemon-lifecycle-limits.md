# Daemon lifecycle limits

**Date:** 2026-07-19

**Scope:** Platform Foundation Phase 4

## Change

Added explicit request and shutdown deadlines to the private local daemon. Shutdown
now stops accepting new work, allows an in-flight read-only doctor request to
finish within its bounded drain period, then destroys remaining sockets.

## Verification

Focused IPC tests cover idle request expiry, graceful draining, forced shutdown,
the occupied endpoint case, frame bounds, authentication, and protocol dispatch.

## Release classification

This is an internal alpha implementation detail with no public daemon-client flow.
It requires a Git commit and journal entry, but no CHANGELOG, release, publication,
push, or pull request.
