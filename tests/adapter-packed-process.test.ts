import { execFileSync } from "node:child_process";
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
import {
  packedCommandShim,
  resolvePackedCliEntry,
  runPackedCli,
  runPackedCommandShim,
} from "./helpers/packed-cli.js";

const repositoryRoot = resolve(".");
const windows = process.platform === "win32";
const command = (name: string) => (windows ? `${name}.cmd` : name);
let packRoot: string;
let packedCliEntry: string;
let runtime: string;

function aif(args: string[]) {
  return runPackedCli(packedCliEntry, args, runtime);
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
    ["--filter", "./packages/cli", "pack", "--pack-destination", packRoot],
    { cwd: repositoryRoot, stdio: "pipe", shell: windows },
  );
  const tarball = join(
    packRoot,
    (await readdir(packRoot)).find((entry) => entry.endsWith(".tgz"))!,
  );
  runtime = join(packRoot, "runtime with spaces");
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
  packedCliEntry = resolvePackedCliEntry(runtime);
}, 30_000);

afterAll(async () => {
  await rm(packRoot, { recursive: true, force: true });
});

describe("packed adapter compatibility matrix", () => {
  it.runIf(windows)("Windows command shim reports help and version", () => {
    const shim = packedCommandShim(runtime);
    expect(runPackedCommandShim(shim, ["--help"], runtime).status).toBe(0);
    expect(
      runPackedCommandShim(shim, ["--version"], runtime).stdout.trim(),
    ).toBe("0.1.0-beta.1");
  });

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

  it("inspects an installed project through the packed CLI", async () => {
    const root = await project("packed-inspect");
    expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(0);
    const result = aif(["inspect", "--root", root, "--json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      operationVersion: 1,
      readiness: "ready",
      detectedAdapters: ["codex", "cursor"],
    });
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
  }, 15_000);

  it("reports the unchanged framework version", () => {
    expect(aif(["--version"]).stdout.trim()).toBe("0.1.0-beta.1");
  });
});
