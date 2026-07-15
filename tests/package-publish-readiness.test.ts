import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
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
let tarball: string;

function tarEntries(archive: Buffer) {
  const tar = gunzipSync(archive);
  const entries: string[] = [];
  for (let offset = 0; offset < tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/u, "");
    const prefix = header
      .subarray(345, 500)
      .toString("utf8")
      .replace(/\0.*$/u, "");
    const size = Number.parseInt(
      header.subarray(124, 136).toString("utf8").replace(/\0.*$/u, "").trim(),
      8,
    );
    entries.push(prefix ? `${prefix}/${name}` : name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries.sort();
}

function tarPayloadChecksums(archive: Buffer) {
  const tar = gunzipSync(archive);
  const checksums: string[] = [];
  for (let offset = 0; offset < tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/u, "");
    const prefix = header
      .subarray(345, 500)
      .toString("utf8")
      .replace(/\0.*$/u, "");
    const size = Number.parseInt(
      header.subarray(124, 136).toString("utf8").replace(/\0.*$/u, "").trim(),
      8,
    );
    const path = prefix ? `${prefix}/${name}` : name;
    const payload = tar.subarray(offset + 512, offset + 512 + size);
    checksums.push(
      `${path}:${size}:${createHash("sha256").update(payload).digest("hex")}`,
    );
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return checksums.sort();
}

function pack(destination: string) {
  execFileSync(
    command("pnpm"),
    ["--filter", "./packages/cli", "pack", "--pack-destination", destination],
    { cwd: repositoryRoot, stdio: "pipe", shell: windows },
  );
}

async function install(packageManager: "npm" | "pnpm") {
  const runtime = join(packRoot, `${packageManager}-runtime with spaces`);
  await mkdir(runtime);
  execFileSync(
    command(packageManager),
    packageManager === "npm"
      ? [
          "install",
          "--cache",
          join(packRoot, `${packageManager}-cache`),
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          tarball,
        ]
      : [
          "add",
          "--ignore-scripts",
          "--store-dir",
          join(packRoot, `${packageManager}-cache`),
          tarball,
        ],
    { cwd: runtime, stdio: "pipe", shell: windows },
  );
  return runtime;
}

beforeAll(async () => {
  execFileSync(command("pnpm"), ["build"], {
    cwd: repositoryRoot,
    stdio: "pipe",
    shell: windows,
  });
  packRoot = await mkdtemp(join(tmpdir(), "aif-publish-readiness-"));
  const first = join(packRoot, "first");
  const second = join(packRoot, "second");
  await Promise.all([mkdir(first), mkdir(second)]);
  pack(first);
  pack(second);
  tarball = join(
    first,
    (await readdir(first)).find((file) => file.endsWith(".tgz"))!,
  );
  const repeatedTarball = join(
    second,
    (await readdir(second)).find((file) => file.endsWith(".tgz"))!,
  );
  expect(tarEntries(await readFile(tarball))).toEqual(
    tarEntries(await readFile(repeatedTarball)),
  );
  expect(tarPayloadChecksums(await readFile(tarball))).toEqual(
    tarPayloadChecksums(await readFile(repeatedTarball)),
  );
}, 30_000);

afterAll(async () => {
  await rm(packRoot, { recursive: true, force: true });
});

describe("public package publishing readiness", () => {
  it("has complete public metadata and private internal workspace packages", async () => {
    const cli = JSON.parse(
      await readFile(join(repositoryRoot, "packages/cli/package.json"), "utf8"),
    );
    expect(cli).toMatchObject({
      name: "aif-core",
      version: "0.1.0-alpha.1",
      license: "MIT",
      private: false,
      homepage: "https://github.com/vitala89/aif-core#readme",
      bugs: { url: "https://github.com/vitala89/aif-core/issues" },
      engines: { node: ">=22" },
      bin: { aif: "dist/aif.cjs" },
      exports: { "./package.json": "./package.json" },
      publishConfig: { access: "public" },
    });
    for (const packageName of ["core", "adapters", "validator"]) {
      const manifest = JSON.parse(
        await readFile(
          join(repositoryRoot, "packages", packageName, "package.json"),
          "utf8",
        ),
      );
      expect(manifest.private).toBe(true);
    }
  });

  it("contains only the public runtime allowlist", async () => {
    const entries = tarEntries(await readFile(tarball));
    expect(entries).toEqual(
      expect.arrayContaining([
        "package/LICENSE",
        "package/README.md",
        "package/package.json",
        "package/dist/aif.cjs",
        "package/dist/catalog/schemas/aif-config.schema.json",
      ]),
    );
    expect(
      entries.some((entry) =>
        /(?:^|\/)(?:tests?|fixtures?|\.env|\.idea)(?:\/|$)/u.test(entry),
      ),
    ).toBe(false);
    expect(entries.some((entry) => entry.includes(repositoryRoot))).toBe(false);
  });

  it.each(["npm", "pnpm"] as const)(
    "installs with %s and runs the offline CLI workflow",
    async (packageManager) => {
      const runtime = await install(packageManager);
      const entry = resolvePackedCliEntry(runtime);
      const root = join(runtime, "project");
      await mkdir(root);
      expect(runPackedCli(entry, ["--help"], runtime).status).toBe(0);
      expect(runPackedCli(entry, ["--version"], runtime).stdout.trim()).toBe(
        "0.1.0-alpha.1",
      );
      expect(
        runPackedCli(
          entry,
          ["init", "--root", root, "--adapters", "codex"],
          runtime,
        ).status,
      ).toBe(0);
      expect(
        runPackedCli(entry, ["adopt", "--root", root, "--dry-run"], runtime)
          .status,
      ).toBe(0);
      expect(
        runPackedCli(entry, ["doctor", "--root", root], runtime).status,
      ).toBe(0);
      expect(
        runPackedCli(entry, ["sync", "--root", root], runtime).stdout,
      ).toContain("No changes required.");
      expect(
        runPackedCli(entry, ["sync", "--root", root], runtime).status,
      ).toBe(0);
      if (packageManager === "npm") {
        const metadata = spawnSync(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            'import manifest from "aif-core/package.json" with { type: "json" }; console.log(manifest.name);',
          ],
          { cwd: runtime, encoding: "utf8" },
        );
        expect(metadata.status).toBe(0);
        expect(metadata.stdout.trim()).toBe("aif-core");
        const deepImport = spawnSync(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            'import("aif-core").catch((error) => console.log(error.code));',
          ],
          { cwd: runtime, encoding: "utf8" },
        );
        expect(deepImport.status).toBe(0);
        expect(deepImport.stdout.trim()).toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");
      }
    },
    30_000,
  );

  it.runIf(windows)("exposes the installed command shim", () => {
    const runtime = join(packRoot, "npm-runtime with spaces");
    expect(
      runPackedCommandShim(packedCommandShim(runtime), ["--help"], runtime)
        .status,
    ).toBe(0);
  });
});
