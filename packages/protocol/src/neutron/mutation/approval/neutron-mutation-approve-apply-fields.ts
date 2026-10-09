import { ProtocolValidationError } from "../../../protocol-validation-error.js";

export function approveApplyObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function approveApplyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  return value;
}

export function approveApplyBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ProtocolValidationError(-32602, `${field} must be a boolean`);
  }
  return value;
}

export function approveApplyOptionalString(
  result: Record<string, unknown>,
  field:
    | "proposalId"
    | "transactionId"
    | "approvalId"
    | "reviewArtifactDigest"
    | "planDigest",
): Partial<Record<typeof field, string>> {
  if (result[field] === undefined) return {};
  return { [field]: approveApplyString(result[field], field) };
}

export function approveApplyStringList(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be an array of strings`,
    );
  }
  return value;
}

export function approveApplyOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ProtocolValidationError(-32602, `${field} is invalid`);
  }
  return value as T;
}
