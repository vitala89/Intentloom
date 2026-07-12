import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
  syncProject,
} from "@aif/cli";

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
});
