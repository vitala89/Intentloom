import {
  validateSandboxEvaluationResult,
  type SandboxEvaluationResult,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { getSandboxCapabilityPolicy } from "./sandbox-capability-policy.js";

export async function evaluateProposalAgainstSandbox(
  proposal: {
    actions?: readonly {
      type: string;
      path?: string;
      command?: string;
      networkAccess?: boolean;
    }[];
    changes?: readonly {
      type: string;
      path?: string;
    }[];
  },
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxEvaluationResult> {
  const policy = await getSandboxCapabilityPolicy(options, fs);
  const violations: string[] = [];

  if (policy.mode === "read-only") {
    violations.push(
      "Sandbox policy is in read-only mode: all mutation proposals are rejected",
    );
  }

  interface SandboxActionItem {
    type: string;
    path?: string;
    command?: string;
    networkAccess?: boolean;
  }
  const rawActions: readonly SandboxActionItem[] =
    (proposal.actions as readonly SandboxActionItem[] | undefined) ??
    (proposal.changes as readonly SandboxActionItem[] | undefined) ??
    [];
  for (const act of rawActions) {
    const actionType = act.type ?? "write";
    const path = act.path ? act.path.replaceAll("\\", "/") : undefined;

    if (path) {
      const isDelete = actionType === "delete" || actionType === "remove";
      const matchedRule = policy.pathRules.find(
        (r) => path.startsWith(r.pathPrefix) || r.pathPrefix === "*",
      );

      if (!matchedRule) {
        violations.push(`Path '${path}' is outside allowed sandbox path rules`);
      } else if (isDelete && !matchedRule.allowDelete) {
        violations.push(
          `Delete operation on path '${path}' violates sandbox policy (allowDelete: false)`,
        );
      } else if (!isDelete && !matchedRule.allowWrite) {
        violations.push(
          `Write operation on path '${path}' violates sandbox policy (allowWrite: false)`,
        );
      }
    }

    if (act.command) {
      const matchedCmd = policy.commandRules.find(
        (c) =>
          act.command?.startsWith(c.commandPrefix) || c.commandPrefix === "*",
      );
      if (!matchedCmd) {
        violations.push(
          `Command '${act.command}' is not in allowed sandbox command rules`,
        );
      }
    }

    if (act.networkAccess === true && !policy.allowNetwork) {
      violations.push(
        "Action requires network access, which is disabled by sandbox policy (allowNetwork: false)",
      );
    }
  }

  return validateSandboxEvaluationResult({
    schemaVersion: "1",
    projectId: options.projectId,
    allowed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
  });
}
