import {
  QUALITY_TASK_DIFF_SCHEMA_URN,
  type EngineeringQualityAcceptanceResult,
  type EngineeringQualityEvidence,
  type EngineeringQualityFinalChange,
  type EngineeringQualityPlanConflict,
  type EngineeringQualityTaskDiff,
  type EngineeringQualityTaskDiffOptions,
  type QualityTaskChangeStatus,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityEvidence,
  validateEngineeringQualityTaskDiff,
  validateEngineeringQualityTaskPlan,
} from "@intentloom/validator";

function byPath(values: readonly EngineeringQualityEvidence[]) {
  return new Map(values.map((value) => [value.artifactPath, value]));
}

function acceptanceResults(
  options: EngineeringQualityTaskDiffOptions,
  conflicts: EngineeringQualityPlanConflict[],
): readonly EngineeringQualityAcceptanceResult[] {
  const results = options.acceptanceResults ?? [];
  const resultIds = new Set(results.map((result) => result.criterionId));
  for (const criterion of options.plan.acceptanceCriteria) {
    if (criterion.required && !resultIds.has(criterion.id)) {
      conflicts.push({
        kind: "missing-acceptance-criteria",
        criterionId: criterion.id,
        message: `Required acceptance criterion ${criterion.id} has no result.`,
      });
    }
  }
  for (const result of results) {
    const criterion = options.plan.acceptanceCriteria.find(
      (candidate) => candidate.id === result.criterionId,
    );
    if (criterion?.required && !result.satisfied) {
      conflicts.push({
        kind: "missing-acceptance-criteria",
        criterionId: criterion.id,
        message: `Required acceptance criterion ${criterion.id} is not satisfied.`,
      });
    }
  }
  return results;
}

function compareChange(
  change: EngineeringQualityTaskDiffOptions["plan"]["changes"][number],
  evidence: EngineeringQualityEvidence | undefined,
  conflicts: EngineeringQualityPlanConflict[],
): EngineeringQualityFinalChange {
  if (evidence === undefined) {
    conflicts.push({
      kind: "missing-final-evidence",
      path: change.path,
      message: `Final evidence is missing for planned path ${change.path}.`,
    });
    return { path: change.path, status: "missing-final-evidence" };
  }
  const actualGrowth = evidence.measuredValue - change.currentLines;
  let status: QualityTaskChangeStatus = "within-plan";
  if (
    change.policy.hardLimit !== undefined &&
    evidence.measuredValue > change.policy.hardLimit
  ) {
    status = "hard-limit-exceeded";
    conflicts.push({
      kind: "hard-limit-crossing",
      path: change.path,
      message: `Final evidence crosses the hard limit for ${change.path}.`,
    });
  } else if (actualGrowth > change.estimatedGrowth.likely) {
    status = "over-projected";
    conflicts.push({
      kind: "projection-drift",
      path: change.path,
      message: `Final growth for ${change.path} exceeds the likely projection.`,
    });
  } else if (actualGrowth < change.estimatedGrowth.minimum) {
    status = "under-projected";
  }
  return {
    path: change.path,
    finalLines: evidence.measuredValue,
    actualGrowth,
    projectedLikely: change.projectedLikely,
    status,
  };
}

export function compareEngineeringQualityTaskPlan(
  options: EngineeringQualityTaskDiffOptions,
): EngineeringQualityTaskDiff {
  const plan = validateEngineeringQualityTaskPlan(options.plan);
  const finalEvidence = options.finalEvidence.map(
    validateEngineeringQualityEvidence,
  );
  const evidence = byPath(finalEvidence);
  const conflicts: EngineeringQualityPlanConflict[] = [...plan.conflicts];
  const changes = plan.changes.map((change) =>
    compareChange(change, evidence.get(change.path), conflicts),
  );
  const plannedPaths = new Set(plan.changes.map((change) => change.path));
  for (const finalChange of finalEvidence) {
    if (!plannedPaths.has(finalChange.artifactPath)) {
      changes.push({
        path: finalChange.artifactPath,
        status: "unexpected-path",
      });
      conflicts.push({
        kind: "unexpected-path",
        path: finalChange.artifactPath,
        message: `Final evidence contains an unplanned path ${finalChange.artifactPath}.`,
      });
    }
  }
  const results = acceptanceResults(options, conflicts);
  return validateEngineeringQualityTaskDiff({
    schemaVersion: QUALITY_TASK_DIFF_SCHEMA_URN,
    projectId: plan.projectId,
    taskId: plan.taskId,
    status: conflicts.length > 0 ? "conflict" : "passed",
    changes,
    acceptanceResults: results,
    conflicts,
  });
}
