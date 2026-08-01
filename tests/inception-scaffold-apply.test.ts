import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  proposeProjectBlueprints,
  approveBlueprint,
  prepareProjectScaffoldPlan,
  applyProjectScaffold,
  rollbackProjectScaffold,
  revokeBlueprintApproval,
} from "@intentloom/application";
import { validateScaffoldResult } from "@intentloom/validator";

describe("Project Inception Transactional Scaffold Apply (Phase I6)", () => {
  it("applies scaffold plan transactionally with valid blueprint approval", () => {
    const session = createInceptionSession({
      root: "/tmp/apply-test",
      idea: "Apply test library",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint);
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/apply-test");

    const writtenMap: Record<string, string> = {};
    const writer = (path: string, content: string) => {
      writtenMap[path] = content;
    };

    const result = applyProjectScaffold(plan, approval, { fileWriter: writer });

    expect(result.status).toBe("applied");
    expect(result.writtenFiles.length).toBe(5);
    expect(writtenMap["package.json"]).toBeDefined();
    expect(writtenMap["src/index.ts"]).toContain("Apply test library");
  });

  it("rejects scaffold application when blueprint digest mismatches or approval is revoked", () => {
    const session = createInceptionSession({
      root: "/tmp/mismatch-test",
      idea: "Mismatch test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint);
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/mismatch-test");

    // Revoked approval
    const revokedApproval = revokeBlueprintApproval(approval);
    expect(() => applyProjectScaffold(plan, revokedApproval)).toThrow(
      "blueprint approval status is 'revoked'",
    );

    // Mismatched digest plan
    const mismatchedPlan = {
      ...plan,
      blueprintDigest:
        "1111111111111111111111111111111111111111111111111111111111111111",
    };
    expect(() => applyProjectScaffold(mismatchedPlan, approval)).toThrow(
      "does not match approval digest",
    );
  });

  it("automatically rolls back written files when writer throws an error", () => {
    const session = createInceptionSession({
      root: "/tmp/error-test",
      idea: "Error test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint);
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/error-test");

    const writtenMap: Record<string, string> = {};
    let count = 0;
    const errorWriter = (path: string, content: string) => {
      count++;
      if (count === 3) throw new Error("Disk full simulation");
      writtenMap[path] = content;
    };

    const result = applyProjectScaffold(plan, approval, {
      fileWriter: errorWriter,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Disk full simulation");
    expect(result.writtenFiles).toEqual([]);
  });

  it("restores original files byte-for-byte on manual rollback", () => {
    const session = createInceptionSession({
      root: "/tmp/rollback-test",
      idea: "Rollback test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const approval = approveBlueprint(blueprint);
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/rollback-test");

    const existingFiles = {
      "README.md": "# Original Header\nPre-existing readme content\n",
    };

    const fsState: Record<string, string | null> = { ...existingFiles };
    const writer = (path: string, content: string | null) => {
      fsState[path] = content;
    };

    const applyResult = applyProjectScaffold(plan, approval, {
      fileWriter: writer as any,
      existingFiles,
    });

    expect(applyResult.status).toBe("applied");
    expect(fsState["README.md"]).toContain("Rollback test");

    const rollbackResult = rollbackProjectScaffold(applyResult, writer);
    expect(rollbackResult.status).toBe("rolled-back");
    expect(fsState["README.md"]).toBe(
      "# Original Header\nPre-existing readme content\n",
    );
  });

  it("validates scaffold result structure strictly", () => {
    expect(() => validateScaffoldResult(null)).toThrow("expected object");
    expect(() =>
      validateScaffoldResult({
        planId: "p1",
        root: "/tmp",
        status: "invalid_status",
        writtenFiles: [],
        backups: [],
        appliedAt: 1000,
      }),
    ).toThrow("Invalid result.status");
  });
});
