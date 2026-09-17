import type { GeneratedFile } from "@intentloom/core";
import type { ApprovedApplyPlan } from "../../protocol/src/approved-apply.js";
import type { ApprovedApplyRollbackFile } from "../../protocol/src/approved-apply.js";
import { NEUTRON_MUTATION_INNER_APPLY_APPROVAL } from "../../protocol/src/neutron-mutation.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import { executeApprovedApplyPlan } from "./approved-apply-engine.js";
import { GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY } from "./generated-file-sync-declared.js";
import type { FileSystem, TransactionStage } from "./index.js";

export interface NeutronTrustedApplyExecutionInput {
  readonly transactionId: string;
  readonly plan: ApprovedApplyPlan;
  readonly files: readonly GeneratedFile[];
  readonly fs: FileSystem;
  readonly currentProjectStateDigest: string;
  readonly now?: () => number;
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
}

export interface NeutronTrustedApplyExecution {
  readonly applied: boolean;
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly rollbackCompleted: boolean;
  readonly rollbackAttempted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly failedStage?: string;
  readonly diagnostics: readonly string[];
  readonly rollbackFiles: readonly ApprovedApplyRollbackFile[];
}

export async function executeTrustedDeclaredPathApply(
  input: NeutronTrustedApplyExecutionInput,
): Promise<NeutronTrustedApplyExecution> {
  if (
    !exactNeutronMutationPathSetsEqual(
      input.files.map((file) => file.path),
      input.plan.changedPaths,
    )
  ) {
    return emptyExecution(["path-scope-mismatch"]);
  }
  const planned = await classifyPlannedWrites(input);
  const result = await executeApprovedApplyPlan(
    {
      schemaVersion: 1,
      targetResourceId: input.transactionId,
      grantedApprovals: [NEUTRON_MUTATION_INNER_APPLY_APPROVAL],
      plan: input.plan,
    },
    input.files,
    {
      fs: input.fs,
      currentProjectStateDigest: input.currentProjectStateDigest,
      syncMode: GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
      ...(input.now !== undefined ? { now: input.now } : {}),
      ...(input.failAt !== undefined ? { failAt: input.failAt } : {}),
      ...(input.rollbackFailPaths !== undefined
        ? { rollbackFailPaths: input.rollbackFailPaths }
        : {}),
    },
  );
  const rollbackFailures = parseRollbackFailures(result.diagnostics);
  const stage = failedStage(result.diagnostics);
  return {
    applied: result.applied === true,
    ...planned,
    rollbackCompleted: rollbackFailures.length === 0,
    rollbackAttempted: result.diagnostics.includes("rollback-attempted"),
    rollbackFailures,
    ...(stage !== undefined ? { failedStage: stage } : {}),
    diagnostics: result.diagnostics.filter(
      (item) => !item.includes("previousContent"),
    ),
    rollbackFiles: result.rollbackEvidence?.rollbackFiles ?? [],
  };
}

function emptyExecution(
  diagnostics: readonly string[],
): NeutronTrustedApplyExecution {
  return {
    applied: false,
    createdPaths: [],
    updatedPaths: [],
    unchangedPaths: [],
    rollbackCompleted: true,
    rollbackAttempted: false,
    rollbackFailures: [],
    diagnostics,
    rollbackFiles: [],
  };
}

function parseRollbackFailures(
  diagnostics: readonly string[],
): readonly string[] {
  const match = diagnostics.find((item) =>
    item.startsWith("rollback-failures:"),
  );
  if (match === undefined) return [];
  const listed = match.slice("rollback-failures:".length);
  return listed.length === 0 ? [] : listed.split(",");
}

function failedStage(diagnostics: readonly string[]): string | undefined {
  const match = diagnostics.find((item) => item.startsWith("failed-stage:"));
  return match === undefined ? undefined : match.slice("failed-stage:".length);
}

async function classifyPlannedWrites(input: {
  readonly plan: ApprovedApplyPlan;
  readonly files: readonly GeneratedFile[];
  readonly fs: FileSystem;
}): Promise<{
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
}> {
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const unchangedPaths: string[] = [];
  for (const file of input.files) {
    const fullPath = `${input.plan.targetRoot}/${file.path}`;
    if (!(await input.fs.exists(fullPath))) {
      createdPaths.push(file.path);
      continue;
    }
    try {
      const existing = await input.fs.read(fullPath);
      if (existing === file.content) unchangedPaths.push(file.path);
      else updatedPaths.push(file.path);
    } catch {
      createdPaths.push(file.path);
    }
  }
  return { createdPaths, updatedPaths, unchangedPaths };
}
