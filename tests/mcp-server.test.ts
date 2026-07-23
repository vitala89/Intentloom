import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleMcpRequest,
  RELEASE_ANALYSIS_TOOL,
  type McpRequest,
} from "../packages/mcp-server/src/index.js";

describe("MCP release analysis server", () => {
  it("advertises only the bounded read-only analysis tool", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { root: process.cwd() },
    );
    expect(response).toMatchObject({
      result: {
        tools: [{ name: RELEASE_ANALYSIS_TOOL }],
      },
    });
  });

  it("returns structured analysis for an explicit export without project writes", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-"));
    try {
      const file = join(root, "github.json");
      await writeFile(file, JSON.stringify({ pullRequests: [{ number: 7 }] }));
      const request: McpRequest = {
        jsonrpc: "2.0",
        id: "analysis",
        method: "tools/call",
        params: {
          name: RELEASE_ANALYSIS_TOOL,
          arguments: {
            provider: "github",
            file,
            projectKey: "org/repo",
            caseId: "mcp-case",
          },
        },
      };
      const response = await handleMcpRequest(request, { root });
      expect(response).toMatchObject({
        result: {
          structuredContent: {
            caseId: "mcp-case",
            projectKey: "org/repo",
            quality: "unavailable",
          },
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsupported methods with a JSON-RPC error", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 2, method: "shell/execute" },
      { root: process.cwd() },
    );
    expect(response).toMatchObject({
      error: { code: -32601 },
    });
  });
});
