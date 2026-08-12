import { ProtocolValidationError } from "./protocol-validation-error.js";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  return value;
}

export function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a positive integer`,
    );
  return value;
}

export function parseFoundationAnswer(value: unknown): {
  questionId: string;
  value: string;
  confidence: "confirmed" | "assumed" | "preference" | "unknown" | "deferred";
  timestamp: number;
} {
  if (!isObject(value))
    throw new ProtocolValidationError(-32602, "answer must be an object");
  const confidence = value.confidence;
  if (
    confidence !== "confirmed" &&
    confidence !== "assumed" &&
    confidence !== "preference" &&
    confidence !== "unknown" &&
    confidence !== "deferred"
  ) {
    throw new ProtocolValidationError(-32602, "invalid answer confidence");
  }
  return {
    questionId: stringValue(value.questionId, "answer.questionId"),
    value: typeof value.value === "string" ? value.value : "",
    confidence,
    timestamp: positiveInteger(value.timestamp, "answer.timestamp"),
  };
}

export function parseBlueprintTier(value: unknown, field: string) {
  if (
    value !== "minimal" &&
    value !== "recommended" &&
    value !== "extensible"
  ) {
    throw new ProtocolValidationError(-32602, `invalid ${field}`);
  }
  return value;
}
