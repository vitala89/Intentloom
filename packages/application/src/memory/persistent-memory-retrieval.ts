import { dirname } from "node:path";
import {
  validatePersistentMemorySearchResult,
  type MemoryRenderTarget,
  type PersistentMemorySearchResult,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { listPersistentMemoryItems } from "./persistent-memory-store.js";

export async function searchPersistentMemory(
  query: string,
  options: { root: string; projectId: string; maxItems?: number },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemorySearchResult> {
  const terms = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const items = (await listPersistentMemoryItems({ root: options.root }, fs))
    .filter(
      (item) =>
        item.projectId === options.projectId &&
        item.lifecycleState === "accepted",
    )
    .map((item) => ({
      item,
      score: terms.reduce(
        (score, term) =>
          score + (item.content.toLowerCase().includes(term) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, options.maxItems ?? 10)
    .map(({ item }) => item);
  return validatePersistentMemorySearchResult({
    schemaVersion: "1",
    query,
    items,
    indexRebuilt: false,
  });
}

export async function rebuildPersistentMemoryIndex(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<{
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly itemIds: readonly string[];
}> {
  const itemIds = (await listPersistentMemoryItems({ root: options.root }, fs))
    .filter(
      (item) =>
        item.projectId === options.projectId &&
        item.lifecycleState === "accepted",
    )
    .map((item) => item.id)
    .sort();
  const path = inside(options.root, ".aif/memory/index.json");
  if (!(await fs.exists(dirname(path)))) await fs.mkdir(dirname(path));
  const index = {
    schemaVersion: "1" as const,
    projectId: options.projectId,
    itemIds,
  };
  await fs.write(path, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function clearPersistentMemoryIndex(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<void> {
  const path = inside(options.root, ".aif/memory/index.json");
  if (await fs.exists(path)) await fs.remove(path);
}

export async function renderPersistentMemoryContext(
  target: MemoryRenderTarget,
  query: string,
  options: { root: string; projectId: string; maxItems?: number },
  fs: FileSystem = nodeFileSystem,
): Promise<{
  readonly target: MemoryRenderTarget;
  readonly content: string;
  readonly itemIds: readonly string[];
}> {
  const result = await searchPersistentMemory(query, options, fs);
  return {
    target,
    itemIds: result.items.map((item) => item.id),
    content: result.items
      .map((item) => `- [${item.classification}] ${item.content}`)
      .join("\n"),
  };
}
