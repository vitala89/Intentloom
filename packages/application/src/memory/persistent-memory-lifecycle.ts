import {
  validatePersistentMemoryExport,
  validatePersistentMemoryItem,
  type MemoryClassification,
  type PersistentMemoryExport,
  type PersistentMemoryItem,
  type RetentionState,
  type TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import {
  getPersistentMemoryItem,
  listPersistentMemoryItems,
  persistentMemoryPath,
  redactPersistentMemoryContent,
  writePersistentMemoryItem,
} from "./persistent-memory-store.js";

export async function proposePersistentMemory(
  input: {
    id: string;
    projectId: string;
    classification: MemoryClassification;
    content: string;
    provenance: string;
    trustClass?: TrustClass;
    retentionState?: RetentionState;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  if (
    input.classification === "canonical-intent" ||
    input.classification === "verified-evidence"
  )
    throw new Error(
      "canonical and verified records must remain source-derived",
    );
  if (await getPersistentMemoryItem(input.id, options, fs))
    throw new Error(`memory item already exists: ${input.id}`);
  const now = new Date().toISOString();
  const item = validatePersistentMemoryItem({
    schemaVersion: "1",
    id: input.id,
    projectId: input.projectId,
    classification: input.classification,
    lifecycleState: "proposed",
    trustClass: input.trustClass ?? "agent-generated",
    content: redactPersistentMemoryContent(input.content),
    provenance: input.provenance,
    retentionState: input.retentionState ?? "active",
    createdAt: now,
    updatedAt: now,
    audit: ["proposed"],
  });
  return writePersistentMemoryItem(item, options.root, fs);
}

export async function acceptPersistentMemory(
  id: string,
  approval: { approvedBy: string; evidence: string },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState !== "proposed")
    throw new Error("only an existing proposed memory item can be accepted");
  const now = new Date().toISOString();
  const accepted = validatePersistentMemoryItem({
    ...existing,
    lifecycleState: "accepted",
    trustClass: "user-supplied",
    updatedAt: now,
    approval: { ...approval, approvedAt: now },
    audit: [...existing.audit, "accepted"],
  });
  return writePersistentMemoryItem(accepted, options.root, fs);
}

export async function supersedePersistentMemory(
  id: string,
  replacement: PersistentMemoryItem,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState !== "accepted")
    throw new Error("only accepted memory can be superseded");
  if (replacement.projectId !== existing.projectId || replacement.id === id)
    throw new Error("replacement must have a distinct id in the same project");
  const now = new Date().toISOString();
  const superseded = validatePersistentMemoryItem({
    ...existing,
    lifecycleState: "superseded",
    retentionState: "superseded",
    updatedAt: now,
    audit: [...existing.audit, `superseded-by:${replacement.id}`],
  });
  const next = validatePersistentMemoryItem({
    ...replacement,
    supersedesId: id,
    updatedAt: now,
    audit: [...replacement.audit, `supersedes:${id}`],
  });
  try {
    await writePersistentMemoryItem(superseded, options.root, fs);
    return await writePersistentMemoryItem(next, options.root, fs);
  } catch (error) {
    await writePersistentMemoryItem(existing, options.root, fs).catch(
      () => undefined,
    );
    await fs
      .remove(persistentMemoryPath(options.root, next.id))
      .catch(() => undefined);
    throw error;
  }
}

export async function forgetPersistentMemory(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState === "deleted")
    throw new Error("eligible memory item not found");
  return writePersistentMemoryItem(
    validatePersistentMemoryItem({
      ...existing,
      lifecycleState: "deleted",
      retentionState: "deleted",
      content: "[REDACTED]",
      updatedAt: new Date().toISOString(),
      audit: [...existing.audit, "forgotten"],
    }),
    options.root,
    fs,
  );
}

export async function exportPersistentMemory(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryExport> {
  const items = (
    await listPersistentMemoryItems({ root: options.root }, fs)
  ).filter(
    (item) =>
      item.projectId === options.projectId && item.lifecycleState !== "deleted",
  );
  return validatePersistentMemoryExport({
    schemaVersion: "1",
    projectId: options.projectId,
    exportedAt: new Date().toISOString(),
    items,
  });
}

export async function importPersistentMemory(
  bundleInput: unknown,
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly PersistentMemoryItem[]> {
  const bundle = validatePersistentMemoryExport(bundleInput);
  if (bundle.projectId !== options.projectId)
    throw new Error("memory import project identity mismatch");
  const imported: PersistentMemoryItem[] = [];
  try {
    for (const source of bundle.items) {
      if (
        ["canonical-intent", "verified-evidence"].includes(
          source.classification,
        )
      )
        throw new Error(
          "canonical sources cannot be imported as persistent memory",
        );
      const id = `import-${source.id}`;
      if (await getPersistentMemoryItem(id, options, fs))
        throw new Error(`memory item already exists: ${id}`);
      imported.push(
        await proposePersistentMemory(
          {
            id,
            projectId: options.projectId,
            classification: source.classification,
            content: source.content,
            provenance: `import:${source.provenance}`,
            trustClass: "agent-generated",
            retentionState: source.retentionState,
          },
          options,
          fs,
        ),
      );
    }
  } catch (error) {
    await Promise.all(
      imported.map((item) =>
        fs.remove(persistentMemoryPath(options.root, item.id)),
      ),
    );
    throw error;
  }
  return imported;
}
