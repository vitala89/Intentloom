import { resolve } from "node:path";
import type { Catalog } from "@intentloom/core";
import {
  createArtifactValidator,
  type ArtifactValidator,
} from "@intentloom/validator";

export interface ExistingProjectAdoptionGenerationOptions {
  readonly catalogRoot?: string;
  readonly catalog?: Catalog;
  readonly validator?: ArtifactValidator;
}

export function spreadExistingProjectAdoptionGeneration(
  options: ExistingProjectAdoptionGenerationOptions,
): ExistingProjectAdoptionGenerationOptions {
  return {
    ...(options.catalogRoot !== undefined
      ? { catalogRoot: options.catalogRoot }
      : {}),
    ...(options.catalog !== undefined ? { catalog: options.catalog } : {}),
    ...(options.validator !== undefined
      ? { validator: options.validator }
      : {}),
  };
}

export async function withExistingProjectAdoptionCatalog(
  options: ExistingProjectAdoptionGenerationOptions,
): Promise<ExistingProjectAdoptionGenerationOptions> {
  const spread = spreadExistingProjectAdoptionGeneration(options);
  if (spread.validator !== undefined || spread.catalogRoot === undefined) {
    return spread;
  }
  return {
    ...spread,
    validator: await createArtifactValidator(
      resolve(spread.catalogRoot, "schemas"),
    ),
  };
}
