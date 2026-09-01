import {
  NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
  type NeutronReadOnlyTool,
  type NeutronRuntimeSession,
  type NeutronToolEnvelope,
  type NeutronToolInvocation,
} from "../../protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import { validateNeutronToolEnvelope } from "../../validator/src/neutron-runtime.js";
import {
  authorizeNeutronToolInvocation,
  validateNeutronToolInvocationRecord,
  type NeutronToolAuthorizationContext,
} from "./neutron-tool-authorization.js";
import {
  buildNeutronToolFailureEnvelope,
  buildNeutronToolSuccessEnvelope,
  NeutronToolRouterError,
  auditFields,
} from "./neutron-tool-errors.js";
import {
  NEUTRON_TOOL_MAX_RESULT_BYTES,
  requireNeutronToolDefinition,
} from "./neutron-tool-registry.js";

export type NeutronToolDispatch = (
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
) => Promise<unknown>;

export interface RouteNeutronToolInput {
  readonly invocation: unknown;
  readonly session: NeutronRuntimeSession;
  readonly capabilities: AgentRoleCapabilities;
  readonly dispatch: NeutronToolDispatch;
  readonly nowMs?: number;
  readonly deadlineMs?: number;
  readonly signal?: AbortSignal;
}

export interface RouteNeutronToolResult {
  readonly envelope: NeutronToolEnvelope;
  readonly operationExecuted: boolean;
}

export async function routeNeutronToolInvocation(
  input: RouteNeutronToolInput,
): Promise<RouteNeutronToolResult> {
  let invocation: NeutronToolInvocation;
  try {
    invocation = validateNeutronToolInvocationRecord(input.invocation);
  } catch (error) {
    return failMalformedInvocation(input, error);
  }

  const context: NeutronToolAuthorizationContext = {
    session: input.session,
    capabilities: input.capabilities,
    nowMs: input.nowMs ?? Date.now(),
    ...(input.deadlineMs !== undefined ? { deadlineMs: input.deadlineMs } : {}),
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
  };

  try {
    const definition = requireNeutronToolDefinition(invocation);
    authorizeNeutronToolInvocation(invocation, context, definition);
    const args = definition.parseInput(invocation, input.session.root);
    const payload = await input.dispatch(definition.toolName, args);
    const payloadJson = JSON.stringify(payload);
    if (payloadJson.length > definition.maxResultBytes) {
      throw new NeutronToolRouterError(
        "budget-exceeded",
        auditFields(
          invocation,
          definition.toolName,
          "result-limit",
          "Tool result exceeds limit",
        ),
      );
    }
    const envelope = validateNeutronToolEnvelope(
      buildNeutronToolSuccessEnvelope(invocation, payload),
    );
    return { envelope, operationExecuted: true };
  } catch (error) {
    if (error instanceof NeutronToolRouterError) {
      return {
        envelope: buildNeutronToolFailureEnvelope(invocation, error),
        operationExecuted: false,
      };
    }
    const routerError = new NeutronToolRouterError(
      "operation-failed",
      auditFields(
        invocation,
        invocation.toolName,
        "operation-failed",
        error instanceof Error ? error.message : "Tool operation failed",
      ),
    );
    return {
      envelope: buildNeutronToolFailureEnvelope(invocation, routerError),
      operationExecuted: true,
    };
  }
}

function failMalformedInvocation(
  input: RouteNeutronToolInput,
  error: unknown,
): RouteNeutronToolResult {
  const message =
    error instanceof Error ? error.message : "Tool invocation is invalid";
  const invocation: NeutronToolInvocation = {
    invocationId: "invalid",
    toolName: "inspect",
    root: input.session.root,
    sessionId: input.session.sessionId,
    argumentsJson: "{}",
    timeoutMs: 0,
  };
  const routerError = new NeutronToolRouterError(
    "validation-failed",
    auditFields(invocation, "unknown", "malformed-envelope", message),
  );
  return {
    envelope: {
      schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
      invocation,
      result: {
        invocationId: invocation.invocationId,
        ok: false,
        payloadJson: JSON.stringify(routerError.audit),
        errorCode: routerError.code,
      },
    },
    operationExecuted: false,
  };
}

export function createNeutronInspectDispatch(
  inspect: (root: string) => Promise<unknown>,
): NeutronToolDispatch {
  return async (toolName, args) => {
    if (toolName !== "inspect") {
      throw new Error(`Unexpected tool ${toolName}`);
    }
    const root = args.root;
    if (typeof root !== "string" || root.length === 0) {
      throw new Error("inspect dispatch requires root");
    }
    return inspect(root);
  };
}

export { NEUTRON_TOOL_MAX_RESULT_BYTES };
