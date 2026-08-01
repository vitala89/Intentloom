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
  ScaffoldResult,
  ScaffoldResultStatus,
  DependencyInstallPlan,
  GitInitPlan,
  PackageManagerKind,
} from "@intentloom/protocol";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function assertStr(v: unknown, f: string): string {
  if (typeof v !== "string" || !v.trim())
    throw new Error(
      `Invalid inception field '${f}': expected non-empty string`,
    );
  return v;
}
function assertNum(v: unknown, f: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
    throw new Error(
      `Invalid inception field '${f}': expected non-negative number`,
    );
  return v;
}
function assertArr(v: unknown, f: string): unknown[] {
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
const RESS: readonly ScaffoldResultStatus[] = [
  "applied",
  "rolled-back",
  "failed",
];
const PKG_MANAGERS: readonly PackageManagerKind[] = ["pnpm", "npm", "yarn"];

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

export function validateScaffoldPlan(v: unknown): ScaffoldPlan {
  if (!isObj(v)) throw new Error("Invalid scaffold plan: expected object");
  if (!isObj(v.scripts))
    throw new Error("Invalid plan.scripts: expected object");
  const files = assertArr(v.files, "plan.files").map((fileObj) => {
    if (!isObj(fileObj))
      throw new Error("Invalid scaffold file plan: expected object");
    if (!["create", "modify", "skip"].includes(fileObj.action as string))
      throw new Error(`Invalid file.action '${String(fileObj.action)}'`);
    if (typeof fileObj.isManaged !== "boolean")
      throw new Error("Invalid file.isManaged: expected boolean");
    return {
      path: assertStr(fileObj.path, "file.path"),
      action: fileObj.action as ScaffoldFileAction,
      content: typeof fileObj.content === "string" ? fileObj.content : "",
      isManaged: fileObj.isManaged,
    };
  });
  return {
    planId: assertStr(v.planId, "plan.planId"),
    root: assertStr(v.root, "plan.root"),
    blueprintDigest: assertStr(v.blueprintDigest, "plan.blueprintDigest"),
    files,
    dependencies: assertArr(
      v.dependencies,
      "plan.dependencies",
    ) as readonly string[],
    scripts: v.scripts as Record<string, string>,
    createdAt: assertNum(v.createdAt, "plan.createdAt"),
  };
}

export function validateScaffoldResult(v: unknown): ScaffoldResult {
  if (!isObj(v)) throw new Error("Invalid scaffold result: expected object");
  if (!RESS.includes(v.status as ScaffoldResultStatus))
    throw new Error(`Invalid result.status '${String(v.status)}'`);
  const backups = assertArr(v.backups, "result.backups").map((b) => {
    if (!isObj(b)) throw new Error("Invalid backup record: expected object");
    if (typeof b.created !== "boolean")
      throw new Error("Invalid backup.created: expected boolean");
    return {
      path: assertStr(b.path, "backup.path"),
      originalContent:
        typeof b.originalContent === "string" ? b.originalContent : null,
      created: b.created,
    };
  });
  const err =
    v.error !== undefined ? assertStr(v.error, "result.error") : undefined;
  return {
    planId: assertStr(v.planId, "result.planId"),
    root: assertStr(v.root, "result.root"),
    status: v.status as ScaffoldResultStatus,
    writtenFiles: assertArr(
      v.writtenFiles,
      "result.writtenFiles",
    ) as readonly string[],
    backups,
    ...(err ? { error: err } : {}),
    appliedAt: assertNum(v.appliedAt, "result.appliedAt"),
  };
}

export function validateDependencyInstallPlan(
  v: unknown,
): DependencyInstallPlan {
  if (!isObj(v))
    throw new Error("Invalid dependency install plan: expected object");
  if (!PKG_MANAGERS.includes(v.packageManager as PackageManagerKind))
    throw new Error(`Invalid packageManager '${String(v.packageManager)}'`);
  return {
    packageManager: v.packageManager as PackageManagerKind,
    dependencies: assertArr(
      v.dependencies,
      "installPlan.dependencies",
    ) as readonly string[],
    command: assertStr(v.command, "installPlan.command"),
  };
}

export function validateGitInitPlan(v: unknown): GitInitPlan {
  if (!isObj(v)) throw new Error("Invalid git init plan: expected object");
  return {
    root: assertStr(v.root, "gitPlan.root"),
    gitignoreEntries: assertArr(
      v.gitignoreEntries,
      "gitPlan.gitignoreEntries",
    ) as readonly string[],
    commitMessage: assertStr(v.commitMessage, "gitPlan.commitMessage"),
    commands: assertArr(v.commands, "gitPlan.commands") as readonly string[],
  };
}

const FLOW_STEPS: readonly string[] = [
  "discovery",
  "blueprinting",
  "review",
  "scaffold-planned",
  "scaffold-applied",
  "cancelled",
];

export function validateInceptionFlowState(v: unknown): {
  readonly session: InceptionSessionState;
  readonly currentStep:
    | "discovery"
    | "blueprinting"
    | "review"
    | "scaffold-planned"
    | "scaffold-applied"
    | "cancelled";
  readonly blueprint?: ProjectBlueprint;
  readonly approval?: BlueprintApproval;
  readonly plan?: ScaffoldPlan;
  readonly result?: ScaffoldResult;
  readonly isComplete: boolean;
  readonly updatedAt: number;
} {
  if (!isObj(v))
    throw new Error("Invalid inception flow state: expected object");
  const session = validateInceptionSessionState(v.session);
  if (!FLOW_STEPS.includes(v.currentStep as string)) {
    throw new Error(`Invalid flow.currentStep '${String(v.currentStep)}'`);
  }

  const blueprint = v.blueprint
    ? validateProjectBlueprint(v.blueprint)
    : undefined;
  const approval = v.approval
    ? validateBlueprintApproval(v.approval)
    : undefined;
  const plan = v.plan ? validateScaffoldPlan(v.plan) : undefined;
  const result = v.result ? validateScaffoldResult(v.result) : undefined;

  if (typeof v.isComplete !== "boolean") {
    throw new Error("Invalid flow.isComplete: expected boolean");
  }
  const updatedAt = assertNum(v.updatedAt, "flow.updatedAt");

  return {
    session,
    currentStep: v.currentStep as any,
    ...(blueprint ? { blueprint } : {}),
    ...(approval ? { approval } : {}),
    ...(plan ? { plan } : {}),
    ...(result ? { result } : {}),
    isComplete: v.isComplete,
    updatedAt,
  };
}
