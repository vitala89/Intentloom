import type { ApprovedApplyRollbackFile } from "../../protocol/src/approved-apply.js";
import type { NeutronMutationRollbackProjection } from "../../protocol/src/neutron-mutation-verification.js";
import { digestGeneratedFileContent } from "../../validator/src/neutron-mutation-review-digest.js";

export function projectNeutronMutationRollbackEvidence(input: {
  readonly attempted: boolean;
  readonly completed: boolean;
  readonly createdPaths: readonly string[];
  readonly rollbackFailures: readonly string[];
  readonly rollbackFiles: readonly ApprovedApplyRollbackFile[];
}): NeutronMutationRollbackProjection {
  const failed = new Set(input.rollbackFailures);
  const previousContentDigests = input.rollbackFiles.map((file) => {
    const existedBefore = file.previousContent !== null;
    const restored = input.completed && !failed.has(file.path);
    return {
      path: file.path,
      existedBefore,
      restored,
      digest:
        file.previousContent === null
          ? null
          : digestGeneratedFileContent(file.previousContent),
    };
  });
  return {
    attempted: input.attempted,
    completed: input.completed,
    verified: false,
    createdPaths: input.createdPaths,
    restoredPaths: previousContentDigests
      .filter((entry) => entry.restored)
      .map((entry) => entry.path),
    failedPaths: input.rollbackFailures,
    previousContentDigests,
  };
}
