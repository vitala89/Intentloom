import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSpecializedPacksCliCommand } from "@intentloom/application";

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-specialized-cli-"));
  await mkdir(join(root, "apps", "desktop", "src-tauri"), { recursive: true });
  await mkdir(join(root, "apps", "desktop", "src"), { recursive: true });
  await mkdir(join(root, "apps", "desktop", "src-tauri", "src"), {
    recursive: true,
  });
  await writeFile(join(root, "apps", "desktop", "src-tauri", "Cargo.toml"), "");
  await writeFile(
    join(root, "apps", "desktop", "src-tauri", "src", "main.rs"),
    "",
  );
  await writeFile(join(root, "apps", "desktop", "src", "App.tsx"), "");
  return root;
}

describe("Specialized Engineering Packs Phase S6: CLI Surface", () => {
  it("executes specialized-packs list returning catalog viewmodel", async () => {
    const res = await runSpecializedPacksCliCommand("list", { json: true });
    expect(res.exitCode).toBe(0);
    const parsed = JSON.parse(res.stdout) as { totalEntries: number };
    expect(parsed.totalEntries).toBe(4);
  });

  it("executes specialized-packs explain for a pack id", async () => {
    const res = await runSpecializedPacksCliCommand("explain", {
      packId: "pack-tauri-desktop",
      json: true,
    });
    expect(res.exitCode).toBe(0);
    const parsed = JSON.parse(res.stdout) as { packId: string };
    expect(parsed.packId).toBe("pack-tauri-desktop");
  });

  it("executes specialized-packs detect from project root paths", async () => {
    const root = await fixtureRoot();
    try {
      const res = await runSpecializedPacksCliCommand("detect", {
        root,
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout) as { compatiblePackIds: string[] };
      expect(parsed.compatiblePackIds).toContain("pack-tauri-desktop");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("executes read-only specialized-packs checks with stable JSON and exit code", async () => {
    const root = await fixtureRoot();
    try {
      const before = await readdir(root, { recursive: true });
      const res = await runSpecializedPacksCliCommand("checks", {
        root,
        json: true,
      });
      const after = await readdir(root, { recursive: true });
      expect(res.exitCode).toBe(0);
      expect(JSON.parse(res.stdout)).toMatchObject({
        activePackIds: ["pack-tauri-desktop"],
        failedCount: 0,
        blockingFailureCount: 0,
      });
      expect(after).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns exit code 1 when a deterministic check fails", async () => {
    const res = await runSpecializedPacksCliCommand("checks", {
      root: "/workspace/project",
      json: true,
      fs: { list: async () => ["apps/desktop/src-tauri/Cargo.toml"] },
    });
    expect(res.exitCode).toBe(1);
    expect(JSON.parse(res.stdout)).toMatchObject({ failedCount: 1 });
  });
});
