# External Extension Lifecycle

## Status

This document defines a future, vendor-neutral lifecycle for optional external
extensions such as Agent Skills, MCP servers, knowledge providers, adapters, and
other tool integrations. It is roadmap direction, not a claim that an extension
runtime or marketplace exists today.

## Purpose

Intentloom should be able to integrate useful external tools without absorbing
their implementation into the canonical core, creating hidden supply-chain
risk, or making a project dependent on an unreviewed moving target.

An external integration should remain optional, replaceable, attributable, and
revocable. A tool such as Graphify may later be supported through a provider or
adapter, but Intentloom must not imply ownership of that tool, redistribute it
without permission, or bypass its license and usage terms.

## Extension categories

The lifecycle may cover:

- portable Agent Skills;
- local MCP servers and bounded MCP clients;
- knowledge and code-graph providers;
- generated host adapters;
- policy, workflow, and profile packs;
- desktop or daemon integrations over the shared application-operation boundary.

These categories may have different installation and execution mechanisms, but
they should share one metadata, trust, compatibility, and update model.

## Required manifest metadata

Every managed external extension should declare at least:

- stable identifier and extension type;
- publisher and source repository or registry;
- exact installed version and supported version range;
- Intentloom API and schema compatibility range;
- runtime and platform requirements;
- requested capabilities, file access, process execution, and network access;
- license identifier, license location, and required attribution or notices;
- package digest or other integrity metadata where the source supports it;
- configuration schema and migration metadata;
- update channel and update policy;
- whether the extension is bundled, downloaded, externally installed, or only referenced.

Unknown, missing, or conflicting metadata must reduce trust and may block a
managed installation or update.

## Legal and attribution boundary

Intentloom may integrate an external project only through permissions granted by
its applicable license, terms, and distribution model.

The integration process must:

1. identify the exact artifact and version being used;
2. record its license and source;
3. preserve copyright, attribution, and notice requirements;
4. distinguish invoking or referencing an external installation from bundling or redistributing it;
5. avoid copying source code, names, logos, or documentation beyond what the license permits;
6. require a separate review before bundling, modifying, or redistributing third-party code;
7. surface incompatible, unknown, source-available, non-commercial, or otherwise restrictive terms before adoption;
8. avoid presenting legal metadata as legal advice or as a guarantee that every use is permitted.

A permissive license can make integration practical, but it does not remove the
need to review trademark rules, notices, transitive dependencies, hosted-service
terms, or later license changes.

## Installation and trust model

Intentloom must not silently install system packages, language runtimes, hooks,
or external binaries.

A future managed installation flow should use:

```text
resolve source and metadata
→ inspect license, publisher, capabilities, and compatibility
→ show exact artifact, version, commands, files, and network effects
→ explicit approval
→ install through the declared package manager or reference an existing install
→ verify integrity and capability boundaries
→ record the resolved state in the project lock
→ run health and compatibility checks
```

Local, read-only, least-privilege integrations should be introduced before
networked or mutating integrations.

## Pinning and lock state

Managed extensions should be reproducible. The project lock should record:

- requested version range;
- exact resolved version;
- source and artifact identity;
- integrity digest when available;
- manifest and compatibility-schema versions;
- granted capabilities;
- license and notice snapshot identifiers;
- configuration digest;
- last successful health check;
- pending migration or incompatibility state.

Generated output must not depend on an unpinned latest version.

## Discovery and updates

Update discovery and update application are separate operations.

Intentloom may check for updates only when the user has enabled a declared
network-capable source. Update discovery should report:

- current and available versions;
- release channel;
- compatibility with the installed Intentloom version and project state;
- capability, permission, license, publisher, source, and integrity changes;
- configuration or data migrations;
- relevant release notes and known breaking changes when available.

An available update must never be treated as approved.

## Safe update transaction

A managed extension update should follow:

```text
resolve candidate
→ validate source, integrity, license, compatibility, and capability delta
→ prepare migration and exact state diff
→ show rollback boundary
→ explicit human approval
→ install or switch the candidate in isolation
→ run contract, health, and project checks
→ commit lock and configuration state
→ retain or remove rollback material according to policy
```

The update must fail closed when the source changes unexpectedly, integrity
cannot be verified, the license becomes incompatible, required capabilities
expand without approval, migration is unavailable, or compatibility checks fail.

No extension may update itself through Intentloom without the same reviewed
transaction boundary.

## Rollback and recovery

The lifecycle must define whether an extension is stateless, stores project-local
state, or owns an external data store.

Rollback should restore the previous executable reference, lock state, generated
configuration, and compatible project-local data when the extension contract
supports it. Irreversible migrations must be reported before approval and must
not be described as safely rollbackable.

Intentloom should preserve the original failure, rollback result, and any state
that requires manual recovery.

## Compatibility contracts

A future extension API should be versioned independently from the Intentloom CLI.
Compatibility checks may include:

- manifest and schema versions;
- declared Intentloom API range;
- MCP protocol and tool-schema versions;
- operating system, architecture, runtime, and package-manager requirements;
- capability availability;
- configuration migration path;
- deterministic contract fixtures;
- provider-specific conformance tests.

Unsupported extensions may remain externally usable, but Intentloom must not
claim that they are managed, compatible, or safe.

## Revocation and removal

Users must be able to disable and remove an extension without losing ownership
of their project.

Removal should preview:

- processes and registrations to stop;
- generated files and configuration entries to remove;
- project-owned files that will remain untouched;
- retained caches, evidence, credentials, and extension-owned data;
- notice or audit records that must remain;
- whether a reversible cleanup is possible.

Compromised publishers, revoked artifacts, or known malicious versions require a
security advisory path that can block new adoption and clearly warn existing
installations. Automatic destructive removal is not allowed.

## Graphify as an example, not a core dependency

A future Graphify integration should use the same vendor-neutral provider
boundary as other knowledge-graph tools.

The preferred shape is:

```text
Intentloom application operations
→ knowledge-provider contract
→ optional Graphify CLI or MCP adapter
→ externally installed Graphify artifact
```

Intentloom should pin and verify the resolved Graphify version, record its
license and source, request only necessary capabilities, and keep Graphify
replaceable. Bundling or redistributing Graphify requires a separate legal,
security, packaging, and maintenance decision.

## Non-goals

This direction does not imply:

- an extension marketplace in the current release;
- automatic installation or automatic updates;
- trust based only on popularity or a permissive license label;
- arbitrary plugin code inside the canonical core process;
- a guarantee that third-party tools remain available or compatible;
- redistribution rights without a specific review;
- legal certification of an extension.
