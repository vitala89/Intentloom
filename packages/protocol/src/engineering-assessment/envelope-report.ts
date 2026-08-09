import type {
  AIEngineeringAssessmentResult,
  ArchitectureAssessmentResult,
  MonorepoCIAssessmentResult,
  PerformanceBaselineEvidence,
} from "./adapters.js";
import type {
  ASSESSMENT_ENVELOPE_SCHEMA_URN,
  ASSESSMENT_REPORT_SCHEMA_URN,
  AssessmentEvidenceReference,
  AssessmentModule,
  AssessmentStatus,
} from "./common.js";
import type {
  AssessmentFindingProjection,
  TechnicalDebtMap,
} from "./finding-debt.js";
import type {
  RemediationRoadmap,
  TargetStateOption,
} from "./remediation-comparison.js";

export interface AssessmentIdentity {
  readonly id: string;
  readonly schemaVersion: typeof ASSESSMENT_ENVELOPE_SCHEMA_URN;
}

export interface AssessmentScope {
  readonly root: string;
  readonly projectId: string;
  readonly projectDigest?: string;
}

export interface AssessmentProvenanceSummary {
  readonly toolName: string;
  readonly toolVersion: string;
  readonly executionTimeMs: number;
}

export interface AssessmentEnvelope {
  readonly identity: AssessmentIdentity;
  readonly scope: AssessmentScope;
  readonly status: AssessmentStatus;
  readonly timestamp: number;
  readonly modules: readonly AssessmentModule[];
  readonly findingReferences: readonly string[];
  readonly insufficientEvidenceAreas: readonly string[];
  readonly evidenceReferences: readonly AssessmentEvidenceReference[];
  readonly findingProjections?: readonly AssessmentFindingProjection[];
  readonly architectureResult?: ArchitectureAssessmentResult;
  readonly technicalDebtMap?: TechnicalDebtMap;
  readonly performanceEvidence?: PerformanceBaselineEvidence;
  readonly monorepoCiResult?: MonorepoCIAssessmentResult;
  readonly aiEngineeringResult?: AIEngineeringAssessmentResult;
  readonly targetStateOptions?: readonly TargetStateOption[];
  readonly remediationRoadmap?: RemediationRoadmap;
  readonly provenance: AssessmentProvenanceSummary;
}

export interface AssessmentReportModel {
  readonly schemaVersion: typeof ASSESSMENT_REPORT_SCHEMA_URN;
  readonly envelope: AssessmentEnvelope;
  readonly technicalDebtMap: TechnicalDebtMap;
  readonly summary: string;
  readonly unsupportedAreas: readonly string[];
}
