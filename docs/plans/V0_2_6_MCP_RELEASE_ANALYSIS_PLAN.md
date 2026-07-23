# v0.2.6 MCP Release Analysis Plan

Expose the existing release analysis operation through a local stdio MCP
adapter without adding provider credentials, network access, or mutation.

## In scope

- a private `@intentloom/mcp-server` package;
- MCP `initialize`, `tools/list`, and `tools/call` handling;
- one named `intentloom_release_analysis` tool;
- Content-Length framed stdio transport;
- project-root-bounded export paths and structured report output.

## Out of scope

- generic shell, CLI execution, arbitrary file reads, or writes;
- live provider APIs, hosted MCP, HTTP transport, or external MCP ingestion;
- mutation, approval, telemetry, or background processes.

## Exit evidence

The adapter must pass MCP handler fixtures, typecheck, formatting, and the full
workspace compatibility matrix.
