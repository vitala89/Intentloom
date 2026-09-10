import {
  validateEngineeringWorkflowPolicy,
  validateGenericTimeline,
} from "../../protocol/src/index.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronToolInvocation } from "../../protocol/src/neutron-runtime.js";
import {
  definition,
  fail,
  optionalBoundedInt,
  parseArgumentObject,
  rejectMutationFlags,
  requireNonEmptyString,
  trustedRoot,
  type NeutronToolDefinition,
  NEUTRON_TOOL_MAX_FINDINGS,
  NEUTRON_TOOL_MAX_MEMORY_ITEMS,
} from "./neutron-tool-input.js";

function parseMemorySearchInput(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): Record<string, unknown> {
  const args = parseArgumentObject(invocation, "memorySearch");
  rejectMutationFlags(invocation, "memorySearch", args);
  const root = trustedRoot(invocation, "memorySearch", args, session.root);
  if (
    typeof args.projectId === "string" &&
    args.projectId !== session.projectId
  ) {
    throw fail(
      invocation,
      "memorySearch",
      "cross-project",
      "Memory search projectId must match the session project",
    );
  }
  const maxItems = optionalBoundedInt(
    invocation,
    "memorySearch",
    args,
    "maxItems",
    NEUTRON_TOOL_MAX_MEMORY_ITEMS,
  );
  return {
    root,
    projectId: session.projectId,
    query: requireNonEmptyString(invocation, "memorySearch", args, "query"),
    maxItems: maxItems ?? NEUTRON_TOOL_MAX_MEMORY_ITEMS,
  };
}

function parseConformanceInput(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): Record<string, unknown> {
  const args = parseArgumentObject(invocation, "conformance");
  rejectMutationFlags(invocation, "conformance", args);
  const root = trustedRoot(invocation, "conformance", args, session.root);
  const caseId =
    typeof args.caseId === "string" && args.caseId.length > 0
      ? args.caseId
      : "current";
  let policy: unknown;
  if (args.policy !== undefined) {
    try {
      policy = validateEngineeringWorkflowPolicy(args.policy);
    } catch {
      throw fail(
        invocation,
        "conformance",
        "invalid-input",
        "conformance policy is invalid",
      );
    }
  }
  let timeline: unknown;
  if (args.timeline !== undefined) {
    try {
      timeline = validateGenericTimeline(args.timeline);
    } catch {
      throw fail(
        invocation,
        "conformance",
        "invalid-input",
        "conformance timeline is invalid",
      );
    }
  }
  return {
    root,
    caseId,
    ...(policy !== undefined ? { policy } : {}),
    ...(timeline !== undefined ? { timeline } : {}),
  };
}

function parseSecurityAuditInput(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): Record<string, unknown> {
  const args = parseArgumentObject(invocation, "securityAudit");
  rejectMutationFlags(invocation, "securityAudit", args);
  return {
    root: trustedRoot(invocation, "securityAudit", args, session.root),
    projectId: session.projectId,
    maxFindings:
      optionalBoundedInt(
        invocation,
        "securityAudit",
        args,
        "maxFindings",
        NEUTRON_TOOL_MAX_FINDINGS,
      ) ?? NEUTRON_TOOL_MAX_FINDINGS,
  };
}

export const GOVERNANCE_TOOL_DEFINITIONS: readonly NeutronToolDefinition[] = [
  definition(
    "memorySearch",
    "Read-only persistent memory search",
    parseMemorySearchInput,
  ),
  definition(
    "conformance",
    "Read-only engineering conformance report",
    parseConformanceInput,
  ),
  definition(
    "securityAudit",
    "Read-only security finding inspection",
    parseSecurityAuditInput,
  ),
];
