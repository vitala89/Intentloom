import type {
  FoundationWorkshopState,
  FoundationQuestion,
  FoundationAnswer,
} from "@intentloom/protocol";
import {
  validateFoundationAnswer,
  validateFoundationQuestion,
  validateFoundationWorkshopState,
} from "@intentloom/validator";
import {
  deleteFoundationWorkshopStoreEntry,
  getFoundationWorkshopStoreEntry,
  registerFoundationWorkshop,
  updateFoundationWorkshopStoreEntry,
} from "./foundation-workshop-store.js";
import {
  buildFoundationConflictList,
  buildFoundationQuestionList,
  buildFoundationReadinessViewmodel,
  buildFoundationUnderstandingSummary,
  buildFoundationWorkshopDeleteResult,
  buildFoundationWorkshopExport,
  buildFoundationWorkshopViewmodel,
} from "./foundation-viewmodel.js";
import { identifyFoundationConflicts } from "./foundation-discovery.js";
import {
  evaluateFoundationReadinessFindings,
  resolveFoundationReadinessStatus,
} from "./foundation-readiness.js";
import {
  DEFAULT_FOUNDATION_QUESTIONS,
  applyAnswerToWorkshopState,
  createDefaultFoundationWorkshopId,
} from "./foundation-workshop-defaults.js";

export interface CreateFoundationWorkshopParams {
  readonly root: string;
  readonly idea: string;
  readonly inceptionSessionId?: string;
  readonly initialQuestions?: readonly FoundationQuestion[];
  readonly workshopId?: string;
}

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

export function createFoundationWorkshop(
  params: CreateFoundationWorkshopParams,
): FoundationWorkshopState {
  if (typeof params.root !== "string" || params.root.trim().length === 0) {
    throw new Error("createFoundationWorkshop requires a non-empty root path");
  }
  if (typeof params.idea !== "string" || params.idea.trim().length === 0) {
    throw new Error(
      "createFoundationWorkshop requires a non-empty idea statement",
    );
  }

  const questions = (
    params.initialQuestions ?? DEFAULT_FOUNDATION_QUESTIONS
  ).map(validateFoundationQuestion);
  const now = Date.now();
  const id = params.workshopId ?? createDefaultFoundationWorkshopId(now);

  const workshop: FoundationWorkshopState = {
    id,
    ...(params.inceptionSessionId !== undefined
      ? { inceptionSessionId: params.inceptionSessionId }
      : {}),
    root: params.root,
    idea: params.idea,
    problemStatement: "",
    smallestOutcome: "",
    nonGoals: [],
    status: "discovering",
    questions,
    answers: [],
    actors: [],
    workflows: [],
    domainConcepts: [],
    qualityScenarios: [],
    constraints: [],
    changeScenarios: [],
    risks: [],
    alternatives: [],
    readinessFindings: [],
    readinessStatus: "not-ready",
    createdAt: now,
    updatedAt: now,
  };

  return registerFoundationWorkshop(validateFoundationWorkshopState(workshop));
}

export function getFoundationWorkshop(
  workshopId: string,
): FoundationWorkshopState {
  const workshop = getFoundationWorkshopStoreEntry(workshopId);
  if (workshop === undefined) {
    throw new Error(`unknown foundation workshop '${workshopId}'`);
  }
  return validateFoundationWorkshopState(workshop);
}

export function listFoundationQuestions(
  workshopId: string,
  options?: { readonly pendingOnly?: boolean },
) {
  const workshop = getFoundationWorkshop(workshopId);
  const list = buildFoundationQuestionList({
    workshopId: workshop.id,
    questions: workshop.questions,
    answers: workshop.answers,
  });
  if (options?.pendingOnly) {
    const pending = new Set(list.pendingQuestionIds);
    return {
      ...list,
      questions: list.questions.filter((question) => pending.has(question.id)),
    };
  }
  return list;
}

export function recordFoundationWorkshopAnswer(
  workshopId: string,
  rawAnswer: FoundationAnswer,
): FoundationWorkshopState {
  return recordFoundationAnswer(getFoundationWorkshop(workshopId), rawAnswer);
}

