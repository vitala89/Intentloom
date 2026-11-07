import { dirname, relative } from "node:path";
import {
  validatePersistentMemoryItem,
  type PersistentMemoryItem,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

export function redactPersistentMemoryContent(content: string): string {
  return content
    .replace(
      /(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/giu,
      "[REDACTED]",
    )
    .replace(
      /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gu,
      "[REDACTED PRIVATE KEY]",
    );
}

export function persistentMemoryPath(root: string, id: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(id))
    throw new Error("memory id must be a safe identifier");
  return inside(root, `.aif/memory/items/${id}.json`);
}

export async function writePersistentMemoryItem(
  item: PersistentMemoryItem,
  root: string,
  fs: FileSystem,
): Promise<PersistentMemoryItem> {
  const path = persistentMemoryPath(root, item.id);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) await fs.mkdir(directory);
  await fs.write(path, `${JSON.stringify(item, null, 2)}\n`);
  return item;
}

export async function getPersistentMemoryItem(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem | undefined> {
  const path = persistentMemoryPath(options.root, id);
  if (!(await fs.exists(path))) return undefined;
  return validatePersistentMemoryItem(JSON.parse(await fs.read(path)));
}

export async function listPersistentMemoryItems(
  options: {
    root: string;
    lifecycleState?: PersistentMemoryItem["lifecycleState"];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly PersistentMemoryItem[]> {
  const items: PersistentMemoryItem[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/items/") ||
      !normalized.endsWith(".json")
    )
      continue;
    try {
      const item = validatePersistentMemoryItem(
        JSON.parse(await fs.read(inside(options.root, normalized))),
      );
      if (
        options.lifecycleState === undefined ||
        item.lifecycleState === options.lifecycleState
      )
        items.push(item);
    } catch {
      /* corrupted records are not trusted */
    }
  }
  return items.sort((left, right) => left.id.localeCompare(right.id));
}
