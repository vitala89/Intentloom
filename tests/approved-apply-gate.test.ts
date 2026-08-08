import { describe, expect, it } from "vitest";
import { evaluateApprovedApplyPlan } from "../packages/application/src/approved-apply-gate.js";
import type { ApprovedApplyRequest } from "../packages/protocol/src/approved-apply.js";

describe("evaluateApprovedApplyPlan", () => {
  it("approves valid request", () => {
    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "project-1",
      grantedApprovals: ["atomic-commit-approval"],
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:1234",
        projectStateDigest: "sha256:abcd",
        targetRoot: "/test",
        changedPaths: ["a.ts"],
        expiresAt: 2000,
      },
    };

    const result = evaluateApprovedApplyPlan(request, {
      now: () => 1000,
      currentProjectStateDigest: "sha256:abcd",
    });

    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("fails if plan is expired", () => {
    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "project-1",
      grantedApprovals: ["atomic-commit-approval"],
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:1234",
        projectStateDigest: "sha256:abcd",
        targetRoot: "/test",
        changedPaths: ["a.ts"],
        expiresAt: 1000,
      },
    };

    const result = evaluateApprovedApplyPlan(request, {
      now: () => 2000,
      currentProjectStateDigest: "sha256:abcd",
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "approved-apply-plan-expired:sha256:1234",
    );
  });

  it("fails if project state diverges", () => {
    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "project-1",
      grantedApprovals: ["atomic-commit-approval"],
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:1234",
        projectStateDigest: "sha256:abcd",
        targetRoot: "/test",
        changedPaths: ["a.ts"],
      },
    };

    const result = evaluateApprovedApplyPlan(request, {
      now: () => 1000,
      currentProjectStateDigest: "sha256:efgh",
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "project-state-diverged:expected=sha256:abcd:actual=sha256:efgh",
    );
  });

  it("fails without atomic-commit-approval", () => {
    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "project-1",
      grantedApprovals: ["some-other-approval"],
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:1234",
        projectStateDigest: "sha256:abcd",
        targetRoot: "/test",
        changedPaths: ["a.ts"],
      },
    };

    const result = evaluateApprovedApplyPlan(request, {
      now: () => 1000,
      currentProjectStateDigest: "sha256:abcd",
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "missing-required-approval:atomic-commit-approval",
    );
  });
});
