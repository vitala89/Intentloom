import {
  ASSESSMENT_REPORT_SCHEMA_URN,
  type AIEngineeringAssessmentResult,
  type ArchitectureAssessmentResult,
  type AssessmentEnvelope,
  type AssessmentFindingProjection,
  type AssessmentModule,
  type AssessmentReportModel,
  type AssessmentStatus,
  type MonorepoCIAssessmentResult,
  type PerformanceBaselineEvidence,
  type RemediationRoadmap,
  type TargetStateOption,
  type TechnicalDebtMap,
} from "@intentloom/protocol";
import {
  validateAIEngineeringAssessmentResult,
  validateMonorepoCIAssessmentResult,
  validatePerformanceBaselineEvidence,
} from "./adapters.js";
import { validateArchitectureAssessmentResult } from "./architecture.js";
import {
  ASSESSMENT_MODULES,
  ASSESSMENT_STATUSES,
  isObject,
  stringArray,
} from "./common.js";
import { validateAssessmentEvidenceReference } from "./evidence.js";
import {
  validateAssessmentFindingProjection,
  validateTechnicalDebtMap,
} from "./finding-debt.js";
import {
  validateAssessmentIdentity,
  validateAssessmentProvenance,
  validateAssessmentScope,
} from "./identity-scope.js";
import {
  validateRemediationRoadmap,
  validateTargetStateOption,
} from "./remediation-comparison.js";

export function validateAssessmentEnvelope(value: unknown): AssessmentEnvelope {
  if (!isObject(value)) {
    throw new Error("assessment envelope must be an object");
  }
  const identity = validateAssessmentIdentity(value.identity);
  const scope = validateAssessmentScope(value.scope);

  if (!ASSESSMENT_STATUSES.includes(value.status as AssessmentStatus)) {
    throw new Error("status must be a valid AssessmentStatus");
  }

  if (
    typeof value.timestamp !== "number" ||
    !Number.isFinite(value.timestamp) ||
    value.timestamp <= 0
  ) {
    throw new Error("timestamp must be a positive timestamp number");
  }

  if (!Array.isArray(value.modules)) {
    throw new Error("modules must be an array");
  }
  for (const moduleItem of value.modules) {
    if (!ASSESSMENT_MODULES.includes(moduleItem as AssessmentModule)) {
      throw new Error(
        `modules contains invalid assessment module: ${String(moduleItem)}`,
      );
    }
  }

  const findingReferences = stringArray(
    value.findingReferences,
    "findingReferences",
  );
  const insufficientEvidenceAreas = stringArray(
    value.insufficientEvidenceAreas,
    "insufficientEvidenceAreas",
  );

  const rawEvidenceRefs = value.evidenceReferences;
  if (!Array.isArray(rawEvidenceRefs)) {
    throw new Error("evidenceReferences must be an array");
  }
  const evidenceReferences = rawEvidenceRefs.map(
    validateAssessmentEvidenceReference,
  );

  let findingProjections: readonly AssessmentFindingProjection[] | undefined =
    undefined;
  if (value.findingProjections !== undefined) {
    if (!Array.isArray(value.findingProjections)) {
      throw new Error("findingProjections must be an array when provided");
    }
    findingProjections = value.findingProjections.map(
      validateAssessmentFindingProjection,
    );
  }

  let architectureResult: ArchitectureAssessmentResult | undefined = undefined;
  if (value.architectureResult !== undefined) {
    architectureResult = validateArchitectureAssessmentResult(
      value.architectureResult,
    );
  }

  let technicalDebtMap: TechnicalDebtMap | undefined = undefined;
  if (value.technicalDebtMap !== undefined) {
    technicalDebtMap = validateTechnicalDebtMap(value.technicalDebtMap);
  }

  let performanceEvidence: PerformanceBaselineEvidence | undefined = undefined;
  if (value.performanceEvidence !== undefined) {
    performanceEvidence = validatePerformanceBaselineEvidence(
      value.performanceEvidence,
    );
  }

  let monorepoCiResult: MonorepoCIAssessmentResult | undefined = undefined;
  if (value.monorepoCiResult !== undefined) {
    monorepoCiResult = validateMonorepoCIAssessmentResult(
      value.monorepoCiResult,
    );
  }

  let aiEngineeringResult: AIEngineeringAssessmentResult | undefined =
    undefined;
  if (value.aiEngineeringResult !== undefined) {
    aiEngineeringResult = validateAIEngineeringAssessmentResult(
      value.aiEngineeringResult,
    );
  }

  let targetStateOptions: readonly TargetStateOption[] | undefined = undefined;
  if (value.targetStateOptions !== undefined) {
    if (!Array.isArray(value.targetStateOptions)) {
      throw new Error("targetStateOptions must be an array when provided");
    }
    targetStateOptions = value.targetStateOptions.map(
      validateTargetStateOption,
    );
  }

  let remediationRoadmap: RemediationRoadmap | undefined = undefined;
  if (value.remediationRoadmap !== undefined) {
    remediationRoadmap = validateRemediationRoadmap(value.remediationRoadmap);
  }

  const provenance = validateAssessmentProvenance(value.provenance);

  return {
    identity,
    scope,
    status: value.status as AssessmentStatus,
    timestamp: value.timestamp,
    modules: value.modules as readonly AssessmentModule[],
    findingReferences,
    insufficientEvidenceAreas,
    evidenceReferences,
    ...(findingProjections !== undefined ? { findingProjections } : {}),
    ...(architectureResult !== undefined ? { architectureResult } : {}),
    ...(technicalDebtMap !== undefined ? { technicalDebtMap } : {}),
    ...(performanceEvidence !== undefined ? { performanceEvidence } : {}),
    ...(monorepoCiResult !== undefined ? { monorepoCiResult } : {}),
    ...(aiEngineeringResult !== undefined ? { aiEngineeringResult } : {}),
    ...(targetStateOptions !== undefined ? { targetStateOptions } : {}),
    ...(remediationRoadmap !== undefined ? { remediationRoadmap } : {}),
    provenance,
  };
}

export function validateAssessmentReportModel(
  value: unknown,
): AssessmentReportModel {
  if (!isObject(value)) {
    throw new Error("assessment report model must be an object");
  }
  if (value.schemaVersion !== ASSESSMENT_REPORT_SCHEMA_URN) {
    throw new Error(`schemaVersion must equal ${ASSESSMENT_REPORT_SCHEMA_URN}`);
  }
  const envelope = validateAssessmentEnvelope(value.envelope);
  const technicalDebtMap = validateTechnicalDebtMap(value.technicalDebtMap);
  if (typeof value.summary !== "string" || !value.summary.trim()) {
    throw new Error("summary must be a non-empty string");
  }
  const unsupportedAreas = stringArray(
    value.unsupportedAreas,
    "unsupportedAreas",
  );

  return {
    schemaVersion: ASSESSMENT_REPORT_SCHEMA_URN,
    envelope,
    technicalDebtMap,
    summary: value.summary,
    unsupportedAreas,
  };
}
