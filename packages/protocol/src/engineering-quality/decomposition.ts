import type {
  QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
  QualityDecompositionConflictKind,
  QualityDecompositionOptionKind,
  QualityDecompositionPlanStatus,
  QualityDependencyKind,
  QualityPublicApiCompatibility,
  QualityResponsibilityCohesion,
} from "./common.js";

export interface EngineeringQualityResponsibilityEvidence {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly measuredLines: number;
  readonly cohesion: QualityResponsibilityCohesion;
  readonly publicApiSymbols: readonly string[];
  readonly testIds: readonly string[];
}

export interface EngineeringQualityDependencyEvidence {
  readonly fromResponsibilityId: string;
  readonly toResponsibilityId: string;
  readonly kind: QualityDependencyKind;
  readonly stable: boolean;
}

export interface EngineeringQualityPublicApiEvidence {
  readonly symbol: string;
  readonly responsibilityId: string;
  readonly consumerCount: number;
  readonly compatibility: QualityPublicApiCompatibility;
}

export interface EngineeringQualityTestPreservationEvidence {
  readonly id: string;
  readonly path: string;
  readonly behavior: string;
  readonly responsibilityIds: readonly string[];
}

export interface EngineeringQualityDecompositionEvidence {
  readonly artifactPath: string;
  readonly currentLines: number;
  readonly preferredLimit: number;
  readonly hardLimit: number;
  readonly responsibilities: readonly EngineeringQualityResponsibilityEvidence[];
  readonly dependencies: readonly EngineeringQualityDependencyEvidence[];
  readonly publicApi: readonly EngineeringQualityPublicApiEvidence[];
  readonly tests: readonly EngineeringQualityTestPreservationEvidence[];
}

export interface EngineeringQualityDecompositionMigrationStep {
  readonly order: number;
  readonly description: string;
  readonly responsibilityIds: readonly string[];
  readonly verification: string;
}

export interface EngineeringQualityDecompositionOption {
  readonly kind: QualityDecompositionOptionKind;
  readonly title: string;
  readonly rationale: string;
  readonly extractedResponsibilityIds: readonly string[];
  readonly retainedResponsibilityIds: readonly string[];
  readonly projectedHostLines: number;
  readonly publicApiActions: readonly string[];
  readonly testPreservationSteps: readonly string[];
  readonly migrationSteps: readonly EngineeringQualityDecompositionMigrationStep[];
  readonly requiresApproval: boolean;
}

export interface EngineeringQualityDecompositionConflict {
  readonly kind: QualityDecompositionConflictKind;
  readonly message: string;
  readonly responsibilityIds?: readonly string[];
}

export interface EngineeringQualityDecompositionPlan {
  readonly schemaVersion: typeof QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN;
  readonly projectId: string;
  readonly taskId: string;
  readonly evidence: EngineeringQualityDecompositionEvidence;
  readonly options: readonly EngineeringQualityDecompositionOption[];
  readonly recommendedOption: QualityDecompositionOptionKind;
  readonly status: QualityDecompositionPlanStatus;
  readonly conflicts: readonly EngineeringQualityDecompositionConflict[];
}

export interface EngineeringQualityDecompositionPlanOptions {
  readonly projectId: string;
  readonly taskId: string;
  readonly evidence: EngineeringQualityDecompositionEvidence;
}
