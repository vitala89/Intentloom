import type {
  AIEngineeringAssessmentResult,
  AIEngineeringControlCheck,
  CheckerAdapterDiagnostics,
  MonorepoCIAssessmentResult,
  PerformanceBaselineEvidence,
  PerformanceMetricDelta,
  QualityPackReference,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

export function validateQualityPackReference(
  value: unknown,
): QualityPackReference {
  if (!isObject(value)) {
    throw new Error("quality pack reference must be an object");
  }
  if (typeof value.name !== "string" || !value.name.trim()) {
    throw new Error("qualityPackReference.name must be a non-empty string");
  }
  if (typeof value.version !== "string" || !value.version.trim()) {
    throw new Error("qualityPackReference.version must be a non-empty string");
  }
  if (
    typeof value.rulesCount !== "number" ||
    !Number.isInteger(value.rulesCount) ||
    value.rulesCount < 0
  ) {
    throw new Error(
      "qualityPackReference.rulesCount must be a non-negative integer",
    );
  }
  return {
    name: value.name,
    version: value.version,
    rulesCount: value.rulesCount,
  };
}

export function validateCheckerAdapterDiagnostics(
  value: unknown,
): CheckerAdapterDiagnostics {
  if (!isObject(value)) {
    throw new Error("checker adapter diagnostics must be an object");
  }
  if (typeof value.toolName !== "string" || !value.toolName.trim()) {
    throw new Error(
      "checkerAdapterDiagnostics.toolName must be a non-empty string",
    );
  }
  if (typeof value.toolVersion !== "string" || !value.toolVersion.trim()) {
    throw new Error(
      "checkerAdapterDiagnostics.toolVersion must be a non-empty string",
    );
  }
  if (
    typeof value.diagnosticsCount !== "number" ||
    !Number.isInteger(value.diagnosticsCount) ||
    value.diagnosticsCount < 0
  ) {
    throw new Error(
      "checkerAdapterDiagnostics.diagnosticsCount must be a non-negative integer",
    );
  }
  if (
    value.rawOutputDigest !== undefined &&
    (typeof value.rawOutputDigest !== "string" || !value.rawOutputDigest.trim())
  ) {
    throw new Error(
      "checkerAdapterDiagnostics.rawOutputDigest must be a non-empty string when provided",
    );
  }
  return {
    toolName: value.toolName,
    toolVersion: value.toolVersion,
    diagnosticsCount: value.diagnosticsCount,
    ...(value.rawOutputDigest !== undefined
      ? { rawOutputDigest: value.rawOutputDigest as string }
      : {}),
  };
}

function validatePerformanceMetricDelta(
  value: unknown,
): PerformanceMetricDelta {
  if (!isObject(value)) {
    throw new Error("performance metric delta must be an object");
  }
  if (typeof value.metricName !== "string" || !value.metricName.trim()) {
    throw new Error("metricDelta.metricName must be a non-empty string");
  }
  if (
    typeof value.beforeValue !== "number" ||
    !Number.isFinite(value.beforeValue)
  ) {
    throw new Error("metricDelta.beforeValue must be a finite number");
  }
  if (
    typeof value.afterValue !== "number" ||
    !Number.isFinite(value.afterValue)
  ) {
    throw new Error("metricDelta.afterValue must be a finite number");
  }
  if (typeof value.unit !== "string" || !value.unit.trim()) {
    throw new Error("metricDelta.unit must be a non-empty string");
  }
  if (
    typeof value.deltaPercent !== "number" ||
    !Number.isFinite(value.deltaPercent)
  ) {
    throw new Error("metricDelta.deltaPercent must be a finite number");
  }
  return {
    metricName: value.metricName,
    beforeValue: value.beforeValue,
    afterValue: value.afterValue,
    unit: value.unit,
    deltaPercent: value.deltaPercent,
  };
}

export function validatePerformanceBaselineEvidence(
  value: unknown,
): PerformanceBaselineEvidence {
  if (!isObject(value)) {
    throw new Error("performance baseline evidence must be an object");
  }
  if (typeof value.scenarioId !== "string" || !value.scenarioId.trim()) {
    throw new Error(
      "performanceEvidence.scenarioId must be a non-empty string",
    );
  }
  if (typeof value.environment !== "string" || !value.environment.trim()) {
    throw new Error(
      "performanceEvidence.environment must be a non-empty string",
    );
  }
  if (!Array.isArray(value.metrics)) {
    throw new Error("performanceEvidence.metrics must be an array");
  }
  const metrics = value.metrics.map(validatePerformanceMetricDelta);
  return {
    scenarioId: value.scenarioId,
    environment: value.environment,
    metrics,
  };
}

export function validateMonorepoCIAssessmentResult(
  value: unknown,
): MonorepoCIAssessmentResult {
  if (!isObject(value)) {
    throw new Error("monorepo CI result must be an object");
  }
  if (typeof value.workspaceType !== "string" || !value.workspaceType.trim()) {
    throw new Error(
      "monorepoCiResult.workspaceType must be a non-empty string",
    );
  }
  if (
    typeof value.cachedTasksCount !== "number" ||
    !Number.isInteger(value.cachedTasksCount) ||
    value.cachedTasksCount < 0
  ) {
    throw new Error(
      "monorepoCiResult.cachedTasksCount must be a non-negative integer",
    );
  }
  if (
    typeof value.uncachedTasksCount !== "number" ||
    !Number.isInteger(value.uncachedTasksCount) ||
    value.uncachedTasksCount < 0
  ) {
    throw new Error(
      "monorepoCiResult.uncachedTasksCount must be a non-negative integer",
    );
  }
  if (
    typeof value.ciPipelineCount !== "number" ||
    !Number.isInteger(value.ciPipelineCount) ||
    value.ciPipelineCount < 0
  ) {
    throw new Error(
      "monorepoCiResult.ciPipelineCount must be a non-negative integer",
    );
  }
  return {
    workspaceType: value.workspaceType,
    cachedTasksCount: value.cachedTasksCount,
    uncachedTasksCount: value.uncachedTasksCount,
    ciPipelineCount: value.ciPipelineCount,
  };
}

function validateAIEngineeringControlCheck(
  value: unknown,
): AIEngineeringControlCheck {
  if (!isObject(value)) {
    throw new Error("AI engineering control check must be an object");
  }
  if (typeof value.checkId !== "string" || !value.checkId.trim()) {
    throw new Error("controlCheck.checkId must be a non-empty string");
  }
  if (
    !["passed", "warning", "failed", "insufficient-evidence"].includes(
      value.status as string,
    )
  ) {
    throw new Error(
      "controlCheck.status must be passed, warning, failed, or insufficient-evidence",
    );
  }
  if (typeof value.description !== "string" || !value.description.trim()) {
    throw new Error("controlCheck.description must be a non-empty string");
  }
  return {
    checkId: value.checkId,
    status: value.status as AIEngineeringControlCheck["status"],
    description: value.description,
  };
}

export function validateAIEngineeringAssessmentResult(
  value: unknown,
): AIEngineeringAssessmentResult {
  if (!isObject(value)) {
    throw new Error("AI engineering assessment result must be an object");
  }
  if (
    typeof value.controlsEvaluated !== "number" ||
    !Number.isInteger(value.controlsEvaluated) ||
    value.controlsEvaluated < 0
  ) {
    throw new Error(
      "aiEngineeringResult.controlsEvaluated must be a non-negative integer",
    );
  }
  if (!Array.isArray(value.checks)) {
    throw new Error("aiEngineeringResult.checks must be an array");
  }
  const checks = value.checks.map(validateAIEngineeringControlCheck);
  return {
    controlsEvaluated: value.controlsEvaluated,
    checks,
  };
}
