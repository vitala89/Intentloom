import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_SESSION_STATES,
  type NeutronReadOnlyTool,
  type NeutronRuntimeSession,
  type NeutronSessionState,
  type NeutronToolInvocation,
} from "../../protocol/src/neutron-runtime.js";
import { NEUTRON_N2_MAX_BODY_BYTES } from "../../validator/src/neutron-runtime-n2.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
} from "../../validator/src/neutron-runtime-helpers.js";
import { NeutronToolRouterError, auditFields } from "./neutron-tool-errors.js";
import type { NeutronToolDefinition } from "./neutron-tool-registry.js";

const ACTIVE_SESSION_STATES: readonly NeutronSessionState[] = [
  "created",
  "discussing",
  "inspecting",
  "planning",
];

export interface NeutronToolAuthorizationContext {
  readonly session: NeutronRuntimeSession;
  readonly capabilities: AgentRoleCapabilities;
  readonly nowMs: number;
  readonly deadlineMs?: number;
  readonly signal?: AbortSignal;
}

export function validateNeutronToolInvocationRecord(
  value: unknown,
): NeutronToolInvocation {
  if (!isObject(value)) {
    throw new Error("tool invocation must be an object");
  }
  return {
    invocationId: nonEmpty(value.invocationId, "invocation.invocationId"),
    toolName: oneOf(
      value.toolName,
      NEUTRON_READ_ONLY_TOOLS,
      "invocation.toolName",
    ) as NeutronReadOnlyTool,
    root: nonEmpty(value.root, "invocation.root"),
    sessionId: nonEmpty(value.sessionId, "invocation.sessionId"),
    argumentsJson: nonEmpty(value.argumentsJson, "invocation.argumentsJson"),
    timeoutMs: finiteInt(value.timeoutMs, "invocation.timeoutMs"),
  };
}

export function authorizeNeutronToolInvocation(
  invocation: NeutronToolInvocation,
  context: NeutronToolAuthorizationContext,
  definition: NeutronToolDefinition,
): void {
  assertNotCancelled(invocation, context.signal);
  const session = validateNeutronRuntimeSession(context.session);
  assertSessionBinding(invocation, session);
  assertSessionLifecycle(invocation, session);
  assertDeadline(invocation, context);
  assertInvocationLimits(invocation);
  assertReadOnlyTool(definition, invocation);
  assertCapabilities(definition, context.capabilities, invocation);
}

function assertNotCancelled(
  invocation: NeutronToolInvocation,
  signal: AbortSignal | undefined,
): void {
  if (signal?.aborted === true) {
    throw new NeutronToolRouterError(
      "cancelled",
      auditFields(
        invocation,
        invocation.toolName,
        "cancelled",
        "Tool invocation was cancelled",
      ),
    );
  }
}

function assertSessionBinding(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): void {
  if (invocation.sessionId !== session.sessionId) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        invocation.toolName,
        "session-invalid",
        "Invocation sessionId must match the active session",
      ),
    );
  }
  if (invocation.root !== session.root) {
    throw new NeutronToolRouterError(
      "root-mismatch",
      auditFields(
        invocation,
        invocation.toolName,
        "out-of-root",
        "Invocation root must match the session root",
      ),
    );
  }
}

function assertSessionLifecycle(
  invocation: NeutronToolInvocation,
  session: NeutronRuntimeSession,
): void {
  if (session.state === "cancelled") {
    throw new NeutronToolRouterError(
      "cancelled",
      auditFields(
        invocation,
        invocation.toolName,
        "session-cancelled",
        "Session is cancelled",
      ),
    );
  }
  if (session.state === "timed-out") {
    throw new NeutronToolRouterError(
      "timeout",
      auditFields(
        invocation,
        invocation.toolName,
        "session-expired",
        "Session timed out",
      ),
    );
  }
  if (!ACTIVE_SESSION_STATES.includes(session.state)) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        invocation.toolName,
        "session-terminal",
        `Session state ${session.state} cannot invoke tools`,
      ),
    );
  }
  if (!NEUTRON_SESSION_STATES.includes(session.state)) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        invocation.toolName,
        "session-invalid",
        "Session state is invalid",
      ),
    );
  }
}

function assertDeadline(
  invocation: NeutronToolInvocation,
  context: NeutronToolAuthorizationContext,
): void {
  if (context.deadlineMs !== undefined && context.nowMs >= context.deadlineMs) {
    throw new NeutronToolRouterError(
      "timeout",
      auditFields(
        invocation,
        invocation.toolName,
        "invocation-expired",
        "Tool invocation deadline expired",
      ),
    );
  }
  if (invocation.timeoutMs <= 0) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        invocation.toolName,
        "invalid-timeout",
        "timeoutMs must be positive",
      ),
    );
  }
}

function assertInvocationLimits(invocation: NeutronToolInvocation): void {
  if (invocation.argumentsJson.length > NEUTRON_N2_MAX_BODY_BYTES) {
    throw new NeutronToolRouterError(
      "budget-exceeded",
      auditFields(
        invocation,
        invocation.toolName,
        "arguments-limit",
        "Tool arguments exceed limit",
      ),
    );
  }
}

function assertReadOnlyTool(
  definition: NeutronToolDefinition,
  invocation: NeutronToolInvocation,
): void {
  if (definition.readOnly !== true) {
    throw new NeutronToolRouterError(
      "permission-denied",
      auditFields(
        invocation,
        invocation.toolName,
        "mutation-forbidden",
        "Mutation tools are not authorized in N4 Slice 1",
      ),
    );
  }
}

function assertCapabilities(
  definition: NeutronToolDefinition,
  capabilities: AgentRoleCapabilities,
  invocation: NeutronToolInvocation,
): void {
  if (!capabilities.readOnly) {
    throw new NeutronToolRouterError(
      "capability-denied",
      auditFields(
        invocation,
        invocation.toolName,
        "read-only-required",
        "Neutron read-only tools require readOnly capability",
      ),
    );
  }
  if (capabilities.allowNetwork) {
    throw new NeutronToolRouterError(
      "capability-denied",
      auditFields(
        invocation,
        invocation.toolName,
        "network-forbidden",
        "Neutron read-only tools forbid network capability",
      ),
    );
  }
  const allowedTools = capabilities.allowedTools;
  if (
    allowedTools.length > 0 &&
    !allowedTools.includes(definition.toolName) &&
    !allowedTools.includes(definition.requiredCapability)
  ) {
    throw new NeutronToolRouterError(
      "capability-denied",
      auditFields(
        invocation,
        invocation.toolName,
        "tool-not-granted",
        `Tool ${definition.toolName} is not in effective allowedTools`,
      ),
    );
  }
}
