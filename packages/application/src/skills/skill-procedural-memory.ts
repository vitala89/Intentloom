import type {
  ProceduralMemoryInspection,
  ProceduralMemorySummary,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { listSkillEvaluations } from "./skill-evaluation.js";
import { listSkillProposals } from "./skill-proposal-store.js";

export async function validateSkillExtensionLock(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<"clean" | "stale" | "unverified" | "corrupted"> {
  const lockFilePath = inside(options.root, ".aif/memory/lock.json");
  if (!(await fs.exists(lockFilePath))) return "unverified";
  try {
    const content = await fs.read(lockFilePath);
    JSON.parse(content);
    return "clean";
  } catch {
    return "corrupted";
  }
}

export async function listProceduralMemorySummary(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProceduralMemorySummary> {
  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);
  const extensionLockStatus = await validateSkillExtensionLock(options, fs);

  const proposalCountsByState: Record<string, number> = {};
  let activeSkillsCount = 0;
  for (const p of proposals) {
    proposalCountsByState[p.state] = (proposalCountsByState[p.state] ?? 0) + 1;
    if (p.state === "active" || p.state === "approved") {
      activeSkillsCount += 1;
    }
  }

  const passedEvals = evaluations.filter((e) => e.passed && e.securityPass);
  const evaluationPassRate =
    evaluations.length > 0
      ? Math.round((passedEvals.length / evaluations.length) * 100)
      : 100;

  return {
    totalProposals: proposals.length,
    proposalCountsByState,
    totalEvaluations: evaluations.length,
    evaluationPassRate,
    activeSkillsCount,
    extensionLockStatus,
  };
}

export async function inspectProceduralMemory(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProceduralMemoryInspection> {
  const summary = await listProceduralMemorySummary(options, fs);
  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);
  const issues: string[] = [];

  if (summary.extensionLockStatus === "corrupted") {
    issues.push("Extension lock file .aif/memory/lock.json is corrupted");
  } else if (summary.extensionLockStatus === "unverified") {
    issues.push("Extension lock file .aif/memory/lock.json is missing");
  }

  for (const p of proposals) {
    if (p.state === "approved" || p.state === "active") {
      const propEvals = evaluations.filter(
        (e) => e.proposalId === p.id || e.skillId === p.name,
      );
      if (propEvals.length === 0) {
        issues.push(
          `Proposal [${p.id}] (${p.name}) is ${p.state} but has no evaluations`,
        );
      } else if (!propEvals[0]!.passed || !propEvals[0]!.securityPass) {
        issues.push(
          `Proposal [${p.id}] (${p.name}) is ${p.state} but latest evaluation failed`,
        );
      }
    }
  }

  return {
    summary,
    proposals,
    evaluations,
    issues,
  };
}
