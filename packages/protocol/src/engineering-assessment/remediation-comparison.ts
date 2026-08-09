export interface TargetStateOption {
  readonly optionId: string;
  readonly title: string;
  readonly description: string;
  readonly complexity: "low" | "medium" | "high";
  readonly risks: readonly string[];
  readonly recommendationLevel: "recommended" | "alternative" | "optional";
}

export interface RemediationRoadmapPhase {
  readonly phaseName: "Immediate" | "Next" | "Later";
  readonly items: readonly string[];
}

export interface RemediationRoadmap {
  readonly targetStateOptionId: string;
  readonly phases: readonly RemediationRoadmapPhase[];
}

export interface AssessmentHistoricalComparison {
  readonly previousId: string;
  readonly currentId: string;
  readonly isCompatible: boolean;
  readonly newFindingIds: readonly string[];
  readonly fixedFindingIds: readonly string[];
  readonly unchangedFindingIds: readonly string[];
  readonly technicalDebtItemDelta: number;
  readonly architectureDriftDelta: number;
}

export interface AssessmentRemediationProposal {
  readonly proposalId: string;
  readonly findingId: string;
  readonly targetOptionId: string;
  readonly affectedPaths: readonly string[];
  readonly policyImpact: string;
  readonly rollbackStrategy: string;
  readonly requiresApproval: boolean;
}
