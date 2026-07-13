import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMemoryFileSystem,
  detectProjectProfiles,
  nodeFileSystem,
} from "@aif/cli";

describe("adoption profile detection", () => {
  it("selects Angular plus Tauri from deterministic repository evidence", async () => {
    const fs = createMemoryFileSystem({
      "/project/package.json": JSON.stringify({
        devDependencies: { "@angular/core": "20.0.0", typescript: "6.0.0" },
      }),
      "/project/angular.json": "{}",
      "/project/tsconfig.json": "{}",
      "/project/src-tauri/Cargo.toml": '[package]\nname = "desktop"\n',
      "/project/src-tauri/tauri.conf.json": "{}",
      "/project/node_modules/misleading/package.json": JSON.stringify({
        dependencies: { "@angular/core": "99.0.0" },
      }),
    });

    const first = await detectProjectProfiles("/project", fs);
    const second = await detectProjectProfiles("/project", fs);

    expect(first).toEqual(second);
    expect(first.selectedProfile).toBe("angular-tauri");
    expect(first.manualConfirmationRequired).toBe(false);
    expect(first.candidates.map((candidate) => candidate.profile)).toEqual([
      "angular-tauri",
      "angular",
      "tauri",
      "typescript",
      "rust",
      "generic",
    ]);
    expect(first.candidates[0]?.evidenceFiles).toEqual([
      "angular.json",
      "package.json",
      "src-tauri/Cargo.toml",
      "src-tauri/tauri.conf.json",
      "tsconfig.json",
    ]);
    expect(first.scannedPaths).not.toContain(
      "node_modules/misleading/package.json",
    );
  });

  it.each([
    ["generic", {}, "generic", false],
    ["TypeScript", { "/project/tsconfig.json": "{}" }, "typescript", false],
    ["Angular", { "/project/angular.json": "{}" }, "angular", false],
    ["Rust", { "/project/Cargo.toml": "[package]" }, "rust", false],
    [
      "Tauri",
      {
        "/project/src-tauri/Cargo.toml": "[package]",
        "/project/src-tauri/tauri.conf.json": "{}",
      },
      "tauri",
      false,
    ],
    [
      "ambiguous TypeScript and Rust",
      {
        "/project/tsconfig.json": "{}",
        "/project/Cargo.toml": "[package]",
      },
      "generic",
      true,
    ],
  ] as const)(
    "detects %s evidence",
    async (_name, files, selectedProfile, manualConfirmationRequired) => {
      const result = await detectProjectProfiles(
        "/project",
        createMemoryFileSystem(files),
      );
      expect(result.selectedProfile).toBe(selectedProfile);
      expect(result.manualConfirmationRequired).toBe(
        manualConfirmationRequired,
      );
    },
  );

  it("bounds native scanning and never traverses ignored or external trees", async () => {
    const parent = await mkdtemp(join(tmpdir(), "aif-adoption-scan-"));
    const root = join(parent, "project");
    const external = join(parent, "external");
    await mkdir(join(root, "node_modules", "misleading"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(external, { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export {};\n");
    await writeFile(
      join(root, "node_modules", "misleading", "package.json"),
      "{}",
    );
    await writeFile(join(external, "package.json"), "{}");
    await symlink(external, join(root, "linked-external"));
    try {
      expect(await nodeFileSystem.list(root)).toEqual(["src/index.ts"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("detects a nested application only from its explicit root", async () => {
    const fs = createMemoryFileSystem({
      "/repo/package.json": "{}",
      "/repo/apps/web ü/angular.json": "{}",
      "/repo/apps/other/Cargo.toml": "[package]",
    });
    const result = await detectProjectProfiles("/repo/apps/web ü", fs);
    expect(result.selectedProfile).toBe("angular");
    expect(result.scannedPaths).toEqual(["angular.json"]);
  });
});
