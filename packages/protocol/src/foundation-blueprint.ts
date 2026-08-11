import type {
  BlueprintApproval,
  BlueprintTopology,
  ProjectBlueprint,
} from "./inception.js";

export type FoundationBlueprintTier = "minimal" | "recommended" | "extensible";

export type FoundationBlueprintComplexity = "low" | "medium" | "high";

export type FoundationBlueprintReversibility = "easy" | "moderate" | "hard";

export interface FoundationBlueprintDecisionMetadata {
  readonly complexity: FoundationBlueprintComplexity;
  readonly reversibility: FoundationBlueprintReversibility;
  readonly migrationNotes: readonly string[];
  readonly deferredDecisions: readonly string[];
}

export interface FoundationBlueprintCandidate {
  readonly tier: FoundationBlueprintTier;
  readonly blueprint: ProjectBlueprint;
  readonly metadata: FoundationBlueprintDecisionMetadata;
  readonly rationale: string;
}

export interface FoundationBlueprintProposalResult {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly recommendedTopology: BlueprintTopology;
  readonly recommended: FoundationBlueprintCandidate;
  readonly alternatives: readonly FoundationBlueprintCandidate[];
  readonly digest: string;
  readonly workshopUnchanged: true;
}

export interface FoundationBlueprintCompareResult {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly leftTier: FoundationBlueprintTier;
  readonly rightTier: FoundationBlueprintTier;
  readonly topologyMatch: boolean;
  readonly packDifferences: readonly string[];
}

export interface FoundationBlueprintApprovalRecord {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly tier: FoundationBlueprintTier;
  readonly approval: BlueprintApproval;
}
