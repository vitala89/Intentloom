import { dirname } from "node:path";
import {
  validateDelegationRequest,
  validateDelegationResult,
  type AgentRoleCapabilities,
  type DelegatedAgentRole,
  type DelegationRequest,
  type DelegationResult,
  type ProfileDefinition,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { getProfile } from "./profile-store.js";

type ClampedDelegationCapabilities = {
  effectiveCapabilities: AgentRoleCapabilities;
  deniedCapabilities: string[];
};

export function clampDelegationCapabilities(
  role: DelegatedAgentRole,
  profile: ProfileDefinition,
  requestedCapabilities: DelegationRequest["requestedCapabilities"],
): ClampedDelegationCapabilities {
  const deniedCapabilities: string[] = [];
  const isReadOnlyRole = role === "context-scout" || role === "reviewer";
  const readOnly = isReadOnlyRole || profile.allowedCapabilities.readOnly;

  if (isReadOnlyRole && requestedCapabilities?.readOnly === false) {
    deniedCapabilities.push("readOnly: false (role enforces read-only)");
  }

  const allowedPaths = profile.allowedCapabilities.allowedPaths;
  const allowedTools = profile.allowedCapabilities.allowedTools;
  const maxBudget = Math.min(
    profile.allowedCapabilities.maxBudget,
    requestedCapabilities?.maxBudget ?? profile.allowedCapabilities.maxBudget,
  );
  const allowNetwork =
    profile.allowedCapabilities.allowNetwork &&
    (requestedCapabilities?.allowNetwork ?? true);

  if (
    requestedCapabilities?.allowNetwork === true &&
    !profile.allowedCapabilities.allowNetwork
  ) {
    deniedCapabilities.push("allowNetwork: true (profile disallows network)");
  }

  return {
    effectiveCapabilities: {
      readOnly,
      allowedPaths,
      allowedTools,
      maxBudget,
      allowNetwork,
    },
    deniedCapabilities,
  };
}

export async function delegateTaskRole(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<DelegationResult> {
  const req = validateDelegationRequest(input);
  const profile = await getProfile(req.profileName, options, fs);
  if (!profile) {
    throw new Error(`Profile not found: ${req.profileName}`);
  }

  if (!profile.activeRoles.includes(req.role)) {
    throw new Error(
      `Role [${req.role}] is not allowed by profile [${profile.name}]`,
    );
  }

  const { effectiveCapabilities, deniedCapabilities } =
    clampDelegationCapabilities(req.role, profile, req.requestedCapabilities);

  const delegationId = `del-${req.role}-${Date.now()}`;
  const result = validateDelegationResult({
    schemaVersion: "1",
    delegationId,
    grantedRole: req.role,
    effectiveCapabilities,
    deniedCapabilities,
    createdAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/delegations/${delegationId}.json`,
  );
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(result, null, 2)}\n`);

  return result;
}
