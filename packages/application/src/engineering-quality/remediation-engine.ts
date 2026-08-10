import { createHash } from "node:crypto";
import {
  QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
  type EngineeringQualityRemediationPlan,
  type QualityRemediationApplyOptions,
  type QualityRemediationFileDiff,
  type QualityRemediationProposal,
  type QualityRemediationRollbackResult,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityRemediationPlan,
  validateQualityRemediationApplyOptions,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function computeQualityRemediationDigest(
  proposal: QualityRemediationProposal,
  diffs: readonly QualityRemediationFileDiff[],
): string {
  const payload = JSON.stringify({
    proposalId: proposal.id,
    kind: proposal.kind,
    targetFindingIds: proposal.targetFindingIds,
    affectedPaths: proposal.affectedPaths,
    diffs: diffs.map((d) => ({
      path: d.path,
      beforeDigest: d.beforeDigest,
      afterDigest: d.afterDigest,
    })),
  });
  return sha256(payload);
}

export function prepareQualityRemediationPlan(options: {
  readonly projectRoot: string;
  readonly proposal: QualityRemediationProposal;
  readonly diffs: readonly QualityRemediationFileDiff[];
  readonly createdAt?: string;
}): EngineeringQualityRemediationPlan {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const contentDigest = computeQualityRemediationDigest(
    options.proposal,
    options.diffs,
  );
  const planId = `remediation-${sha256(`${options.proposal.id}:${createdAt}`).slice(0, 12)}`;

  return validateEngineeringQualityRemediationPlan({
    schemaVersion: QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
    planId,
    projectRoot: options.projectRoot,
    status: "draft",
    proposal: options.proposal,
    diffs: options.diffs,
    contentDigest,
    createdAt,
  });
}

export function revalidateQualityRemediationPlan(
  plan: EngineeringQualityRemediationPlan,
  currentFileContents: Map<string, string>,
): EngineeringQualityRemediationPlan {
  let isStale = false;
  for (const diff of plan.diffs) {
    const content = currentFileContents.get(diff.path);
    if (content === undefined || sha256(content) !== diff.beforeDigest) {
      isStale = true;
      break;
    }
  }

  const updatedStatus = isStale ? "stale" : plan.status;
  return validateEngineeringQualityRemediationPlan({
    ...plan,
    status: updatedStatus,
  });
}

export function applyQualityRemediationPlan(
  options: QualityRemediationApplyOptions,
  fileReader: (path: string) => string,
  fileWriter: (path: string, content: string) => void,
): {
  readonly plan: EngineeringQualityRemediationPlan;
  readonly backups: Map<string, string>;
} {
  const validOptions = validateQualityRemediationApplyOptions(options);
  const { plan, humanApprovalToken, projectRoot } = validOptions;

  if (plan.status !== "draft" && plan.status !== "approved") {
    throw new Error(
      `cannot apply remediation plan with status '${plan.status}'`,
    );
  }

  const expectedToken = `approved:${plan.contentDigest}`;
  if (humanApprovalToken !== expectedToken) {
    throw new Error(
      "human approval token mismatch or missing; explicit human approval is required",
    );
  }

  const currentFiles = new Map<string, string>();
  for (const diff of plan.diffs) {
    const fullPath = diff.path.startsWith("/")
      ? diff.path
      : `${projectRoot}/${diff.path}`;
    currentFiles.set(diff.path, fileReader(fullPath));
  }

  const revalidated = revalidateQualityRemediationPlan(plan, currentFiles);
  if (revalidated.status === "stale") {
    throw new Error(
      "cannot apply stale remediation plan; target files have drifted since plan creation",
    );
  }

  const backups = new Map<string, string>();
  for (const diff of plan.diffs) {
    const fullPath = diff.path.startsWith("/")
      ? diff.path
      : `${projectRoot}/${diff.path}`;
    const before = currentFiles.get(diff.path) ?? "";
    backups.set(fullPath, before);
    fileWriter(fullPath, diff.afterContent);
  }

  const appliedAt = new Date().toISOString();
  const appliedPlan = validateEngineeringQualityRemediationPlan({
    ...plan,
    status: "applied",
    approvedAt: plan.approvedAt ?? appliedAt,
    appliedAt,
  });

  return { plan: appliedPlan, backups };
}

export function rollbackQualityRemediationPlan(
  backups: Map<string, string>,
  fileWriter: (path: string, content: string) => void,
): QualityRemediationRollbackResult {
  const restoredFiles: string[] = [];
  try {
    for (const [path, content] of backups.entries()) {
      fileWriter(path, content);
      restoredFiles.push(path);
    }
    return { status: "success", restoredFiles };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { status: "failed", restoredFiles, error: errorMsg };
  }
}