export function recordFoundationAnswer(
  workshop: FoundationWorkshopState,
  rawAnswer: FoundationAnswer,
): FoundationWorkshopState {
  const validatedWorkshop = validateFoundationWorkshopState(workshop);
  const validatedAnswer = validateFoundationAnswer(rawAnswer);

  const questionExists = validatedWorkshop.questions.some(
    (question) => question.id === validatedAnswer.questionId,
  );
  if (!questionExists) {
    throw new Error(
      `Cannot record answer: question '${validatedAnswer.questionId}' does not exist in workshop`,
    );
  }

  const updatedAnswers = [
    ...validatedWorkshop.answers.filter(
      (answer) => answer.questionId !== validatedAnswer.questionId,
    ),
    validatedAnswer,
  ];

  let updatedWorkshop = applyAnswerToWorkshopState(
    validatedWorkshop,
    validatedAnswer,
  );
  updatedWorkshop = {
    ...updatedWorkshop,
    answers: updatedAnswers,
    status: "structuring",
    updatedAt: Date.now(),
  };

  return updateFoundationWorkshopStoreEntry(
    validateFoundationWorkshopState(updatedWorkshop),
  );
}

export function summarizeFoundationUnderstandingState(
  workshop: FoundationWorkshopState,
): FoundationUnderstanding {
  const validated = validateFoundationWorkshopState(workshop);
  const totalQuestions = validated.questions.length;
  const answeredQuestions = validated.answers.length;
  return {
    workshopId: validated.id,
    root: validated.root,
    idea: validated.idea,
    status: validated.status,
    problemStatement: validated.problemStatement,
    smallestOutcome: validated.smallestOutcome,
    nonGoalsCount: validated.nonGoals.length,
    totalQuestions,
    answeredQuestions,
    pendingQuestions: totalQuestions - answeredQuestions,
    actorsCount: validated.actors.length,
    workflowsCount: validated.workflows.length,
    domainConceptsCount: validated.domainConcepts.length,
    qualityScenariosCount: validated.qualityScenarios.length,
    changeScenariosCount: validated.changeScenarios.length,
    constraintsCount: validated.constraints.length,
    risksCount: validated.risks.length,
    alternativesCount: validated.alternatives.length,
  };
}

export function summarizeFoundationUnderstandingViewmodel(workshopId: string) {
  return buildFoundationUnderstandingSummary(
    summarizeFoundationUnderstandingState(getFoundationWorkshop(workshopId)),
  );
}

export function identifyFoundationWorkshopConflicts(workshopId: string) {
  const workshop = getFoundationWorkshop(workshopId);
  return buildFoundationConflictList({
    workshopId: workshop.id,
    conflicts: identifyFoundationConflicts(workshop),
  });
}

export function evaluateFoundationWorkshopReadiness(
  workshopId: string,
): ReturnType<typeof buildFoundationReadinessViewmodel> {
  const workshop = getFoundationWorkshop(workshopId);
  const findings = evaluateFoundationReadinessFindings(workshop);
  const readinessStatus = resolveFoundationReadinessStatus(findings);
  const updatedWorkshop: FoundationWorkshopState = {
    ...workshop,
    readinessFindings: [...findings],
    readinessStatus,
    status: readinessStatus === "ready" ? "ready" : "evaluating",
    updatedAt: Date.now(),
  };
  updateFoundationWorkshopStoreEntry(
    validateFoundationWorkshopState(updatedWorkshop),
  );
  return buildFoundationReadinessViewmodel(
    workshop.id,
    readinessStatus,
    findings,
  );
}

export function getFoundationWorkshopViewmodel(workshopId: string) {
  return buildFoundationWorkshopViewmodel(getFoundationWorkshop(workshopId));
}

export function exportFoundationWorkshopJson(workshopId: string) {
  return buildFoundationWorkshopExport(getFoundationWorkshop(workshopId));
}

export function deleteFoundationWorkshop(workshopId: string) {
  deleteFoundationWorkshopStoreEntry(workshopId);
  return buildFoundationWorkshopDeleteResult(workshopId);
}
