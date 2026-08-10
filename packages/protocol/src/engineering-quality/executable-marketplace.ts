import type { QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN } from "./common.js";

export type QualityExecutableMarketplaceDecisionStatus =
  "rejected" | "accepted-scoped" | "deferred";

export interface QualityExecutableMarketplaceDecision {
  readonly schemaVersion: typeof QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN;
  readonly id: string;
  readonly status: QualityExecutableMarketplaceDecisionStatus;
  readonly rationale: string;
  readonly requiredCapabilityBoundary: readonly string[];
  readonly securityRequirements: readonly string[];
  readonly evaluatedAt: string;
}

export interface QualityExecutablePackSafetyOptions {
  readonly packId: string;
  readonly publisherIdentity: string;
  readonly signature: string;
  readonly trustRootId?: string;
  readonly isExecutable: boolean;
  readonly requestedCapabilities: readonly string[];
  readonly sandboxProfile: string;
  readonly licenseApproved: boolean;
}

export type QualityExecutablePackEvaluationDecision =
  "blocked" | "approved-sandbox";

export interface QualityExecutableMarketplaceEvaluation {
  readonly packId: string;
  readonly publisherSigned: boolean;
  readonly sandboxCompliant: boolean;
  readonly licenseApproved: boolean;
  readonly decision: QualityExecutablePackEvaluationDecision;
  readonly evaluationDigest: string;
  readonly evaluatedAt: string;
}
