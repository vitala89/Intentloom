import type {
  VersionedInceptionSession,
  VersionedInceptionSummary,
} from "@intentloom/protocol";
import {
  getInceptionSessionViewmodel,
  identifyInceptionSessionConflicts,
  listInceptionQuestions,
  summarizeInceptionSessionViewmodel,
} from "./inception.js";

export type InceptionClientSurfaceState =
  "empty" | "loading" | "ready" | "error" | "resume" | "deleted";

export interface InceptionQuestionRowViewModel {
  readonly id: string;
  readonly prompt: string;
  readonly category: string;
  readonly required: boolean;
  readonly answered: boolean;
  readonly answerValue?: string;
  readonly confidence?: string;
}

export interface InceptionSessionProgressViewModel {
  readonly sessionId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly retentionStatus: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly confirmedAnswers: number;
  readonly conflictCount: number;
  readonly progressPercent: number;
  readonly questions: readonly InceptionQuestionRowViewModel[];
  readonly surfaceState: InceptionClientSurfaceState;
}

export interface InceptionNewProjectShellViewModel {
  readonly headline: string;
  readonly description: string;
  readonly canStart: boolean;
  readonly resumeSessionId?: string;
  readonly surfaceState: InceptionClientSurfaceState;
}

function progressPercent(answered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((answered / total) * 100);
}

function questionRows(
  session: VersionedInceptionSession,
): readonly InceptionQuestionRowViewModel[] {
  const answeredByQuestion = new Map(
    session.session.answers.map((answer) => [answer.questionId, answer]),
  );
  return session.session.questions.map((question) => {
    const answer = answeredByQuestion.get(question.id);
    return {
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      required: question.required,
      answered: answer !== undefined,
      ...(answer?.value !== undefined ? { answerValue: answer.value } : {}),
      ...(answer?.confidence !== undefined
        ? { confidence: answer.confidence }
        : {}),
    } satisfies InceptionQuestionRowViewModel;
  });
}

export function buildInceptionSessionProgressViewModel(input: {
  readonly session: VersionedInceptionSession;
  readonly summary?: VersionedInceptionSummary;
  readonly conflictCount?: number;
  readonly surfaceState?: InceptionClientSurfaceState;
}): InceptionSessionProgressViewModel {
  const summary =
    input.summary ??
    summarizeInceptionSessionViewmodel(input.session.session.id);
  const conflictCount =
    input.conflictCount ??
    identifyInceptionSessionConflicts(input.session.session.id).conflicts
      .length;

  return {
    sessionId: input.session.session.id,
    root: input.session.session.root,
    idea: input.session.session.idea,
    status: input.session.session.status,
    retentionStatus: input.session.retention.status,
    totalQuestions: summary.totalQuestions,
    answeredQuestions: summary.answeredQuestions,
    pendingQuestions: summary.pendingQuestions,
    confirmedAnswers: summary.confirmedAnswers,
    conflictCount,
    progressPercent: progressPercent(
      summary.answeredQuestions,
      summary.totalQuestions,
    ),
    questions: questionRows(input.session),
    surfaceState: input.surfaceState ?? "ready",
  };
}

export function buildInceptionSessionProgressFromId(
  sessionId: string,
  surfaceState: InceptionClientSurfaceState = "ready",
): InceptionSessionProgressViewModel {
  return buildInceptionSessionProgressViewModel({
    session: getInceptionSessionViewmodel(sessionId),
    surfaceState,
  });
}

export function buildInceptionNewProjectShellViewModel(input: {
  readonly resumeSessionId?: string;
  readonly surfaceState?: InceptionClientSurfaceState;
}): InceptionNewProjectShellViewModel {
  const surfaceState = input.surfaceState ?? "empty";
  const shell: InceptionNewProjectShellViewModel = {
    headline: "Start a new project",
    description:
      "Describe your idea and answer discovery questions before any files are created.",
    canStart: surfaceState !== "loading",
    surfaceState,
  };
  if (input.resumeSessionId) {
    return { ...shell, resumeSessionId: input.resumeSessionId };
  }
  return shell;
}

export function buildInceptionQuestionListViewModel(sessionId: string) {
  const list = listInceptionQuestions(sessionId);
  const session = getInceptionSessionViewmodel(sessionId);
  return {
    sessionId,
    pendingQuestionIds: list.pendingQuestionIds,
    pendingCount: list.pendingQuestionIds.length,
    totalCount: list.questions.length,
    progress: buildInceptionSessionProgressViewModel({ session }),
  };
}
