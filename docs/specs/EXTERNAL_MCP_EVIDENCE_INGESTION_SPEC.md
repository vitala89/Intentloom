# External MCP Evidence Ingestion Specification

- **Status**: Draft / Candidate
- **Version**: 0.4.0-candidate
- **Governing ADR**: [ADR-0023](../decisions/ADR-0023-external-mcp-evidence-ingestion.md)

---

## 1. Overview

This specification establishes the technical controls, schema requirements, trust boundaries, and redaction pipeline for ingesting untrusted evidence from external Model Context Protocol (MCP) servers.

---

## 2. Project Configuration (`.aif/config.yaml`)

External MCP servers must be explicitly declared under `externalMcpServers`:

```yaml
externalMcpServers:
  - id: mcp:org/issue-tracker
    transport: stdio
    command: npx
    args: ["-y", "@example/mcp-issue-tracker"]
    allowlist:
      tools:
        - get_issue_status
        - list_pull_request_links
    trustLevel: untrusted-external
```

---

## 3. Ingestion Protocol & Validation Pipeline

When ingesting evidence from an external MCP server:

```text
1. Verify server ID and requested tool name against .aif/config.yaml allowlist
2. Execute read-only tool call via stdio or HTTP transport
3. Intercept raw tool response JSON
4. Validate response structure against urn:aif:schema:evidence-bundle:1
5. Run redaction engine (strip tokens, credentials, private user details)
6. Attach metadata:
   - provider: "external-mcp"
   - serverId: "mcp:org/issue-tracker"
   - trustLevel: "untrusted-external"
   - ingestedAt: "<ISO-8601-timestamp>"
7. Append normalized evidence to release timeline or evidence store
```

---

## 4. Non-Mutation Boundary

1. External MCP tool outputs MUST NOT trigger:
   - File creation, modification, or deletion.
   - Project adoption (`intentloom adopt`).
   - Profile sync (`intentloom sync`).
   - Git commits, tags, or merges.
   - Release state changes.
2. Ingested external evidence may be referenced in `intentloom release-analysis` or `intentloom conformance` as supplementary evidence, marked clearly as `untrusted-external`.

---

## 5. Security Controls & Error Handling

- **Unlisted Tool**: Reject execution with `E_MCP_TOOL_NOT_ALLOWED`.
- **Malformed Output**: Abort ingestion with `E_MCP_EVIDENCE_MALFORMED`.
- **Timeout**: Enforce a strict 10-second timeout per tool call.
