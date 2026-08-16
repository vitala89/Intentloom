import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
  detectProjectProfiles,
  engineeringProfiles,
  inspectProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";

function nxTypescriptTree(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/nx.json": JSON.stringify({ targetDefaults: {} }),
    "/project/package.json": JSON.stringify({
      devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
    }),
    "/project/tsconfig.json": "{}",
    "/project/README.md": "vii workspace\n",
    "/project/AGENTS.md": "project agents\n",
    "/project/.changeset/README.md": "changeset help\n",
    "/project/adr/README.md": "adr index\n",
    "/project/docs/README.md": "docs index\n",
    "/project/docs/architecture/overview.md": "architecture overview\n",
    "/project/docs/architecture/README.md": "architecture index\n",
    "/project/docs/governance/process.md": "governance\n",
    "/project/packages/app/README.md": "package readme\n",
    "/project/fixtures/sample/README.md": "fixture readme\n",
    "/project/examples/demo/README.md": "example readme\n",
    "/project/rfcs/0001-example.md": "rfc\n",
    "/project/.nx/cache/terminalOutputs/run-1.txt": "cached output\n",
    "/project/.nx/cache/project-graph.json": "{}\n",
    "/project/.nx/workspace-data/project-graph.json": "{}\n",
    ...extra,
  };
}

