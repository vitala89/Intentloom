import type { ExtensionInspectionReport } from "@intentloom/protocol";
import {
  createArtifactValidator,
  inspectExtensionManifestDocument,
  type InspectionEnvironment,
} from "@intentloom/validator";

export interface InspectExtensionManifestParams {
  readonly manifestContent: string;
  readonly lockfileContent?: string;
  readonly schemaRoot?: string;
  readonly environment?: InspectionEnvironment;
}

export async function inspectExtensionManifest(
  params: InspectExtensionManifestParams,
): Promise<ExtensionInspectionReport> {
  const schemaRoot = params.schemaRoot ?? "catalog/schemas";
  const validator = await createArtifactValidator(schemaRoot);

  return inspectExtensionManifestDocument(
    validator,
    params.manifestContent,
    params.lockfileContent,
    params.environment,
  );
}

export * from "./extension-health.js";
