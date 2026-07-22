# ADR-0011: Project inspection access contract

## Status

Proposed

## Context

`0.1.0-beta.1` establishes reusable project operations, explicit roots, and
read-only `doctor` behavior. The next milestone needs a useful inspection view
of one selected project without turning the CLI, daemon, or a future MCP adapter
into a general filesystem or process gateway.

The project-connection direction requires a stable `inspectProject` operation,
bounded evidence, deterministic output, and byte-for-byte read-only behavior.
It also reserves future capabilities such as local Git evidence and metadata
writes without granting them implicitly.

## Decision

Add a private `inspectProject` operation to `@intentloom/application` in
incremental, separately reviewed slices. The first slice accepts one explicit
project root and has only the fixed capability `project.files.read`.

The operation may inspect only a documented, bounded set of project-relative
paths. It must reject root escapes and symlink traversal, skip dependencies,
build output, caches, vendor trees, and ignored secret-like paths, and never
execute scripts, invoke package managers, start processes, access Git, or use
the network. Its result is deterministic for identical project state and
options, contains only normalized project-relative paths, and distinguishes
observed facts from recommendations.

The initial output reports profile detection, supported adapters, recognized
instruction and Intentloom metadata paths, bounded scan exclusions, adoption
readiness, and machine-readable findings. It does not persist an access grant
or introduce `.aif/access.yaml`; persistence, local Git evidence, provider
access, and MCP transport each require separate decisions.

The CLI is a presentation adapter over this operation. Future daemon and MCP
adapters must call the same operation and may not expand its read scope.

## Consequences

The first implementation deliberately provides inspection rather than a
connection session. A normal process retains the operating-system permissions
of its user; the contract is an application-level boundary, not an OS sandbox.

Tests must cover deterministic output, absent and initialized projects,
excluded paths, root escape and symlink rejection, and byte-for-byte unchanged
project snapshots. Adding a read scope, result field with compatibility impact,
or any capability beyond `project.files.read` requires an explicit follow-up
decision and fixtures.
