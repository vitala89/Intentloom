import { resolve, sep } from "node:path";
import type {
  BoundedExecutionCapability,
  BoundedExecutionGate,
} from "@intentloom/protocol";

export const BOUNDED_EXECUTION_PLAN_APPROVAL = "approved:implementation-plan";

export interface GrantBoundedExecutionCapabilityInput {
  readonly approvedRoot: string;
  readonly requestedRoot?: string;
  readonly requestedAllowedPaths?: readonly string[];
  readonly requestedAllowedCommands?: readonly string[];
  readonly requestedNetworkAccess?: boolean;
  readonly requestedProcessExecution?: boolean;
  readonly planApproval?: string;
}

export interface GrantBoundedExecutionCapabilityResult {
  readonly gate: BoundedExecutionGate;
  readonly capability: BoundedExecutionCapability;
  readonly diagnostics: readonly string[];
}

function hasParentSegment(relativePath: string): boolean {
  const parts = relativePath.split("/");
  for (const part of parts) {
    if (part === "..") return true;
  }
  return false;
}

export function isPathInsideApprovedRoot(
  approvedRoot: string,
  relativePath: string,
): boolean {
  if (relativePath.length === 0) return false;
  if (hasParentSegment(relativePath.replaceAll("\\", "/"))) return false;
  const root = resolve(approvedRoot);
  const candidate = resolve(root, relativePath);
  if (candidate === root) return true;
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate.startsWith(prefix);
}

export function grantBoundedExecutionCapability(
  input: GrantBoundedExecutionCapabilityInput,
): GrantBoundedExecutionCapabilityResult {
  const approvedRoot = resolve(input.approvedRoot);
  const denied: BoundedExecutionCapability = {
    approvedRoot,
    allowedPaths: [],
    allowedCommands: [],
    networkAccess: false,
    processExecution: false,
    mutationAllowed: false,
  };
  const diagnostics: string[] = [];

  if (input.requestedNetworkAccess === true) {
    diagnostics.push("network-access-not-granted");
    return { gate: "unsupported", capability: denied, diagnostics };
  }
  if (
    input.requestedProcessExecution === true ||
    (input.requestedAllowedCommands !== undefined &&
      input.requestedAllowedCommands.length > 0)
  ) {
    diagnostics.push("process-execution-not-granted");
    return { gate: "unsupported", capability: denied, diagnostics };
  }

  if (input.requestedRoot !== undefined) {
    if (resolve(input.requestedRoot) !== approvedRoot) {
      diagnostics.push("root-widening-rejected");
      return { gate: "blocked", capability: denied, diagnostics };
    }
  }

  const allowedPaths = input.requestedAllowedPaths ?? ["."];
  for (const path of allowedPaths) {
    if (!isPathInsideApprovedRoot(approvedRoot, path)) {
      diagnostics.push(`path-widening-rejected:${path}`);
      return { gate: "blocked", capability: denied, diagnostics };
    }
  }

  if (input.planApproval !== BOUNDED_EXECUTION_PLAN_APPROVAL) {
    diagnostics.push("plan-approval-missing");
    return { gate: "w11-blocked", capability: denied, diagnostics };
  }

  return {
    gate: "capability-granted",
    capability: {
      approvedRoot,
      allowedPaths,
      allowedCommands: [],
      networkAccess: false,
      processExecution: false,
      mutationAllowed: false,
    },
    diagnostics,
  };
}
