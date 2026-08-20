import { canonicalJson, parseJsonDocument } from "./canonical-json.js";

const metadataJsonPaths = new Set([
  ".aif/manifest.lock.json",
  ".aif/source-map.json",
]);

const protectedMetadataPaths = new Set([
  ".aif/config.yaml",
  ".aif/manifest.lock.json",
  ".aif/source-map.json",
]);

export interface GeneratedPlanChange {
  readonly path: string;
  readonly kind: "update" | "conflict" | "modified";
  readonly reason: string;
  readonly content?: string;
}

export function isMetadataJsonPath(path: string): boolean {
  return metadataJsonPaths.has(path);
}

export function compareGeneratedArtifact(
  path: string,
  existing: string,
  desired: string,
):
  | { readonly equal: true }
  | { readonly equal: false; readonly reason: string } {
  if (existing === desired) return { equal: true };
  if (!isMetadataJsonPath(path))
    return {
      equal: false,
      reason: "existing file is not identical; explicit resolution required",
    };
  const existingJson = parseJsonDocument(existing);
  if (!existingJson.ok)
    return {
      equal: false,
      reason:
        "existing metadata JSON is malformed; explicit resolution required",
    };
  const desiredJson = parseJsonDocument(desired);
  if (!desiredJson.ok)
    return {
      equal: false,
      reason:
        "generated metadata JSON is malformed; explicit resolution required",
    };
  if (canonicalJson(existingJson.value) === canonicalJson(desiredJson.value))
    return { equal: true };
  return {
    equal: false,
    reason: "existing metadata JSON differs; explicit resolution required",
  };
}

export function planExistingGeneratedChange(input: {
  readonly path: string;
  readonly existing: string;
  readonly desired: string;
  readonly sync: boolean;
  readonly ownedChecksum: string | undefined;
  readonly checksum: (value: string) => string;
  readonly approvedOverwrite?: boolean;
}): GeneratedPlanChange | undefined {
  const comparison = compareGeneratedArtifact(
    input.path,
    input.existing,
    input.desired,
  );
  if (comparison.equal) return undefined;
  if (input.approvedOverwrite === true) {
    return {
      path: input.path,
      kind: "update",
      reason: "approved adoption replaces generated output",
      content: input.desired,
    };
  }
  if (input.sync && !protectedMetadataPaths.has(input.path)) {
    if (!input.ownedChecksum)
      return {
        path: input.path,
        kind: "conflict",
        reason: "existing destination has no Intentloom ownership record",
      };
    if (input.checksum(input.existing) !== input.ownedChecksum)
      return {
        path: input.path,
        kind: "modified",
        reason: "Intentloom-owned generated file was manually modified",
      };
    return {
      path: input.path,
      kind: "update",
      reason: "verified Intentloom-owned generated output changed",
      content: input.desired,
    };
  }
  return {
    path: input.path,
    kind: "conflict",
    reason: comparison.reason,
  };
}
