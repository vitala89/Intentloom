import type { ArtifactValidationResult } from "@intentloom/validator";

export class ArtifactValidationFailure extends Error {
  constructor(readonly results: readonly ArtifactValidationResult[]) {
    super("project artifact validation failed");
  }
}
