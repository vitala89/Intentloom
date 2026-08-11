export type FoundationWorkshopStatus =
  | "draft"
  | "discovering"
  | "structuring"
  | "evaluating"
  | "ready"
  | "approved"
  | "archived";

export type FoundationQuestionCategory =
  "intent" | "actors" | "domain" | "quality" | "change" | "constraints";

export interface FoundationQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly category: FoundationQuestionCategory;
  readonly required: boolean;
  readonly options?: readonly string[];
}

export type FoundationAnswerConfidence =
  "confirmed" | "assumed" | "preference" | "unknown" | "deferred";

export interface FoundationAnswer {
  readonly questionId: string;
  readonly value: string;
  readonly confidence: FoundationAnswerConfidence;
  readonly timestamp: number;
}

export interface FoundationActor {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly description: string;
}

export interface FoundationWorkflow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly primaryActorId?: string;
}

export type FoundationSourceOfTruth =
  "internal" | "external" | "shared" | "unresolved";

export interface FoundationDomainConcept {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sourceOfTruth: FoundationSourceOfTruth;
}

export type FoundationQualityCategory =
  | "security"
  | "privacy"
  | "reliability"
  | "accessibility"
  | "performance"
  | "offline"
  | "compatibility";

export type FoundationSensitivityLevel =
  "not-applicable" | "low" | "medium" | "high" | "unclassified";

export interface FoundationQualityScenario {
  readonly id: string;
  readonly category: FoundationQualityCategory;
  readonly description: string;
  readonly sensitivity: FoundationSensitivityLevel;
  readonly expectation: string;
}

export type FoundationConstraintKind = "hard" | "preference";

export interface FoundationConstraint {
  readonly id: string;
  readonly kind: FoundationConstraintKind;
  readonly scope: string;
  readonly description: string;
}

export type FoundationChangeImportance = "strategic" | "likely" | "speculative";

export interface FoundationChangeScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly importance: FoundationChangeImportance;
  readonly reviewed: boolean;
}

export type FoundationRiskSeverity = "low" | "medium" | "high";

export interface FoundationRisk {
  readonly id: string;
  readonly description: string;
  readonly severity: FoundationRiskSeverity;
  readonly mitigation?: string;
}

export type FoundationAlternativeTier =
  "minimal" | "recommended" | "extensible";

export interface FoundationAlternative {
  readonly id: string;
  readonly name: string;
  readonly tier: FoundationAlternativeTier;
  readonly summary: string;
  readonly tradeoffs: readonly string[];
  readonly selected: boolean;
}

export type FoundationReadinessStatus =
  "not-ready" | "ready-with-warnings" | "ready" | "blocked";

export type FoundationReadinessSeverity = "blocking" | "warning" | "info";

export interface FoundationReadinessFinding {
  readonly id: string;
  readonly ruleGroup: string;
  readonly severity: FoundationReadinessSeverity;
  readonly message: string;
  readonly resolved: boolean;
}

export interface FoundationConflict {
  readonly questionId: string;
  readonly conflict: string;
  readonly severity: "error" | "warning";
}

export interface FoundationWorkshopState {
  readonly id: string;
  readonly inceptionSessionId?: string;
  readonly root: string;
  readonly idea: string;
  readonly problemStatement: string;
  readonly smallestOutcome: string;
  readonly nonGoals: readonly string[];
  readonly status: FoundationWorkshopStatus;
  readonly questions: readonly FoundationQuestion[];
  readonly answers: readonly FoundationAnswer[];
  readonly actors: readonly FoundationActor[];
  readonly workflows: readonly FoundationWorkflow[];
  readonly domainConcepts: readonly FoundationDomainConcept[];
  readonly qualityScenarios: readonly FoundationQualityScenario[];
  readonly constraints: readonly FoundationConstraint[];
  readonly changeScenarios: readonly FoundationChangeScenario[];
  readonly risks: readonly FoundationRisk[];
  readonly alternatives: readonly FoundationAlternative[];
  readonly readinessFindings: readonly FoundationReadinessFinding[];
  readonly readinessStatus: FoundationReadinessStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
}
