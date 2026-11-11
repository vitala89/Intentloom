import { checksum, type GeneratedFile } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import type { Change, Plan } from "../project-change.js";
import { inside } from "../project-path.js";
import {
  buildTransactionMetadata,
  lockPath,
  sourceMapPath,
  type TransactionMetadata,
} from "./transaction-metadata.js";
import { transactionSummary } from "./transaction-summary.js";

export interface OwnedTransactionFiles {
  readonly normalized: GeneratedFile[];
  readonly manifest: string;
  readonly sourceMap: string;
  readonly transactionFiles: GeneratedFile[];
}

export interface OwnedWritePlan {
  readonly proposal: Plan;
  readonly summary: ReturnType<typeof transactionSummary>;
  readonly createdGeneratedPaths: ReadonlySet<string>;
}

export function prepareOwnedTransaction(
  files: readonly GeneratedFile[],
  validatedMetadata: TransactionMetadata | undefined,
): OwnedTransactionFiles {
  const normalized = files.map((file) => ({
    ...file,
    checksum: checksum(file.content),
  }));
  const metadata = validatedMetadata ?? buildTransactionMetadata(normalized);
  return {
    normalized,
    manifest: metadata.manifest,
    sourceMap: metadata.sourceMap,
    transactionFiles: [
      ...normalized,
      metadataFile(lockPath, metadata.manifest, "transaction:manifest"),
      metadataFile(sourceMapPath, metadata.sourceMap, "transaction:source-map"),
    ],
  };
}

function metadataFile(
  path: string,
  content: string,
  source: string,
): GeneratedFile {
  return {
    path,
    content,
    sources: [source],
    checksum: checksum(content),
  };
}

export async function planOwnedChanges(
  root: string,
  prepared: OwnedTransactionFiles,
  fs: FileSystem,
): Promise<OwnedWritePlan> {
  const changes: Change[] = [];
  const createdGeneratedPaths = new Set<string>();
  for (const file of prepared.transactionFiles) {
    const path = inside(root, file.path);
    if (!(await fs.exists(path))) {
      changes.push({
        path: file.path,
        kind: "create",
        reason: "missing",
        content: file.content,
      });
      if (file.path !== lockPath && file.path !== sourceMapPath)
        createdGeneratedPaths.add(file.path);
    } else if ((await fs.read(path)) !== file.content)
      changes.push({
        path: file.path,
        kind: "update",
        reason: "committed content differs",
        content: file.content,
      });
  }
  return {
    proposal: { changes, diagnostics: [] },
    summary: transactionSummary(prepared.normalized, changes),
    createdGeneratedPaths,
  };
}
