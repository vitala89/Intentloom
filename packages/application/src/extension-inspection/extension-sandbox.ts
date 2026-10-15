import type {
  ExtensionIsolationProfile,
  ExtensionManifest,
  ExtensionSandboxEvaluation,
  ExtensionSandboxPolicy,
} from "@intentloom/protocol";
import { validateExtensionSandboxPolicy } from "@intentloom/validator";

const PROFILE_RANKS: Record<ExtensionIsolationProfile, number> = {
  strict: 1,
  "workspace-read": 2,
  "workspace-write": 3,
  "network-read": 4,
  unrestricted: 5,
};

function inferRequestedProfile(
  manifest: ExtensionManifest,
): ExtensionIsolationProfile {
  const caps = manifest.capabilities;
  const hasNet = Boolean(
    caps.network?.connect && caps.network.connect.length > 0,
  );
  const hasExec = Boolean(caps.process?.exec && caps.process.exec.length > 0);
  const hasWrite = Boolean(
    caps.filesystem?.write && caps.filesystem.write.length > 0,
  );
  const hasRead = Boolean(
    caps.filesystem?.read && caps.filesystem.read.length > 0,
  );

  if (hasNet && hasExec) return "unrestricted";
  if (hasNet) return "network-read";
  if (hasExec || hasWrite) return "workspace-write";
  if (hasRead) return "workspace-read";
  return "strict";
}

export function evaluateExtensionSandboxPolicy(
  manifest: ExtensionManifest,
  policyInput: ExtensionSandboxPolicy,
): ExtensionSandboxEvaluation {
  const policy = validateExtensionSandboxPolicy(policyInput);
  const requestedProfile = inferRequestedProfile(manifest);
  const requestedRank = PROFILE_RANKS[requestedProfile];
  const maxRank = PROFILE_RANKS[policy.maxIsolationProfile];
  const profileSatisfied = requestedRank <= maxRank;

  const readReq = manifest.capabilities.filesystem?.read ?? [];
  const writeReq = manifest.capabilities.filesystem?.write ?? [];
  const execReq = manifest.capabilities.process?.exec ?? [];
  const netReq = manifest.capabilities.network?.connect ?? [];

  const unapprovedReadPaths = policy.allowedReadPaths
    ? readReq.filter((path) => !policy.allowedReadPaths!.includes(path))
    : [];
  const unapprovedWritePaths = policy.allowedWritePaths
    ? writeReq.filter((path) => !policy.allowedWritePaths!.includes(path))
    : [];
  const unapprovedExecCommands = policy.allowedExecCommands
    ? execReq.filter((cmd) => !policy.allowedExecCommands!.includes(cmd))
    : [];
  const unapprovedConnectHosts = policy.allowedConnectHosts
    ? netReq.filter((host) => !policy.allowedConnectHosts!.includes(host))
    : [];

  const filesystemReadAllowed = unapprovedReadPaths.length === 0;
  const filesystemWriteAllowed = unapprovedWritePaths.length === 0;
  const processExecAllowed = unapprovedExecCommands.length === 0;
  const networkConnectAllowed = unapprovedConnectHosts.length === 0;

  const diagnostics: string[] = [];

  if (!profileSatisfied) {
    diagnostics.push(
      `isolation-profile-exceeded: requested profile "${requestedProfile}" exceeds maximum allowed profile "${policy.maxIsolationProfile}"`,
    );
  }
  if (unapprovedReadPaths.length > 0) {
    diagnostics.push(
      `unapproved-read-paths: ${unapprovedReadPaths.join(", ")}`,
    );
  }
  if (unapprovedWritePaths.length > 0) {
    diagnostics.push(
      `unapproved-write-paths: ${unapprovedWritePaths.join(", ")}`,
    );
  }
  if (unapprovedExecCommands.length > 0) {
    diagnostics.push(
      `unapproved-exec-commands: ${unapprovedExecCommands.join(", ")}`,
    );
  }
  if (unapprovedConnectHosts.length > 0) {
    diagnostics.push(
      `unapproved-connect-hosts: ${unapprovedConnectHosts.join(", ")}`,
    );
  }

  let status: "approved" | "requires-approval" | "rejected";

  if (!profileSatisfied) {
    status = "rejected";
  } else if (
    unapprovedReadPaths.length > 0 ||
    unapprovedWritePaths.length > 0 ||
    unapprovedExecCommands.length > 0 ||
    unapprovedConnectHosts.length > 0 ||
    Boolean(policy.requireExplicitApprovalForExpansions)
  ) {
    status = "requires-approval";
    if (
      policy.requireExplicitApprovalForExpansions &&
      diagnostics.length === 0
    ) {
      diagnostics.push("explicit-approval-required-by-policy");
    }
  } else {
    status = "approved";
  }

  return {
    status,
    extensionId: manifest.extensionId,
    category: manifest.category,
    requestedProfile,
    maxProfile: policy.maxIsolationProfile,
    profileSatisfied,
    filesystemReadAllowed,
    filesystemWriteAllowed,
    processExecAllowed,
    networkConnectAllowed,
    unapprovedReadPaths,
    unapprovedWritePaths,
    unapprovedExecCommands,
    unapprovedConnectHosts,
    diagnostics,
  };
}
