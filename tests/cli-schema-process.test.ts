import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(".");
const cli = resolve("packages/cli/dist/aif.cjs");

interface Execution {
  status: number;
  stdout: string;
  stderr: string;
}
function run(binary: string, args: string[], cwd = repositoryRoot): Execution {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
function aif(args: string[]) {
  return run(process.execPath, [cli, ...args]);
}
async function project() {
  const root = await mkdtemp(join(tmpdir(), "aif-schema-process-"));
  expect(aif(["init", "--root", root, "--adapters", "codex"]).status).toBe(0);
  return root;
}
async function snapshot(root: string) {
  const paths = (await readdir(root, { recursive: true })).sort();
  return Promise.all(
    paths.map(async (path) => {
      try {
        return [path, await readFile(join(root, path), "utf8")] as const;
      } catch {
        return [path, null] as const;
      }
    }),
  );
}

beforeAll(() => {
  execFileSync("pnpm", ["build"], { cwd: repositoryRoot, stdio: "pipe" });
});

describe("built CLI schema validation process cases", () => {
  it("sync rejects malformed config", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/config.yaml"), "schemaVersion: [", "utf8");
    expect(aif(["sync", "--root", root]).status).toBe(3);
  });
  it("sync rejects an unsupported config schema version", async () => {
    const root = await project();
    await writeFile(
      join(root, ".aif/config.yaml"),
      "schemaVersion: '2'\nprofile: generic\nadapters: [codex]\n",
      "utf8",
    );
    expect(aif(["sync", "--root", root]).status).toBe(3);
  });
  it("sync rejects malformed manifest JSON", async () => {
    const root = await project();
    await writeFile(
      join(root, ".aif/manifest.lock.json"),
      "{ malformed",
      "utf8",
    );
    expect(aif(["sync", "--root", root]).status).toBe(3);
  });
  it("sync rejects malformed source-map JSON", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/source-map.json"), "{ malformed", "utf8");
    expect(aif(["sync", "--root", root]).status).toBe(3);
  });
  it("diff rejects invalid metadata before producing a diff", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/source-map.json"), "null", "utf8");
    const outcome = aif(["diff", "--root", root]);
    expect(outcome.status).toBe(3);
    expect(outcome.stdout).toBe("");
  });
  it("doctor reports multiple schema errors including malformed skills", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/config.yaml"), "schemaVersion: [", "utf8");
    await writeFile(join(root, ".aif/manifest.lock.json"), "null", "utf8");
    const skill = join(root, "skills/bad/SKILL.md");
    await mkdir(join(root, "skills/bad"), { recursive: true });
    await writeFile(skill, "# no frontmatter\n", "utf8");
    const outcome = aif(["doctor", "--root", root]);
    expect(outcome.status).toBe(3);
    expect(outcome.stdout).toContain(".aif/config.yaml");
    expect(outcome.stdout).toContain(".aif/manifest.lock.json");
    expect(outcome.stdout).toContain("skills/bad/SKILL.md");
  });
  it("doctor never changes files", async () => {
    const root = await project();
    const before = await snapshot(root);
    aif(["doctor", "--root", root]);
    expect(await snapshot(root)).toEqual(before);
  });
  it("doctor separates cross-document semantic errors", async () => {
    const root = await project();
    const path = join(root, ".aif/manifest.lock.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    manifest.canonicalSourceId = "c".repeat(64);
    await writeFile(path, `${JSON.stringify(manifest)}\n`, "utf8");
    const outcome = aif(["doctor", "--root", root, "--json"]);
    expect(outcome.status).toBe(3);
    expect(JSON.parse(outcome.stdout).errors[0].phase).toBe("semantic");
  });
  it("doctor fails when an owned generated file is missing", async () => {
    const root = await project();
    await unlink(join(root, "AGENTS.md"));
    const outcome = aif(["doctor", "--root", root, "--json"]);
    expect(outcome.status).toBe(3);
    expect(
      JSON.parse(outcome.stdout).changes.some(
        (change: { kind: string; path: string }) =>
          change.kind === "missing" && change.path === "AGENTS.md",
      ),
    ).toBe(true);
    const result = JSON.parse(outcome.stdout);
    expect(result.errors[0].phase).toBe("semantic");
    expect(result.errors[0].artifactType).toBe("generated-state");
    expect(result.errors[0].schemaId).toBe(
      "urn:aif:semantic:generated-state:1",
    );
    expect(result.errors[0].documentPath).toBe("AGENTS.md");
    expect(
      result.changes.every(
        (change: { content?: string }) => change.content === undefined,
      ),
    ).toBe(true);
  });
  it("doctor fails when owned generated bytes no longer match the checksum", async () => {
    const root = await project();
    await writeFile(join(root, "AGENTS.md"), "manual edit\n", "utf8");
    const outcome = aif(["doctor", "--root", root, "--json"]);
    expect(outcome.status).toBe(3);
    expect(
      JSON.parse(outcome.stdout).changes.some(
        (change: { kind: string; path: string }) =>
          change.kind === "modified" && change.path === "AGENTS.md",
      ),
    ).toBe(true);
  });
  it("plan refuses an invalid generated planning artifact", () => {
    expect(aif(["plan", "--task", "invalid task id"]).status).toBe(3);
  });
  it("JSON diagnostics are stable", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/config.yaml"), "null", "utf8");
    const first = aif(["sync", "--root", root, "--json"]);
    const second = aif(["sync", "--root", root, "--json"]);
    expect(first.stderr).toBe(second.stderr);
    expect(JSON.parse(first.stderr).errorCode).toBe(
      "artifact-validation-failed",
    );
  });
  it("human diagnostics do not contain private values", async () => {
    const root = await project();
    const secret = "PRIVATE-SCHEMA-SECRET";
    await writeFile(
      join(root, ".aif/config.yaml"),
      `schemaVersion: '1'\nprofile: generic\nadapters: [codex]\napiToken: ${secret}\n`,
      "utf8",
    );
    const outcome = aif(["sync", "--root", root]);
    expect(`${outcome.stdout}${outcome.stderr}`).not.toContain(secret);
  });
  it("structural validation uses exit code 3", async () => {
    const root = await project();
    await writeFile(join(root, ".aif/config.yaml"), "null", "utf8");
    expect(aif(["sync", "--root", root]).status).toBe(3);
  });
  it("usage failure remains exit code 2", () => {
    expect(aif(["sync", "--unknown-option"]).status).toBe(2);
  });
  it("packed CLI resolves bundled schemas outside the monorepo", async () => {
    const schemaDirectory = resolve("packages/cli/dist/catalog/schemas");
    const schemaSnapshot = async () =>
      Promise.all(
        (await readdir(schemaDirectory))
          .sort()
          .map(
            async (path) =>
              [
                path,
                await readFile(join(schemaDirectory, path), "utf8"),
              ] as const,
          ),
      );
    const firstBuild = await schemaSnapshot();
    execFileSync("pnpm", ["build"], {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
    expect(await schemaSnapshot()).toEqual(firstBuild);
    const packRoot = await mkdtemp(join(tmpdir(), "aif-schema-pack-"));
    execFileSync(
      "pnpm",
      ["--filter", "@aif/cli", "pack", "--pack-destination", packRoot],
      { cwd: repositoryRoot, stdio: "pipe" },
    );
    const tarball = join(
      packRoot,
      (await readdir(packRoot)).find((entry) => entry.endsWith(".tgz"))!,
    );
    const contents = execFileSync("tar", ["-tzf", tarball], {
      encoding: "utf8",
    });
    expect(
      contents.match(/package\/dist\/catalog\/schemas\/[^\n]+\.json/gu),
    ).toHaveLength(8);
    expect(contents).not.toMatch(/(?:^|\/)(?:tests?|fixtures?)(?:\/|$)/mu);
    expect(contents).not.toMatch(/(?:^|\/)\.env(?:\.|$)/mu);
    const runtime = join(packRoot, "runtime");
    await mkdir(runtime);
    execFileSync(
      "npm",
      [
        "install",
        "--cache",
        join(packRoot, "npm-cache"),
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        tarball,
      ],
      { cwd: runtime, stdio: "pipe" },
    );
    const packedCli = join(runtime, "node_modules/.bin/aif");
    const root = join(packRoot, "external-project");
    await mkdir(root);
    expect(
      run(packedCli, ["init", "--root", root, "--adapters", "codex"], runtime)
        .status,
    ).toBe(0);
    expect(run(packedCli, ["sync", "--root", root], runtime).status).toBe(0);
  });
});
