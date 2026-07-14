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
  const quote = (value: string) => `"${value.replaceAll('"', '\\"')}"`;
  const result = windows
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `${quote(packedCli)} ${args.map(quote).join(" ")}`],
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
async function snapshot(root: string) {
  const entries = (await readdir(root, { recursive: true })).sort();
  return Promise.all(
    entries.map(async (entry) => {
      try {
        return [entry, await readFile(join(root, entry), "utf8")] as const;
      } catch {
        return [entry, null] as const;
      }
    }),
  );
}

beforeAll(async () => {
  execFileSync(command("pnpm"), ["build"], {
    cwd: repositoryRoot,
    stdio: "pipe",
    shell: windows,
  });
  packRoot = await mkdtemp(join(tmpdir(), "aif-adoption-packed-"));
  execFileSync(
    command("pnpm"),
    ["--filter", "@aif/cli", "pack", "--pack-destination", packRoot],
    { cwd: repositoryRoot, stdio: "pipe", shell: windows },
  );
  const tarball = join(
    packRoot,
    (await readdir(packRoot)).find((entry) => entry.endsWith(".tgz"))!,
  );
  const runtime = join(packRoot, "runtime");
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

describe("packed adoption and doctor fixture cases", () => {
  it("adoption dry-run analyzes a clean fixture without writes", async () => {
    const root = await project("clean fixture");
    const before = await snapshot(root);
    const result = aif(["adopt", "--root", root, "--dry-run", "--json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).kind).toBe("adoption-proposal");
    expect(await snapshot(root)).toEqual(before);
  });

  it("adoption preserves an existing AGENTS file", async () => {
    const root = await project("existing-agents");
    await writeFile(join(root, "AGENTS.md"), "project owned\n");
    const before = await snapshot(root);
    const result = aif(["adopt", "--root", root, "--dry-run", "--json"]);
    expect(result.status).toBe(3);
    expect(
      JSON.parse(result.stdout).items.find(
        (item: { path: string }) => item.path === "AGENTS.md",
      ).currentClassification,
    ).toBe("project-owned");
    expect(await snapshot(root)).toEqual(before);
  });

  it("adoption diagnoses a partial AIF fixture", async () => {
    const root = await project("partial-aif");
    await mkdir(join(root, ".aif"));
    await writeFile(
      join(root, ".aif/config.yaml"),
      "schemaVersion: '1'\nprofile: generic\nadapters: [codex]\n",
    );
    const before = await snapshot(root);
    const result = aif(["adopt", "--root", root, "--dry-run", "--json"]);
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".aif/manifest.lock.json",
          action: "create",
        }),
      ]),
    );
    expect(await snapshot(root)).toEqual(before);
  });

  it("adoption exits nonzero for a manual-only blocked proposal", async () => {
    const root = await project("manual-only-adoption");
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "ROADMAP.md"), "project roadmap\n");
    await writeFile(join(root, "docs/product-roadmap.md"), "other roadmap\n");
    const before = await snapshot(root);
    const result = aif(["adopt", "--root", root, "--dry-run", "--json"]);
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "manual-decision-required" }),
      ]),
    );
    expect(await snapshot(root)).toEqual(before);
  });

  it("doctor reports a healthy packed installation", async () => {
    const root = await project("healthy-doctor");
    await writeFile(join(root, "README.md"), "project\n");
    expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(0);
    const result = aif(["doctor", "--root", root, "--json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "installation-healthy" }),
      ]),
    );
  });

  it("doctor reports malformed metadata without leaking it", async () => {
    const root = await project("malformed-doctor");
    await mkdir(join(root, ".aif"));
    await writeFile(join(root, ".aif/config.yaml"), "PACKED-PRIVATE: [");
    const result = aif(["doctor", "--root", root, "--json"]);
    expect(result.status).toBe(3);
    expect(result.stdout).toContain("yaml-malformed");
    expect(result.stdout).not.toContain("PACKED-PRIVATE");
  });

  it("doctor reports drifted generated output", async () => {
    const root = await project("drifted-doctor");
    expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(0);
    await writeFile(join(root, "AGENTS.md"), "drift\n");
    const result = aif(["doctor", "--root", root, "--json"]);
    expect(result.status).toBe(3);
    expect(result.stdout).toContain("generated-checksum-drift");
  });

  it("repeated dry-run output is deterministic", async () => {
    const root = await project("deterministic-adopt ü");
    const args = ["adopt", "--root", root, "--dry-run", "--json"];
    expect(aif(args).stdout).toBe(aif(args).stdout);
  });

  it("repeated doctor output is deterministic", async () => {
    const root = await project("deterministic-doctor");
    expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(0);
    const args = ["doctor", "--root", root, "--json"];
    expect(aif(args).stdout).toBe(aif(args).stdout);
  });

  it("both packed commands preserve filesystem state", async () => {
    const root = await project("immutable packed");
    await writeFile(join(root, "README.md"), "project\n");
    const before = await snapshot(root);
    aif(["adopt", "--root", root, "--dry-run"]);
    aif(["doctor", "--root", root]);
    expect(await snapshot(root)).toEqual(before);
  });

  it("packed version remains unchanged", () => {
    expect(aif(["--version"]).stdout.trim()).toBe("0.1.0-alpha.0");
  });
});
