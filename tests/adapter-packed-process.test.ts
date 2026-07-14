import { execFileSync, spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(".");
const windows = process.platform === "win32";
const command = (name: string) => (windows ? `${name}.cmd` : name);
let packRoot: string;
let packedCli: string;

function aif(args: string[]) {
  const quoteForWindowsCommand = (value: string) => {
    if (/[&|<>()^%!"]/u.test(value)) {
      throw new Error("Windows packed CLI test arguments must be shell-safe.");
    }
    return `"${value}"`;
  };
  const result = windows
    ? spawnSync(
        "cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          `"${quoteForWindowsCommand(packedCli)} ${args
            .map(quoteForWindowsCommand)
            .join(" ")}"`,
        ],
        { encoding: "utf8" },
      )
    : spawnSync(packedCli, args, { encoding: "utf8" });
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function project(name: string) {
  const root = join(packRoot, name);
  await mkdir(root, { recursive: true });
  return root;
}

beforeAll(async () => {
  execFileSync(command("pnpm"), ["build"], {
    cwd: repositoryRoot,
    stdio: "pipe",
    shell: windows,
  });
  packRoot = await mkdtemp(join(tmpdir(), "aif-adapter-packed-"));
  execFileSync(
    command("pnpm"),
    ["--filter", "@aif/cli", "pack", "--pack-destination", packRoot],
    { cwd: repositoryRoot, stdio: "pipe", shell: windows },
  );
  const tarball = join(
    packRoot,
    (await readdir(packRoot)).find((entry) => entry.endsWith(".tgz"))!,
  );
  const runtime = join(packRoot, "runtime with spaces");
  await mkdir(runtime);
  execFileSync(
    command("npm"),
    [
      "install",
      "--cache",
      join(packRoot, "npm-cache"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    { cwd: runtime, stdio: "pipe", shell: windows },
  );
  packedCli = join(runtime, `node_modules/.bin/aif${windows ? ".cmd" : ""}`);
}, 30_000);

afterAll(async () => {
  await rm(packRoot, { recursive: true, force: true });
});

describe("packed adapter compatibility matrix", () => {
  it.each(["claude", "codex", "cursor", "copilot"])(
    "generates the %s adapter outside the monorepo",
    async (adapter) => {
      const root = await project(`packed-${adapter}`);
      expect(aif(["init", "--root", root, "--adapters", adapter]).status).toBe(
        0,
      );
      expect(await readdir(root)).toContain(".aif");
    },
  );

  it("generates all adapters without duplicate destinations", async () => {
    const root = await project("packed-all");
    const result = aif([
      "init",
      "--root",
      root,
      "--adapters",
      "copilot,cursor,codex,claude",
    ]);
    expect(result.status).toBe(0);
    const entries = await readdir(root, { recursive: true });
    expect(entries.filter((entry) => entry === "AGENTS.md")).toHaveLength(1);
  });

  it("performs a second all-adapter sync with zero changes", async () => {
    const root = await project("packed-no-op");
    expect(
      aif(["init", "--root", root, "--adapters", "claude,codex,cursor,copilot"])
        .status,
    ).toBe(0);
    const result = aif(["sync", "--root", root]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No changes required.");
  });

  it("doctors an all-adapter installation", async () => {
    const root = await project("packed-doctor-all");
    expect(
      aif(["init", "--root", root, "--adapters", "claude,codex,cursor,copilot"])
        .status,
    ).toBe(0);
    const result = aif(["doctor", "--root", root, "--json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "installation-healthy" }),
      ]),
    );
  });

  it("dry-runs an ownership conflict without writing metadata", async () => {
    const root = await project("packed-conflict");
    await writeFile(join(root, "AGENTS.md"), "project-owned\n");
    const result = aif([
      "init",
      "--root",
      root,
      "--adapters",
      "codex,cursor,copilot",
      "--dry-run",
    ]);
    expect(result.status).toBe(3);
    expect(await readdir(root)).not.toContain(".aif");
  });

  it.each(["project with spaces", "unicode-ü-项目"])(
    "works in %s",
    async (name) => {
      const root = await project(name);
      expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(
        0,
      );
    },
  );

  it("stores only portable relative metadata paths", async () => {
    const root = await project("packed-portable-metadata");
    expect(
      aif(["init", "--root", root, "--adapters", "claude,codex"]).status,
    ).toBe(0);
    for (const file of [".aif/manifest.lock.json", ".aif/source-map.json"]) {
      const source = await readFile(join(root, file), "utf8");
      expect(source).not.toContain(root);
      const metadata = JSON.parse(source);
      const records = metadata.generated ?? metadata.files;
      for (const record of records) {
        expect(record.path).not.toMatch(/^(?:[A-Za-z]:|[\\/])/u);
        expect(record.path).not.toContain("\\");
      }
    }
  });

  it("reports the unchanged framework version", () => {
    expect(aif(["--version"]).stdout.trim()).toBe("0.1.0-alpha.0");
  });
});
