import { mkdtemp, mkdir, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { doctorProject, nodeFileSystem } from "@aif/cli";

describe("doctor path security", () => {
  it("reports a symlinked metadata path without traversing or writing it", async () => {
    const parent = await mkdtemp(join(tmpdir(), "aif-doctor-security-"));
    const root = join(parent, "project");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await symlink(external, join(root, ".aif"));
    try {
      const result = await doctorProject(
        { root, profile: "generic", adapters: ["codex"] },
        nodeFileSystem,
      );
      expect(result.findings.map((finding) => finding.code)).toContain(
        "path-security-violation",
      );
      expect(await readdir(external)).toEqual([]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
