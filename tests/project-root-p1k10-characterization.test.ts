import { mkdir, mkdtemp, readdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertCanonicalProjectRoot,
  nodeFileSystem,
  ProjectRootError,
  timelineProject,
  type FileSystem,
} from "@intentloom/application";
import type { GitRunner } from "@intentloom/evidence-git";

const scratch: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function tempDir(name: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `intentloom-p1k10-${name}-`));
  scratch.push(path);
  return path;
}

function filesystem(overrides: Partial<FileSystem> = {}): {
  fs: FileSystem;
  calls: { method: "exists" | "isSymbolicLink"; path: string }[];
} {
  const calls: { method: "exists" | "isSymbolicLink"; path: string }[] = [];
  const fs: FileSystem = {
    async exists(path) {
      calls.push({ method: "exists", path });
      if (overrides.exists) return overrides.exists(path);
      return false;
    },
    async isSymbolicLink(path) {
      calls.push({ method: "isSymbolicLink", path });
      if (overrides.isSymbolicLink) return overrides.isSymbolicLink(path);
      return false;
    },
    read: overrides.read ?? (async () => ""),
    write: overrides.write ?? (async () => undefined),
    mkdir: overrides.mkdir ?? (async () => undefined),
    remove: overrides.remove ?? (async () => undefined),
    list: overrides.list ?? (async () => []),
    realpath: overrides.realpath ?? (async (path) => path),
  };
  return { fs, calls };
}

function commitRecord(id: string, timestamp: number, path?: string): string {
  const header = `${id}\u0000\u0000${timestamp}`;
  return path === undefined ? header : `${header}\n${path}`;
}

function recordingRunner(
  stdout: string,
  fail = false,
): {
  run: GitRunner;
  seen: {
    args: readonly string[];
    cwd: string;
    timeout: number;
    maxBuffer: number;
  }[];
} {
  const seen: {
    args: readonly string[];
    cwd: string;
    timeout: number;
    maxBuffer: number;
  }[] = [];
  const run: GitRunner = async (_file, args, options) => {
    seen.push({
      args,
      cwd: options.cwd,
      timeout: options.timeout,
      maxBuffer: options.maxBuffer,
    });
    if (fail) throw new Error("git-down");
    return { stdout, stderr: "" };
  };
  return { run, seen };
}

async function skipWithoutSymlinks(
  context: { skip: (reason?: string) => void },
  create: () => Promise<void>,
): Promise<boolean> {
  try {
    await create();
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "ENOTSUP") {
      context.skip("platform cannot create the link");
      return false;
    }
    throw error;
  }
}

