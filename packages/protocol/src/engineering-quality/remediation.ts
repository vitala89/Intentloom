import type {
  QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
  QualityRemediationKind,
  QualityRemediationStatus,
} from "./common.js";

export interface QualityRemediationProposal {
  readonly id: string;
  readonly kind: QualityRemediationKind;
  readonly title: string;
  readonly rationale: string;
  readonly targetFindingIds: readonly string[];
  readonly affectedPaths: readonly string[];
}

export interface QualityRemediationFileDiff {
  readonly path: string;
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly beforeContent: string;
  readonly afterContent: string;
}

export interface EngineeringQualityRemediationPlan {
  readonly schemaVersion: typeof QUALITY_REMEDIATION_PLAN_SCHEMA_URN;
  readonly planId: string;
  readonly projectRoot: string;
  readonly status: QualityRemediationStatus;
  readonly proposal: QualityRemediationProposal;
  readonly diffs: readonly QualityRemediationFileDiff[];
  readonly contentDigest: string;
  readonly createdAt: string;
  readonly approvedAt?: string;
  readonly appliedAt?: string;
}

export interface QualityRemediationApplyOptions {
  readonly projectRoot: string;
  readonly plan: EngineeringQualityRemediationPlan;
  readonly humanApprovalToken: string;
  readonly createBackup?: boolean;
}

export interface QualityRemediationRollbackResult {
  readonly status: "success" | "failed";
  readonly restoredFiles: readonly string[];
  readonly error?: string;
}
