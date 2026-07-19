# Standalone `intentloomd` entrypoint

**Date:** 2026-07-19

**Scope:** Platform Foundation Phase 4

## Change

Added the private, bundled `intentloomd` executable. It starts only from explicit
local IPC and token-file inputs, dispatches the existing read-only doctor
operation, and exits cleanly on process termination signals.

## Security boundary

The entrypoint rejects non-private POSIX token files. The daemon accepts only an
absolute local IPC endpoint, one framed request per connection, the v1 doctor
method, and bounded input. Tests cover bad tokens, unsafe endpoints, oversized
messages, occupied endpoints, socket cleanup, and an end-to-end binary request.

## Release classification

This remains a private Platform Foundation implementation slice: no public
package, version, CHANGELOG entry, release, push, or pull request was created.
The user-visible daemon-client flow remains pending Phase 4 completion and Phase
5 authorization.
