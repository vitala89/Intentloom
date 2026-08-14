import { join } from "node:path";
import {
  validatePersistentMemoryItem,
  type ContinuousLoopMemoryApply,
  type ContinuousLoopMemoryProposal,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";

export const CONTINUOUS_LOOP_MEMORY_APPROVAL = "approved:w12-memory";

function memoryItemPath(root: string, id: string): string {
  return join(root, ".aif", "memory", "items", `${id}.json`);
}

export function draftLoopMemoryProposal(input: {
  readonly projectId: string;
  readonly content: string;
}): ContinuousLoopMemoryProposal {
  const safeId = `w12-${input.projectId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    id: safeId.slice(0, 128),
    lifecycleState: "draft",
    content: input.content,
  };
}

export async function applyContinuousLoopMemory(input: {
  readonly root: string;
  readonly projectId: string;
  readonly proposal: ContinuousLoopMemoryProposal;
  readonly applyRequested: boolean;
  readonly grantedApprovals: readonly string[];
  readonly fs: FileSystem;
  readonly now: () => number;
}): Promise<{
  readonly apply: ContinuousLoopMemoryApply;
  readonly proposal: ContinuousLoopMemoryProposal;
}> {
  if (!input.applyRequested) {
    return {
      apply: { attempted: false, applied: false, diagnostics: [] },
      proposal: input.proposal,
    };
  }
  if (!input.grantedApprovals.includes(CONTINUOUS_LOOP_MEMORY_APPROVAL)) {
    return {
      apply: {
        attempted: true,
        applied: false,
        diagnostics: ["apply-blocked:memory-approval-missing"],
      },
      proposal: input.proposal,
    };
  }
  const timestamp = new Date(input.now()).toISOString();
  const accepted = validatePersistentMemoryItem({
    schemaVersion: "1",
    id: input.proposal.id,
    projectId: input.projectId,
    classification: "working-context",
    lifecycleState: "accepted",
    trustClass: "user-supplied",
    content: input.proposal.content,
    provenance: "continuous-loop-w12",
    retentionState: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    approval: {
      approvedBy: "workspace-operator",
      evidence: CONTINUOUS_LOOP_MEMORY_APPROVAL,
      approvedAt: timestamp,
    },
    audit: ["proposed", "accepted"],
  });
  const itemPath = memoryItemPath(input.root, accepted.id);
  await input.fs.mkdir(join(input.root, ".aif", "memory", "items"));
  await input.fs.write(itemPath, `${JSON.stringify(accepted, null, 2)}\n`);
  return {
    apply: { attempted: true, applied: true, diagnostics: [] },
    proposal: {
      id: accepted.id,
      lifecycleState: "accepted",
      content: accepted.content,
    },
  };
}
