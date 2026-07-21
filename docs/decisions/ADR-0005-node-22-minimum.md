# ADR-0005: Node.js 22 minimum runtime

## Status

Accepted

## Context

The provisional packages declared Node.js 24 or newer, but the production code,
build output, and direct dependencies did not require a Node-24-only API. That
declaration excluded an active LTS line without providing a compatibility or
security benefit. Package declarations also differed because only the root and
CLI packages specified an engine.

## Decision

Intentloom requires Node.js 22 or newer. Every workspace package declares the same
minimum, and the packed CLI is bundled for the Node 22 target. Compatibility CI
runs the complete suite and packed-CLI smoke tests on Node 22 and Node 24 across
Linux, macOS, and Windows.

Stored project paths are runtime-independent, normalized, project-relative
forward-slash paths. Host-native conversion occurs only at filesystem access
boundaries.

## Consequences

Node 22 is the directly verified minimum. Node 24 remains a tested supported
runtime rather than an artificial minimum. Runtimes older than Node 22 are
unsupported and package managers may reject installation based on `engines`.
Changes that require a newer Node API must update all package declarations,
the bundle target, CI, compatibility documentation, and this decision through
a superseding ADR.
