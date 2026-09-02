import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronToolInvocation } from "../../protocol/src/neutron-runtime.js";
import {
  definition,
  optionalBoundedInt,
  parseArgumentObject,
  rejectMutationFlags,
  trustedRoot,
  type NeutronToolDefinition,
  NEUTRON_TOOL_MAX_DIFF_CHANGES,
  NEUTRON_TOOL_MAX_FINDINGS,
  NEUTRON_TOOL_MAX_TIMELINE_EVENTS,
} from "./neutron-tool-input.js";

function parseRootOnly(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
  toolName: NeutronToolDefinition["toolName"],
): Record<string, unknown> {
  const args = parseArgumentObject(invocation, toolName);
  rejectMutationFlags(invocation, toolName, args);
  return { root: trustedRoot(invocation, toolName, args, session.root) };
}

function parseTimelineInput(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): Record<string, unknown> {
  const args = parseArgumentObject(invocation, "timeline");
  rejectMutationFlags(invocation, "timeline", args);
  const root = trustedRoot(invocation, "timeline", args, session.root);
  const caseId =
    typeof args.caseId === "string" && args.caseId.length > 0
      ? args.caseId
      : "current";
  const limit = optionalBoundedInt(
    invocation,
    "timeline",
    args,
    "limit",
    NEUTRON_TOOL_MAX_TIMELINE_EVENTS,
  );
  return {
    root,
    caseId,
    ...(limit !== undefined ? { limit } : {}),
  };
}

export const PROJECT_TOOL_DEFINITIONS: readonly NeutronToolDefinition[] = [
  definition("inspect", "Read-only project inspection", (invocation, session) =>
    parseRootOnly(invocation, session, "inspect"),
  ),
  definition(
    "doctor",
    "Read-only project doctor diagnosis",
    (invocation, session) => parseRootOnly(invocation, session, "doctor"),
  ),
  definition(
    "timeline",
    "Read-only bounded project timeline",
    parseTimelineInput,
  ),
  definition(
    "projectDiff",
    "Read-only structured project diff plan",
    (invocation, session) => parseRootOnly(invocation, session, "projectDiff"),
  ),
];

export {
  NEUTRON_TOOL_MAX_DIFF_CHANGES,
  NEUTRON_TOOL_MAX_FINDINGS,
  NEUTRON_TOOL_MAX_TIMELINE_EVENTS,
};
