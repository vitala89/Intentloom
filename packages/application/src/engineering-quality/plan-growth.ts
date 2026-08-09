import {
  type EngineeringQualityPolicy,
  type EngineeringQualityPolicyResolution,
  type EngineeringQualityProjectedChange,
  type EngineeringQualityTaskPlan,
  type EngineeringQualityTaskPlanOptions,
  type QualityTaskProjectionDisposition,
  QUALITY_TASK_PLAN_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityEvidence,
  validateEngineeringQualityPolicy,
  validateEngineeringQualityTaskPlan,
} from "@intentloom/validator";

function matchSegment(value: string, pattern: string): boolean {
  let valueIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let retryIndex = -1;
  while (valueIndex < value.length) {
    if (pattern[patternIndex] === value[valueIndex]) {
      valueIndex += 1;
      patternIndex += 1;
    } else if (pattern[patternIndex] === "*") {
      starIndex = patternIndex;
      retryIndex = valueIndex;
      patternIndex += 1;
    } else if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      retryIndex += 1;
      valueIndex = retryIndex;
    } else {
      return false;
    }
  }
  while (pattern[patternIndex] === "*") patternIndex += 1;
  return patternIndex === pattern.length;
}

function matchPath(path: string, pattern: string): boolean {
  const pathParts = path.replaceAll("\\", "/").split("/");
  const patternParts = pattern.replaceAll("\\", "/").split("/");
  const cache = new Map<string, boolean>();

  function visit(pathIndex: number, patternIndex: number): boolean {
    const cacheKey = `${pathIndex}:${patternIndex}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;
    let result = false;
    if (patternIndex === patternParts.length) {
      result = pathIndex === pathParts.length;
    } else if (patternParts[patternIndex] === "**") {
      result =
        visit(pathIndex, patternIndex + 1) ||
        (pathIndex < pathParts.length && visit(pathIndex + 1, patternIndex));
    } else {
      result =
        pathIndex < pathParts.length &&
        matchSegment(pathParts[pathIndex]!, patternParts[patternIndex]!) &&
        visit(pathIndex + 1, patternIndex + 1);
    }
    cache.set(cacheKey, result);
    return result;
  }

  return visit(0, 0);
}

export function resolveEngineeringQualityPolicyForPath(
  policy: EngineeringQualityPolicy,
  path: string,
  classification: EngineeringQualityPolicy["defaultRules"][number]["applicableClassifications"][number],
): EngineeringQualityPolicyResolution {
  const scopes = (policy.scopes ?? []).filter(
    (scope) =>
      matchPath(path, scope.pathPattern) &&
      (scope.classification === undefined ||
        scope.classification === classification),
  );
  const disabledRules = new Set(
    scopes.flatMap((scope) =>
      (scope.ruleOverrides ?? [])
        .filter((override) => override.disabled === true)
        .map((override) => override.ruleId),
    ),
  );
  const applicableRules = policy.defaultRules.filter(
    (rule) =>
      rule.applicableClassifications.includes(classification) &&
      !disabledRules.has(rule.id),
  );
  const limits = (level: "review" | "hard") => {
    let limit: number | undefined;
    for (const rule of applicableRules) {
      for (const threshold of rule.thresholds) {
        if (
          threshold.level === level &&
          (limit === undefined || threshold.maxPhysicalLines < limit)
        ) {
          limit = threshold.maxPhysicalLines;
        }
      }
    }
    return limit;
  };
  const reviewLimit = limits("review");
  const hardLimit = limits("hard");
  return {
    path,
    status: applicableRules.length > 0 ? "resolved" : "no-applicable-rules",
    matchedScopes: scopes.map((scope) => scope.pathPattern),
    applicableRuleIds: applicableRules.map((rule) => rule.id),
    ...(reviewLimit === undefined ? {} : { reviewLimit }),
    ...(hardLimit === undefined ? {} : { hardLimit }),
  };
}

function dispositionFor(
  projectedLikely: number,
  resolution: EngineeringQualityPolicyResolution,
): QualityTaskProjectionDisposition {
  if (resolution.status === "no-applicable-rules") return "unsupported";
  if (
    resolution.hardLimit !== undefined &&
    projectedLikely > resolution.hardLimit
  ) {
    return "likely-hard-limit-crossing";
  }
  if (
    resolution.reviewLimit !== undefined &&
    projectedLikely > resolution.reviewLimit
  ) {
    return "likely-review-threshold-crossing";
  }
  return "within-policy";
}

export function prepareEngineeringQualityTaskPlan(
  options: EngineeringQualityTaskPlanOptions,
): EngineeringQualityTaskPlan {
  const policy = validateEngineeringQualityPolicy(options.policy);
  const changes: EngineeringQualityProjectedChange[] = [];
  const conflicts: EngineeringQualityTaskPlan["conflicts"][number][] = [];
  for (const input of options.changes) {
    const evidence = validateEngineeringQualityEvidence(input.currentEvidence);
    if (evidence.artifactPath !== input.path) {
      throw new Error(
        `change path must match evidence artifactPath: ${input.path}`,
      );
    }
    const projectedMinimum =
      evidence.measuredValue + input.estimatedGrowth.minimum;
    const projectedLikely =
      evidence.measuredValue + input.estimatedGrowth.likely;
    const policyResolution = resolveEngineeringQualityPolicyForPath(
      policy,
      input.path,
      evidence.classification,
    );
    const disposition = dispositionFor(projectedLikely, policyResolution);
    changes.push({
      path: input.path,
      currentLines: evidence.measuredValue,
      projectedMinimum,
      projectedLikely,
      estimatedGrowth: input.estimatedGrowth,
      policy: policyResolution,
      disposition,
    });
    if (policyResolution.status === "no-applicable-rules") {
      conflicts.push({
        kind: "policy-unresolved",
        path: input.path,
        message: `No applicable quality rule resolved for ${input.path}.`,
      });
    }
    if (disposition === "likely-hard-limit-crossing") {
      conflicts.push({
        kind: "hard-limit-crossing",
        path: input.path,
        message: `Likely projected growth crosses the hard limit for ${input.path}.`,
      });
    }
  }
  if (!options.acceptanceCriteria.some((criterion) => criterion.required)) {
    conflicts.push({
      kind: "missing-acceptance-criteria",
      message: "At least one required plan acceptance criterion is needed.",
    });
  }
  const hasReview = changes.some(
    (change) => change.disposition === "likely-review-threshold-crossing",
  );
  const status =
    conflicts.length > 0
      ? "conflict"
      : hasReview
        ? "review-required"
        : "accepted";
  return validateEngineeringQualityTaskPlan({
    schemaVersion: QUALITY_TASK_PLAN_SCHEMA_URN,
    projectId: options.projectId,
    taskId: options.taskId,
    policyId: policy.policyId,
    changes,
    acceptanceCriteria: options.acceptanceCriteria,
    status,
    conflicts,
  });
}
