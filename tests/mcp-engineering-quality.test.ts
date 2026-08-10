import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildQualityCatalogViewModel,
  buildQualityCheckersViewModel,
  buildQualityGraphViewModel,
  buildQualityStandardsViewModel,
  FIRST_PARTY_CATALOG_ENTRIES,
  getEffectiveEngineeringQualityPolicy,
  loadQualityGraphSnapshot,
  nodeFileSystem,
  QUALITY_CHECKER_ADAPTERS,
} from "../packages/application/src/index.js";
import {
  handleMcpRequest,
  QUALITY_CATALOG_TOOL,
  QUALITY_CHECKERS_TOOL,
  QUALITY_GRAPH_TOOL,
  QUALITY_STANDARDS_TOOL,
} from "../packages/mcp-server/src/index.js";

const tools = [
  QUALITY_STANDARDS_TOOL,
  QUALITY_CATALOG_TOOL,
  QUALITY_CHECKERS_TOOL,
  QUALITY_GRAPH_TOOL,
] as const;

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-quality-mcp-"));
  await mkdir(join(root, "packages", "lib"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "fixture-root",
      dependencies: { "fixture-lib": "workspace:*" },
    }),
  );
  await writeFile(
    join(root, "packages", "lib", "package.json"),
    JSON.stringify({ name: "fixture-lib" }),
  );
  return root;
}

async function callTool(
  name: (typeof tools)[number],
  root: string,
  args: Record<string, unknown> = {},
) {
  return handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: name,
      method: "tools/call",
      params: { name, arguments: args },
    },
    { root },
  );
}

describe("MCP Engineering Quality surface", () => {
  it.each(tools)(
    "tools/list exposes %s with a versioned output schema",
    async (name) => {
      const response = await handleMcpRequest(
        { jsonrpc: "2.0", id: "list", method: "tools/list" },
        { root: process.cwd() },
      );
      const toolList = response?.result?.tools;
      if (!Array.isArray(toolList))
        throw new Error("tools/list returned no tools");
      const descriptor = (
        toolList as {
          name: string;
          outputSchema?: { $id?: string };
        }[]
      ).find((tool) => tool.name === name);
      expect(descriptor?.outputSchema?.$id).toBe(
        `urn:intentloom:mcp:quality-${name.replace("intentloom_quality_", "")}:output:1`,
      );
    },
  );

  it.each([
    [
      QUALITY_STANDARDS_TOOL,
      (_root: string) =>
        buildQualityStandardsViewModel({
          policy: getEffectiveEngineeringQualityPolicy(),
        }),
    ],
    [
      QUALITY_CATALOG_TOOL,
      () => buildQualityCatalogViewModel(FIRST_PARTY_CATALOG_ENTRIES),
    ],
    [
      QUALITY_CHECKERS_TOOL,
      () =>
        buildQualityCheckersViewModel({ adapters: QUALITY_CHECKER_ADAPTERS }),
    ],
    [
      QUALITY_GRAPH_TOOL,
      async (root: string) =>
        buildQualityGraphViewModel({
          snapshot: await loadQualityGraphSnapshot(root, nodeFileSystem),
        }),
    ],
  ] as const)(
    "returns application-equivalent %s output",
    async (name, expectedBuilder) => {
      const root = await fixtureRoot();
      try {
        const response = await callTool(name, root);
        expect(response).toMatchObject({
          result: { structuredContent: await expectedBuilder(root) },
        });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it.each(tools)("rejects extra arguments for %s", async (name) => {
    const root = await fixtureRoot();
    try {
      const response = await callTool(name, root, { unexpected: true });
      expect(response).toMatchObject({
        result: {
          isError: true,
          structuredContent: { code: "arguments-invalid" },
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each(tools)("rejects a symlink root for %s", async (name) => {
    const parent = await mkdtemp(
      join(tmpdir(), "intentloom-quality-mcp-link-"),
    );
    const target = join(parent, "target");
    const root = join(parent, "project");
    await mkdir(target);
    await symlink(target, root);
    try {
      const response = await callTool(name, root);
      expect(response).toMatchObject({
        result: { isError: true, structuredContent: { code: "root-symlink" } },
      });
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
