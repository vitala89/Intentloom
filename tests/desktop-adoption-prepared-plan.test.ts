import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
  parseExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import { existingProjectAdoptionPreparedPlanDesktopMethods } from "../apps/desktop/src/desktop-client-adoption-prepared-plan.js";
import {
  prepareAdoptionPlan,
  revalidateAdoptionPlan,
} from "../apps/desktop/src/views/adoption-prepared-plan-controller.js";

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

describe("desktop adoption prepared plan client", () => {
  it("calls typed prepare and revalidate without apply", async () => {
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
    });
    const client =
      existingProjectAdoptionPreparedPlanDesktopMethods(foundationRequest);
    const prepared = await prepareAdoptionPlan({
      client,
      root: "/workspace/example",
      previewIdentity: "a".repeat(64),
      projectId: "example-workspace",
      decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
    });
    expect(prepared.status).toBe("ready");
    expect(prepared.result?.approved).toBe(false);
    expect(prepared.result?.changesApplied).toBe(0);
    expect(prepared.invokedMethods).toEqual(["existingProjectAdoptionPrepare"]);
    const checked = await revalidateAdoptionPlan({
      client,
      root: "/workspace/example",
      plan,
    });
    expect(checked.status).toBe("ready");
    expect(checked.result?.status).toBe("valid");
    expect(foundationRequest).toHaveBeenCalledTimes(2);
    const methods = foundationRequest.mock.calls.map(
      (call) => (call[0] as { method: string }).method,
    );
    expect(methods).toEqual([
      EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
      EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
    ]);
    expect(methods.join(" ")).not.toContain("apply");
  });

  it("keeps apply denied in the Tauri allowlist", () => {
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.prepare.v1",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.revalidate.v1",
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
