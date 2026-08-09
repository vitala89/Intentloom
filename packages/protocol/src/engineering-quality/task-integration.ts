import type {
  QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
  QUALITY_TASK_DIFF_SCHEMA_URN,
  QUALITY_TASK_PLAN_SCHEMA_URN,
  QualityProjectionConfidence,
  QualityTaskChangeStatus,
  QualityTaskConflictKind,
  QualityTaskDiffStatus,
  QualityTaskPlanStatus,
  QualityTaskProjectionDisposition,
} from "./common.js";
import type { EngineeringQualityEvidence } from "./finding.js";
import type { EngineeringQualityPolicy } from "./policy.js";

export interface EngineeringQualityGrowthProjection {
  readonly minimum: number;
  readonly likely: number;
  readonly confidence: QualityProjectionConfidence;
}

export interface EngineeringQualityProjectedChangeInput {
  readonly path: string;
  readonly currentEvidence: EngineeringQualityEvidence;
  readonly estimatedGrowth: EngineeringQualityGrowthProjection;
}

export interface EngineeringQualityPolicyResolution {
  readonly path: string;
  readonly status: "resolved" | "no-applicable-rules";
  readonly matchedScopes: readonly string[];
  readonly applicableRuleIds: readonly string[];
  readonly reviewLimit?: number;
  readonly hardLimit?: number;
}

export interface EngineeringQualityProjectedChange {
  readonly path: string;
  readonly currentLines: number;
  readonly projectedMinimum: number;
  readonly projectedLikely: number;
  readonly estimatedGrowth: EngineeringQualityGrowthProjection;
  readonly policy: EngineeringQualityPolicyResolution;
  readonly disposition: QualityTaskProjectionDisposition;
}

export interface EngineeringQualityAcceptanceCriterion {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
}

export interface EngineeringQualityPlanConflict {
  readonly kind: QualityTaskConflictKind;
  readonly path?: string;
  readonly criterionId?: string;
  readonly message: string;
}

export interface EngineeringQualityTaskPlan {
  readonly schemaVersion: typeof QUALITY_TASK_PLAN_SCHEMA_URN;
  readonly projectId: string;
  readonly taskId: string;
  readonly policyId: string;
  readonly changes: readonly EngineeringQualityProjectedChange[];
  readonly acceptanceCriteria: readonly EngineeringQualityAcceptanceCriterion[];
  readonly status: QualityTaskPlanStatus;
  readonly conflicts: readonly EngineeringQualityPlanConflict[];
}

export interface EngineeringQualityAcceptanceResult {
  readonly criterionId: string;
  readonly satisfied: boolean;
  readonly details: string;
}

export interface EngineeringQualityFinalChange {
  readonly path: string;
  readonly finalLines?: number;
  readonly actualGrowth?: number;
  readonly projectedLikely?: number;
  readonly status: QualityTaskChangeStatus;
}

export interface EngineeringQualityTaskDiff {
  readonly schemaVersion: typeof QUALITY_TASK_DIFF_SCHEMA_URN;
  readonly projectId: string;
  readonly taskId: string;
  readonly status: QualityTaskDiffStatus;
  readonly changes: readonly EngineeringQualityFinalChange[];
  readonly acceptanceResults: readonly EngineeringQualityAcceptanceResult[];
  readonly conflicts: readonly EngineeringQualityPlanConflict[];
}

export interface EngineeringQualityPullRequestEvidence {
  readonly schemaVersion: typeof QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN;
  readonly projectId: string;
  readonly taskId: string;
  readonly planStatus: QualityTaskPlanStatus;
  readonly diffStatus: QualityTaskDiffStatus;
  readonly status: "ready" | "conflict";
  readonly markdown: string;
  readonly conflicts: readonly EngineeringQualityPlanConflict[];
}

export interface EngineeringQualityTaskPlanOptions {
  readonly projectId: string;
  readonly taskId: string;
  readonly policy: EngineeringQualityPolicy;
  readonly changes: readonly EngineeringQualityProjectedChangeInput[];
  readonly acceptanceCriteria: readonly EngineeringQualityAcceptanceCriterion[];
}

export interface EngineeringQualityTaskDiffOptions {
  readonly plan: EngineeringQualityTaskPlan;
  readonly finalEvidence: readonly EngineeringQualityEvidence[];
  readonly acceptanceResults?: readonly EngineeringQualityAcceptanceResult[];
}

export interface EngineeringQualityPullRequestEvidenceOptions {
  readonly plan: EngineeringQualityTaskPlan;
  readonly diff: EngineeringQualityTaskDiff;
}
