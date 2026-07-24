# Managed Extension Lifecycle Specification (v0.3 Candidate)

- **Status**: Draft / Candidate
- **Version**: 0.3.0
- **Concept source**: [docs/concepts/EXTENSION_LIFECYCLE.md](../concepts/EXTENSION_LIFECYCLE.md)
- **Governing ADR**: [ADR-0021](../decisions/ADR-0021-managed-extension-lifecycle-and-manifest.md)
- **Target Schemas**: `urn:aif:schema:extension-manifest:1` & `urn:aif:schema:extension-lock:1`

---

## 1. Overview

This specification establishes the vendor-neutral governance, discovery,
inspection, resolution, and locking model for external Intentloom extensions.

External integrations remain optional, replaceable, attributable, and revocable.
Intentloom must not imply ownership of external tools, redistribute them without
permission, or bypass their license and usage terms.

---

## 2. Extension Categories

The lifecycle covers:

| Category             | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `skill`              | Portable Agent Skills — instructions and helper scripts.                       |
| `mcp-server`         | Local `stdio` or HTTP Model Context Protocol servers.                          |
| `knowledge-provider` | External code-graph or index providers (e.g., Graphify).                       |
| `adapter-pack`       | Custom or third-party IDE/agent target adapters.                               |
| `policy-pack`        | Pre-packaged engineering workflow policy rulesets.                             |
| `daemon-integration` | Desktop or daemon integrations over the shared application-operation boundary. |

Different categories may use different installation and execution mechanisms but
share one metadata, trust, compatibility, and update model.

---

## 3. Extension Manifest Schema (`urn:aif:schema:extension-manifest:1`)

Every managed extension must provide an `extension-manifest.json` file in its
root. Unknown, missing, or conflicting metadata must reduce trust and may block
managed installation or update.

```json
{
  "$schema": "urn:aif:schema:extension-manifest:1",
  "extensionId": "ext:org/graphify-provider",
  "name": "Graphify Code-Graph Provider",
  "category": "knowledge-provider",
  "version": "1.2.0",
  "publisher": {
    "name": "Intentloom Ecosystem",
    "url": "https://github.com/vitala89/Intentloom"
  },
  "source": {
    "registry": "npm",
    "package": "@intentloom/graphify-provider"
  },
  "compatibility": {
    "intentloomCore": "^0.2.0 || ^0.3.0",
    "node": ">=20.0.0",
    "os": ["darwin", "linux", "win32"],
    "arch": ["x64", "arm64"]
  },
  "license": {
    "spdxId": "MIT",
    "licenseFile": "LICENSE",
    "noticeRequired": true,
    "noticeFile": "NOTICE"
  },
  "capabilities": {
    "filesystem": {
      "read": ["./", ".aif/"],
      "write": [".aif/cache/"]
    },
    "process": {
      "exec": ["python3", "graphify"]
    },
    "network": {
      "connect": []
    }
  },
  "entrypoint": {
    "type": "command",
    "command": "graphify",
    "args": ["query"]
  },
  "updateChannel": "stable",
  "installationType": "referenced",
  "configSchema": "urn:aif:schema:extension-manifest:1#/definitions/config"
}
```

### Required Manifest Fields

Every manifest must declare:

- Stable identifier and extension type.
- Publisher and source repository or registry.
- Exact installed version and supported version range.
- Intentloom API and schema compatibility range.
- Runtime and platform requirements.
- Requested capabilities: file access, process execution, and network access.
- License SPDX identifier, license file location, and required attribution or
  notices.
- Package digest or integrity metadata where the source supports it.
- Configuration schema and migration metadata.
- Update channel and update policy.
- Installation type: `bundled`, `downloaded`, `externally-installed`, or
  `referenced`.

---

## 4. Extension Lockfile Schema (`urn:aif:schema:extension-lock:1`)

Resolved and approved extensions are pinned in `.aif/extension-lock.json`.
Generated output must not depend on an unpinned `latest` version.

```json
{
  "lockVersion": 1,
  "updatedAt": "2026-07-24T02:49:00Z",
  "extensions": {
    "ext:org/graphify-provider": {
      "extensionId": "ext:org/graphify-provider",
      "category": "knowledge-provider",
      "requestedVersion": "^1.2.0",
      "resolvedVersion": "1.2.0",
      "source": {
        "registry": "npm",
        "package": "@intentloom/graphify-provider",
        "resolved": "https://registry.npmjs.org/@intentloom/graphify-provider/-/graphify-provider-1.2.0.tgz"
      },
      "integrity": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "manifestSchemaVersion": "urn:aif:schema:extension-manifest:1",
      "grantedCapabilities": {
        "filesystem": {
          "read": ["./"],
          "write": [".aif/cache/"]
        },
        "process": {
          "exec": ["python3", "graphify"]
        },
        "network": {
          "connect": []
        }
      },
      "license": {
        "spdxId": "MIT",
        "noticeSnapshotId": "sha256:abc123"
      },
      "configDigest": "sha256:def456",
      "approvedAt": "2026-07-24T02:49:00Z",
      "approvedBy": "human-interactive",
      "lastHealthCheck": "2026-07-24T02:49:00Z",
      "pendingMigration": false,
      "installationType": "referenced"
    }
  }
}
```

### Required Lock Fields

Each resolved extension entry must record:

- Requested version range and exact resolved version.
- Source URL and artifact identity.
- Integrity digest when available.
- Manifest and compatibility-schema versions.
- Granted capabilities (may be narrower than requested).
- License and notice snapshot identifiers.
- Configuration digest.
- Last successful health check timestamp.
- Pending migration or incompatibility state.

