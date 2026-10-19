export interface FoundationUnderstanding {
  readonly workshopId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly problemStatement: string;
  readonly smallestOutcome: string;
  readonly nonGoalsCount: number;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly actorsCount: number;
  readonly workflowsCount: number;
  readonly domainConceptsCount: number;
  readonly qualityScenariosCount: number;
  readonly changeScenariosCount: number;
  readonly constraintsCount: number;
  readonly risksCount: number;
  readonly alternativesCount: number;
}
