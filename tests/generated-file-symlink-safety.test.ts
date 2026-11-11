import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checksum, type GeneratedFile } from "@intentloom/core";
import { describe, expect, it } from "vitest";
import {
  nodeFileSystem,
  synchronizeGeneratedFiles,
} from "../packages/application/src/index.js";

function generatedFile(path: string, content: string): GeneratedFile {
  return {
    path,
    content,
    sources: ["adapter:codex"],
    checksum: checksum(content),
  };
}

describe("generated-file symlink safety", () => {
  it("rejects a symlinked destination that points outside the project", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "aif-owned-symlink-"));
    const project = join(sandbox, "project");
    const external = join(sandbox, "external.md");
    await mkdir(project);
    await writeFile(external, "sentinel");
    await symlink(external, join(project, "AGENTS.md"));

    const result = await synchronizeGeneratedFiles(
      project,
      [generatedFile("AGENTS.md", "owned contents\n")],
      nodeFileSystem,
    );

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("generated-commit");
    expect(result.diagnostics).toEqual(["security-error: AGENTS.md"]);
    expect(result.rollbackAttempted).toBe(true);
    expect(result.rollbackCompleted).toBe(true);
    expect(result.rollbackFailures).toEqual([]);
    expect(await readFile(external, "utf8")).toBe("sentinel");
    expect(await readFile(join(project, "AGENTS.md"), "utf8")).toBe("sentinel");
  });

  it("rejects a symlinked parent that leads outside the project", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "aif-owned-parent-link-"));
    const project = join(sandbox, "project");
    const external = join(sandbox, "external");
    await mkdir(project);
    await mkdir(external);
    const sentinel = join(external, "sentinel.txt");
    await writeFile(sentinel, "unchanged");
    await symlink(external, join(project, ".cursor"));

    const result = await synchronizeGeneratedFiles(
      project,
      [generatedFile(".cursor/rules.md", "owned rule\n")],
      nodeFileSystem,
    );

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("generated-commit");
    expect(result.diagnostics).toEqual(["security-error: .cursor/rules.md"]);
    expect(result.rollbackAttempted).toBe(true);
    expect(result.rollbackCompleted).toBe(true);
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
    await expect(readFile(join(external, "rules.md"), "utf8")).rejects.toThrow(
      "ENOENT",
    );
  });

  it("rejects a broken destination symlink without creating its external target", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "aif-owned-broken-link-"));
    const project = join(sandbox, "project");
    const external = join(sandbox, "external");
    await mkdir(project);
    await mkdir(external);
    const target = join(external, "created-by-escape.md");
    await symlink(target, join(project, "AGENTS.md"));

    const result = await synchronizeGeneratedFiles(
      project,
      [generatedFile("AGENTS.md", "owned contents\n")],
      nodeFileSystem,
    );

    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]).toBe("security-error: AGENTS.md");
    await expect(readFile(target, "utf8")).rejects.toThrow("ENOENT");
  });
});
