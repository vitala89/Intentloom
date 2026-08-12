export const FEATURE_INTENT_SCHEMA_URN =
  "urn:intentloom:schema:feature-intent:1" as const;

export const FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN =
  "urn:intentloom:schema:feature-intent-workspace-overview:1" as const;

export const FEATURE_INTENT_OPERATIONS = [
  "createFeatureIntent",
  "resolveAffectedScope",
  "analyzeArchitectureImpact",
  "prepareImplementationAlternatives",
  "prepareImplementationPlan",
] as const;

export type FeatureIntentOperation = (typeof FEATURE_INTENT_OPERATIONS)[number];

export type FeatureIntentAlternativeStrategy =
  "narrow-scope" | "boundary-preserving" | "phased-with-debt";

export interface FeatureIntent {
  readonly schemaVersion: typeof FEATURE_INTENT_SCHEMA_URN;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly createdAt: number;
  readonly readOnly: true;
}

export interface FeatureIntentAffectedScope {
  readonly packages: readonly string[];
  readonly matchedPaths: readonly string[];
  readonly publicApiSurfaces: readonly string[];
  readonly graphNodeIds: readonly string[];
  readonly graphProviderKind: string;
  readonly specializedPackIds: readonly string[];
  readonly decisionPaths: readonly string[];
  readonly foundationPresent: boolean;
}

export interface FeatureIntentArchitectureImpact {
  readonly summary: string;
  readonly assessmentFindingsCount: number;
  readonly debtItemCount: number;
  readonly publicApiChangeRisk: "none" | "possible" | "likely";
  readonly graphNodeCount: number;
  readonly evidence: readonly string[];
}

export interface FeatureIntentImplementationAlternative {
  readonly id: string;
  readonly strategy: FeatureIntentAlternativeStrategy;
  readonly title: string;
  readonly summary: string;
  readonly tradeoffs: readonly string[];
}

export interface FeatureIntentPlanStep {
  readonly id: string;
  readonly label: string;
  readonly mutationAllowed: false;
}

export interface FeatureIntentImplementationPlan {
  readonly selectedAlternativeId: string;
  readonly reviewRequired: true;
  readonly mutationAllowed: false;
  readonly executionGate: "w11-blocked";
  readonly steps: readonly FeatureIntentPlanStep[];
}

export interface FeatureIntentWorkspaceOverview {
  readonly schemaVersion: typeof FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN;
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly readOnly: true;
  readonly intent: FeatureIntent;
  readonly affectedScope: FeatureIntentAffectedScope;
  readonly architectureImpact: FeatureIntentArchitectureImpact;
  readonly alternatives: readonly FeatureIntentImplementationAlternative[];
  readonly plan: FeatureIntentImplementationPlan;
}
