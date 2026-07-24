import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleMcpRequest,
  ENGINEERING_CONFORMANCE_TOOL,
  PROJECT_DOCTOR_TOOL,
  PROJECT_INSPECT_TOOL,
  RELEASE_ANALYSIS_TOOL,
  type McpRequest,
} from "../packages/mcp-server/src/index.js";

describe("MCP release analysis server", () => {
  it("advertises bounded read-only analysis and project tools", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { root: process.cwd() },
    );
    const tools = response?.result?.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(
      (tools as { name: string }[]).map(({ name }) => name).sort(),
    ).toEqual(
      [
        RELEASE_ANALYSIS_TOOL,
        PROJECT_INSPECT_TOOL,
        PROJECT_DOCTOR_TOOL,
        ENGINEERING_CONFORMANCE_TOOL,
      ].sort(),
    );
    expect(
      (tools as { name: string; outputSchema?: { $id?: string } }[])
        .filter((tool) => tool.name !== RELEASE_ANALYSIS_TOOL)
        .map((tool) => tool.outputSchema?.$id),
    ).toEqual([
      "urn:intentloom:mcp:project-inspect:output:1",
      "urn:intentloom:mcp:project-doctor:output:1",
      "urn:intentloom:mcp:engineering-conformance:output:1",
    ]);
  });

  it("rejects a symbolic-link root before project doctor reads it", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-mcp-symlink-"));
    const target = join(parent, "target");
    const root = join(parent, "project");
    await mkdir(target);
    await symlink(target, root);
    try {
      const response = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "doctor-symlink",
          method: "tools/call",
          params: {
            name: PROJECT_DOCTOR_TOOL,
            arguments: { profile: "generic", adapters: ["codex"] },
          },
        },
        { root },
      );

      expect(response).toMatchObject({
        result: {
          isError: true,
          structuredContent: {
            schemaVersion: 1,
            code: "root-symlink",
          },
        },
      });
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("enforces the declared doctor adapter limits", async () => {
    const response = await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: "doctor-adapters",
        method: "tools/call",
        params: {
          name: PROJECT_DOCTOR_TOOL,
          arguments: {
            profile: "generic",
            adapters: ["codex", "codex"],
          },
        },
      },
      { root: process.cwd() },
    );

    expect(response).toMatchObject({
      result: {
        isError: true,
        structuredContent: { code: "arguments-invalid" },
      },
    });
  });

  it("inspects and doctors the configured root without project writes", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-project-"));
    try {
      await writeFile(join(root, "package.json"), "{}\n");
      const before = await readdir(root);

      const inspection = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "inspect",
          method: "tools/call",
          params: { name: PROJECT_INSPECT_TOOL, arguments: {} },
        },
        { root },
      );
      const doctor = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "doctor",
          method: "tools/call",
          params: {
            name: PROJECT_DOCTOR_TOOL,
            arguments: { profile: "generic", adapters: ["codex"] },
          },
        },
        { root },
      );

      expect(inspection).toMatchObject({
        result: {
          structuredContent: {
            operationVersion: 1,
            readOnly: true,
            capabilities: ["project.files.read"],
          },
        },
      });
      expect(doctor).toMatchObject({
        result: {
          structuredContent: {
            findings: expect.any(Array),
          },
        },
      });
      expect(await readdir(root)).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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

  it("evaluates engineering conformance via MCP request with explicit policy and timeline", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-conformance-"));
    try {
      const policyFile = "policy.json";
      const timelineFile = "timeline.json";

      await writeFile(
        join(root, policyFile),
        JSON.stringify({
          schemaVersion: "1",
          policyId: "policy:mcp-test",
          description: "MCP Conformance Test",
          rules: [
            {
              ruleId: "rule:code-review",
              caseType: "pull-request",
              severity: "error",
              title: "Code Review Required",
              condition: {
                type: "required-activity",
                activity: "code-review",
              },
            },
          ],
        }),
      );

      await writeFile(
        join(root, timelineFile),
        JSON.stringify({
          caseType: "pull-request",
          caseId: "pr-mcp-1",
          events: [
            {
              activity: "code-review",
              source: "github",
              sourceId: "review-mcp-1",
            },
          ],
        }),
      );

      const response = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "mcp-conformance",
          method: "tools/call",
          params: {
            name: ENGINEERING_CONFORMANCE_TOOL,
            arguments: {
              policyFile,
              timelineFile,
            },
          },
        },
        { root },
      );

      expect(response).toMatchObject({
        result: {
          structuredContent: {
            policyId: "policy:mcp-test",
            caseId: "pr-mcp-1",
            summary: {
              passed: 1,
              violations: 0,
            },
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
