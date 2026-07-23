# ADR-0017: Local stdio MCP release-analysis boundary

- Status: Accepted
- Date: 2026-07-23

## Context

The release analysis operation is now available through the CLI. MCP clients
need the same structured operation without invoking the CLI or parsing text.
The first transport must remain local and read-only.

## Decision

Add a private `@intentloom/mcp-server` package with one named tool,
`intentloom_release_analysis`. It accepts an explicit provider, project key,
and export file, plus optional case id. The export path is resolved beneath the
configured project root. The server combines the existing provider normalizer,
local Git collector, release timeline, and analysis operation directly.

The server supports only MCP initialization, tool listing, and tool calls over
Content-Length framed stdio. It exposes no generic shell, arbitrary file read,
network, or mutation capability. MCP tool results include the same structured
report returned by the analysis package.

## Consequences

- MCP and CLI share the same deterministic analysis boundary.
- A client can inspect release evidence locally without credentials or a port.
- Additional read-only tools require separate versioned schemas and tests.
