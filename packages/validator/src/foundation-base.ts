import type {
  FoundationQuestion,
  FoundationAnswer,
  FoundationWorkshopState,
  FoundationQuestionCategory,
  FoundationAnswerConfidence,
  FoundationWorkshopStatus,
  FoundationReadinessStatus,
  FoundationConflict,
} from "@intentloom/protocol";
import {
  assertArr,
  assertNum,
  assertStr,
  isObj,
} from "./foundation-validation-helpers.js";
import {
  validateFoundationActor,
  validateFoundationAlternative,
  validateFoundationChangeScenario,
  validateFoundationConstraint,
  validateFoundationDomainConcept,
  validateFoundationQualityScenario,
  validateFoundationReadinessFinding,
  validateFoundationRisk,
  validateFoundationWorkflow,
} from "./foundation-entity-validators.js";

const QUESTION_CATEGORIES: readonly FoundationQuestionCategory[] = [
  "intent",
  "actors",
  "domain",
  "quality",
  "change",
  "constraints",
];

const ANSWER_CONFIDENCES: readonly FoundationAnswerConfidence[] = [
  "confirmed",
  "assumed",
  "preference",
  "unknown",
  "deferred",
];

const WORKSHOP_STATUSES: readonly FoundationWorkshopStatus[] = [
  "draft",
  "discovering",
  "structuring",
  "evaluating",
  "ready",
  "approved",
  "archived",
];

const READINESS_STATUSES: readonly FoundationReadinessStatus[] = [
  "not-ready",
  "ready-with-warnings",
  "ready",
  "blocked",
];

function mapArr<T>(items: unknown, field: string, fn: (i: unknown) => T): T[] {
  return assertArr(items, field).map(fn);
}

export function validateFoundationQuestion(v: unknown): FoundationQuestion {
  if (!isObj(v))
    throw new Error("Invalid foundation question: expected object");
  const category = v.category as FoundationQuestionCategory;
  if (!QUESTION_CATEGORIES.includes(category))
    throw new Error(`Invalid question category '${String(v.category)}'`);
  if (typeof v.required !== "boolean")
    throw new Error("Invalid question.required: expected boolean");
  let options: readonly string[] | undefined;
  if (v.options !== undefined) {
    const opts = assertArr(v.options, "question.options");
    if (!opts.every((opt) => typeof opt === "string"))
      throw new Error("Invalid question.options: expected string array");
    options = opts as string[];
  }
  return {
    id: assertStr(v.id, "question.id"),
    prompt: assertStr(v.prompt, "question.prompt"),
    category,
    required: v.required,
    ...(options !== undefined ? { options } : {}),
  };
}

export function validateFoundationAnswer(v: unknown): FoundationAnswer {
  if (!isObj(v)) throw new Error("Invalid foundation answer: expected object");
  const confidence = v.confidence as FoundationAnswerConfidence;
  if (!ANSWER_CONFIDENCES.includes(confidence))
    throw new Error(`Invalid answer confidence '${String(v.confidence)}'`);
  return {
    questionId: assertStr(v.questionId, "answer.questionId"),
    value: typeof v.value === "string" ? v.value : "",
    confidence,
    timestamp: assertNum(v.timestamp, "answer.timestamp"),
  };
}

export function validateFoundationConflict(v: unknown): FoundationConflict {
  if (!isObj(v))
    throw new Error("Invalid foundation conflict: expected object");
  const severity = v.severity;
  if (severity !== "error" && severity !== "warning")
    throw new Error("Invalid conflict.severity");
  return {
    questionId: assertStr(v.questionId, "conflict.questionId"),
    conflict: assertStr(v.conflict, "conflict.conflict"),
    severity,
  };
}

export function validateFoundationWorkshopState(
  v: unknown,
): FoundationWorkshopState {
  if (!isObj(v))
    throw new Error("Invalid foundation workshop state: expected object");
  const status = v.status as FoundationWorkshopStatus;
  const readinessStatus = v.readinessStatus as FoundationReadinessStatus;
  if (!WORKSHOP_STATUSES.includes(status))
    throw new Error(`Invalid workshop status '${String(v.status)}'`);
  if (!READINESS_STATUSES.includes(readinessStatus))
    throw new Error(`Invalid readiness status '${String(v.readinessStatus)}'`);
  const nonGoals = assertArr(v.nonGoals, "workshop.nonGoals");
  if (!nonGoals.every((item) => typeof item === "string"))
    throw new Error("Invalid workshop.nonGoals: expected string array");
  return {
    id: assertStr(v.id, "workshop.id"),
    ...(v.inceptionSessionId === undefined
      ? {}
      : {
          inceptionSessionId: assertStr(
            v.inceptionSessionId,
            "workshop.inceptionSessionId",
          ),
        }),
    root: assertStr(v.root, "workshop.root"),
    idea: assertStr(v.idea, "workshop.idea"),
    problemStatement:
      typeof v.problemStatement === "string" ? v.problemStatement : "",
    smallestOutcome:
      typeof v.smallestOutcome === "string" ? v.smallestOutcome : "",
    nonGoals: nonGoals as string[],
    status,
    questions: mapArr(
      v.questions,
      "workshop.questions",
      validateFoundationQuestion,
    ),
    answers: mapArr(v.answers, "workshop.answers", validateFoundationAnswer),
    actors: mapArr(v.actors, "workshop.actors", validateFoundationActor),
    workflows: mapArr(
      v.workflows,
      "workshop.workflows",
      validateFoundationWorkflow,
    ),
    domainConcepts: mapArr(
      v.domainConcepts,
      "workshop.domainConcepts",
      validateFoundationDomainConcept,
    ),
    qualityScenarios: mapArr(
      v.qualityScenarios,
      "workshop.qualityScenarios",
      validateFoundationQualityScenario,
    ),
    constraints: mapArr(
      v.constraints,
      "workshop.constraints",
      validateFoundationConstraint,
    ),
    changeScenarios: mapArr(
      v.changeScenarios,
      "workshop.changeScenarios",
      validateFoundationChangeScenario,
    ),
    risks: mapArr(v.risks, "workshop.risks", validateFoundationRisk),
    alternatives: mapArr(
      v.alternatives,
      "workshop.alternatives",
      validateFoundationAlternative,
    ),
    readinessFindings: mapArr(
      v.readinessFindings,
      "workshop.readinessFindings",
      validateFoundationReadinessFinding,
    ),
    readinessStatus,
    createdAt: assertNum(v.createdAt, "workshop.createdAt"),
    updatedAt: assertNum(v.updatedAt, "workshop.updatedAt"),
  };
}
