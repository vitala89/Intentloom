import { describe, expect, it } from "vitest";
import {
  assessProject,
  createRemediationProposal,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Remediation Planning Integration", () => {
  it("creates a remediation proposal for a valid finding", async () => {
    const report = await assessProject({
      root: "/projects/sample-remediation",
      projectId: "sample-remediation",
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
    });

    const proposal = createRemediationProposal(
      report,
      "fp-arch-1",
      "opt-minimal",
    );

    expect(proposal.proposalId).toBe("rem-prop-fp-arch-1");
    expect(proposal.findingId).toBe("fp-arch-1");
    expect(proposal.targetOptionId).toBe("opt-minimal");
    expect(proposal.affectedPaths).toContain("packages/core");
    expect(proposal.policyImpact).toContain("ERROR finding fp-arch-1");
    expect(proposal.rollbackStrategy).toContain("Revert changes");
    expect(proposal.requiresApproval).toBe(true);
  });

  it("throws an error when finding ID does not exist in the report", async () => {
    const report = await assessProject({
      root: "/projects/sample-remediation",
      projectId: "sample-remediation",
    });

    expect(() => createRemediationProposal(report, "non-existent-id")).toThrow(
      /Finding non-existent-id was not found/,
    );
  });
});
