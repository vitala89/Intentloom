import { checksum, normalizeStoredPath, resolveWithin } from "@intentloom/core";
import type { GeneratedFile } from "@intentloom/core";
import { dirname, relative, resolve, sep } from "node:path";
import { findDestinationCollisions } from "./destination-collisions.js";
import type {
  FileSystem,
  Plan,
  PostWriteValidationResult,
  TransactionOptions,
  TransactionResult,
  TransactionStage,
} from "./index.js";

export const GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY =
  "declared-paths-only" as const;

export type GeneratedFileSyncMode =
  "generated-files" | typeof GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY;

export function isDeclaredPathsOnlySyncMode(
  mode: GeneratedFileSyncMode | undefined,
): boolean {
  return mode === GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY;
}

export function planSynchronizeGeneratedFilesWriteSet(
  files: readonly GeneratedFile[],
  options: { readonly syncMode?: GeneratedFileSyncMode } = {},
): readonly string[] {
  const normalized = files.map((file) => normalizeStoredPath(file.path));
  const ordered = [...new Set(normalized)].sort((left, right) =>
    left.localeCompare(right),
  );
  if (isDeclaredPathsOnlySyncMode(options.syncMode)) {
    return ordered;
  }
  return [...ordered, ".aif/manifest.lock.json", ".aif/source-map.json"].sort(
    (left, right) => left.localeCompare(right),
  );
}

function noncanonicalPathPlan(files: readonly GeneratedFile[]): Plan | null {
  const invalidPaths = files
    .map((file) => file.path)
    .filter((path) => {
      try {
        return normalizeStoredPath(path) !== path;
      } catch {
        return true;
      }
    })
    .sort();
  if (invalidPaths.length === 0) return null;
  return {
    changes: invalidPaths.map((path) => ({
      path,
      kind: "security-error" as const,
      reason: "generated destination is not a canonical stored path",
    })),
    diagnostics: ["invalid-stored-path"],
  };
}

function collisionPlan(files: readonly GeneratedFile[]): Plan | null {
  const collisions = findDestinationCollisions(files);
  if (collisions.length === 0) return null;
  return {
    changes: collisions.map((collision) => ({
      path: collision.paths.join(", "),
      kind: "conflict" as const,
      reason: JSON.stringify(collision),
    })),
    diagnostics: ["destination-collision"],
  };
}

function inside(root: string, path: string): string {
  return resolveWithin(root, path);
}

async function safeDestination(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<void> {
  let rootResolved = resolve(root);
  try {
    rootResolved = await fs.realpath(rootResolved);
  } catch {
    /* new project root */
  }
  let current = path;
  while (true) {
    if (await fs.isSymbolicLink(current)) {
      throw new Error(
        `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
      );
    }
    if (await fs.exists(current)) {
      const resolved = await fs.realpath(current);
      if (
        resolved !== rootResolved &&
        !resolved.startsWith(`${rootResolved}${sep}`)
      ) {
        throw new Error(
          `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
        );
      }
      return;
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

async function validateDeclaredPathBytes(input: {
  readonly root: string;
  readonly files: readonly GeneratedFile[];
  readonly fs: FileSystem;
}): Promise<PostWriteValidationResult> {
  for (const file of input.files) {
    const path = inside(input.root, file.path);
    const actual = await input.fs.read(path);
    if (actual !== file.content) {
      return {
        status: "invalid",
        code: "committed-generated-bytes-mismatch",
        affectedPaths: [file.path],
        affectedIdentifiers: [file.path],
      };
    }
  }
  return {
    status: "valid",
    checkedGeneratedFileCount: input.files.length,
    checkedManifestEntryCount: 0,
    checkedSourceMapEntryCount: 0,
    checksumsValidated: true,
    ownershipValidated: true,
    pathsValidated: true,
    versionsValidated: true,
    metadataBytesValidated: true,
  };
}

export async function synchronizeDeclaredProjectPaths(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions = {},
): Promise<TransactionResult> {
  const collision = collisionPlan(files);
  if (collision) {
    return {
      ...collision,
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles: [],
      updatedFiles: [],
      unchangedFiles: [],
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  }
  const invalidPath = noncanonicalPathPlan(files);
  if (invalidPath) {
    return {
      ...invalidPath,
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles: [],
      updatedFiles: [],
      unchangedFiles: [],
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  }

  const normalized = files.map((file) => ({
    ...file,
    path: normalizeStoredPath(file.path),
    checksum: checksum(file.content),
  }));

  const changes = [];
  const createdFiles: string[] = [];
  const updatedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  for (const file of normalized) {
    const path = inside(root, file.path);
    if (!(await fs.exists(path))) {
      changes.push({
        path: file.path,
        kind: "create" as const,
        reason: "missing",
        content: file.content,
      });
      createdFiles.push(file.path);
    } else if ((await fs.read(path)) !== file.content) {
      changes.push({
        path: file.path,
        kind: "update" as const,
        reason: "committed content differs",
        content: file.content,
      });
      updatedFiles.push(file.path);
    } else {
      unchangedFiles.push(file.path);
    }
  }

  const proposal: Plan = { changes, diagnostics: [] };
  const backups = new Map<string, string>();
  const created: string[] = [];
  let stage: TransactionStage = "generated-stage";
  let postWriteValidation: PostWriteValidationResult | undefined;
  const inject = (candidate: TransactionStage) => {
    stage = candidate;
    if (options.failAt === candidate) throw new Error(`injected:${candidate}`);
  };

  try {
    inject("generated-stage");
    for (const file of normalized) {
      inject("generated-commit");
      const path = inside(root, file.path);
      await safeDestination(root, path, fs);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, file.content);
    }
    inject("post-write-consistency");
    postWriteValidation = await validateDeclaredPathBytes({
      root,
      files: normalized,
      fs,
    });
    if (postWriteValidation.status === "invalid") {
      throw new Error(postWriteValidation.code);
    }
    inject("success-cleanup");
    return {
      ...proposal,
      status: "success",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles,
      updatedFiles,
      unchangedFiles,
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: true,
      cleanupCompleted: true,
      postWriteValidation,
    };
  } catch (error) {
    const rollbackFailures: string[] = [];
    const injectedRollbackFailures = new Set(options.rollbackFailPaths ?? []);
    for (const [path, content] of backups) {
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure", { cause: error });
        await fs.write(path, content);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    for (const path of created) {
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure", { cause: error });
        await fs.remove(path);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    const originalError =
      error instanceof Error ? error.message : String(error);
    return {
      ...proposal,
      status: "failed",
      failedStage: stage,
      diagnostics:
        rollbackFailures.length === 0
          ? [originalError]
          : [originalError, "transaction-rollback-incomplete"],
      rollbackAttempted: true,
      rollbackCompleted: rollbackFailures.length === 0,
      rollbackFailures,
      createdFiles,
      updatedFiles,
      unchangedFiles,
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
      ...(postWriteValidation === undefined ? {} : { postWriteValidation }),
    };
  }
}
