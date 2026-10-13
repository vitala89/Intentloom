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
    const offHost: string[] = [];
    for (const name of readdirSync(sourceDir)) {
      if (
        (!name.startsWith("harness") && name !== "external-skill-import.ts") ||
        !name.endsWith(".ts")
      ) {
        continue;
      }
      const file = join(sourceDir, name);
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