---

## 5. Legal and Attribution Boundary

Intentloom may integrate an external project only through permissions granted by
its applicable license, terms, and distribution model.

The integration process must:

1. Identify the exact artifact and version being used.
2. Record its license and source.
3. Preserve copyright, attribution, and notice requirements.
4. Distinguish invoking or referencing an external installation from bundling or
   redistributing it.
5. Avoid copying source code, names, logos, or documentation beyond what the
   license permits.
6. Require a separate review before bundling, modifying, or redistributing
   third-party code.
7. Surface incompatible, unknown, source-available, non-commercial, or otherwise
   restrictive terms before adoption.
8. Not present legal metadata as legal advice or as a guarantee that every use is
   permitted.

A permissive license can make integration practical, but it does not remove the
need to review trademark rules, notices, transitive dependencies, hosted-service
terms, or later license changes.

---

## 6. Installation and Trust Model

Intentloom must not silently install system packages, language runtimes, hooks,
or external binaries.

### Pre-Adoption Inspection Workflow

When adopting an external extension:

```text
1. Read candidate extension-manifest.json
2. Validate against urn:aif:schema:extension-manifest:1
3. Verify Intentloom core and Node runtime compatibility
4. Inspect license identifier, publisher, source and publisher changes,
   restrictive terms, and unknown legal metadata
5. Compute capability delta against current project lock state
6. Present pre-adoption inspection report:
   - Exact artifact, version, commands, files, and network effects
   - License and attribution requirements
   - Capability grants required
7. Require explicit human confirmation
8. Install through the declared package manager or reference existing install
9. Verify integrity and capability boundaries
10. Record resolved state in .aif/extension-lock.json
11. Run health and compatibility checks
```

Failure at any step aborts the transaction without mutating existing project
configuration or lock files.

Local, read-only, least-privilege integrations should be introduced before
networked or mutating integrations.

---

## 7. Update Discovery and Safe Update Transactions

Update discovery and update application are separate operations.

Intentloom may check for updates only when the user has enabled a declared
network-capable source. Update discovery must report:

- Current and available versions.
- Release channel.
- Compatibility with the installed Intentloom version and project state.
- Capability, permission, license, publisher, source, and integrity changes.
- Configuration or data migrations.
- Relevant release notes and known breaking changes when available.

An available update must never be treated as approved.

### Safe Update Transaction

```text
1. Resolve candidate and verify source, integrity, license, compatibility,
   and capability delta
2. Prepare migration and exact state diff
3. Show rollback boundary
4. Explicit human approval
5. Install or switch candidate in isolation
6. Run contract, health, and project checks
7. Commit lock and configuration state
8. Retain or remove rollback material according to policy
```

The update must fail closed when:

- The source changes unexpectedly.
- Integrity cannot be verified.
- The license becomes incompatible.
- Required capabilities expand without approval.
- Migration is unavailable.
- Compatibility checks fail.

No extension may update itself through Intentloom without the same reviewed
transaction boundary.

---

## 8. Rollback and Recovery

The lifecycle must define whether an extension is:

- **Stateless**: No project-local state beyond configuration.
- **Project-local state**: Stores data inside the project directory.
- **External data store owner**: Owns state outside the project.

Rollback must restore the previous executable reference, lock state, generated
configuration, and compatible project-local data when the extension contract
supports it.

Irreversible migrations must be reported before approval and must not be
described as safely rollbackable.

Intentloom must preserve the original failure, rollback result, and any state
that requires manual recovery.

---

## 9. Compatibility Contracts

A future extension API should be versioned independently from the Intentloom
CLI. Compatibility checks may include:

- Manifest and schema versions.
- Declared Intentloom API range.
- MCP protocol and tool-schema versions.
- Operating system, architecture, runtime, and package-manager requirements.
- Capability availability.
- Configuration migration path.
- Deterministic contract fixtures.
- Provider-specific conformance tests.

Unsupported extensions may remain externally usable, but Intentloom must not
claim that they are managed, compatible, or safe.

---

## 10. Doctor Diagnostics

The `intentloom doctor` command must detect and report:

- Stale or outdated pinned versions.
- Unavailable or revoked artifacts.
- Compromised or locally modified extensions.
- Incompatible runtime or capability state.
- Missing integrity or notice metadata.
- Failed health checks.

---

## 11. Revocation and Removal

Users must be able to disable and remove an extension without losing ownership
of their project.

Removal must preview:

- Processes and registrations to stop.
- Generated files and configuration entries to remove.
- Project-owned files that will remain untouched.
- Retained caches, evidence, credentials, and extension-owned data.
- Notice or audit records that must remain.
- Whether reversible cleanup is possible.

Compromised publishers, revoked artifacts, or known malicious versions require a
security advisory path that can block new adoption and clearly warn existing
installations. Automatic destructive removal is not allowed.

---

## 12. Graphify as an Example, Not a Core Dependency

A future Graphify integration should use the same vendor-neutral provider
boundary as other knowledge-graph tools.

The preferred integration shape is:

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

---

## 13. Non-Goals

This specification does not imply:

- An extension marketplace in the current release.
- Automatic installation or automatic updates.
- Trust based only on popularity or a permissive license label.
- Arbitrary plugin code inside the canonical core process.
- A guarantee that third-party tools remain available or compatible.
- Redistribution rights without a specific review.
- Legal certification of an extension.
