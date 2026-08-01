import type {
  InceptionQuestion,
  InceptionAnswer,
  InceptionSessionState,
  InceptionCategory,
  AnswerConfidence,
  InceptionSessionStatus,
  ProjectConstraint,
  ProjectAssumption,
  BlueprintAlternative,
} from "@intentloom/protocol";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid inception field '${fieldName}': expected non-empty string`,
    );
  }
  return value;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid inception field '${fieldName}': expected non-negative number`,
    );
  }
  return value;
}

const CATEGORIES: readonly InceptionCategory[] = [
  "product",
  "architecture",
  "tooling",
  "security",
];

const CONFIDENCES: readonly AnswerConfidence[] = [
  "confirmed",
  "assumed",
  "preference",
];

const STATUSES: readonly InceptionSessionStatus[] = [
  "discovering",
  "blueprinting",
  "approved",
  "cancelled",
];

export function validateInceptionQuestion(value: unknown): InceptionQuestion {
  if (!isObject(value)) {
    throw new Error("Invalid inception question: expected object");
  }
  const id = assertString(value.id, "question.id");
  const prompt = assertString(value.prompt, "question.prompt");
  if (!CATEGORIES.includes(value.category as InceptionCategory)) {
    throw new Error(`Invalid question category '${String(value.category)}'`);
  }
  if (typeof value.required !== "boolean") {
    throw new Error("Invalid question.required: expected boolean");
  }
  let options: readonly string[] | undefined;
  if (value.options !== undefined) {
    if (
      !Array.isArray(value.options) ||
      !value.options.every((opt) => typeof opt === "string")
    ) {
      throw new Error("Invalid question.options: expected array of strings");
    }
    options = value.options;
  }
  return {
    id,
    prompt,
    category: value.category as InceptionCategory,
    required: value.required,
    ...(options ? { options } : {}),
  };
}

export function validateInceptionAnswer(value: unknown): InceptionAnswer {
  if (!isObject(value)) {
    throw new Error("Invalid inception answer: expected object");
  }
  const questionId = assertString(value.questionId, "answer.questionId");
  const val = typeof value.value === "string" ? value.value : "";
  if (!CONFIDENCES.includes(value.confidence as AnswerConfidence)) {
    throw new Error(`Invalid answer confidence '${String(value.confidence)}'`);
  }
  const timestamp = assertNumber(value.timestamp, "answer.timestamp");
  return {
    questionId,
    value: val,
    confidence: value.confidence as AnswerConfidence,
    timestamp,
  };
}

export function validateInceptionSessionState(
  value: unknown,
): InceptionSessionState {
  if (!isObject(value)) {
    throw new Error("Invalid inception session state: expected object");
  }
  const id = assertString(value.id, "session.id");
  const root = assertString(value.root, "session.root");
  const idea = assertString(value.idea, "session.idea");
  if (!STATUSES.includes(value.status as InceptionSessionStatus)) {
    throw new Error(`Invalid session status '${String(value.status)}'`);
  }
  if (!Array.isArray(value.questions)) {
    throw new Error("Invalid session.questions: expected array");
  }
  if (!Array.isArray(value.answers)) {
    throw new Error("Invalid session.answers: expected array");
  }
  if (!Array.isArray(value.constraints)) {
    throw new Error("Invalid session.constraints: expected array");
  }
  if (!Array.isArray(value.assumptions)) {
    throw new Error("Invalid session.assumptions: expected array");
  }
  if (!Array.isArray(value.alternatives)) {
    throw new Error("Invalid session.alternatives: expected array");
  }

  const questions = value.questions.map(validateInceptionQuestion);
  const answers = value.answers.map(validateInceptionAnswer);
  const createdAt = assertNumber(value.createdAt, "session.createdAt");
  const updatedAt = assertNumber(value.updatedAt, "session.updatedAt");

  return {
    id,
    root,
    idea,
    status: value.status as InceptionSessionStatus,
    questions,
    answers,
    constraints: value.constraints as readonly ProjectConstraint[],
    assumptions: value.assumptions as readonly ProjectAssumption[],
    alternatives: value.alternatives as readonly BlueprintAlternative[],
    createdAt,
    updatedAt,
  };
}

export function validateInceptionConflict(value: unknown): {
  readonly questionId: string;
  readonly conflict: string;
  readonly severity: "error" | "warning";
} {
  if (!isObject(value)) {
    throw new Error("Invalid inception conflict: expected object");
  }
  const questionId = assertString(value.questionId, "conflict.questionId");
  const conflict = assertString(value.conflict, "conflict.conflict");
  if (value.severity !== "error" && value.severity !== "warning") {
    throw new Error("Invalid conflict.severity: expected 'error' or 'warning'");
  }
  return {
    questionId,
    conflict,
    severity: value.severity,
  };
}

const TOPOLOGIES: readonly string[] = [
  "single-package",
  "pnpm-workspace",
  "cli-tool",
  "web-product",
  "desktop-product",
];

export function validateProjectBlueprint(value: unknown): {
  readonly id: string;
  readonly name: string;
  readonly topology:
    | "single-package"
    | "pnpm-workspace"
    | "cli-tool"
    | "web-product"
    | "desktop-product";
  readonly recommendedPacks: readonly string[];
  readonly qualityProfile: string;
  readonly frameworkNeutral: boolean;
  readonly digest: string;
  readonly alternatives: readonly BlueprintAlternative[];
  readonly createdAt: number;
} {
  if (!isObject(value)) {
    throw new Error("Invalid project blueprint: expected object");
  }
  const id = assertString(value.id, "blueprint.id");
  const name = assertString(value.name, "blueprint.name");
  if (!TOPOLOGIES.includes(value.topology as string)) {
    throw new Error(`Invalid blueprint topology '${String(value.topology)}'`);
  }
  if (
    !Array.isArray(value.recommendedPacks) ||
    !value.recommendedPacks.every((p) => typeof p === "string")
  ) {
    throw new Error(
      "Invalid blueprint.recommendedPacks: expected array of strings",
    );
  }
  const qualityProfile = assertString(
    value.qualityProfile,
    "blueprint.qualityProfile",
  );
  if (typeof value.frameworkNeutral !== "boolean") {
    throw new Error("Invalid blueprint.frameworkNeutral: expected boolean");
  }
  const digest = assertString(value.digest, "blueprint.digest");
  if (!Array.isArray(value.alternatives)) {
    throw new Error("Invalid blueprint.alternatives: expected array");
  }
  const createdAt = assertNumber(value.createdAt, "blueprint.createdAt");

  return {
    id,
    name,
    topology: value.topology as any,
    recommendedPacks: value.recommendedPacks,
    qualityProfile,
    frameworkNeutral: value.frameworkNeutral,
    digest,
    alternatives: value.alternatives as readonly BlueprintAlternative[],
    createdAt,
  };
}
