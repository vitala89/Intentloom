import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  executeApprovedApplyPlan,
} from "../packages/application/src/index.js";
import type { ApprovedApplyRequest } from "../packages/protocol/src/approved-apply.js";
import type { GeneratedFile } from "@intentloom/core";

describe("executeApprovedApplyPlan", () => {
  it("fails execution if security gate fails", async () => {
    const fs = createMemoryFileSystem();
    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "res-1",
      grantedApprovals: [], // missing atomic-commit-approval
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:plan1",
        projectStateDigest: "sha256:state1",
        targetRoot: "/project",
        changedPaths: ["file1.ts"],
      },
    };

    const filesToApply: GeneratedFile[] = [
      {
        path: "file1.ts",
        content: "console.log('hello');",
        checksum: "sha256:abc",
        sources: ["src/file1.ts"],
      },
    ];

    const result = await executeApprovedApplyPlan(request, filesToApply, {
      fs,
    });

    expect(result.applied).toBe(false);
    expect(result.gateResult.passed).toBe(false);
    expect(result.diagnostics).toContain("gate-evaluation-failed");
  });

  it("successfully applies changes and records rollback evidence for new and existing files", async () => {
    const fs = createMemoryFileSystem({
      "/project/file1.ts": "const old = 1;\n",
    });

    const request: ApprovedApplyRequest = {
      schemaVersion: 1,
      targetResourceId: "res-1",
      grantedApprovals: ["atomic-commit-approval"],
      plan: {
        schemaVersion: 1,
        planDigest: "sha256:plan1",
        projectStateDigest: "sha256:state1",
        targetRoot: "/project",
        changedPaths: ["file1.ts", "file2.ts"],
      },
    };

    const filesToApply: GeneratedFile[] = [
      {
        path: "file1.ts",
        content: "const updated = 2;\n",
        checksum: "sha256:file1",
        sources: ["src/file1.ts"],
      },
      {
        path: "file2.ts",
        content: "export const newFile = true;\n",
        checksum: "sha256:file2",
        sources: ["src/file2.ts"],
      },
    ];

    const result = await executeApprovedApplyPlan(request, filesToApply, {
      fs,
      now: () => 1000,
    });

    expect(result.applied).toBe(true);
    expect(result.gateResult.passed).toBe(true);
    expect(result.rollbackEvidence).toBeDefined();
    expect(result.rollbackEvidence?.planDigest).toBe("sha256:plan1");
    expect(result.rollbackEvidence?.targetRoot).toBe("/project");
    expect(result.rollbackEvidence?.rollbackFiles).toHaveLength(2);

    const rollbackFile1 = result.rollbackEvidence?.rollbackFiles.find(
      (f) => f.path === "file1.ts",
    );
    expect(rollbackFile1?.previousContent).toBe("const old = 1;\n");

    const rollbackFile2 = result.rollbackEvidence?.rollbackFiles.find(
      (f) => f.path === "file2.ts",
    );
    expect(rollbackFile2?.previousContent).toBeNull();

    // Verify filesystem state
    expect(fs.files.get("/project/file1.ts")).toBe("const updated = 2;\n");
    expect(fs.files.get("/project/file2.ts")).toBe(
      "export const newFile = true;\n",
    );
  });
});
