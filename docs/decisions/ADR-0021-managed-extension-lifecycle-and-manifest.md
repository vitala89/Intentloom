# ADR-0021: Managed Extension Lifecycle and Manifest

- **Status**: Accepted
- **Date**: 2026-07-24
- **Authors**: Intentloom Maintainers

## Context

Projects integrated with Intentloom frequently leverage external extensions, including portable Agent Skills, local stdio/HTTP MCP servers, knowledge graph indexers (e.g., Graphify), and custom workflow policy packs.

Without a vendor-neutral governance model:

1. Third-party skills or MCP servers could execute unverified shell commands or make hidden network calls.
2. Dependencies could drift silently due to unpinned `latest` resolution.
3. Third-party licenses, copyrights, and attribution terms could be violated.
4. Core Intentloom architecture could become tightly coupled to specific third-party tools.

## Decision

Intentloom adopts a Managed Extension Lifecycle based on [EXTENSION_LIFECYCLE.md](file:///Users/eugenekasap/WebstormProjects/Intentloom/docs/concepts/EXTENSION_LIFECYCLE.md):

1. **Extension Manifest (`urn:aif:schema:extension-manifest:1`)**: Every external extension must declare a manifest defining its category, publisher, license, version bounds, required capabilities (filesystem access, process execution, network endpoints), and entry points.
2. **Extension Lockfile (`urn:aif:schema:extension-lock:1`)**: Resolved extensions are pinned in `.aif/extension-lock.json` with exact resolved versions, source URLs, artifact digests, and granted capability approvals.
3. **Pre-Adoption Inspection & Human Approval**: Extension adoption and update operations must perform dry-run pre-adoption inspection (license check, capability diff, compatibility verification) before requesting explicit human approval.
4. **Fail-Closed Transactional Installs**: Extension installation or updates must be executed within transactional rollback boundaries. Any integrity failure, capability expansion without approval, or license mismatch triggers immediate rollback.

## Consequences

### Positive

- Prevents silent supply-chain attacks, unapproved capability expansions, and hidden telemetry in external extensions.
- Provides reproducible, pinned extension environments via `.aif/extension-lock.json`.
- Keeps third-party integrations (such as Graphify, Chrome DevTools MCP, or custom skills) decoupled from canonical core code.

### Negative

- Requires maintaining versioned JSON schemas for extension manifests and lockfiles.
- Unapproved third-party extensions without manifests must be inspected before adoption.
