import { checksum, type GeneratedFile } from "@intentloom/core";
import type { BoundedExecutionApplySummary } from "@intentloom/protocol";
import { executeApprovedApplyPlan } from "./approved-apply-engine.js";
import type { FileSystem } from "./index.js";

export async function applyBoundedExecutionChange(input: {
  readonly root: string;
  readonly intentId: string;
  readonly proposedPaths: readonly string[];
  readonly outsideApprovedPaths: readonly string[];
  readonly grantedApprovals: readonly string[];
  readonly applyRequested: boolean;
  readonly files: readonly {
    readonly path: string;
    readonly content: string;
  }[];
  readonly fs: FileSystem;
  readonly now: () => number;
}): Promise<BoundedExecutionApplySummary> {
  if (!input.applyRequested) {
    return { attempted: false, applied: false, diagnostics: [] };
  }
  const diagnostics: string[] = [];
  if (input.outsideApprovedPaths.length > 0) {
    diagnostics.push("apply-blocked:path-widening");
    return { attempted: true, applied: false, diagnostics };
  }
  if (input.proposedPaths.length === 0) {
    diagnostics.push("apply-blocked:no-proposed-paths");
    return { attempted: true, applied: false, diagnostics };
  }
  const filesToApply: GeneratedFile[] = input.files.map((file) => ({
    path: file.path,
    content: file.content,
    sources: ["bounded-execution"],
    checksum: checksum(file.content),
  }));
  const result = await executeApprovedApplyPlan(
    {
      schemaVersion: 1,
      targetResourceId: input.intentId,
      grantedApprovals: input.grantedApprovals,
      plan: {
        schemaVersion: 1,
        planDigest: `bounded-plan-${input.intentId}`,
        projectStateDigest: `bounded-state-${input.intentId}`,
        targetRoot: input.root,
        changedPaths: input.proposedPaths,
      },
    },
    filesToApply,
    { fs: input.fs, now: input.now },
  );
  return {
    attempted: true,
    applied: result.applied,
    diagnostics: result.diagnostics,
  };
}
