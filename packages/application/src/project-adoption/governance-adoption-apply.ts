import { dirname, resolve } from "node:path";
import { checksum } from "@intentloom/core";
import {
  deterministicId,
  type AdoptionOperation,
  type AdoptionPlan,
  type MigrationJournalEntry,
} from "@intentloom/core/adoption";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import type {
  AdoptionApplyResult,
  ApplyProjectAdoptionOptions,
} from "./governance-adoption-contracts.js";

const agentEntrypointBody =
  "# Agent Entrypoint\n\nStart here for repository instructions and workflows.\n";

export async function applyProjectAdoption(
  options: ApplyProjectAdoptionOptions,
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionApplyResult> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption apply requires a non-symbolic explicit project root",
    );
  }
  const { plan: adoptionPlan, dryRun = false } = options;
  const schemaVersion: number = adoptionPlan.schemaVersion;
  if (schemaVersion !== 1)
    throw new Error("unsupported adoption plan schema version");
  const stale = await staleHashResult(root, adoptionPlan, fs);
  if (stale) return stale;
  if (dryRun) return dryRunResult(adoptionPlan);
  return writeGovernanceAdoption(root, adoptionPlan, fs);
}

async function staleHashResult(
  root: string,
  adoptionPlan: AdoptionPlan,
  fs: FileSystem,
): Promise<AdoptionApplyResult | null> {
  for (const op of adoptionPlan.operations) {
    if (op.path === undefined || op.expectedCurrentHash === undefined) continue;
    const fullPath = inside(root, op.path);
    if (!(await fs.exists(fullPath))) continue;
    let content: string;
    try {
      content = await fs.read(fullPath);
    } catch {
      return emptyApplyResult(
        "stale-hash",
        `Unable to read target file for hash verification: ${op.path}`,
      );
    }
    if (checksum(content) !== op.expectedCurrentHash) {
      return emptyApplyResult(
        "stale-hash",
        `Stale content hash for ${op.path}`,
      );
    }
  }
  return null;
}

function dryRunResult(adoptionPlan: AdoptionPlan): AdoptionApplyResult {
  return {
    status: "no-op",
    appliedOperations: adoptionPlan.operations.map((op) => op.id),
    createdFiles: [],
    updatedFiles: [],
  };
}

function emptyApplyResult(
  status: "stale-hash" | "rolled-back",
  error: string,
): AdoptionApplyResult {
  return {
    status,
    error,
    appliedOperations: [],
    createdFiles: [],
    updatedFiles: [],
  };
}

interface ApplyProgress {
  readonly backups: Map<string, string | null>;
  readonly appliedOperations: string[];
  readonly createdFiles: string[];
  readonly updatedFiles: string[];
}

async function writeGovernanceAdoption(
  root: string,
  adoptionPlan: AdoptionPlan,
  fs: FileSystem,
): Promise<AdoptionApplyResult> {
  const progress: ApplyProgress = {
    backups: new Map(),
    appliedOperations: [],
    createdFiles: [],
    updatedFiles: [],
  };
  try {
    for (const op of adoptionPlan.operations)
      await applyAdoptionOperation(root, op, fs, progress);
    return {
      status: "success",
      appliedOperations: progress.appliedOperations,
      createdFiles: progress.createdFiles,
      updatedFiles: progress.updatedFiles,
      journalEntryId: await appendMigrationJournal(
        root,
        adoptionPlan,
        progress.appliedOperations,
        fs,
      ),
    };
  } catch (err) {
    await restoreAdoptionBackups(root, progress.backups, fs);
    return emptyApplyResult(
      "rolled-back",
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function applyAdoptionOperation(
  root: string,
  op: AdoptionOperation,
  fs: FileSystem,
  progress: ApplyProgress,
): Promise<void> {
  if (op.kind === "create" && op.path !== undefined) {
    await writeCreatedGovernanceFile(root, op, fs, progress);
    return;
  }
  progress.appliedOperations.push(op.id);
}

async function writeCreatedGovernanceFile(
  root: string,
  op: AdoptionOperation,
  fs: FileSystem,
  progress: ApplyProgress,
): Promise<void> {
  const path = op.path;
  if (path === undefined) return;
  const fullPath = inside(root, path);
  const exists = await fs.exists(fullPath);
  if (!progress.backups.has(path)) {
    progress.backups.set(path, exists ? await fs.read(fullPath) : null);
  }
  await fs.mkdir(dirname(fullPath));
  await fs.write(fullPath, governanceCreateBody(op, path));
  if (!exists) progress.createdFiles.push(path);
  else progress.updatedFiles.push(path);
  progress.appliedOperations.push(op.id);
}

function governanceCreateBody(op: AdoptionOperation, path: string): string {
  return op.role === "agent-entrypoint"
    ? agentEntrypointBody
    : `# Intentloom Governance ${op.role ?? path}\n`;
}

async function appendMigrationJournal(
  root: string,
  adoptionPlan: AdoptionPlan,
  appliedOperations: readonly string[],
  fs: FileSystem,
): Promise<string> {
  const journalPath = inside(root, ".aif/migration-journal.json");
  const journalEntries = await existingJournalEntries(journalPath, fs);
  const entry: MigrationJournalEntry = {
    id: deterministicId("journal", {
      planId: adoptionPlan.planId,
      timestamp: appliedOperations.join(","),
    }),
    planId: adoptionPlan.planId,
    status: "applied",
    operationIds: appliedOperations,
    timestamp: new Date().toISOString(),
  };
  journalEntries.push(entry);
  await fs.mkdir(dirname(journalPath));
  await fs.write(journalPath, JSON.stringify(journalEntries, null, 2));
  return entry.id;
}

async function existingJournalEntries(
  journalPath: string,
  fs: FileSystem,
): Promise<MigrationJournalEntry[]> {
  if (!(await fs.exists(journalPath))) return [];
  try {
    return JSON.parse(await fs.read(journalPath)) as MigrationJournalEntry[];
  } catch {
    return [];
  }
}

async function restoreAdoptionBackups(
  root: string,
  backups: ReadonlyMap<string, string | null>,
  fs: FileSystem,
): Promise<void> {
  for (const [relativePath, originalContent] of backups) {
    const fullPath = inside(root, relativePath);
    try {
      if (originalContent === null) await fs.remove(fullPath);
      else await fs.write(fullPath, originalContent);
    } catch {
      /* rollback best-effort */
    }
  }
}
