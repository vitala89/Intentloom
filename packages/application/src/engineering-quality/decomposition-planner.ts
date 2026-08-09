import {
  QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
  type EngineeringQualityDecompositionConflict,
  type EngineeringQualityDecompositionPlan,
  type EngineeringQualityDecompositionPlanOptions,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityDecompositionEvidence,
  validateEngineeringQualityDecompositionPlan,
} from "@intentloom/validator";
import { buildDecompositionOptions } from "./decomposition-options.js";

function conflictsFor(
  evidence: EngineeringQualityDecompositionPlanOptions["evidence"],
  options: ReturnType<typeof buildDecompositionOptions>,
): readonly EngineeringQualityDecompositionConflict[] {
  const conflicts: EngineeringQualityDecompositionConflict[] = [];
  if (
    evidence.responsibilities.length === 0 &&
    evidence.currentLines > evidence.hardLimit
  ) {
    conflicts.push({
      kind: "insufficient-evidence",
      message:
        "No responsibility evidence is available for an oversized artifact.",
    });
  }
  const minimal = options.find((option) => option.kind === "minimal")!;
  const recommended = options.find((option) => option.kind === "recommended")!;
  if (
    evidence.currentLines > evidence.hardLimit &&
    minimal.projectedHostLines > evidence.hardLimit
  ) {
    conflicts.push({
      kind: "no-cohesive-extraction",
      message:
        "No evidence-backed whole-responsibility extraction reaches the hard limit.",
    });
  }
  if (
    evidence.currentLines > evidence.hardLimit &&
    recommended.projectedHostLines > evidence.hardLimit
  ) {
    conflicts.push({
      kind: "oversized-retained",
      message:
        "The recommended cohesive plan would retain an oversized host file.",
      responsibilityIds: recommended.retainedResponsibilityIds,
    });
  }
  for (const api of evidence.publicApi.filter(
    (item) => item.compatibility === "review",
  )) {
    conflicts.push({
      kind: "public-api-risk",
      message: `Public API symbol ${api.symbol} requires compatibility review before extraction.`,
      responsibilityIds: [api.responsibilityId],
    });
  }
  for (const dependency of evidence.dependencies.filter(
    (item) => item.kind === "internal" && !item.stable,
  )) {
    conflicts.push({
      kind: "dependency-risk",
      message: `Unstable dependency connects ${dependency.fromResponsibilityId} and ${dependency.toResponsibilityId}.`,
      responsibilityIds: [
        dependency.fromResponsibilityId,
        dependency.toResponsibilityId,
      ],
    });
  }
  return conflicts;
}

export function prepareEngineeringQualityDecompositionPlan(
  options: EngineeringQualityDecompositionPlanOptions,
): EngineeringQualityDecompositionPlan {
  const evidence = validateEngineeringQualityDecompositionEvidence(
    options.evidence,
  );
  const decompositionOptions = buildDecompositionOptions(evidence);
  const conflicts = conflictsFor(evidence, decompositionOptions);
  const recommended = decompositionOptions.find(
    (option) => option.kind === "recommended",
  )!;
  const minimal = decompositionOptions.find(
    (option) => option.kind === "minimal",
  )!;
  const withinHardLimit = evidence.currentLines <= evidence.hardLimit;
  const status = conflicts.some(
    (conflict) =>
      conflict.kind === "insufficient-evidence" ||
      conflict.kind === "no-cohesive-extraction",
  )
    ? "unsupported"
    : conflicts.length > 0 || !withinHardLimit
      ? "review-required"
      : "ready";
  return validateEngineeringQualityDecompositionPlan({
    schemaVersion: QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
    projectId: options.projectId,
    taskId: options.taskId,
    evidence,
    options: decompositionOptions,
    recommendedOption:
      withinHardLimit || recommended.projectedHostLines <= evidence.hardLimit
        ? "recommended"
        : minimal.projectedHostLines <= evidence.hardLimit
          ? "minimal"
          : "defer",
    status,
    conflicts,
  });
}
