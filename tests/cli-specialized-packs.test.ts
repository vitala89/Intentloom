import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSpecializedPacksCliCommand } from "@intentloom/application";

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-specialized-cli-"));
  await mkdir(join(root, "apps", "desktop", "src-tauri"), { recursive: true });
  await mkdir(join(root, "apps", "desktop", "src"), { recursive: true });
  await writeFile(join(root, "apps", "desktop", "src-tauri", "Cargo.toml"), "");
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
});
