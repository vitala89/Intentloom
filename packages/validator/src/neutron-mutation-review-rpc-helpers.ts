import { isObject } from "./neutron-runtime-helpers.js";

export const REVIEW_AUTHORITY_KEYS = [
  "approvalToken",
  "approvalDigest",
  "approvalId",
  "grantedApprovals",
  "approved",
  "mutationAllowed",
  "previousContent",
  "prompts",
  "prompt",
  "reasoning",
] as const;

export function asReviewObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${field} must be an object`);
  return value;
}

export function rejectUnknownReviewKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new Error(`${field} must not include ${key}`);
    }
  }
}

export function rejectReviewAuthorityKeys(
  value: Record<string, unknown>,
  field: string,
): void {
  for (const key of REVIEW_AUTHORITY_KEYS) {
    if (Object.hasOwn(value, key)) {
      throw new Error(`${field} must not include ${key}`);
    }
  }
}
