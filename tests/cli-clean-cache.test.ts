import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  writeCachedProviderResult,
  type ProviderCacheStore,
} from "../packages/evidence-provider/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

class MemoryProviderCacheStore implements ProviderCacheStore {
  readonly files = new Map<string, string>();

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error("cache-miss");
    return content;
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async remove(path: string): Promise<void> {
    for (const key of this.files.keys()) {
      if (key === path || key.startsWith(`${path}${sep}`))
        this.files.delete(key);
    }
  }
}

describe("clean cache CLI", () => {
  it("purges provider cache without touching project files", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-clean-cache-"));
    try {
      const cacheRoot = join(root, ".aif/cache/providers/github/cache-entry");
      await mkdir(cacheRoot, { recursive: true });
      await writeFile(join(cacheRoot, "evidence.json"), "cached", "utf8");
      await writeFile(join(root, "project.txt"), "project-owned", "utf8");
      const output: string[] = [];

      const exitCode = await runCli(
        ["clean", "--cache", "--root", root, "--json"],
        { catalogRoot: resolve("catalog") },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toMatchObject({
        status: "purged",
        cachePath: ".aif/cache/providers",
      });
      await expect(rm(join(root, ".aif/cache/providers"))).rejects.toThrow();
      await expect(readFile(join(root, "project.txt"), "utf8")).resolves.toBe(
        "project-owned",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("supports provider scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-clean-scope-"));
    const store = new MemoryProviderCacheStore();
    try {
      store.files.set(
        join(root, ".aif/cache/providers/github/one/evidence.json"),
        "one",
      );
      store.files.set(
        join(root, ".aif/cache/providers/github/two/evidence.json"),
        "two",
      );
      store.files.set(
        join(root, ".aif/cache/providers/gitlab/one/evidence.json"),
        "gitlab",
      );
      const providerOutput: string[] = [];

      const providerExitCode = await runCli(
        ["clean", "--cache", "--root", root, "--provider", "github", "--json"],
        { catalogRoot: resolve("catalog"), providerCacheStore: store },
        {
          stdout: (message) => providerOutput.push(message),
          stderr: () => undefined,
        },
      );

      expect(providerExitCode).toBe(0);
      expect(store.files.size).toBe(1);
      expect([...store.files.keys()][0]).toContain(`${sep}gitlab${sep}`);
      expect(JSON.parse(providerOutput.join("\n"))).toMatchObject({
        provider: "github",
        projectKey: null,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("supports project scope within one provider", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-clean-project-"));
    const store = new MemoryProviderCacheStore();
    const cache = {
      rootDirectory: join(root, ".aif/cache/providers"),
      store,
    };
    const result = (projectKey: string) => ({
      operationVersion: 1 as const,
      source: "provider-live" as const,
      provider: "github" as const,
      projectKey,
      trust: "provider-supplied-unverified" as const,
      status: "available" as const,
      events: [],
      diagnostics: [],
    });
    try {
      await writeCachedProviderResult(result("org/one"), cache);
      await writeCachedProviderResult(result("org/two"), cache);
      const output: string[] = [];

      const exitCode = await runCli(
        [
          "clean",
          "--cache",
          "--root",
          root,
          "--provider",
          "github",
          "--project-key",
          "org/one",
          "--json",
        ],
        { catalogRoot: resolve("catalog"), providerCacheStore: store },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(store.files.size).toBe(1);
      expect(JSON.parse(output.join("\n"))).toMatchObject({
        provider: "github",
        projectKey: "org/one",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a project scope without a provider", async () => {
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      ["clean", "--cache", "--project-key", "org/repo", "--json"],
      { catalogRoot: resolve("catalog") },
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(errors.join("\n")).toContain(
      "clean --project-key requires --provider",
    );
  });
});
