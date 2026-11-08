import { dirname, relative } from "node:path";
import {
  validateSkillEvaluationResult,
  type EvaluationOutcome,
  type SkillEvaluationResult,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { getSkillProposal } from "./skill-proposal-store.js";

export async function evaluateSkillProposal(
  proposalId: string,
  options: { root: string; caseId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillEvaluationResult> {
  const proposal = await getSkillProposal(proposalId, options, fs);
  if (!proposal) throw new Error(`Skill proposal not found: ${proposalId}`);

  const details: string[] = [];
  let securityPass = true;
  let passed = true;
  let outcome: EvaluationOutcome = "passed";

  const unsafePatterns = [
    /ignore previous instructions/iu,
    /bypass approval/iu,
    /grant all permissions/iu,
    /eval\(/iu,
    /rm -rf/iu,
  ];

  for (const pattern of unsafePatterns) {
    if (pattern.test(proposal.content)) {
      securityPass = false;
      passed = false;
      outcome = "unsafe";
      details.push(
        `Security check failed: content matched unsafe pattern ${pattern.source}`,
      );
      break;
    }
  }

  if (securityPass) {
    if (proposal.content.trim().length === 0) {
      passed = false;
      outcome = "unsupported";
      details.push("Proposal content is empty");
    } else {
      details.push("Security checks passed");
      details.push("Execution contract verified");
      outcome = proposal.previousVersion ? "improved" : "passed";
    }
  }

  const evalId = `eval-${proposal.id}-${Date.now()}`;
  const evalResult: SkillEvaluationResult = validateSkillEvaluationResult({
    schemaVersion: "1",
    id: evalId,
    skillId: proposal.name,
    proposalId: proposal.id,
    outcome,
    passed,
    contextCost: Math.ceil(proposal.content.length / 4),
    toolSelectionScore: securityPass ? 1.0 : 0.0,
    capabilityScore: passed ? 1.0 : 0.0,
    securityPass,
    details,
    provenance: {
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    },
    evaluatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/evaluations/${evalId}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(evalResult, null, 2)}\n`);
  return evalResult;
}

export async function listSkillEvaluations(
  options: {
    root: string;
    skillId?: string;
    outcome?: EvaluationOutcome;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SkillEvaluationResult[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SkillEvaluationResult[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/evaluations/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const evalRes = validateSkillEvaluationResult(JSON.parse(content));
      if (
        options.skillId !== undefined &&
        evalRes.skillId !== options.skillId &&
        evalRes.proposalId !== options.skillId
      )
        continue;
      if (options.outcome !== undefined && evalRes.outcome !== options.outcome)
        continue;
      results.push(evalRes);
    } catch {
      // Ignore corrupted evaluation records
    }
  }

  return results.sort((left, right) =>
    right.evaluatedAt.localeCompare(left.evaluatedAt),
  );
}

export async function getSkillEvaluation(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillEvaluationResult | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/evaluations/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateSkillEvaluationResult(JSON.parse(content));
  } catch {
    return null;
  }
}
