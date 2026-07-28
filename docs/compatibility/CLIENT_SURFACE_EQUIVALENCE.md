# Client-Surface Read-Only Equivalence & Architectural Boundaries

Status: official compatibility document for `v1.0.0`.

Date: 2026-07-28.

## Goal

Ensure all supported Intentloom client surfaces (CLI, TUI, MCP Stdio Server, and Desktop Client) execute over shared application operations without duplicating business logic, domain rules, or project inspection routines.

## Client Surface Matrix

| Client Surface            | Underlying Module / Package                | Transport / API            | Domain Rule Ownership                  |
| ------------------------- | ------------------------------------------ | -------------------------- | -------------------------------------- |
| **CLI (`intentloom`)**    | `packages/cli`                             | Process invocation         | Delegated to `@intentloom/application` |
| **TUI (`intentloom ui`)** | `packages/cli` + `@intentloom/application` | Terminal rendering / JSON  | Delegated to `@intentloom/application` |
| **MCP Server**            | `@intentloom/mcp`                          | Stdio RPC (`JSON-RPC 2.0`) | Delegated to `@intentloom/application` |
| **Desktop App**           | `apps/desktop` + Tauri Rust sidecar        | Local IPC (`intentloomd`)  | Delegated to `@intentloom/application` |

## Equivalence Guarantees

1. **Shared Application Operations**: `inspectProject`, `doctorProject`, `diffProject`, `timelineProject`, and `getInteractiveWorkspaceState` serve as the single source of truth across all clients.
2. **Read-Only Zero Mutation Invariant**: Executing read-only queries from CLI, MCP, or Desktop leaves project files 100% byte-for-byte unchanged.
3. **Typed Result Equivalence**: `InteractiveWorkspaceState` payload formats emitted by `intentloom ui --json` match the data structures received by the Desktop webview client over `intentloomd` IPC.
