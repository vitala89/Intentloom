export type InceptionCategory =
  "product" | "architecture" | "tooling" | "security";

export interface InceptionQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly category: InceptionCategory;
  readonly required: boolean;
  readonly options?: readonly string[];
}

export type AnswerConfidence = "confirmed" | "assumed" | "preference";

export interface InceptionAnswer {
  readonly questionId: string;
  readonly value: string;
  readonly confidence: AnswerConfidence;
  readonly timestamp: number;
}

export type ProjectConstraintKind = "hard" | "preference";

export interface ProjectConstraint {
  readonly id: string;
  readonly kind: ProjectConstraintKind;
  readonly scope: string;
  readonly description: string;
}

export type ProjectAssumptionStatus = "pending" | "accepted" | "rejected";

export interface ProjectAssumption {
  readonly id: string;
  readonly description: string;
  readonly status: ProjectAssumptionStatus;
}

export interface BlueprintAlternative {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
}

export type InceptionSessionStatus =
  "discovering" | "blueprinting" | "approved" | "cancelled";

export interface InceptionSessionState {
  readonly id: string;
  readonly root: string;
  readonly idea: string;
  readonly status: InceptionSessionStatus;
  readonly questions: readonly InceptionQuestion[];
  readonly answers: readonly InceptionAnswer[];
  readonly constraints: readonly ProjectConstraint[];
  readonly assumptions: readonly ProjectAssumption[];
  readonly alternatives: readonly BlueprintAlternative[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type EffortProfile = "low" | "medium" | "high";

export interface InceptionConflict {
  readonly questionId: string;
  readonly conflict: string;
  readonly severity: "error" | "warning";
}

export interface InceptionDiscoveryOptions {
  readonly effort?: EffortProfile;
  readonly modelProfile?: string;
}

export type BlueprintTopology =
  | "single-package"
  | "pnpm-workspace"
  | "cli-tool"
  | "web-product"
  | "desktop-product";

export interface ProjectBlueprint {
  readonly id: string;
  readonly name: string;
  readonly topology: BlueprintTopology;
  readonly recommendedPacks: readonly string[];
  readonly qualityProfile: string;
  readonly frameworkNeutral: boolean;
  readonly digest: string;
  readonly alternatives: readonly BlueprintAlternative[];
  readonly createdAt: number;
}

export type BlueprintApprovalStatus = "approved" | "revoked" | "expired";

export interface BlueprintApproval {
  readonly blueprintId: string;
  readonly blueprintDigest: string;
  readonly approver: string;
  readonly approvedAt: number;
  readonly expiry: number;
  readonly status: BlueprintApprovalStatus;
}
