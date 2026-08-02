import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleMcpRequest,
  RELEASE_ANALYSIS_TOOL,
} from "../packages/mcp-server/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

describe("CLI/MCP evidence result equivalence", () => {
  it("returns the same structured release-analysis result for the same export", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "intentloom-evidence-equivalence-"),
    );
    try {
      await writeFile(
        join(root, "github.json"),
        JSON.stringify({
          pullRequests: [{ number: 7, createdAt: "2026-01-01T00:00:00Z" }],
        }),
      );
      const cliOutput: string[] = [];
      const cliExitCode = await runCli(
        [
          "evidence",
          "analyze",
          "--provider",
          "github",
          "--file",
          join(root, "github.json"),
          "--project-key",
          "org/repo",
          "--root",
          root,
          "--case-id",
          "equivalence-case",
          "--json",
        ],
        { catalogRoot: "catalog" },
        {
          stdout: (message) => cliOutput.push(message),
          stderr: () => undefined,
        },
      );

      const mcpResponse = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "equivalence",
          method: "tools/call",
          params: {
            name: RELEASE_ANALYSIS_TOOL,
            arguments: {
              provider: "github",
              file: "github.json",
              projectKey: "org/repo",
              caseId: "equivalence-case",
            },
          },
        },
        { root },
      );

      expect(cliExitCode).toBe(3);
      expect(mcpResponse.error).toBeUndefined();
      expect(JSON.parse(cliOutput.join("\n"))).toEqual(
        mcpResponse.result?.structuredContent,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