describe("existing-project Nx dogfood regressions", () => {
  it("resolves Nx TypeScript workspaces to a supported inspect/adopt profile", async () => {
    const fs = createMemoryFileSystem(nxTypescriptTree());
    const detection = await detectProjectProfiles("/project", fs);
    const inspection = await inspectProject("/project", fs);
    const proposal = await adoptProject(
      {
        root: "/project",
        profile: detection.selectedProfile,
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(engineeringProfiles.has(detection.selectedProfile)).toBe(true);
    expect(detection.selectedProfile).toBe("typescript");
    expect(detection.workspaceTopology).toBe("nx");
    expect(detection.candidates.some((item) => item.profile === "nx")).toBe(
      true,
    );
    expect(inspection.profileDetection.selectedProfile).toBe("typescript");
    expect(inspection.profileDetection.workspaceTopology).toBe("nx");
    expect(proposal.diagnostics).not.toContain(
      "selected project profile is not available",
    );
    expect(proposal.profileDetection.selectedProfile).toBe("typescript");
    expect(proposal.applied).toBe(false);
  });

  it("keeps Angular evidence as the engineering profile on an Nx workspace", async () => {
    const result = await detectProjectProfiles(
      "/project",
      createMemoryFileSystem({
        "/project/nx.json": "{}",
        "/project/angular.json": "{}",
        "/project/package.json": JSON.stringify({
          dependencies: { "@angular/core": "20.0.0" },
          devDependencies: { nx: "21.0.0" },
        }),
      }),
    );
    expect(result.selectedProfile).toBe("angular");
    expect(result.workspaceTopology).toBe("nx");
    expect(result.manualConfirmationRequired).toBe(false);
  });

  it("falls back to generic when Nx topology has no engineering-stack evidence", async () => {
    const result = await detectProjectProfiles(
      "/project",
      createMemoryFileSystem({
        "/project/nx.json": "{}",
        "/project/package.json": JSON.stringify({
          devDependencies: { nx: "21.0.0" },
        }),
      }),
    );
    expect(result.selectedProfile).toBe("generic");
    expect(result.workspaceTopology).toBe("nx");
    expect(engineeringProfiles.has(result.selectedProfile)).toBe(true);
  });

  it("excludes Nx generated cache from inspect and adopt inventories", async () => {
    const fs = createMemoryFileSystem(nxTypescriptTree());
    const detection = await detectProjectProfiles("/project", fs);
    const proposal = await adoptProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
    const serialized = JSON.stringify(proposal);

    expect(
      detection.scannedPaths.some((path) => path.startsWith(".nx/cache")),
    ).toBe(false);
    expect(
      detection.scannedPaths.some((path) =>
        path.startsWith(".nx/workspace-data"),
      ),
    ).toBe(false);
    expect(
      proposal.items.some((item) => item.path.startsWith(".nx/cache")),
    ).toBe(false);
    expect(serialized).not.toContain(".nx/cache");
    expect(serialized).not.toContain("terminalOutputs");
  });

  it("does not let Nx cache files change profile detection", async () => {
    const withoutCache = await detectProjectProfiles(
      "/project",
      createMemoryFileSystem({
        "/project/nx.json": "{}",
        "/project/tsconfig.json": "{}",
      }),
    );
    const withCache = await detectProjectProfiles(
      "/project",
      createMemoryFileSystem({
        "/project/nx.json": "{}",
        "/project/tsconfig.json": "{}",
        "/project/.nx/cache/terminalOutputs/run-1.txt": "cached\n",
      }),
    );
    expect(withCache.selectedProfile).toBe(withoutCache.selectedProfile);
    expect(withCache.workspaceTopology).toBe(withoutCache.workspaceTopology);
    expect(withCache.scannedPaths).toEqual(withoutCache.scannedPaths);
  });

  it("does not treat nested monorepo documentation as public-readme ambiguity", async () => {
    const fs = createMemoryFileSystem(nxTypescriptTree());
    const first = await adoptProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
    const second = await adoptProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(first).toEqual(second);
    expect(first.items.find((item) => item.path === "README.md")).toEqual(
      expect.objectContaining({
        action: "map-existing-project-owned",
        proposedClassification: "project-owned-documentation",
        manualDecisionRequired: false,
      }),
    );
    expect(first.items.find((item) => item.path === "docs/README.md")).toEqual(
      expect.objectContaining({
        action: "map-existing-aif-compatible-document",
        reason: expect.stringContaining("documentation-index"),
        manualDecisionRequired: false,
      }),
    );
    for (const path of [
      ".changeset/README.md",
      "adr/README.md",
      "docs/architecture/README.md",
      "docs/architecture/overview.md",
      "docs/governance/process.md",
      "packages/app/README.md",
      "fixtures/sample/README.md",
      "examples/demo/README.md",
      "rfcs/0001-example.md",
    ]) {
      const item = first.items.find((candidate) => candidate.path === path);
      expect(item?.path).toBe(path);
      expect(item?.action).not.toBe("manual-decision-required");
      expect(item?.reason ?? "").not.toContain("public-readme");
    }
    expect(
      first.items.filter(
        (item) =>
          item.action === "manual-decision-required" &&
          item.reason.includes("public-readme"),
      ),
    ).toEqual([]);
  });

  it("still requires a manual choice for two root public-readme documents", async () => {
    const result = await adoptProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      createMemoryFileSystem({
        "/project/README.md": "one\n",
        "/project/Readme.md": "two\n",
      }),
    );
    expect(
      result.items.filter(
        (item) =>
          item.action === "manual-decision-required" &&
          item.reason.includes("public-readme"),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("does not write during dry-run and ignores native Nx cache trees", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-nx-dogfood-"));
    const root = join(parent, "project");
    await mkdir(join(root, ".nx", "cache", "terminalOutputs"), {
      recursive: true,
    });
    await writeFile(join(root, "nx.json"), "{}\n");
    await writeFile(join(root, "tsconfig.json"), "{}\n");
    await writeFile(
      join(root, ".nx", "cache", "terminalOutputs", "run-1.txt"),
      "cached\n",
    );
    try {
      expect(await nodeFileSystem.list(root)).toEqual([
        "nx.json",
        "tsconfig.json",
      ]);
      const before = await nodeFileSystem.list(root);
      const proposal = await adoptProject(
        {
          root,
          profile: "typescript",
          adapters: ["codex"],
          dryRun: true,
        },
        nodeFileSystem,
      );
      expect(proposal.applied).toBe(false);
      expect(await nodeFileSystem.list(root)).toEqual(before);
      expect(proposal.items.some((item) => item.path.startsWith(".nx/"))).toBe(
        false,
      );
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
