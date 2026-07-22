import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";

describe("project inspection", () => {
  it("reports bounded project facts deterministically without writing", async () => {
    const fs = createMemoryFileSystem({
      "/project/package.json": JSON.stringify({
        devDependencies: { typescript: "5.0.0" },
      }),
      "/project/tsconfig.json": "{}",
      "/project/AGENTS.md": "project guidance",
      "/project/.cursor/rules/project.mdc": "rule",
      "/project/.aif/config.yaml": "profile: typescript",
      "/project/.aif/manifest.lock.json": "{}",
      "/project/.aif/source-map.json": "{}",
    });
    const before = [...fs.files.entries()];

    const first = await inspectProject("/project", fs);
    const second = await inspectProject("/project", fs);

    expect(second).toEqual(first);
    expect([...fs.files.entries()]).toEqual(before);
    expect(first.profileDetection.selectedProfile).toBe("typescript");
    expect(first.detectedAdapters).toEqual(["codex", "cursor"]);
    expect(first.instructionPaths).toEqual([
      ".cursor/rules/project.mdc",
      "AGENTS.md",
    ]);
    expect(first.readiness).toBe("ready");
    expect(first.capabilities).toEqual(["project.files.read"]);
  });

  it("does not expose secret-like paths in structured inspection output", async () => {
    const fs = createMemoryFileSystem({
      "/project/.env": "DATABASE_URL=private",
      "/project/keys/release.pem": "private key",
      "/project/README.md": "safe",
    });

    const result = await inspectProject("/project", fs);

    expect(JSON.stringify(result)).not.toContain(".env");
    expect(JSON.stringify(result)).not.toContain("release.pem");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("private key");
  });

  it("rejects a symbolic-link project root without following it", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-inspection-"));
    const target = join(parent, "target");
    const root = join(parent, "project");
    await mkdir(target);
    await symlink(target, root);
    try {
      const result = await inspectProject(root, nodeFileSystem);

      expect(result.findings).toEqual([
        expect.objectContaining({ code: "inspection-root-symlink" }),
      ]);
      expect(result.instructionPaths).toEqual([]);
      expect(result.intentloomMetadata.every((item) => !item.present)).toBe(
        true,
      );
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
