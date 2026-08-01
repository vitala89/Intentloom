import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  proposeProjectBlueprints,
  exportBlueprintYaml,
  parseBlueprintYaml,
  approveBlueprint,
  revokeBlueprintApproval,
  validateBlueprintApprovalState,
} from "@intentloom/application";
import { validateBlueprintApproval } from "@intentloom/validator";

describe("Project Inception Blueprint Storage & Review (Phase I4)", () => {
  it("serializes blueprint to YAML and parses it back accurately", () => {
    const session = createInceptionSession({
      root: "/tmp/yaml-test",
      idea: "YAML export test application",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const yaml = exportBlueprintYaml(blueprint);

    expect(yaml).toContain("id: ");
    expect(yaml).toContain("topology: ");
    expect(yaml).toContain("digest: ");

    const parsed = parseBlueprintYaml(yaml);
    expect(parsed).toEqual(blueprint);
  });

  it("creates explicit approval bound to blueprint digest", () => {
    const session = createInceptionSession({
      root: "/tmp/approval-test",
      idea: "Approval test application",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint, { approver: "lead-engineer" });

    expect(approval.blueprintId).toBe(blueprint.id);
    expect(approval.blueprintDigest).toBe(blueprint.digest);
    expect(approval.approver).toBe("lead-engineer");
    expect(approval.status).toBe("approved");
  });

  it("validates approval state against blueprint digest and expiration", () => {
    const session = createInceptionSession({
      root: "/tmp/state-test",
      idea: "State validation test application",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint);

    const validCheck = validateBlueprintApprovalState(approval, blueprint);
    expect(validCheck.isValid).toBe(true);

    // Modified blueprint with different digest
    const modifiedBlueprint = {
      ...blueprint,
      digest:
        "0000000000000000000000000000000000000000000000000000000000000000",
    };

    const mismatchCheck = validateBlueprintApprovalState(
      approval,
      modifiedBlueprint,
    );
    expect(mismatchCheck.isValid).toBe(false);
    expect(mismatchCheck.reason).toContain("digest mismatch");

    // Revoked approval
    const revoked = revokeBlueprintApproval(approval);
    expect(revoked.status).toBe("revoked");

    const revokedCheck = validateBlueprintApprovalState(revoked, blueprint);
    expect(revokedCheck.isValid).toBe(false);
    expect(revokedCheck.reason).toContain("revoked");
  });

  it("validates blueprint approval structure strictly", () => {
    expect(() => validateBlueprintApproval(null)).toThrow("expected object");
    expect(() =>
      validateBlueprintApproval({
        blueprintId: "bp_1",
        blueprintDigest: "abc",
        approver: "user",
        approvedAt: 1000,
        expiry: 2000,
        status: "invalid_status",
      }),
    ).toThrow("Invalid approval.status");
  });
});
