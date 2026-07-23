# ADR-0018: Local stdio MCP project-inspect and doctor boundary

- Status: Accepted
- Date: 2026-07-23

## Context

Intentloom already has deterministic, read-only project inspection and doctor
operations. MCP clients need those same structured reports without shelling out
to the CLI or receiving generic filesystem access.

## Decision

Add two MCP tools bound to the server's configured root:
`intentloom_project_inspect` and `intentloom_project_doctor`. The adapter calls
the application operations directly with the Node filesystem adapter. Doctor
requires typed `profile` and `adapters` values, so callers pass the same
application-operation choices used by the CLI without silent configuration
substitution. Typed optional project-owned and documentation mappings complete
the doctor operation options.

The tool input and output schemas have versioned `$id` values. Tool failures
return a versioned structured error code. Both tools reject a symbolic-link
configured root before inspection or doctor work begins. They expose neither a
root override nor arbitrary file paths, and retain the existing no-write
behavior of the application operations.
Schema annotations publish versioned limits for configured roots and adapters.
They also bound mapping counts and mapping-path lengths.

## Consequences

- MCP clients receive the established structured project reports directly.
- The configured-root boundary remains enforceable by the adapter.
- CLI argument parsing and output formatting remain outside the MCP boundary.
- Future configuration-aware doctor behavior requires its own versioned
  application contract and MCP schema.
