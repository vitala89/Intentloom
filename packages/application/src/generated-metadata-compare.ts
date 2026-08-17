import { canonicalJson, parseJsonDocument } from "./canonical-json.js";

const metadataJsonPaths = new Set([
  ".aif/manifest.lock.json",
  ".aif/source-map.json",
]);

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
