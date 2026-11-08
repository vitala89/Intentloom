import { dirname, relative } from "node:path";
import {
  validateSkillProposal,
  type SkillProposal,
  type SkillProposalState,
  type TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

export async function createSkillProposal(
  input: Omit<
    SkillProposal,
    "schemaVersion" | "state" | "createdAt" | "updatedAt"
  > & {
    state?: SkillProposalState;
    createdAt?: string;
    updatedAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const root = options.root;
  const now = new Date().toISOString();

  const proposal = validateSkillProposal({
    schemaVersion: "1",
    id: input.id,
    name: input.name,
    version: input.version,
    state: input.state ?? "proposed",
    sourceTaskIds: input.sourceTaskIds,
    observedPattern: input.observedPattern,
    confidence: input.confidence,
    uncertainty: input.uncertainty,
    requestedCapabilities: input.requestedCapabilities,
    supportedProfiles: input.supportedProfiles,
    validationExpectations: input.validationExpectations,
    privacyImpact: input.privacyImpact,
    ...(input.licenseNotice !== undefined
      ? { licenseNotice: input.licenseNotice }
      : {}),
    trustClass: input.trustClass,
    content: input.content,
    ...(input.approvalEvidence !== undefined
      ? { approvalEvidence: input.approvalEvidence }
      : {}),
    ...(input.previousVersion !== undefined
      ? { previousVersion: input.previousVersion }
      : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });

  const path = inside(root, `.aif/memory/proposals/${proposal.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(proposal, null, 2)}\n`);
  return proposal;
}

export async function listSkillProposals(
  options: {
    root: string;
    state?: SkillProposalState;
    trustClass?: TrustClass;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SkillProposal[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SkillProposal[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/proposals/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const proposal = validateSkillProposal(JSON.parse(content));
      if (options.state !== undefined && proposal.state !== options.state)
        continue;
      if (
        options.trustClass !== undefined &&
        proposal.trustClass !== options.trustClass
      )
        continue;
      results.push(proposal);
    } catch {
      // Ignore corrupted proposal records
    }
  }

  return results.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getSkillProposal(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/proposals/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateSkillProposal(JSON.parse(content));
  } catch {
    return null;
  }
}
