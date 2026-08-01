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
  ScaffoldPlan,
  ScaffoldFileAction,
} from "@intentloom/protocol";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function assertString(v: unknown, f: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(
      `Invalid inception field '${f}': expected non-empty string`,
    );
  }
  return v;
}
function assertNumber(v: unknown, f: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(
      `Invalid inception field '${f}': expected non-negative number`,
    );
  }
  return v;
}
function assertArray(v: unknown, f: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Invalid ${f}: expected array`);
  return v;
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
const TOPOLOGIES: readonly BlueprintTopology[] = [
  "single-package",
  "pnpm-workspace",
  "cli-tool",
  "web-product",
  "desktop-product",
];
const APPROVAL_STATUSES: readonly BlueprintApprovalStatus[] = [
  "approved",
  "revoked",
  "expired",
];

export function validateInceptionQuestion(v: unknown): InceptionQuestion {
  if (!isObject(v))
    throw new Error("Invalid inception question: expected object");
  const id = assertString(v.id, "question.id");
  const prompt = assertString(v.prompt, "question.prompt");
  if (!CATEGORIES.includes(v.category as InceptionCategory))
    throw new Error(`Invalid question category '${String(v.category)}'`);
  if (typeof v.required !== "boolean")
    throw new Error("Invalid question.required: expected boolean");
  let options: readonly string[] | undefined;
  if (v.options !== undefined) {
    const opts = assertArray(v.options, "question.options");
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
  if (!isObject(v))
    throw new Error("Invalid inception answer: expected object");
  const questionId = assertString(v.questionId, "answer.questionId");
  const val = typeof v.value === "string" ? v.value : "";
  if (!CONFIDENCES.includes(v.confidence as AnswerConfidence))
    throw new Error(`Invalid answer confidence '${String(v.confidence)}'`);
  return {
    questionId,
    value: val,
    confidence: v.confidence as AnswerConfidence,
    timestamp: assertNumber(v.timestamp, "answer.timestamp"),
  };
}

export function validateInceptionSessionState(
  v: unknown,
): InceptionSessionState {
  if (!isObject(v))
    throw new Error("Invalid inception session state: expected object");
  const id = assertString(v.id, "session.id");
  const root = assertString(v.root, "session.root");
  const idea = assertString(v.idea, "session.idea");
  if (!STATUSES.includes(v.status as InceptionSessionStatus))
    throw new Error(`Invalid session status '${String(v.status)}'`);
  return {
    id,
    root,
    idea,
    status: v.status as InceptionSessionStatus,
    questions: assertArray(v.questions, "session.questions").map(
      validateInceptionQuestion,
    ),
    answers: assertArray(v.answers, "session.answers").map(
      validateInceptionAnswer,
    ),
    constraints: assertArray(
      v.constraints,
      "session.constraints",
    ) as readonly ProjectConstraint[],
    assumptions: assertArray(
      v.assumptions,
      "session.assumptions",
    ) as readonly ProjectAssumption[],
    alternatives: assertArray(
      v.alternatives,
      "session.alternatives",
    ) as readonly BlueprintAlternative[],
    createdAt: assertNumber(v.createdAt, "session.createdAt"),
    updatedAt: assertNumber(v.updatedAt, "session.updatedAt"),
  };
}

export function validateInceptionConflict(v: unknown): {
  readonly questionId: string;
  readonly conflict: string;
  readonly severity: "error" | "warning";
} {
  if (!isObject(v))
    throw new Error("Invalid inception conflict: expected object");
  if (v.severity !== "error" && v.severity !== "warning")
    throw new Error("Invalid conflict.severity: expected 'error' or 'warning'");
  return {
    questionId: assertString(v.questionId, "conflict.questionId"),
    conflict: assertString(v.conflict, "conflict.conflict"),
    severity: v.severity,
  };
}

export function validateProjectBlueprint(v: unknown): ProjectBlueprint {
  if (!isObject(v))
    throw new Error("Invalid project blueprint: expected object");
  if (!TOPOLOGIES.includes(v.topology as BlueprintTopology))
    throw new Error(`Invalid blueprint topology '${String(v.topology)}'`);
  const recommendedPacks = assertArray(
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
    id: assertString(v.id, "blueprint.id"),
    name: assertString(v.name, "blueprint.name"),
    topology: v.topology as BlueprintTopology,
    recommendedPacks: recommendedPacks as readonly string[],
    qualityProfile: assertString(v.qualityProfile, "blueprint.qualityProfile"),
    frameworkNeutral: v.frameworkNeutral,
    digest: assertString(v.digest, "blueprint.digest"),
    alternatives: assertArray(
      v.alternatives,
      "blueprint.alternatives",
    ) as readonly BlueprintAlternative[],
    createdAt: assertNumber(v.createdAt, "blueprint.createdAt"),
  };
}

export function validateBlueprintApproval(v: unknown): BlueprintApproval {
  if (!isObject(v))
    throw new Error("Invalid blueprint approval: expected object");
  if (!APPROVAL_STATUSES.includes(v.status as BlueprintApprovalStatus))
    throw new Error(`Invalid approval.status '${String(v.status)}'`);
  return {
    blueprintId: assertString(v.blueprintId, "approval.blueprintId"),
    blueprintDigest: assertString(
      v.blueprintDigest,
      "approval.blueprintDigest",
    ),
    approver: assertString(v.approver, "approval.approver"),
    approvedAt: assertNumber(v.approvedAt, "approval.approvedAt"),
    expiry: assertNumber(v.expiry, "approval.expiry"),
    status: v.status as BlueprintApprovalStatus,
  };
}

export function validateScaffoldPlan(v: unknown): ScaffoldPlan {
  if (!isObject(v)) throw new Error("Invalid scaffold plan: expected object");
  if (!isObject(v.scripts))
    throw new Error("Invalid plan.scripts: expected object");

  const files = assertArray(v.files, "plan.files").map((fileObj) => {
    if (!isObject(fileObj))
      throw new Error("Invalid scaffold file plan: expected object");
    if (!["create", "modify", "skip"].includes(fileObj.action as string))
      throw new Error(`Invalid file.action '${String(fileObj.action)}'`);
    if (typeof fileObj.isManaged !== "boolean")
      throw new Error("Invalid file.isManaged: expected boolean");
    return {
      path: assertString(fileObj.path, "file.path"),
      action: fileObj.action as ScaffoldFileAction,
      content: typeof fileObj.content === "string" ? fileObj.content : "",
      isManaged: fileObj.isManaged,
    };
  });

  return {
    planId: assertString(v.planId, "plan.planId"),
    root: assertString(v.root, "plan.root"),
    blueprintDigest: assertString(v.blueprintDigest, "plan.blueprintDigest"),
    files,
    dependencies: assertArray(
      v.dependencies,
      "plan.dependencies",
    ) as readonly string[],
    scripts: v.scripts as Record<string, string>,
    createdAt: assertNumber(v.createdAt, "plan.createdAt"),
  };
}
