import { createHash } from "node:crypto";
import { dirname } from "node:path";
import {
  validateSkillMutationPlan,
  validateSkillProposal,
  type SkillMutationPlan,
  type SkillProposal,
  type SkillProposalState,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { listSkillEvaluations } from "./skill-evaluation.js";
import { getSkillProposal } from "./skill-proposal-store.js";

export async function updateSkillProposalState(
  id: string,
  newState: SkillProposalState,
  options: {
    root: string;
    approvalEvidence?: string;
    bypassEvaluationGate?: boolean;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const existing = await getSkillProposal(id, options, fs);
  if (!existing) throw new Error(`Skill proposal not found: ${id}`);

  if (
    (newState === "approved" || newState === "active") &&
    (!options.approvalEvidence || options.approvalEvidence.trim().length === 0)
  ) {
    throw new Error(
      `Transitioning proposal ${id} to ${newState} requires non-empty approvalEvidence`,
    );
  }

  if (
    (newState === "approved" || newState === "active") &&
    !options.bypassEvaluationGate
  ) {
    const evaluations = await listSkillEvaluations({ root: options.root }, fs);
    const proposalEvals = evaluations.filter(
      (e) =>
        e.proposalId === id ||
        e.skillId === existing.id ||
        e.skillId === existing.name,
    );
    if (proposalEvals.length === 0) {
      throw new Error(
        `Activation blocked: skill proposal ${id} has no evaluation records`,
      );
    }
    const latestEval = proposalEvals[0]!;
    if (
      !latestEval.passed ||
      !latestEval.securityPass ||
      latestEval.outcome === "regressed" ||
      latestEval.outcome === "unsafe"
    ) {
      throw new Error(
        `Activation blocked: skill proposal ${id} evaluation outcome is ${latestEval.outcome}`,
      );
    }
  }

  const updated = validateSkillProposal({
    ...existing,
    state: newState,
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : existing.approvalEvidence !== undefined
        ? { approvalEvidence: existing.approvalEvidence }
        : {}),
    updatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/proposals/${id}.json`);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function rollbackSkill(
  id: string,
  options: { root: string; approvalEvidence?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const existing = await getSkillProposal(id, options, fs);
  if (!existing) throw new Error(`Skill proposal not found: ${id}`);

  const updated = validateSkillProposal({
    ...existing,
    state: "rolled-back",
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : {}),
    updatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/proposals/${id}.json`);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function prepareSkillMutationPlan(
  options: {
    root: string;
    action: "approve" | "activate" | "deprecate" | "rollback";
    proposalId: string;
    approvalEvidence?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillMutationPlan> {
  const proposal = await getSkillProposal(options.proposalId, options, fs);
  if (!proposal)
    throw new Error(`Skill proposal not found: ${options.proposalId}`);

  let targetState: SkillProposalState;
  switch (options.action) {
    case "approve":
      targetState = "approved";
      break;
    case "activate":
      targetState = "active";
      break;
    case "deprecate":
      targetState = "deprecated";
      break;
    case "rollback":
      targetState = "rolled-back";
      break;
  }

  const planId = `plan-skill-${options.proposalId}-${Date.now()}`;
  const checksumPayload = `${planId}:${options.action}:${options.proposalId}:${targetState}:${options.approvalEvidence ?? ""}`;
  const checksumDigest = createHash("sha256")
    .update(checksumPayload)
    .digest("hex");

  return validateSkillMutationPlan({
    schemaVersion: "1",
    id: planId,
    action: options.action,
    proposalId: options.proposalId,
    targetState,
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : {}),
    checksum: checksumDigest,
    createdAt: new Date().toISOString(),
  });
}

export async function applySkillMutationPlan(
  planInput: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const mutationPlan = validateSkillMutationPlan(planInput);

  let result: SkillProposal;
  if (mutationPlan.action === "rollback") {
    result = await rollbackSkill(
      mutationPlan.proposalId,
      {
        root: options.root,
        ...(mutationPlan.approvalEvidence !== undefined
          ? { approvalEvidence: mutationPlan.approvalEvidence }
          : {}),
      },
      fs,
    );
  } else {
    result = await updateSkillProposalState(
      mutationPlan.proposalId,
      mutationPlan.targetState,
      {
        root: options.root,
        ...(mutationPlan.approvalEvidence !== undefined
          ? { approvalEvidence: mutationPlan.approvalEvidence }
          : {}),
      },
      fs,
    );
  }

  const logPath = inside(
    options.root,
    `.aif/memory/mutations/${mutationPlan.id}.json`,
  );
  const dir = dirname(logPath);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(logPath, `${JSON.stringify(mutationPlan, null, 2)}\n`);

  return result;
}
