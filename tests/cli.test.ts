import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
  syncProject,
} from "../packages/application/src/index.js";
import { checksum, type Catalog } from "@intentloom/core";

const injectedCatalog: Catalog = {
  policies: ["policies/core.md"],
  workflows: [],
  templates: [],
  skills: [],
};

describe("init", () => {
  it("plans without writing in dry-run mode", async () => {
    const fs = createMemoryFileSystem();
    const result = await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
    expect(result.changes.some((change) => change.kind === "create")).toBe(
      true,
    );
    expect(fs.files.size).toBe(0);
  });
  it("does not overwrite an existing instruction file", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project-owned",
    });
    const result = await initProject(
      { root: "/project", profile: "generic", adapters: ["codex"] },
      fs,
    );
    expect(
      result.changes.find((change) => change.path === "AGENTS.md")?.kind,
    ).toBe("conflict");
    expect(await fs.read("/project/AGENTS.md")).toBe("project-owned");
  });
  it("is idempotent and doctor never writes", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project with spaces/é",
      profile: "generic",
      adapters: ["codex"] as const,
    };
    await initProject(options, fs);
    expect((await syncProject(options, fs)).changes).toEqual([]);
    const before = [...fs.files.entries()];
    await doctorProject(options, fs);
    expect([...fs.files.entries()]).toEqual(before);
  });
  it("refuses a manually modified owned generated file", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["codex"] as const,
    };
    await initProject(options, fs);
    await fs.write("/project/AGENTS.md", "manual edit");
    expect(
      (await syncProject(options, fs)).changes.find(
        (change) => change.path === "AGENTS.md",
      )?.kind,
    ).toBe("modified");
  });
  it("rolls back generated files and metadata when finalization fails", async () => {
    const fs = createMemoryFileSystem({}, 3);
    await expect(
      initProject(
        { root: "/project", profile: "generic", adapters: ["codex"] },
        fs,
      ),
    ).rejects.toThrow("injected write failure");
    expect(fs.files.size).toBe(0);
  });
  it("requires content evidence when an injected catalog has canonical sources", async () => {
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["codex"] as const,
      catalog: injectedCatalog,
    };
    await expect(
      initProject(options, createMemoryFileSystem()),
    ).rejects.toThrow("canonical source hash unavailable: policies/core.md");
    const fs = createMemoryFileSystem();
    await initProject(
      {
        ...options,
        canonicalSourceHashes: {
          "policies/core.md": checksum("canonical policy bytes"),
        },
      },
      fs,
    );
    const manifest = JSON.parse(
      await fs.read("/project/.aif/manifest.lock.json"),
    );
    expect(manifest.sourceHashes).toEqual([
      {
        id: "policies/core.md",
        checksum: checksum("canonical policy bytes"),
      },
    ]);
  });
});
