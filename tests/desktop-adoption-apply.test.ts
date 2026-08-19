import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
  parseExistingProjectAdoptionApproval,
  parseExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import { existingProjectAdoptionApplyDesktopMethods } from "../apps/desktop/src/desktop-client-adoption-apply.js";
import {
  applyApprovedAdoptionPlan,
  applyOutcomeLabel,
  canApplyApprovedPlan,
} from "../apps/desktop/src/views/adoption-apply-controller.js";
import {
  ADOPTION_APPLY_WARNING,
  renderAdoptionApplySummary,
} from "../apps/desktop/src/views/AdoptionApplyPanel.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function samplePlan() {
  return parseExistingProjectAdoptionPreparedPlan({
    schemaVersion: 1,
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    root: "/workspace/example",
    projectId: "example-workspace",
    profile: "typescript",
    workspaceTopology: "nx",
    detectedAdapters: ["codex"],
    previewIdentity: "a".repeat(64),
    preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
    planDigest: "b".repeat(64),
    projectFingerprint: "c".repeat(64),
    createdAt: 1_700_000_000_000,
    expiresAt: 1_700_000_900_000,
    decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
    affectedPaths: ["AGENTS.md"],
    plannedActions: [],
    diagnostics: [],
    remainingManualDecisionPaths: [],
  });
}

function sampleApproval() {
  return parseExistingProjectAdoptionApproval({
    schemaVersion: 1,
    readOnly: true,
    classification: "read-only",
    approved: true,
    applied: false,
    changesApplied: 0,
    approvalId: "adoption-approval-aaaaaaaaaaaaaaaaaaaaaaaa",
    approvalDigest: "d".repeat(64),
    approvalSource: "local-interactive",
    approvalToken: `approved:${"b".repeat(64)}`,
    root: "/workspace/example",
    previewIdentity: "a".repeat(64),
    preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
    planDigest: "b".repeat(64),
    projectFingerprint: "c".repeat(64),
    approvedAt: 1_700_000_000_100,
    approvalValidUntil: 1_700_000_900_000,
    preparedPlanExpiresAt: 1_700_000_900_000,
  });
}

describe("desktop adoption apply", () => {
  it("keeps Apply separate from Approve and requires an explicit click", async () => {
    const plan = samplePlan();
    const approval = sampleApproval();
    expect(canApplyApprovedPlan(null, "valid")).toBe(false);
    expect(canApplyApprovedPlan(approval, "stale")).toBe(false);
    expect(canApplyApprovedPlan(approval, "valid")).toBe(true);
    const foundationRequest = vi.fn(async (request: object) => {
      expect((request as { method: string }).method).toBe(
        EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
      );
      return {
        schemaVersion: 1,
        readOnly: false,
        classification: "mutating",
        status: "applied",
        reasons: [],
        applied: true,
        alreadyApplied: false,
        ready: true,
        changesApplied: 1,
        canonicalRoot: plan.root,
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        approvalId: approval.approvalId,
        appliedPaths: [".aif/config.yaml"],
        unchangedPaths: [],
        rollbackAttempted: false,
        rollbackCompleted: true,
        rollbackFailures: [],
        doctor: { errorCount: 0, warningCount: 0, codes: [] },
        diff: { unmanagedDriftPaths: [] },
        inspectionReadiness: "ready",
        recoveryGuidance: null,
        diagnostics: [],
        cancelledAfterCommit: false,
        approval,
        plan,
      };
    });
    const client =
      existingProjectAdoptionApplyDesktopMethods(foundationRequest);
    const applied = await applyApprovedAdoptionPlan({
      client,
      root: plan.root,
      plan,
      approval,
    });
    expect(applied.status).toBe("ready");
    expect(applied.invokedMethods).toEqual(["existingProjectAdoptionApply"]);
    expect(foundationRequest).toHaveBeenCalledTimes(1);
    const panel = readFileSync(
      join(desktopRoot, "src/views/AdoptionApplyPanel.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(desktopRoot, "src/views/AdoptionPreviewPage.tsx"),
      "utf8",
    );
    const approvePanel = readFileSync(
      join(desktopRoot, "src/views/AdoptionPreparedPlanPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain(ADOPTION_APPLY_WARNING);
    expect(panel).toContain("Apply approved plan");
    expect(panel).toContain('id="adoption-apply-plan"');
    expect(panel).toContain("mutation");
    expect(panel).toContain('type="button"');
    expect(approvePanel).not.toContain("Apply approved plan");
    expect(page).toContain('approval?.status === "approved"');
    expect(page).toContain("() => void applyPlan()");
    expect(page).not.toContain("void applyPlan();\n");
    expect(
      renderAdoptionApplySummary({
        plan,
        approval,
        applying: true,
        result: null,
      }),
    ).toBe("Applying...");
    expect(applyOutcomeLabel(applied.result)).toBe("Ready");
    expect(
      applyOutcomeLabel({ ...applied.result!, status: "already-applied" }),
    ).toBe("Already applied");
    expect(
      applyOutcomeLabel({
        ...applied.result!,
        status: "applied-needs-attention",
        ready: false,
      }),
    ).toBe("Needs attention");
    expect(
      applyOutcomeLabel({
        ...applied.result!,
        status: "rolled-back",
        applied: false,
        ready: false,
      }),
    ).toBe("Rolled back");
    expect(
      applyOutcomeLabel({
        ...applied.result!,
        status: "failed-incomplete",
        applied: false,
        ready: false,
      }),
    ).toBe("Incomplete recovery required");
    expect(
      applyOutcomeLabel({
        ...applied.result!,
        status: "denied",
        applied: false,
        ready: false,
      }),
    ).toMatch(/stale or expired/);
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.apply.v1",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.mutate.v1",
    );
    expect(allowlist).not.toContain("existing-project.adoption.*");
  });
});
