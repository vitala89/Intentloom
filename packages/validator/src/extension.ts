import type { ArtifactValidator, ArtifactValidationResult } from "./index.js";

export function validateExtensionManifestDocument(
  validator: ArtifactValidator,
  documentPath: string,
  source: string,
): ArtifactValidationResult {
  return validator.validate({
    artifactType: "extension-manifest",
    documentPath,
    format: "json",
    source,
  });
}

export function validateExtensionLockDocument(
  validator: ArtifactValidator,
  documentPath: string,
  source: string,
): ArtifactValidationResult {
  return validator.validate({
    artifactType: "extension-lock",
    documentPath,
    format: "json",
    source,
  });
}
