# Managed Extension Lifecycle Specification (v0.3 Candidate)

- **Status**: Draft / Candidate
- **Version**: 0.3.0
- **Target Schema**: `urn:aif:schema:extension-manifest:1` & `urn:aif:schema:extension-lock:1`

---

## 1. Overview

This specification establishes the vendor-neutral governance, discovery, inspection, resolution, and locking model for external Intentloom extensions.

Supported extension categories include:

- `skill`: Portable Agent Skills containing instructions and helper tools.
- `mcp-server`: Local stdio or HTTP Model Context Protocol servers.
- `knowledge-provider`: External code graph or index providers (e.g., Graphify).
- `adapter-pack`: Custom or third-party IDE/agent target adapters.
- `policy-pack`: Pre-packaged engineering workflow policy rulesets.

---

## 2. Extension Manifest Schema (`urn:aif:schema:extension-manifest:1`)

Every managed extension must provide an `extension-manifest.json` file in its root:

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
  "compatibility": {
    "intentloomCore": "^0.2.0 || ^0.3.0",
    "node": ">=20.0.0"
  },
  "license": {
    "spdxId": "MIT",
    "noticeRequired": true
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
  }
}
```

---

## 3. Extension Lockfile Schema (`urn:aif:schema:extension-lock:1`)

Resolved and approved extensions are recorded in `.aif/extension-lock.json`:

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
      "integrity": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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
      "approvedAt": "2026-07-24T02:49:00Z",
      "approvedBy": "human-interactive"
    }
  }
}
```

---

## 4. Inspection & Adoption Workflow

When adopting or updating an external extension:

```text
1. Read candidate extension-manifest.json
2. Validate against urn:aif:schema:extension-manifest:1
3. Verify Intentloom core and Node runtime compatibility
4. Compute capability delta against current project lock state
5. Present pre-adoption inspection report (license, capabilities, binary executions)
6. Require explicit human confirmation
7. Install artifact and write pinned entry to .aif/extension-lock.json
8. Execute health-check verification
```

Failure at any step aborts the transaction without mutating existing project configuration or lock files.
