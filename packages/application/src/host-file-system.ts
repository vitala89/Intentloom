import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  ignoredScanDirectoryName,
  ignoredScanPath,
} from "./project-scan-exclusions.js";

export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  realpath(path: string): Promise<string>;
  isSymbolicLink(path: string): Promise<boolean>;
}

function memoryPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
}

export function createMemoryFileSystem(
  initial: Record<string, string> = {},
  failAfterWrites?: number,
): FileSystem & { files: Map<string, string> } {
  const files = new Map(
    Object.entries(initial).map(([path, content]) => [
      memoryPath(path),
      content,
    ]),
  );
  let writes = 0;
  let failed = false;
  return {
    files,
    async exists(path) {
      return files.has(memoryPath(path));
    },
    async read(path) {
      const content = files.get(memoryPath(path));
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      writes += 1;
      if (
        failAfterWrites !== undefined &&
        writes > failAfterWrites &&
        !failed
      ) {
        failed = true;
        throw new Error("injected write failure");
      }
      files.set(memoryPath(path), content);
    },
    async mkdir() {},
    async remove(path) {
      files.delete(memoryPath(path));
    },
    async list(path) {
      const directory = memoryPath(path);
      return [...files.keys()].filter((file) => file.startsWith(directory));
    },
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
  };
}
export const nodeFileSystem: FileSystem = {
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
  read: (path) => readFile(path, "utf8"),
  async write(path, content) {
    await writeFile(path, content, "utf8");
  },
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  async remove(path) {
    await rm(path, { recursive: true, force: true });
  },
  async list(path) {
    try {
      const files: string[] = [];
      const binaryExtensions =
        /\.(?:7z|bin|dll|dylib|exe|gif|gz|ico|jpe?g|pdf|png|so|tar|webp|zip)$/iu;
      const walk = async (
        directory: string,
        prefix: string,
        depth: number,
      ): Promise<void> => {
        if (depth > 32 || files.length >= 10_000) return;
        const entries = (
          await readdir(directory, { withFileTypes: true })
        ).sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          if (files.length >= 10_000) return;
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isSymbolicLink()) continue;
          if (entry.isDirectory()) {
            if (
              ignoredScanDirectoryName(entry.name) ||
              ignoredScanPath(relativePath)
            )
              continue;
            await walk(resolve(directory, entry.name), relativePath, depth + 1);
          } else if (entry.isFile() && !binaryExtensions.test(entry.name))
            files.push(relativePath);
        }
      };
      await walk(path, "", 0);
      return files.sort();
    } catch {
      return [];
    }
  },
  realpath: (path) => realpath(path),
  async isSymbolicLink(path) {
    try {
      return (await lstat(path)).isSymbolicLink();
    } catch {
      return false;
    }
  },
};
