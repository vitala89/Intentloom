import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  createMemoryFileSystem as hostCreateMemoryFileSystem,
  nodeFileSystem as hostNodeFileSystem,
} from "../packages/application/src/host-file-system.js";

function acceptsHostFileSystem(fs: FileSystem): FileSystem {
  return fs;
}

async function withTemp(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-host-fs-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("application host filesystem extraction", () => {
  it("keeps the port and adapters importable from the application root", () => {
    expect(createMemoryFileSystem).toBe(hostCreateMemoryFileSystem);
    expect(nodeFileSystem).toBe(hostNodeFileSystem);
    expect(acceptsHostFileSystem(nodeFileSystem)).toBe(nodeFileSystem);
    expect(acceptsHostFileSystem(createMemoryFileSystem()).list).toBeTypeOf(
      "function",
    );
  });

  it("keeps the extracted module off the application root and transports", () => {
    const source = readFileSync(
      "packages/application/src/host-file-system.ts",
      "utf8",
    );
    const barrel = readFileSync("packages/application/src/index.ts", "utf8");
    expect(source).not.toMatch(/from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/);
    expect(source).not.toMatch(
      /@intentloom\/(?:application|cli|daemon|mcp-server)|apps\/desktop|from\s+["']react["']|@tauri-apps\//,
    );
    expect(barrel).toContain('from "./host-file-system.js"');
    expect(barrel).not.toContain("function memoryPath");
    expect(barrel).not.toContain("export const nodeFileSystem");
    expect(barrel).not.toContain("export interface FileSystem");
  });

  it("preserves memory filesystem initialization, paths, and errors", async () => {
    const fs = createMemoryFileSystem(
      {
        "C:\\project\\b.txt": "beta",
        "/project/a.txt": "alpha",
      },
      1,
    );
    expect(await fs.read("C:/project/b.txt")).toBe("beta");
    expect(await fs.exists("c:\\project\\b.txt")).toBe(true);
    expect(await fs.list("/project")).toEqual([
      "/project/b.txt",
      "/project/a.txt",
    ]);
    expect(await fs.realpath("C:\\project\\b.txt")).toBe("C:\\project\\b.txt");
    expect(await fs.isSymbolicLink("/project/a.txt")).toBe(false);
    await fs.mkdir("/project/nested");
    expect(fs.files.has("/project/nested")).toBe(false);
    await fs.write("/project/c.txt", "gamma");
    await expect(fs.write("/project/d.txt", "delta")).rejects.toThrow(
      "injected write failure",
    );
    expect(fs.files.has("/project/d.txt")).toBe(false);
    await fs.remove("/project/a.txt");
    expect(await fs.exists("/project/a.txt")).toBe(false);
    await expect(fs.read("/missing.txt")).rejects.toThrow(
      "missing /missing.txt",
    );
  });

  it("preserves node filesystem reads, writes, and missing-path results", async () => {
    await withTemp(async (root) => {
      const file = join(root, "nested", "note.txt");
      expect(await nodeFileSystem.exists(file)).toBe(false);
      expect(await nodeFileSystem.isSymbolicLink(file)).toBe(false);
      expect(await nodeFileSystem.list(join(root, "missing"))).toEqual([]);
      await nodeFileSystem.mkdir(join(root, "nested"));
      await nodeFileSystem.write(file, "note");
      expect(await nodeFileSystem.read(file)).toBe("note");
      expect(await nodeFileSystem.exists(file)).toBe(true);
      await nodeFileSystem.remove(file);
      expect(await nodeFileSystem.exists(file)).toBe(false);
      await expect(nodeFileSystem.read(file)).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
  });

  it("preserves symlink skip, binary skip, exclusions, and forward-slash paths", async () => {
    await withTemp(async (root) => {
      const realDirectory = join(root, "real");
      await mkdir(realDirectory);
      await writeFile(join(realDirectory, "hidden.txt"), "hidden");
      await writeFile(join(root, "notes.txt"), "notes");
      await writeFile(join(root, "photo.png"), "png");
      await writeFile(join(root, "photo.JPG"), "jpg");
      await symlink(join(root, "notes.txt"), join(root, "link.txt"));
      await symlink(realDirectory, join(root, "alias"));
      await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
      await writeFile(join(root, "node_modules", "pkg", "index.js"), "skip");
      await mkdir(join(root, ".git"));
      await writeFile(join(root, ".git", "config"), "skip");
      await mkdir(join(root, ".nx", "cache"), { recursive: true });
      await writeFile(join(root, ".nx", "cache", "data.txt"), "skip");
      await mkdir(join(root, "src"));
      await writeFile(join(root, "src", "app.ts"), "keep");

      const listed = await nodeFileSystem.list(root);
      expect(listed).toEqual(["notes.txt", "real/hidden.txt", "src/app.ts"]);
      expect(await nodeFileSystem.isSymbolicLink(join(root, "link.txt"))).toBe(
        true,
      );
      expect(await nodeFileSystem.isSymbolicLink(join(root, "alias"))).toBe(
        true,
      );
    });
  });

  it("preserves the directory traversal depth limit of 32", async () => {
    await withTemp(async (root) => {
      const keptSegments = Array.from({ length: 32 }, (_, index) => {
        return `d${index + 1}`;
      });
      const keptDirectory = join(root, ...keptSegments);
      await mkdir(join(keptDirectory, "d33"), { recursive: true });
      await writeFile(join(keptDirectory, "kept.txt"), "kept");
      await writeFile(join(keptDirectory, "d33", "deep.txt"), "deep");

      const listed = await nodeFileSystem.list(root);
      expect(listed).toEqual([`${keptSegments.join("/")}/kept.txt`]);
    });
  });

  it("preserves the 10,000 file scan cap", async () => {
    await withTemp(async (root) => {
      const batchSize = 250;
      const count = 10_001;
      for (let start = 0; start < count; start += batchSize) {
        const batch: Promise<void>[] = [];
        for (
          let index = start;
          index < Math.min(count, start + batchSize);
          index += 1
        ) {
          batch.push(
            writeFile(
              join(root, `f${String(index).padStart(5, "0")}.txt`),
              "x",
            ),
          );
        }
        await Promise.all(batch);
      }

      const listed = await nodeFileSystem.list(root);
      expect(listed).toHaveLength(10_000);
      expect(listed[0]).toBe("f00000.txt");
      expect(listed.at(-1)).toBe("f09999.txt");
      expect(listed).not.toContain("f10000.txt");
    });
  }, 20_000);

  it("keeps engineering quality filesystem port imports off the application root", () => {
    const rootBarrel = resolve("packages/application/src/index.ts");
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const qualityDir = "packages/application/src/engineering-quality";
    const rootPortImports: string[] = [];
    const nonHostAdapterImports: string[] = [];
    for (const name of readdirSync(qualityDir)) {
      if (!name.endsWith(".ts")) continue;
      const file = join(qualityDir, name);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = resolveRelativeSpecifier(file, binding.specifier);
        if (resolved === rootBarrel) {
          rootPortImports.push(`${name}:${importedPort.join(",")}`);
        }
        if (
          importedPort.some((imported) => imported !== "FileSystem") &&
          resolved !== hostModule
        ) {
          nonHostAdapterImports.push(name);
        }
      }
    }

    expect(rootPortImports).toEqual([]);
    expect(nonHostAdapterImports).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/engineering-quality/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps existing-project adoption filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const adoptionDir = "packages/application/src";
    const offHost: string[] = [];
    for (const name of readdirSync(adoptionDir)) {
      if (!name.startsWith("existing-project") || !name.endsWith(".ts")) {
        continue;
      }
      const file = join(adoptionDir, name);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = binding.specifier.startsWith(".")
          ? resolveRelativeSpecifier(file, binding.specifier)
          : binding.specifier;
        if (resolved !== hostModule) {
          offHost.push(`${name}:${importedPort.join(",")}`);
        }
      }
    }

    expect(offHost).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/existing-project/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps harness filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const harnessDir = join(sourceDir, "harness");
    const flatHarness = readdirSync(sourceDir).filter(
      (name) => name.startsWith("harness") && name.endsWith(".ts"),
    );
    expect(flatHarness).toEqual([]);
    const harnessNames = readdirSync(harnessDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(harnessNames).toEqual(
      expect.arrayContaining(["harness-benchmark-sample.ts"]),
    );
    const files = [
      ...harnessNames.map((name) => join(harnessDir, name)),
      join(sourceDir, "external-skill-import.ts"),
    ];
    const offHost: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = binding.specifier.startsWith(".")
          ? resolveRelativeSpecifier(file, binding.specifier)
          : binding.specifier;
        if (resolved !== hostModule) {
          offHost.push(`${name}:${importedPort.join(",")}`);
        }
      }
    }

    expect(offHost).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/\bharness\b/);
    expect(hostSource).not.toMatch(/external-skill-import/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps feature intent filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const featureDir = join(sourceDir, "feature-intent");
    const featureNames = readdirSync(featureDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(featureNames).toEqual(
      expect.arrayContaining([
        "feature-intent-fixtures.ts",
        "feature-intent-scope.ts",
        "feature-intent-workspace.ts",
        "feature-intent-workspace-cli.ts",
      ]),
    );
    const files = [
      ...featureNames.map((name) => join(featureDir, name)),
      join(sourceDir, "task-routing.ts"),
      join(sourceDir, "skill-markdown.ts"),
    ];
    const offHost: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = binding.specifier.startsWith(".")
          ? resolveRelativeSpecifier(file, binding.specifier)
          : binding.specifier;
        if (resolved !== hostModule) {
          offHost.push(`${name}:${importedPort.join(",")}`);
        }
      }
    }

    expect(offHost).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/feature-intent/);
    expect(hostSource).not.toMatch(/task-routing/);
    expect(hostSource).not.toMatch(/skill-markdown/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps bounded execution filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const boundedDir = join(sourceDir, "bounded-execution");
    const flatNames = readdirSync(sourceDir).filter(
      (name) => name.startsWith("bounded-execution") && name.endsWith(".ts"),
    );
    const boundedNames = readdirSync(boundedDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(boundedNames).toEqual(
      expect.arrayContaining([
        "bounded-execution-verify.ts",
        "bounded-execution-workspace-viewmodel.ts",
      ]),
    );
    expect(flatNames).toEqual(
      expect.arrayContaining([
        "bounded-execution-apply.ts",
        "bounded-execution-capability.ts",
        "bounded-execution-fixtures.ts",
        "bounded-execution-task.ts",
        "bounded-execution-w11.ts",
        "bounded-execution-workspace-cli.ts",
        "bounded-execution-workspace.ts",
      ]),
    );
    const files = [
      ...flatNames.map((name) => join(sourceDir, name)),
      ...boundedNames.map((name) => join(boundedDir, name)),
    ];
    const offHost: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = binding.specifier.startsWith(".")
          ? resolveRelativeSpecifier(file, binding.specifier)
          : binding.specifier;
        if (resolved !== hostModule) {
          offHost.push(`${name}:${importedPort.join(",")}`);
        }
      }
    }

    expect(offHost).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/bounded-execution/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps continuous loop filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const loopDir = join(sourceDir, "continuous-loop");
    const flatNames = readdirSync(sourceDir).filter(
      (name) => name.startsWith("continuous-loop") && name.endsWith(".ts"),
    );
    const loopNames = readdirSync(loopDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(loopNames).toEqual(
      expect.arrayContaining([
        "continuous-loop-compare.ts",
        "continuous-loop-workspace-viewmodel.ts",
      ]),
    );
    expect(flatNames).toEqual(
      expect.arrayContaining([
        "continuous-loop-apply.ts",
        "continuous-loop-fixtures.ts",
        "continuous-loop-w12.ts",
        "continuous-loop-workspace-cli.ts",
        "continuous-loop-workspace.ts",
      ]),
    );
    const files = [
      ...flatNames.map((name) => join(sourceDir, name)),
      ...loopNames.map((name) => join(loopDir, name)),
    ];
    const offHost: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        const resolved = binding.specifier.startsWith(".")
          ? resolveRelativeSpecifier(file, binding.specifier)
          : binding.specifier;
        if (resolved !== hostModule) {
          offHost.push(`${name}:${importedPort.join(",")}`);
        }
      }
    }

    expect(offHost).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/continuous-loop/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps foundation filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const foundationDir = join(sourceDir, "foundation");
    const retained = [
      "foundation-discovery.ts",
      "foundation-flow.ts",
      "foundation-scaffold-client-viewmodel.ts",
      "foundation-scaffold-workspace-viewmodel.ts",
      "foundation-viewmodel.ts",
      "foundation-w8.ts",
      "foundation-workshop.ts",
    ];
    const moved = [
      "foundation-blueprint-client-viewmodel.ts",
      "foundation-blueprint-store.ts",
      "foundation-blueprint-viewmodel-renderers.ts",
      "foundation-blueprint.ts",
      "foundation-cli.ts",
      "foundation-client-viewmodel.ts",
      "foundation-discovery-client-viewmodel.ts",
      "foundation-discovery-turn.ts",
      "foundation-discovery-viewmodel-renderers.ts",
      "foundation-fixtures.ts",
      "foundation-readiness.ts",
      "foundation-scaffold-apply-revalidation.ts",
      "foundation-scaffold-apply-store.ts",
      "foundation-scaffold-apply.ts",
      "foundation-scaffold-cli.ts",
      "foundation-scaffold-file-row-types.ts",
      "foundation-scaffold-store.ts",
      "foundation-scaffold-viewmodel-renderers.ts",
      "foundation-scaffold.ts",
      "foundation-understanding-types.ts",
      "foundation-viewmodel-renderers.ts",
      "foundation-w2.ts",
      "foundation-w3.ts",
      "foundation-w4.ts",
      "foundation-w6.ts",
      "foundation-w7.ts",
      "foundation-workshop-defaults.ts",
      "foundation-workshop-lookup.ts",
      "foundation-workshop-store.ts",
    ];
    const flatNames = readdirSync(sourceDir).filter(
      (name) => name.startsWith("foundation") && name.endsWith(".ts"),
    );
    const foundationNames = readdirSync(foundationDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(flatNames.toSorted()).toEqual(retained);
    expect(foundationNames.toSorted()).toEqual(moved);
    const files = [
      ...flatNames.map((name) => join(sourceDir, name)),
      ...foundationNames.map((name) => join(foundationDir, name)),
    ];
    const portSites: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        portSites.push(
          `${name}:${importedPort.join(",")}:${binding.specifier}`,
        );
      }
    }

    expect(portSites).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/foundation-/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });

  it("keeps inception filesystem port imports off the application root", () => {
    const hostModule = resolve("packages/application/src/host-file-system.ts");
    const portNames = new Set([
      "FileSystem",
      "nodeFileSystem",
      "createMemoryFileSystem",
    ]);
    const sourceDir = "packages/application/src";
    const inceptionDir = join(sourceDir, "inception");
    const retained = [
      "inception-flow.ts",
      "inception-viewmodel.ts",
      "inception.ts",
    ];
    const moved = [
      "inception-actions.ts",
      "inception-approval.ts",
      "inception-blueprint.ts",
      "inception-cli.ts",
      "inception-client-viewmodel.ts",
      "inception-discovery.ts",
      "inception-fixtures.ts",
      "inception-package-name.ts",
      "inception-scaffold-apply.ts",
      "inception-scaffold-planner.ts",
      "inception-session-store.ts",
      "inception-summary-types.ts",
      "inception-templates.ts",
      "inception-viewmodel-renderers.ts",
      "inception-w1.ts",
      "inception-workspace-scaffold-files.ts",
      "inception-workspace-scaffold-validation.ts",
    ];
    const flatNames = readdirSync(sourceDir).filter(
      (name) => name.startsWith("inception") && name.endsWith(".ts"),
    );
    const inceptionNames = readdirSync(inceptionDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(flatNames.toSorted()).toEqual(retained);
    expect(inceptionNames.toSorted()).toEqual(moved);
    const files = [
      ...flatNames.map((name) => join(sourceDir, name)),
      ...inceptionNames.map((name) => join(inceptionDir, name)),
    ];
    const portSites: string[] = [];
    for (const file of files) {
      const name = file.slice(sourceDir.length + 1);
      for (const binding of namedImportBindings(readFileSync(file, "utf8"))) {
        const importedPort = binding.names.filter((imported) =>
          portNames.has(imported),
        );
        if (importedPort.length === 0) continue;
        portSites.push(
          `${name}:${importedPort.join(",")}:${binding.specifier}`,
        );
      }
    }

    expect(portSites).toEqual([]);
    const hostSource = readFileSync(hostModule, "utf8");
    expect(hostSource).not.toMatch(/inception-/);
    expect(hostSource).not.toMatch(
      /from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/,
    );
  });
});

function namedImportBindings(
  source: string,
): { specifier: string; names: string[] }[] {
  const bindings: { specifier: string; names: string[] }[] = [];
  const pattern =
    /(?:^|\n)import\s+(?:type\s+)?([\s\S]*?)\sfrom\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const clause = match[1] ?? "";
    const specifier = match[2] ?? "";
    const named = clause.match(/\{([\s\S]*)\}/);
    const names = named
      ? (named[1] ?? "")
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map(
            (part) => part.replace(/^type\s+/, "").split(/\s+as\s+/)[0] ?? "",
          )
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
      : [];
    bindings.push({ specifier, names });
  }
  return bindings;
}

function resolveRelativeSpecifier(fromFile: string, specifier: string): string {
  const lexical = resolve(dirname(fromFile), specifier);
  if (lexical.endsWith(".js")) return `${lexical.slice(0, -3)}.ts`;
  return lexical;
}
