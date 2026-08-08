import type {
  ApprovedApplyExecutionResult,
  ApprovedApplyPlan,
  ApprovedApplyRequest,
  ApprovedApplyResult,
  ApprovedApplyRollbackEvidence,
  ApprovedApplyRollbackFile,
} from "@intentloom/protocol";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export function validateApprovedApplyPlan(value: unknown): ApprovedApplyPlan {
  if (!isObject(value)) {
    throw new Error("approved apply plan must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("approved apply plan schemaVersion must equal 1");
  }
  if (typeof value.planDigest !== "string" || !value.planDigest.trim()) {
    throw new Error("planDigest must be a non-empty string");
  }
  if (
    typeof value.projectStateDigest !== "string" ||
    !value.projectStateDigest.trim()
  ) {
    throw new Error("projectStateDigest must be a non-empty string");
  }
  if (typeof value.targetRoot !== "string" || !value.targetRoot.trim()) {
    throw new Error("targetRoot must be a non-empty string");
  }
  const changedPaths = stringArray(value.changedPaths, "changedPaths");

  let expiresAt: number | undefined;
  if (value.expiresAt !== undefined) {
    if (
      typeof value.expiresAt !== "number" ||
      !Number.isInteger(value.expiresAt) ||
      value.expiresAt <= 0
    ) {
      throw new Error("expiresAt must be a positive integer if provided");
    }
    expiresAt = value.expiresAt;
  }

  return {
    schemaVersion: 1,
    planDigest: value.planDigest,
    projectStateDigest: value.projectStateDigest,
    targetRoot: value.targetRoot,
    changedPaths,
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
}

export function validateApprovedApplyRequest(
  value: unknown,
): ApprovedApplyRequest {
  if (!isObject(value)) {
    throw new Error("approved apply request must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("approved apply request schemaVersion must equal 1");
  }
  if (
    typeof value.targetResourceId !== "string" ||
    !value.targetResourceId.trim()
  ) {
    throw new Error("targetResourceId must be a non-empty string");
  }
  const plan = validateApprovedApplyPlan(value.plan);
  const grantedApprovals = stringArray(
    value.grantedApprovals,
    "grantedApprovals",
  );

  return {
    schemaVersion: 1,
    targetResourceId: value.targetResourceId,
    plan,
    grantedApprovals,
  };
}

export function validateApprovedApplyResult(
  value: unknown,
): ApprovedApplyResult {
  if (!isObject(value)) {
    throw new Error("approved apply result must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("approved apply result schemaVersion must equal 1");
  }
  if (
    typeof value.targetResourceId !== "string" ||
    !value.targetResourceId.trim()
  ) {
    throw new Error("targetResourceId must be a non-empty string");
  }
  if (typeof value.passed !== "boolean") {
    throw new Error("passed must be a boolean");
  }
  const diagnostics = stringArray(value.diagnostics, "diagnostics");

  if (
    typeof value.safeNextAction !== "string" ||
    !value.safeNextAction.trim()
  ) {
    throw new Error("safeNextAction must be a non-empty string");
  }

  return {
    schemaVersion: 1,
    targetResourceId: value.targetResourceId,
    passed: value.passed,
    diagnostics,
    safeNextAction: value.safeNextAction,
  };
}

export function validateApprovedApplyRollbackFile(
  value: unknown,
): ApprovedApplyRollbackFile {
  if (!isObject(value)) {
    throw new Error("approved apply rollback file must be an object");
  }
  if (typeof value.path !== "string" || !value.path.trim()) {
    throw new Error("rollback file path must be a non-empty string");
  }
  if (
    value.previousContent !== null &&
    typeof value.previousContent !== "string"
  ) {
    throw new Error("rollback file previousContent must be a string or null");
  }
  return {
    path: value.path,
    previousContent: value.previousContent,
  };
}

export function validateApprovedApplyRollbackEvidence(
  value: unknown,
): ApprovedApplyRollbackEvidence {
  if (!isObject(value)) {
    throw new Error("approved apply rollback evidence must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error(
      "approved apply rollback evidence schemaVersion must equal 1",
    );
  }
  if (typeof value.planDigest !== "string" || !value.planDigest.trim()) {
    throw new Error("planDigest must be a non-empty string");
  }
  if (typeof value.targetRoot !== "string" || !value.targetRoot.trim()) {
    throw new Error("targetRoot must be a non-empty string");
  }
  if (!Array.isArray(value.rollbackFiles)) {
    throw new Error("rollbackFiles must be an array");
  }
  const rollbackFiles = value.rollbackFiles.map(
    validateApprovedApplyRollbackFile,
  );

  return {
    schemaVersion: 1,
    planDigest: value.planDigest,
    targetRoot: value.targetRoot,
    rollbackFiles,
  };
}

export function validateApprovedApplyExecutionResult(
  value: unknown,
): ApprovedApplyExecutionResult {
  if (!isObject(value)) {
    throw new Error("approved apply execution result must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error(
      "approved apply execution result schemaVersion must equal 1",
    );
  }
  if (
    typeof value.targetResourceId !== "string" ||
    !value.targetResourceId.trim()
  ) {
    throw new Error("targetResourceId must be a non-empty string");
  }
  if (typeof value.applied !== "boolean") {
    throw new Error("applied must be a boolean");
  }
  const gateResult = validateApprovedApplyResult(value.gateResult);
  const diagnostics = stringArray(value.diagnostics, "diagnostics");

  let rollbackEvidence: ApprovedApplyRollbackEvidence | undefined;
  if (value.rollbackEvidence !== undefined) {
    rollbackEvidence = validateApprovedApplyRollbackEvidence(
      value.rollbackEvidence,
    );
  }

  return {
    schemaVersion: 1,
    targetResourceId: value.targetResourceId,
    applied: value.applied,
    gateResult,
    ...(rollbackEvidence !== undefined ? { rollbackEvidence } : {}),
    diagnostics,
  };
}
