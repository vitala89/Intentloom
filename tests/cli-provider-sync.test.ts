import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  diffProject,
  initProject,
  nodeFileSystem,
  syncProject,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

async function createTestProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-provider-sync-"));
  await initProject(
    {
      root,
      catalogRoot: resolve("catalog"),
      adapters: ["cursor"],
    },
    nodeFileSystem,
  );
  // Prune to config.yaml only so sync handles fresh generation
  for (const entry of await readdir(root)) {
    const path = join(root, entry);
    if (entry !== ".aif") await rm(path, { recursive: true, force: true });
  }
  const aifDirectory = join(root, ".aif");
  for (const entry of await readdir(aifDirectory)) {
    if (entry !== "config.yaml")
      await rm(join(aifDirectory, entry), { recursive: true, force: true });
  }
  return root;
}

describe("provider synchronization CLI (intentloom sync and intentloom diff)", () => {
  it("detects drift between canonical policy and provider derivative files", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-provider-diff-"));
    await initProject(
      { root, catalogRoot: resolve("catalog"), adapters: ["cursor"] },
      nodeFileSystem,
    );
    try {
      await writeFile(
        join(root, ".cursor/rules/project.mdc"),
        "drifted content",
        "utf8",
      );

      const diff = await diffProject(
        { root, catalogRoot: resolve("catalog") },
        nodeFileSystem,
      );

      expect(diff.changes.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves user-owned local sections during provider sync", async () => {
    const root = await createTestProject();
    try {
      const syncResult = await syncProject(
        { root, catalogRoot: resolve("catalog"), adapters: ["cursor"] },
        nodeFileSystem,
      );

      expect(syncResult.status).toBe("success");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("executes intentloom diff via CLI returning diff proposal", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-provider-diff-cli-"));
    await initProject(
      {
        root,
        profile: "generic",
        catalogRoot: resolve("catalog"),
        adapters: ["cursor"],
      },
      nodeFileSystem,
    );
    try {
      const output: string[] = [];
      const exitCode = await runCli(
        ["diff", "--root", root, "--adapters", "cursor", "--json"],
        { catalogRoot: resolve("catalog") },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      const diff = JSON.parse(output.join("\n")) as Record<string, unknown>;
      expect(diff).toHaveProperty("changes");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("executes intentloom sync --dry-run via CLI without mutating files", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-provider-sync-cli-"));
    await initProject(
      {
        root,
        profile: "generic",
        catalogRoot: resolve("catalog"),
        adapters: ["cursor"],
      },
      nodeFileSystem,
    );
    try {
      const output: string[] = [];
      const exitCode = await runCli(
        ["sync", "--root", root, "--adapters", "cursor", "--dry-run", "--json"],
        { catalogRoot: resolve("catalog") },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
