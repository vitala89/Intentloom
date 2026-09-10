import { checksum, normalizeStoredPath } from "@intentloom/core";
import { NEUTRON_CONTENT_DIGEST_PATTERN } from "./neutron-runtime-helpers.js";

export function compareNeutronMutationPaths(
  left: string,
  right: string,
): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function canonicalizeNeutronMutationPaths(
  paths: readonly string[],
  field: string,
): readonly string[] {
  if (paths.length === 0) {
    throw new Error(`${field} must contain at least one path`);
  }
  const normalized = paths.map((path, index) => {
    try {
      return normalizeStoredPath(path);
    } catch {
      throw new Error(
        `${field}[${String(index)}] must be a safe project-relative path`,
      );
    }
  });
  const unique = new Set<string>();
  for (const path of normalized) {
    if (unique.has(path)) {
      throw new Error(`${field} must not contain duplicate paths`);
    }
    unique.add(path);
  }
  const ordered = [...normalized];
  ordered.sort(compareNeutronMutationPaths);
  return ordered;
}

export function neutronMutationContentDigest(value: string): string {
  return `sha256:${checksum(value)}`;
}

export function assertNeutronMutationDigest(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !NEUTRON_CONTENT_DIGEST_PATTERN.test(value)
  ) {
    throw new Error(`${field} must be sha256:<64 lowercase hex characters>`);
  }
  return value;
}

export function neutronMutationApprovalToken(proposalDigest: string): string {
  return `approved:${assertNeutronMutationDigest(proposalDigest, "proposalDigest")}`;
}

export function canonicalNeutronMutationJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON rejects non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalNeutronMutationJson(entry)).join(",")}]`;
  }
  if (typeof value !== "object") {
    throw new Error("canonical JSON rejects unsupported types");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  keys.sort(compareNeutronMutationPaths);
  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalNeutronMutationJson(record[key])}`,
    )
    .join(",")}}`;
}
