import type { ExtensionCategory } from "./extension-lifecycle.js";

export type ExtensionIsolationProfile =
  | "strict"
  | "workspace-read"
  | "workspace-write"
  | "network-read"
  | "unrestricted";

export interface ExtensionSandboxPolicy {
  readonly maxIsolationProfile: ExtensionIsolationProfile;
  readonly allowedReadPaths?: readonly string[] | undefined;
  readonly allowedWritePaths?: readonly string[] | undefined;
  readonly allowedExecCommands?: readonly string[] | undefined;
  readonly allowedConnectHosts?: readonly string[] | undefined;
  readonly requireExplicitApprovalForExpansions?: boolean | undefined;
}

export interface ExtensionSandboxEvaluation {
  readonly status: "approved" | "requires-approval" | "rejected";
  readonly extensionId: string;
  readonly category: ExtensionCategory;
  readonly requestedProfile: ExtensionIsolationProfile;
  readonly maxProfile: ExtensionIsolationProfile;
  readonly profileSatisfied: boolean;
  readonly filesystemReadAllowed: boolean;
  readonly filesystemWriteAllowed: boolean;
  readonly processExecAllowed: boolean;
  readonly networkConnectAllowed: boolean;
  readonly unapprovedReadPaths: readonly string[];
  readonly unapprovedWritePaths: readonly string[];
  readonly unapprovedExecCommands: readonly string[];
  readonly unapprovedConnectHosts: readonly string[];
  readonly diagnostics: readonly string[];
}
