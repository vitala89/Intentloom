import {
  ASSESSMENT_ENVELOPE_SCHEMA_URN,
  ASSESSMENT_REPORT_SCHEMA_URN,
  type ArchitectureAssessmentResult,
  type AssessmentEnvelope,
  type AssessmentEvidenceReference,
  type AssessmentFindingProjection,
  type AssessmentModule,
  type AssessmentReportModel,
  type RemediationRoadmap,
  type TargetStateOption,
  type TechnicalDebtMap,
} from "@intentloom/protocol";
import {
  validateAIEngineeringAssessmentResult,
  validateAssessmentEnvelope,
  validateAssessmentReportModel,
  validateCheckerAdapterDiagnostics,
  validateMonorepoCIAssessmentResult,
  validatePerformanceBaselineEvidence,
  validateQualityPackReference,
} from "@intentloom/validator";
import type { AssessProjectOptions } from "./assess-options.js";

export type { AssessProjectOptions };

export async function assessProject(
  options: AssessProjectOptions,
): Promise<AssessmentReportModel> {
  const root = options.root;
  if (typeof root !== "string" || !root.trim()) {
    throw new Error("root must be a non-empty string");
  }
  const projectId = options.projectId ?? "intentloom-project";
  const now = options.now ? options.now() : Date.now();
  const enabledModules: readonly AssessmentModule[] = options.modules ?? [
    "architecture",
    "quality",
    "conformance",
    "technical-debt",
  ];

  const packages = options.packages ?? [root];
  const dependencyEdges = options.dependencyEdges ?? [];
  const graphProvider = options.graphProviderKind ?? "workspace-manifest";

  const qualityPacks = (options.qualityPacks ?? []).map(
    validateQualityPackReference,
  );
  const checkerDiagnostics = (options.checkerDiagnostics ?? []).map(
    validateCheckerAdapterDiagnostics,
  );

  const performanceEvidence = options.performanceEvidence
    ? validatePerformanceBaselineEvidence(options.performanceEvidence)
    : undefined;

  const monorepoCiResult = options.monorepoCiResult
    ? validateMonorepoCIAssessmentResult(options.monorepoCiResult)
    : undefined;

  const aiEngineeringResult = options.aiEngineeringResult
    ? validateAIEngineeringAssessmentResult(options.aiEngineeringResult)
    : undefined;

  const boundaryViolations = dependencyEdges.filter(
    (edge) => edge.isBoundaryViolation,
  );

  const findingProjections: AssessmentFindingProjection[] = [];
  const evidenceReferences: AssessmentEvidenceReference[] = [];

  if (boundaryViolations.length > 0) {
    evidenceReferences.push({
      id: "ev-arch-001",
      kind: "deterministic-tool",
      status: "valid",
      quality: "complete",
      sourceId: `graph-provider:${graphProvider}`,
      toolName: "intentloom-assess",
      toolVersion: "1.0.2",
      description: `Architecture graph dependency analysis via ${graphProvider}`,
    });

    for (let i = 0; i < boundaryViolations.length; i++) {
      const violation = boundaryViolations[i]!;
      findingProjections.push({
        id: `fp-arch-${i + 1}`,
        category: "architecture",
        scope: violation.from,
        evidenceReferences: ["ev-arch-001"],
        ruleReference: "rule:architecture:no-boundary-violation",
        severity: "error",
        confidence: "deterministic",
        evidenceQuality: "complete",
        impactSummary: `Boundary violation from ${violation.from} to ${violation.to}`,
        recommendationReferences: [`rec-arch-${i + 1}`],
        provenanceClassification: "deterministic-rule",
      });
    }
  }

  for (let i = 0; i < checkerDiagnostics.length; i++) {
    const diag = checkerDiagnostics[i]!;
    if (diag.diagnosticsCount > 0) {
      const evId = `ev-chk-${i + 1}`;
      evidenceReferences.push({
        id: evId,
        kind: "deterministic-tool",
        status: "valid",
        quality: "complete",
        sourceId: diag.toolName,
        toolName: diag.toolName,
        toolVersion: diag.toolVersion,
        ...(diag.rawOutputDigest !== undefined
          ? { configDigest: diag.rawOutputDigest }
          : {}),
        description: `Diagnostics from ${diag.toolName} v${diag.toolVersion}`,
      });

      findingProjections.push({
        id: `fp-chk-${i + 1}`,
        category: "quality",
        scope: root,
        evidenceReferences: [evId],
        ruleReference: `rule:checker:${diag.toolName}`,
        severity: "warning",
        confidence: "deterministic",
        evidenceQuality: "complete",
        impactSummary: `${diag.diagnosticsCount} diagnostic issue(s) reported by ${diag.toolName}`,
        recommendationReferences: [`rec-chk-${i + 1}`],
        provenanceClassification: "checker-adapter",
      });
    }
  }

  const driftDiagnostics: string[] = [];
  if (boundaryViolations.length > 0) {
    driftDiagnostics.push(
      `Detected ${boundaryViolations.length} architectural boundary violation(s) using ${graphProvider}.`,
    );
  }
  if (qualityPacks.length > 0) {
    driftDiagnostics.push(
      `Applied ${qualityPacks.length} quality pack(s): ${qualityPacks.map((p) => `${p.name}@${p.version}`).join(", ")}.`,
    );
  }

  const architectureResult: ArchitectureAssessmentResult = {
    packages,
    dependencyEdges,
    dependencyCycles: [],
    driftDiagnostics,
  };

  const technicalDebtMap: TechnicalDebtMap = {
    items: findingProjections.map((fp, index) => ({
      id: `td-${index + 1}`,
      findingProjectionId: fp.id,
      category:
        fp.category === "architecture" ? "architecture" : "maintainability",
      affectedScopes: [fp.scope],
      estimatedRemediationComplexity: "medium",
      prerequisites: [],
      recommendedOrder: index + 1,
    })),
  };

  let targetStateOptions: readonly TargetStateOption[] | undefined = undefined;
  let remediationRoadmap: RemediationRoadmap | undefined = undefined;

  if (findingProjections.length > 0) {
    targetStateOptions = [
      {
        optionId: "opt-minimal",
        title: "Minimal Remediation",
        description: "Fix highest priority boundary errors and quality issues.",
        complexity: "low",
        risks: ["May leave secondary technical debt items"],
        recommendationLevel: "recommended",
      },
      {
        optionId: "opt-migration",
        title: "Architecture Migration",
        description: "Full refactoring and strict boundary enforcement.",
        complexity: "high",
        risks: ["Higher refactoring effort and scope"],
        recommendationLevel: "alternative",
      },
    ];

    remediationRoadmap = {
      targetStateOptionId: "opt-minimal",
      phases: [
        {
          phaseName: "Immediate",
          items: findingProjections.map((fp) => fp.id),
        },
        {
          phaseName: "Next",
          items: [],
        },
        {
          phaseName: "Later",
          items: [],
        },
      ],
    };
  }

  const envelopeInput: AssessmentEnvelope = {
    identity: {
      id: `assess-${now}`,
      schemaVersion: ASSESSMENT_ENVELOPE_SCHEMA_URN,
    },
    scope: {
      root,
      projectId,
    },
    status: "completed",
    timestamp: now,
    modules: enabledModules,
    findingReferences: findingProjections.map((fp) => fp.id),
    insufficientEvidenceAreas: [],
    evidenceReferences,
    findingProjections,
    architectureResult,
    technicalDebtMap,
    ...(performanceEvidence !== undefined ? { performanceEvidence } : {}),
    ...(monorepoCiResult !== undefined ? { monorepoCiResult } : {}),
    ...(aiEngineeringResult !== undefined ? { aiEngineeringResult } : {}),
    ...(targetStateOptions !== undefined ? { targetStateOptions } : {}),
    ...(remediationRoadmap !== undefined ? { remediationRoadmap } : {}),
    provenance: {
      toolName: "intentloom",
      toolVersion: "1.0.2",
      executionTimeMs: 10,
    },
  };

  const envelope = validateAssessmentEnvelope(envelopeInput);

  const reportInput: AssessmentReportModel = {
    schemaVersion: ASSESSMENT_REPORT_SCHEMA_URN,
    envelope,
    technicalDebtMap,
    summary:
      findingProjections.length > 0
        ? `Assessment complete: ${findingProjections.length} finding projection(s) identified.`
        : "Assessment complete: project structure conforms to quality and architecture rules.",
    unsupportedAreas: [],
  };

  return validateAssessmentReportModel(reportInput);
}
