import { normalizeStoredPath } from "@intentloom/core";

export { isObject } from "./engineering-assessment/common.js";

export const NEUTRON_CONTENT_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

export function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

export function finiteInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

export function positiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

export function projectRelativePath(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  try {
    return normalizeStoredPath(value);
  } catch {
    throw new Error(`${field} must be a safe project-relative path`);
  }
}

export function contentDigest(value: unknown, field: string): string {
  const digest = nonEmpty(value, field);
  if (!NEUTRON_CONTENT_DIGEST_PATTERN.test(digest)) {
    throw new Error(`${field} must be sha256:<64 lowercase hex characters>`);
  }
  return digest;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

export function strings(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((item, index) => nonEmpty(item, `${field}[${index}]`));
}
