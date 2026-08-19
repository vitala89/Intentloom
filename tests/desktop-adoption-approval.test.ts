import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
  EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
  parseExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import { existingProjectAdoptionPreparedPlanDesktopMethods } from "../apps/desktop/src/desktop-client-adoption-prepared-plan.js";
import {
  approveAdoptionPlan,
  canApprovePreparedPlan,
  prepareAdoptionPlan,
  revalidateAdoptionPlan,
} from "../apps/desktop/src/views/adoption-prepared-plan-controller.js";
import {
  ADOPTION_APPROVAL_INTENT,
  ADOPTION_APPROVAL_NO_WRITE,
  ADOPTION_APPROVAL_WARNING,
  renderAdoptionApprovalSummary,
} from "../apps/desktop/src/views/AdoptionPreparedPlanPanel.js";
import { adoptionPreviewFocusOrder } from "../apps/desktop/src/views/adoption-preview-presentation.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function samplePlan(): ExistingProjectAdoptionPreparedPlan {
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
    plannedActions: [
      {
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        manualDecisionRequired: false,
      },
    ],
    diagnostics: [],
    remainingManualDecisionPaths: [],
  });
}

describe("desktop adoption approval", () => {
  it("requires an explicit approve click after valid revalidation", async () => {
    const plan = samplePlan();
    const foundationRequest = vi.fn(async (request: object) => {
      const method = (request as { method?: string }).method;
      if (method === EXISTING_PROJECT_ADOPTION_PREPARE_METHOD) {
        return {
          readOnly: true,
          classification: "read-only",
          applied: false,
          changesApplied: 0,
          approved: false,
          status: "prepared",
          reasons: [],
          plan,
        };
      }
      if (method === EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD) {
        return {
          readOnly: true,
          classification: "read-only",
          applied: false,
          changesApplied: 0,
          approved: false,
          status: "valid",
          reasons: [],
          plan,
        };
      }
      return {
        readOnly: true,
        classification: "read-only",
        applied: false,
        changesApplied: 0,
        approved: true,
        status: "approved",
        reasons: [],
        plan,
        approval: {
          schemaVersion: 1,
          readOnly: true,
          classification: "read-only",
          approved: true,
          applied: false,
          changesApplied: 0,
          approvalId: "adoption-approval-aaaaaaaaaaaaaaaaaaaaaaaa",
          approvalDigest: "d".repeat(64),
          approvalSource: "local-interactive",
          approvalToken: `approved:${plan.planDigest}`,
          root: plan.root,
          previewIdentity: plan.previewIdentity,
          preparedPlanId: plan.preparedPlanId,
          planDigest: plan.planDigest,
          projectFingerprint: plan.projectFingerprint,
          approvedAt: 1_700_000_000_100,
          approvalValidUntil: plan.expiresAt,
          preparedPlanExpiresAt: plan.expiresAt,
        },
      };
    });
    const client =
      existingProjectAdoptionPreparedPlanDesktopMethods(foundationRequest);
    await prepareAdoptionPlan({
      client,
      root: "/workspace/example",
      previewIdentity: plan.previewIdentity,
      decisions: plan.decisions,
    });
    const checked = await revalidateAdoptionPlan({
      client,
      root: "/workspace/example",
      plan,
    });
    expect(canApprovePreparedPlan(checked.result)).toBe(true);
    expect(canApprovePreparedPlan(null)).toBe(false);
    expect(
      canApprovePreparedPlan({ ...checked.result!, status: "expired" }),
    ).toBe(false);
    expect(
      canApprovePreparedPlan({ ...checked.result!, status: "stale" }),
    ).toBe(false);
    expect(foundationRequest.mock.calls).toHaveLength(2);
    const approved = await approveAdoptionPlan({
      client,
      root: "/workspace/example",
      plan,
    });
    expect(approved.status).toBe("ready");
    expect(approved.result?.approved).toBe(true);
    expect(approved.result?.applied).toBe(false);
    expect(approved.result?.changesApplied).toBe(0);
    expect(approved.invokedMethods).toEqual(["existingProjectAdoptionApprove"]);
    const methods = foundationRequest.mock.calls.map(
      (call) => (call[0] as { method: string }).method,
    );
    expect(methods).toEqual([
      EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
      EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
      EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
    ]);
    expect(methods.join(" ")).not.toContain("apply");
    expect(
      renderAdoptionApprovalSummary({
        plan,
        revalidation: checked.result,
        approval: approved.result,
      }),
    ).toContain("Approved");
    expect(
      renderAdoptionApprovalSummary({
        plan,
        revalidation: checked.result,
        approval: approved.result,
      }),
    ).toContain("Changes applied: 0");
    expect(
      renderAdoptionApprovalSummary({
        plan,
        revalidation: checked.result,
        approval: null,
      }),
    ).toContain(plan.planDigest);
  });

  it("keeps approval copy, keyboard target, and apply denied", () => {
    const panel = readFileSync(
      join(desktopRoot, "src/views/AdoptionPreparedPlanPanel.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(desktopRoot, "src/views/AdoptionPreviewPage.tsx"),
      "utf8",
    );
    expect(panel).toContain(ADOPTION_APPROVAL_INTENT);
    expect(panel).toContain(ADOPTION_APPROVAL_NO_WRITE);
    expect(panel).toContain(ADOPTION_APPROVAL_WARNING);
    expect(panel).toContain('id="adoption-approve-plan"');
    expect(panel).toContain("aria-describedby");
    expect(panel).not.toContain("Apply");
    expect(panel).not.toContain("Installed");
    expect(panel).not.toContain("Ready");
    expect(page).toContain("onApprove={() => void approvePlan()}");
    expect(page).not.toContain("void approvePlan();\n");
    expect(page).toContain("setApproval(null)");
    const focus = adoptionPreviewFocusOrder("ready", null);
    expect(focus.some((item) => item.id === "adoption-approve-plan")).toBe(
      true,
    );
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.approve.v1",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.apply.v1",
    );
    expect(allowlist).toContain("assert!(!is_foundation_method(");
  });
});
