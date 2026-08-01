import type {
  ScaffoldPlan,
  ScaffoldFileAction,
  ScaffoldResult,
  ScaffoldResultStatus,
  DependencyInstallPlan,
  GitInitPlan,
  PackageManagerKind,
  InceptionFlowState,
  ProjectBlueprint,
  BlueprintApproval,
  TemplateManifest,
} from "@intentloom/protocol";
import {
  isObj,
  assertStr,
  assertNum,
  assertArr,
  validateInceptionSessionState,
  validateProjectBlueprint,
  validateBlueprintApproval,
} from "./inception-base.js";

const RESS: readonly ScaffoldResultStatus[] = [
  "applied",
  "rolled-back",
  "failed",
];
const PKG_MANAGERS: readonly PackageManagerKind[] = ["pnpm", "npm", "yarn"];
const FLOW_STEPS: readonly string[] = [
  "discovery",
  "blueprinting",
  "review",
  "scaffold-planned",
  "scaffold-applied",
  "cancelled",
];

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

export function validateInceptionFlowState(v: unknown): InceptionFlowState {
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

export function validateTemplateManifest(v: unknown): TemplateManifest {
  if (!isObj(v)) throw new Error("Invalid template manifest: expected object");
  const id = assertStr(v.id, "manifest.id");
  const name = assertStr(v.name, "manifest.name");
  const version = assertStr(v.version, "manifest.version");
  const description = assertStr(v.description, "manifest.description");
  const license = assertStr(v.license, "manifest.license");
  const author = assertStr(v.author, "manifest.author");
  const minIntentloomVersion = assertStr(
    v.minIntentloomVersion,
    "manifest.minIntentloomVersion",
  );
  const capabilities = assertArr(
    v.capabilities,
    "manifest.capabilities",
  ) as readonly string[];
  const integrityHash = assertStr(v.integrityHash, "manifest.integrityHash");
  const filesArray = assertArr(v.files, "manifest.files");

  const files = filesArray.map((fileObj) => {
    if (!isObj(fileObj))
      throw new Error("Invalid template file plan: expected object");
    const path = assertStr(fileObj.path, "file.path");
    if (!["create", "modify", "skip"].includes(fileObj.action as string)) {
      throw new Error(`Invalid file.action '${String(fileObj.action)}'`);
    }
    const content = typeof fileObj.content === "string" ? fileObj.content : "";
    if (typeof fileObj.isManaged !== "boolean") {
      throw new Error("Invalid file.isManaged: expected boolean");
    }
    return {
      path,
      action: fileObj.action as ScaffoldFileAction,
      content,
      isManaged: fileObj.isManaged,
    };
  });

  return {
    id,
    name,
    version,
    description,
    license,
    author,
    minIntentloomVersion,
    capabilities,
    integrityHash,
    files,
  };
}
