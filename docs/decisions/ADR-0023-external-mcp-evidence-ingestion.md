# ADR-0023: External MCP Evidence Ingestion

- **Status**: Accepted
- **Date**: 2026-07-24
- **Authors**: Intentloom Maintainers

## Context

Intentloom may consume telemetry, issue statuses, code graph metrics, or build results from external Model Context Protocol (MCP) servers configured by the user.

Allowing external MCP servers to supply data introduces security risks:

1. Untrusted MCP responses could attempt prompt injection or payload tampering.
2. Malicious or compromised MCP servers could attempt to trigger repository mutations or configuration syncs.
3. External tool calls could expose sensitive project paths or secrets.

## Decision

Intentloom adopts a strict security boundary for external MCP evidence ingestion:

1. **Untrusted Authority Classification**: All data ingested from external MCP servers is classified as untrusted evidence (`trustLevel: "untrusted-external"`). External evidence NEVER grants authority to bypass human review, policy checks, or transactional boundaries.
2. **Read-Only & Non-Mutating Limitation**: External MCP tools may only be invoked for evidence collection. External MCP tools cannot trigger project adoption (`intentloom adopt`), configuration sync (`intentloom sync`), file writes, git commits, or releases.
3. **Explicit Server & Tool Allowlist**: Projects must explicitly declare external MCP servers in `.aif/config.yaml` with an explicit tool allowlist. Unlisted tools or unapproved servers are rejected.
4. **Schema Validation & Redaction**: All ingested MCP responses are validated against the evidence model schema (`urn:aif:schema:evidence-bundle:1`) and sanitized through the redaction engine before inclusion in release timelines or conformance reports.

## Consequences

### Positive

- Safely enables external MCP tool integration (e.g. issue trackers, external code graph indexers, build servers) without risking repository integrity.
- Prevents untrusted payloads from masquerading as authoritative internal evidence.
- Ensures all project mutations require explicit human approval regardless of MCP output.

### Negative

- Requires maintaining an explicit MCP server allowlist in project configuration.