describe("P1K.10 project root characterization", () => {
  it("rejects a missing root after exists and does not call isSymbolicLink", async () => {
    const tracked = filesystem();
    const root = "p1k10-missing-relative";
    await expect(
      assertCanonicalProjectRoot(root, tracked.fs),
    ).rejects.toMatchObject({
      name: "ProjectRootError",
      message: "project root does not exist",
      clientErrorCode: "invalid_root",
    });
    expect(tracked.calls).toEqual([{ method: "exists", path: resolve(root) }]);
  });

  it("checks an existing root with exists then isSymbolicLink on the same filesystem", async () => {
    const tracked = filesystem({
      exists: async () => true,
      isSymbolicLink: async () => false,
    });
    const canonical = await assertCanonicalProjectRoot("/proj", tracked.fs);
    expect(canonical).toBe(resolve("/proj"));
    expect(tracked.calls).toEqual([
      { method: "exists", path: resolve("/proj") },
      { method: "isSymbolicLink", path: resolve("/proj") },
    ]);
  });

  it("propagates a custom exists failure and skips isSymbolicLink", async () => {
    const tracked = filesystem({
      exists: async () => {
        throw new Error("exists-boom");
      },
    });
    await expect(
      assertCanonicalProjectRoot("/proj", tracked.fs),
    ).rejects.toThrow("exists-boom");
    expect(tracked.calls.map((call) => call.method)).toEqual(["exists"]);
  });

  it("propagates a custom isSymbolicLink failure after exists succeeds", async () => {
    const tracked = filesystem({
      exists: async () => true,
      isSymbolicLink: async () => {
        throw new Error("link-boom");
      },
    });
    await expect(
      assertCanonicalProjectRoot("/proj", tracked.fs),
    ).rejects.toThrow("link-boom");
    expect(tracked.calls.map((call) => call.method)).toEqual([
      "exists",
      "isSymbolicLink",
    ]);
  });

  it("accepts a directory and a regular file", async () => {
    const parent = await tempDir("paths");
    const directory = join(parent, "dir");
    const file = join(parent, "file.txt");
    await mkdir(directory);
    await writeFile(file, "x");
    expect(await assertCanonicalProjectRoot(directory)).toBe(
      resolve(directory),
    );
    expect(await assertCanonicalProjectRoot(file)).toBe(resolve(file));
  });

  it("resolves a relative root lexically without changing the process cwd", async () => {
    const parent = await tempDir("relative");
    const directory = join(parent, "dir");
    await mkdir(directory);
    const cwd = process.cwd();
    const fromCwd = relative(cwd, directory);
    expect(await assertCanonicalProjectRoot(fromCwd)).toBe(resolve(fromCwd));
    expect(process.cwd()).toBe(cwd);
  });

  it("reports nodeFileSystem swallows as invalid_root for a missing path", async () => {
    const missing = join(await tempDir("missing"), "absent");
    expect(await nodeFileSystem.exists(missing)).toBe(false);
    expect(await nodeFileSystem.isSymbolicLink(missing)).toBe(false);
    await expect(assertCanonicalProjectRoot(missing)).rejects.toBeInstanceOf(
      ProjectRootError,
    );
    await expect(assertCanonicalProjectRoot(missing)).rejects.toMatchObject({
      clientErrorCode: "invalid_root",
      message: "project root does not exist",
    });
  });

  it("rejects a direct symlink and a dangling symlink differently", async (context) => {
    const parent = await tempDir("links");
    const target = join(parent, "target");
    const direct = join(parent, "direct");
    const dangling = join(parent, "dangling");
    await mkdir(target);
    const created = await skipWithoutSymlinks(context, async () => {
      await symlink(target, direct, "dir");
      await symlink(join(parent, "missing"), dangling);
    });
    if (!created) return;
    await expect(assertCanonicalProjectRoot(direct)).rejects.toMatchObject({
      name: "ProjectRootError",
      clientErrorCode: "stale_root",
      message: "project root is a symbolic link and is not stable",
    });
    await expect(assertCanonicalProjectRoot(dangling)).rejects.toMatchObject({
      clientErrorCode: "invalid_root",
      message: "project root does not exist",
    });
  });

  it("accepts a non-symlink leaf reached through a parent symlink", async (context) => {
    const parent = await tempDir("parent-link");
    const real = join(parent, "real");
    const via = join(parent, "via");
    await mkdir(join(real, "leaf"), { recursive: true });
    const created = await skipWithoutSymlinks(context, async () => {
      await symlink(real, via, "dir");
    });
    if (!created) return;
    const leaf = join(via, "leaf");
    expect(await assertCanonicalProjectRoot(leaf)).toBe(resolve(leaf));
    expect(resolve(leaf)).not.toBe(resolve(join(real, "leaf")));
  });

  it("does not call the git runner when root validation throws", async () => {
    const run = vi.fn<GitRunner>();
    const missing = join(await tempDir("no-git"), "absent");
    await expect(
      timelineProject({ root: missing, caseId: "release:missing", run }),
    ).rejects.toMatchObject({ clientErrorCode: "invalid_root" });
    expect(run).not.toHaveBeenCalled();
  });

  it("passes evidence defaults and explicit bounds through to the runner", async () => {
    const parent = await tempDir("runner");
    const id = "a".repeat(40);
    const defaults = recordingRunner(commitRecord(id, 1, "README.md"));
    const complete = await timelineProject({
      root: parent,
      caseId: "release:complete",
      run: defaults.run,
    });
    expect(defaults.seen[0]).toMatchObject({
      cwd: resolve(parent),
      timeout: 5_000,
      maxBuffer: 512 * 1024,
    });
    expect(defaults.seen[0]?.args).toContain("--max-count");
    expect(defaults.seen[0]?.args.at(-1)).toBe("50");
    expect(complete.quality).toBe("complete");
    expect(complete.findings).toEqual([]);
    expect(complete.diagnostics).toEqual([]);

    const explicit = recordingRunner(commitRecord(id, 1, "README.md"));
    await timelineProject({
      root: parent,
      caseId: "release:explicit",
      limit: 2,
      timeoutMs: 200,
      maxOutputBytes: 8_192,
      run: explicit.run,
    });
    expect(explicit.seen[0]).toMatchObject({
      timeout: 200,
      maxBuffer: 8_192,
    });
    expect(explicit.seen[0]?.args.at(-1)).toBe("2");
  });

  it("sorts events and maps bounded and unavailable evidence", async () => {
    const parent = await tempDir("timeline");
    const before = await readdir(parent);
    const later = "b".repeat(40);
    const earlier = "a".repeat(40);
    const ordered = recordingRunner(
      [
        commitRecord(later, 20, "later.txt"),
        commitRecord(earlier, 10, "earlier.txt"),
      ].join("\n"),
    );
    const result = await timelineProject({
      root: parent,
      caseId: "release:order",
      run: ordered.run,
    });
    expect(result.events.map((event) => event.commitId)).toEqual([
      earlier,
      later,
    ]);
    expect(result.root).toBe(resolve(parent));

    const bounded = recordingRunner(commitRecord(earlier, 1, "one.txt"));
    const limited = await timelineProject({
      root: parent,
      caseId: "release:bounded",
      limit: 1,
      run: bounded.run,
    });
    expect(limited.quality).toBe("bounded");
    expect(limited.findings).toEqual(["evidence-bounded"]);
    expect(limited.diagnostics).toEqual(["commit-limit-reached"]);

    const failed = recordingRunner("", true);
    const unavailable = await timelineProject({
      root: parent,
      caseId: "release:down",
      run: failed.run,
    });
    expect(unavailable.quality).toBe("unavailable");
    expect(unavailable.findings).toEqual(["evidence-unavailable"]);
    expect(unavailable.diagnostics).toEqual(["git-unavailable"]);
    expect(await readdir(parent)).toEqual(before);
  });

  it("keeps the CLI off application root checks and the daemon on timelineProject", () => {
    const cli = readFileSync("packages/cli/src/timeline-command.ts", "utf8");
    const daemon = readFileSync("packages/daemon/src/bin.ts", "utf8");
    expect(cli).not.toContain("assertCanonicalProjectRoot");
    expect(cli).toContain("collectGitEvidence");
    expect(daemon).toContain("timelineProject");
    expect(daemon).not.toContain("assertCanonicalProjectRoot");
  });
});
