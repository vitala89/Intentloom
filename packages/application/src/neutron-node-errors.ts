export const NEUTRON_NODE_EXECUTION_STAGES = [
  "scheduling",
  "capability",
  "context",
  "model",
  "tool",
  "cancellation",
  "timeout",
] as const;

export type NeutronNodeExecutionStage =
  (typeof NEUTRON_NODE_EXECUTION_STAGES)[number];

export const NEUTRON_NODE_EXECUTION_ERROR_CODES = [
  "validation-failed",
  "node-not-runnable",
  "root-mismatch",
  "unsupported-tool",
  "cancelled",
  "timeout",
  "budget-exceeded",
  "adapter-unconfigured",
  "network-forbidden",
  "capability-denied",
  "permission-denied",
  "operation-failed",
  "context-assembly-failed",
] as const;

export type NeutronNodeExecutionErrorCode =
  (typeof NEUTRON_NODE_EXECUTION_ERROR_CODES)[number];

export interface NeutronNodeExecutionFailure {
  readonly code: NeutronNodeExecutionErrorCode;
  readonly stage: NeutronNodeExecutionStage;
  readonly message: string;
}

export class NeutronNodeExecutionError extends Error {
  readonly code: NeutronNodeExecutionErrorCode;
  readonly stage: NeutronNodeExecutionStage;

  constructor(
    code: NeutronNodeExecutionErrorCode,
    stage: NeutronNodeExecutionStage,
    message: string,
  ) {
    super(message);
    this.name = "NeutronNodeExecutionError";
    this.code = code;
    this.stage = stage;
  }

  toFailure(): NeutronNodeExecutionFailure {
    return { code: this.code, stage: this.stage, message: this.message };
  }
}

export function mapNeutronNodeFailure(
  error: unknown,
): NeutronNodeExecutionFailure {
  if (error instanceof NeutronNodeExecutionError) return error.toFailure();
  if (isCodedError(error)) {
    return mapCodedFailure(error);
  }
  const message =
    error instanceof Error ? error.message : "Node execution failed";
  if (
    message.startsWith("Profile not found:") ||
    message.startsWith("Role [")
  ) {
    return {
      code: "context-assembly-failed",
      stage: "context",
      message,
    };
  }
  return { code: "operation-failed", stage: "model", message };
}

function isCodedError(
  error: unknown,
): error is { readonly code: string; readonly message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function mapCodedFailure(error: {
  readonly code: string;
  readonly message: string;
}): NeutronNodeExecutionFailure {
  if (error.code === "cancelled") {
    return { code: "cancelled", stage: "cancellation", message: error.message };
  }
  if (error.code === "timeout") {
    return { code: "timeout", stage: "timeout", message: error.message };
  }
  if (
    error.code === "capability-denied" ||
    error.code === "unsupported-tool" ||
    error.code === "permission-denied"
  ) {
    return {
      code: error.code,
      stage: "capability",
      message: error.message,
    };
  }
  if (
    error.code === "adapter-unconfigured" ||
    error.code === "network-forbidden" ||
    error.code === "budget-exceeded" ||
    error.code === "validation-failed" ||
    error.code === "root-mismatch" ||
    error.code === "operation-failed"
  ) {
    const stage = error.code === "operation-failed" ? "tool" : "model";
    return {
      code: error.code,
      stage,
      message: error.message,
    };
  }
  return { code: "operation-failed", stage: "model", message: error.message };
}
