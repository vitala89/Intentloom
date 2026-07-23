# v0.2.7 MCP Project Inspect and Doctor Plan

Expose existing project inspection and doctor operations through the local stdio
MCP adapter without invoking the CLI, changing the project, or expanding
process, network, or provider access.

## In scope

- typed `intentloom_project_inspect` and `intentloom_project_doctor` tools;
- root-bound operation contracts, with required typed doctor profile and adapter
  choices plus optional typed project mappings;
- direct calls to `@intentloom/application` with the Node filesystem adapter;
- MCP handler tests for tool discovery, structured results, and no project
  writes, root-symlink rejection, versioned limits, and versioned error responses.

## Out of scope

- changing the application inspection or doctor contracts;
- generic filesystem reads, arbitrary tool roots, shell or CLI execution;
- provider access, Git collection, mutation, approval, telemetry, or
  background processes.

## Exit evidence

The adapter must preserve its root boundary, return existing structured
application reports, and pass typecheck, formatting, full tests, and CI.
