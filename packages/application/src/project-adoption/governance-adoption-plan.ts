import { resolve } from "node:path";
import { checksum } from "@intentloom/core";
import {
  planGovernanceAdoption,
  type AdoptionPlan,
  type DetectedProjectArtifact,
} from "@intentloom/core/adoption";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import {
  inside,
  projectRelativePaths,
  secretLikePath,
} from "../project-path.js";
import {
  ownershipClassForPath,
  roleCandidatesForPath,
} from "./governance-adoption-artifacts.js";
import type { PlanProjectAdoptionOptions } from "./governance-adoption-contracts.js";

export async function planProjectAdoption(
  options: PlanProjectAdoptionOptions,
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionPlan> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption planning requires a non-symbolic explicit project root",
    );
  }
  return planGovernanceAdoption({
    projectId: options.projectId ?? "project",
    packId: options.packId ?? "duty-watch",
    packVersion: options.packVersion ?? "1.0.0",
    artifacts: await governanceArtifacts(root, fs),
    ...(options.validations !== undefined
      ? { validations: options.validations }
      : {}),
    ...(options.exceptions !== undefined
      ? { exceptions: options.exceptions }
      : {}),
  });
}

async function governanceArtifacts(
  root: string,
  fs: FileSystem,
): Promise<DetectedProjectArtifact[]> {
  const scannedPaths = projectRelativePaths(root, await fs.list(root));
  const artifacts: DetectedProjectArtifact[] = [];
  for (const path of scannedPaths) {
    const artifact = await readGovernanceArtifact(root, path, fs);
    if (artifact) artifacts.push(artifact);
  }
  return artifacts;
}

async function readGovernanceArtifact(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<DetectedProjectArtifact | null> {
  if (secretLikePath(path)) return null;
  let content: string;
  try {
    content = await fs.read(inside(root, path));
  } catch {
    return null;
  }
  return {
    path,
    contentHash: checksum(content),
    ownership: ownershipClassForPath(path),
    roleCandidates: roleCandidatesForPath(path),
  };
}
