import type {
  QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
  QUALITY_BASELINE_RATCHET_SCHEMA_URN,
  QUALITY_BASELINE_REDUCTION_SCHEMA_URN,
  QualityBaselineRatchetIssueKind,
  QualityBaselineRatchetStatus,
} from "./common.js";
import type {
  EngineeringQualityBaseline,
  EngineeringQualityBaselineItem,
  EngineeringQualityEvidence,
  EngineeringQualityFinding,
} from "./finding.js";

export interface EngineeringQualityBaselinePreview {
  readonly schemaVersion: typeof QUALITY_BASELINE_PREVIEW_SCHEMA_URN;
  readonly projectId: string;
  readonly policyId: string;
  readonly policyVersion?: string;
  readonly generatedAt: number;
  readonly candidateItems: readonly EngineeringQualityBaselineItem[];
  readonly sourceFindingIds: readonly string[];
  readonly approvalRequired: true;
}

export interface EngineeringQualityBaselineApproval {
  readonly approvedBy: string;
  readonly approvedAt: number;
}

export interface EngineeringQualityBaselineRatchetIssue {
  readonly kind: QualityBaselineRatchetIssueKind;
  readonly ruleId: string;
  readonly artifactPath: string;
  readonly baselineItemId?: string;
  readonly findingId?: string;
  readonly baselineMeasuredValue?: number;
  readonly measuredValue?: number;
  readonly allowedCeiling?: number;
  readonly message: string;
}

export interface EngineeringQualityBaselineRatchetResult {
  readonly schemaVersion: typeof QUALITY_BASELINE_RATCHET_SCHEMA_URN;
  readonly projectId: string;
  readonly status: QualityBaselineRatchetStatus;
  readonly requiresReview: boolean;
  readonly issues: readonly EngineeringQualityBaselineRatchetIssue[];
  readonly legacyFindings: readonly EngineeringQualityFinding[];
  readonly newViolations: readonly EngineeringQualityFinding[];
  readonly growthViolations: readonly EngineeringQualityFinding[];
  readonly staleItems: readonly EngineeringQualityBaselineItem[];
  readonly expiredItems: readonly EngineeringQualityBaselineItem[];
  readonly resolvedItems: readonly EngineeringQualityBaselineItem[];
}

export interface EngineeringQualityBaselineReduction {
  readonly schemaVersion: typeof QUALITY_BASELINE_REDUCTION_SCHEMA_URN;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly baseline: EngineeringQualityBaseline;
  readonly removedItems: readonly EngineeringQualityBaselineItem[];
  readonly retainedItems: readonly EngineeringQualityBaselineItem[];
}

export interface EngineeringQualityBaselineRatchetOptions {
  readonly baseline: EngineeringQualityBaseline;
  readonly findings: readonly EngineeringQualityFinding[];
  readonly evidence?: readonly EngineeringQualityEvidence[];
  readonly now?: number;
}
