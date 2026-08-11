import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSpecializedPackCatalogViewModel,
  buildSpecializedPackChecksViewModel,
  buildSpecializedPackDetectionViewModel,
  getFirstPartySpecializedPackEntries,
  nodeFileSystem,
  resolveFirstPartySpecializedPackDetection,
  resolveFirstPartySpecializedPackChecks,
  validateFirstPartySpecializedPackCatalog,
} from "../packages/application/src/index.js";
import {
  handleMcpRequest,
  SPECIALIZED_PACKS_CATALOG_TOOL,
  SPECIALIZED_PACKS_CHECKS_TOOL,
  SPECIALIZED_PACKS_DETECT_TOOL,
} from "../packages/mcp-server/src/index.js";

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-specialized-mcp-"));
  await mkdir(join(root, "apps", "desktop", "src-tauri"), { recursive: true });
  await writeFile(join(root, "apps", "desktop", "src-tauri", "Cargo.toml"), "");
  return root;
}

async function callTool(
  name:
    | typeof SPECIALIZED_PACKS_CATALOG_TOOL
    | typeof SPECIALIZED_PACKS_DETECT_TOOL
    | typeof SPECIALIZED_PACKS_CHECKS_TOOL,
  root: string,
) {
  return handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: name,
      method: "tools/call",
      params: { name, arguments: {} },
    },
    { root },
  );
}

describe("MCP Specialized Engineering Packs surface", () => {
  it("returns CLI-equivalent catalog and detect viewmodels", async () => {
    const root = await fixtureRoot();
    try {
      const catalogResponse = await callTool(
        SPECIALIZED_PACKS_CATALOG_TOOL,
        root,
      );
      const catalog = catalogResponse?.result?.structuredContent as {
        totalEntries: number;
      };
      expect(catalog.totalEntries).toBe(4);
      expect(catalog).toEqual(
        buildSpecializedPackCatalogViewModel(
          validateFirstPartySpecializedPackCatalog(
            getFirstPartySpecializedPackEntries(),
          ).entries,
        ),
      );

      const detectResponse = await callTool(
        SPECIALIZED_PACKS_DETECT_TOOL,
        root,
      );
      const detect = detectResponse?.result?.structuredContent as {
        compatiblePackIds: string[];
      };
      expect(detect.compatiblePackIds).toContain("pack-tauri-desktop");
      expect(detect).toEqual(
        buildSpecializedPackDetectionViewModel(
          resolveFirstPartySpecializedPackDetection({
            projectPaths: await nodeFileSystem.list(root),
            entries: getFirstPartySpecializedPackEntries(),
          }),
        ),
      );

      const checksResponse = await callTool(
        SPECIALIZED_PACKS_CHECKS_TOOL,
        root,
      );
      const checks = checksResponse?.result?.structuredContent;
      expect(checks).toEqual(
        buildSpecializedPackChecksViewModel(
          resolveFirstPartySpecializedPackChecks({
            projectPaths: await nodeFileSystem.list(root),
            entries: getFirstPartySpecializedPackEntries(),
          }),
        ),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
