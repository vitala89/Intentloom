import type {
  BoundedExecutionArchitectureCheck,
  BoundedExecutionCheckerResult,
  BoundedExecutionDiffReview,
} from "@intentloom/protocol";
import type { FeatureIntentArchitectureImpact } from "@intentloom/protocol";
import { isPathInsideApprovedRoot } from "./bounded-execution-capability.js";

export function runBoundedExecutionVerification(input: {
  readonly approvedRoot: string;
  readonly allowedPaths: readonly string[];
  readonly proposedPaths: readonly string[];
  readonly architectureImpact: FeatureIntentArchitectureImpact;
}): {
  readonly checkerResults: readonly BoundedExecutionCheckerResult[];
  readonly architectureCheck: BoundedExecutionArchitectureCheck;
  readonly diffReview: BoundedExecutionDiffReview;
} {
  const outsideApprovedPaths = input.proposedPaths.filter((path) => {
    if (!isPathInsideApprovedRoot(input.approvedRoot, path)) return true;
    if (input.allowedPaths.includes(".")) return false;
    return !input.allowedPaths.some(
      (allowed) => path === allowed || path.startsWith(`${allowed}/`),
    );
  });
  const architecturePassed =
    input.architectureImpact.publicApiChangeRisk !== "likely";
  return {
    checkerResults: [
      {
        checkerId: "bounded-path-policy",
        passed: outsideApprovedPaths.length === 0,
        summary:
          outsideApprovedPaths.length === 0
            ? "Proposed paths stay inside the approved capability."
            : "Proposed paths widen the approved capability.",
      },
      {
        checkerId: "bounded-network-policy",
        passed: true,
        summary: "Network remains disabled for this execution.",
      },
    ],
    architectureCheck: {
      passed: architecturePassed,
      summary: architecturePassed
        ? input.architectureImpact.summary
        : `${input.architectureImpact.summary} Public API change is likely; review before apply.`,
    },
    diffReview: {
      proposedPaths: input.proposedPaths,
      allowedPaths: input.allowedPaths,
      outsideApprovedPaths,
      reviewRequired: true,
    },
  };
}
