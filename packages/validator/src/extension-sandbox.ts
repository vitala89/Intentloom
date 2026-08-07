import type {
  ExtensionCategory,
  ExtensionIsolationProfile,
  ExtensionSandboxEvaluation,
  ExtensionSandboxPolicy,
} from "@intentloom/protocol";

const ISOLATION_PROFILES: readonly ExtensionIsolationProfile[] = [
  "strict",
  "workspace-read",
  "workspace-write",
  "network-read",
  "unrestricted",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export function validateExtensionSandboxPolicy(
  value: unknown,
): ExtensionSandboxPolicy {
  if (!isObject(value))
    throw new Error("extension sandbox policy must be an object");
  if (
    !ISOLATION_PROFILES.includes(
      value.maxIsolationProfile as ExtensionIsolationProfile,
    )
  )
    throw new Error("invalid maxIsolationProfile in sandbox policy");

  return {
    maxIsolationProfile: value.maxIsolationProfile as ExtensionIsolationProfile,
    ...(value.allowedReadPaths !== undefined
      ? {
          allowedReadPaths: stringArray(
            value.allowedReadPaths,
            "allowedReadPaths",
          ),
        }
      : {}),
    ...(value.allowedWritePaths !== undefined
      ? {
          allowedWritePaths: stringArray(
            value.allowedWritePaths,
            "allowedWritePaths",
          ),
        }
      : {}),
    ...(value.allowedExecCommands !== undefined
      ? {
          allowedExecCommands: stringArray(
            value.allowedExecCommands,
            "allowedExecCommands",
          ),
        }
      : {}),
    ...(value.allowedConnectHosts !== undefined
      ? {
          allowedConnectHosts: stringArray(
            value.allowedConnectHosts,
            "allowedConnectHosts",
          ),
        }
      : {}),
    ...(typeof value.requireExplicitApprovalForExpansions === "boolean"
      ? {
          requireExplicitApprovalForExpansions:
            value.requireExplicitApprovalForExpansions,
        }
      : {}),
  };
}

export function validateExtensionSandboxEvaluation(
  value: unknown,
): ExtensionSandboxEvaluation {
  if (!isObject(value))
    throw new Error("extension sandbox evaluation must be an object");
  if (
    !["approved", "requires-approval", "rejected"].includes(
      value.status as string,
    )
  )
    throw new Error("invalid status in sandbox evaluation");
  if (typeof value.extensionId !== "string" || !value.extensionId)
    throw new Error(
      "extensionId must be a non-empty string in sandbox evaluation",
    );
  if (
    !ISOLATION_PROFILES.includes(
      value.requestedProfile as ExtensionIsolationProfile,
    )
  )
    throw new Error("invalid requestedProfile in sandbox evaluation");
  if (
    !ISOLATION_PROFILES.includes(value.maxProfile as ExtensionIsolationProfile)
  )
    throw new Error("invalid maxProfile in sandbox evaluation");
  if (typeof value.profileSatisfied !== "boolean")
    throw new Error("profileSatisfied must be a boolean in sandbox evaluation");

  return {
    status: value.status as "approved" | "requires-approval" | "rejected",
    extensionId: value.extensionId,
    category: value.category as ExtensionCategory,
    requestedProfile: value.requestedProfile as ExtensionIsolationProfile,
    maxProfile: value.maxProfile as ExtensionIsolationProfile,
    profileSatisfied: value.profileSatisfied,
    filesystemReadAllowed: Boolean(value.filesystemReadAllowed),
    filesystemWriteAllowed: Boolean(value.filesystemWriteAllowed),
    processExecAllowed: Boolean(value.processExecAllowed),
    networkConnectAllowed: Boolean(value.networkConnectAllowed),
    unapprovedReadPaths: stringArray(
      value.unapprovedReadPaths,
      "unapprovedReadPaths",
    ),
    unapprovedWritePaths: stringArray(
      value.unapprovedWritePaths,
      "unapprovedWritePaths",
    ),
    unapprovedExecCommands: stringArray(
      value.unapprovedExecCommands,
      "unapprovedExecCommands",
    ),
    unapprovedConnectHosts: stringArray(
      value.unapprovedConnectHosts,
      "unapprovedConnectHosts",
    ),
    diagnostics: stringArray(value.diagnostics, "diagnostics"),
  };
}
