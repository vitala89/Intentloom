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
  ProjectBlueprint,
  BlueprintApproval,
  BlueprintApprovalStatus,
  BlueprintTopology,
} from "@intentloom/protocol";

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function assertStr(v: unknown, f: string): string {
  if (typeof v !== "string" || !v.trim())
    throw new Error(
      `Invalid inception field '${f}': expected non-empty string`,
    );
  return v;
}
export function assertNum(v: unknown, f: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
    throw new Error(
      `Invalid inception field '${f}': expected non-negative number`,
    );
  return v;
}
export function assertArr(v: unknown, f: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Invalid ${f}: expected array`);
  return v;
}

const CATS: readonly InceptionCategory[] = [
  "product",
  "architecture",
  "tooling",
  "security",
];
const CONFS: readonly AnswerConfidence[] = [
  "confirmed",
  "assumed",
  "preference",
];
const STATS: readonly InceptionSessionStatus[] = [
  "discovering",
  "blueprinting",
  "approved",
  "cancelled",
];
const TOPS: readonly BlueprintTopology[] = [
  "single-package",
  "pnpm-workspace",
  "cli-tool",
  "web-product",
  "desktop-product",
];
const APPS: readonly BlueprintApprovalStatus[] = [
  "approved",
  "revoked",
  "expired",
];

export function validateInceptionQuestion(v: unknown): InceptionQuestion {
  if (!isObj(v)) throw new Error("Invalid inception question: expected object");
  const id = assertStr(v.id, "question.id");
  const prompt = assertStr(v.prompt, "question.prompt");
  if (!CATS.includes(v.category as InceptionCategory))
    throw new Error(`Invalid question category '${String(v.category)}'`);
  if (typeof v.required !== "boolean")
    throw new Error("Invalid question.required: expected boolean");
  let options: readonly string[] | undefined;
  if (v.options !== undefined) {
    const opts = assertArr(v.options, "question.options");
    if (!opts.every((opt) => typeof opt === "string"))
      throw new Error("Invalid question.options: expected array of strings");
    options = opts as readonly string[];
  }
  return {
    id,
    prompt,
    category: v.category as InceptionCategory,
    required: v.required,
    ...(options ? { options } : {}),
  };
}

export function validateInceptionAnswer(v: unknown): InceptionAnswer {
  if (!isObj(v)) throw new Error("Invalid inception answer: expected object");
  const questionId = assertStr(v.questionId, "answer.questionId");
  const val = typeof v.value === "string" ? v.value : "";
  if (!CONFS.includes(v.confidence as AnswerConfidence))
    throw new Error(`Invalid answer confidence '${String(v.confidence)}'`);
  return {
    questionId,
    value: val,
    confidence: v.confidence as AnswerConfidence,
    timestamp: assertNum(v.timestamp, "answer.timestamp"),
  };
}

export function validateInceptionSessionState(
  v: unknown,
): InceptionSessionState {
  if (!isObj(v))
    throw new Error("Invalid inception session state: expected object");
  const id = assertStr(v.id, "session.id");
  const root = assertStr(v.root, "session.root");
  const idea = assertStr(v.idea, "session.idea");
  if (!STATS.includes(v.status as InceptionSessionStatus))
    throw new Error(`Invalid session status '${String(v.status)}'`);
  return {
    id,
    root,
    idea,
    status: v.status as InceptionSessionStatus,
    questions: assertArr(v.questions, "session.questions").map(
      validateInceptionQuestion,
    ),
    answers: assertArr(v.answers, "session.answers").map(
      validateInceptionAnswer,
    ),
    constraints: assertArr(
      v.constraints,
      "session.constraints",
    ) as readonly ProjectConstraint[],
    assumptions: assertArr(
      v.assumptions,
      "session.assumptions",
    ) as readonly ProjectAssumption[],
    alternatives: assertArr(
      v.alternatives,
      "session.alternatives",
    ) as readonly BlueprintAlternative[],
    createdAt: assertNum(v.createdAt, "session.createdAt"),
    updatedAt: assertNum(v.updatedAt, "session.updatedAt"),
  };
}

export function validateInceptionConflict(v: unknown): {
  readonly questionId: string;
  readonly conflict: string;
  readonly severity: "error" | "warning";
} {
  if (!isObj(v)) throw new Error("Invalid inception conflict: expected object");
  if (v.severity !== "error" && v.severity !== "warning")
    throw new Error("Invalid conflict.severity: expected 'error' or 'warning'");
  return {
    questionId: assertStr(v.questionId, "conflict.questionId"),
    conflict: assertStr(v.conflict, "conflict.conflict"),
    severity: v.severity,
  };
}

export function validateProjectBlueprint(v: unknown): ProjectBlueprint {
  if (!isObj(v)) throw new Error("Invalid project blueprint: expected object");
  if (!TOPS.includes(v.topology as BlueprintTopology))
    throw new Error(`Invalid blueprint topology '${String(v.topology)}'`);
  const recommendedPacks = assertArr(
    v.recommendedPacks,
    "blueprint.recommendedPacks",
  );
  if (!recommendedPacks.every((p) => typeof p === "string"))
    throw new Error(
      "Invalid blueprint.recommendedPacks: expected array of strings",
    );
  if (typeof v.frameworkNeutral !== "boolean")
    throw new Error("Invalid blueprint.frameworkNeutral: expected boolean");
  return {
    id: assertStr(v.id, "blueprint.id"),
    name: assertStr(v.name, "blueprint.name"),
    topology: v.topology as BlueprintTopology,
    recommendedPacks: recommendedPacks as readonly string[],
    qualityProfile: assertStr(v.qualityProfile, "blueprint.qualityProfile"),
    frameworkNeutral: v.frameworkNeutral,
    digest: assertStr(v.digest, "blueprint.digest"),
    alternatives: assertArr(
      v.alternatives,
      "blueprint.alternatives",
    ) as readonly BlueprintAlternative[],
    createdAt: assertNum(v.createdAt, "blueprint.createdAt"),
  };
}

export function validateBlueprintApproval(v: unknown): BlueprintApproval {
  if (!isObj(v)) throw new Error("Invalid blueprint approval: expected object");
  if (!APPS.includes(v.status as BlueprintApprovalStatus))
    throw new Error(`Invalid approval.status '${String(v.status)}'`);
  return {
    blueprintId: assertStr(v.blueprintId, "approval.blueprintId"),
    blueprintDigest: assertStr(v.blueprintDigest, "approval.blueprintDigest"),
    approver: assertStr(v.approver, "approval.approver"),
    approvedAt: assertNum(v.approvedAt, "approval.approvedAt"),
    expiry: assertNum(v.expiry, "approval.expiry"),
    status: v.status as BlueprintApprovalStatus,
  };
}
