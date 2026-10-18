export interface InceptionSummary {
  readonly sessionId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly confirmedAnswers: number;
  readonly assumptionsCount: number;
  readonly constraintsCount: number;
  readonly alternativesCount: number;
}
