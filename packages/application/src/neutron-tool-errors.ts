import {
  NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
  type NeutronErrorCode,
  type NeutronReadOnlyTool,
  type NeutronToolEnvelope,
  type NeutronToolInvocation,
} from "../../protocol/src/neutron-runtime.js";

export interface NeutronToolFailureAudit {
  readonly toolName: string;
  readonly invocationId: string;
  readonly sessionId: string;
  readonly root: string;
  readonly reason: string;
  readonly denialClass: string;
  readonly operationExecuted: false;
}

export class NeutronToolRouterError extends Error {
  readonly code: NeutronErrorCode;
  readonly audit: NeutronToolFailureAudit;

  constructor(
    code: NeutronErrorCode,
    audit: Omit<NeutronToolFailureAudit, "operationExecuted">,
  ) {
    super(audit.reason);
    this.name = "NeutronToolRouterError";
    this.code = code;
    this.audit = { ...audit, operationExecuted: false };
  }
}

export function buildNeutronToolFailureEnvelope(
  invocation: NeutronToolInvocation,
  error: NeutronToolRouterError,
): NeutronToolEnvelope {
  return {
    schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
    invocation,
    result: {
      invocationId: invocation.invocationId,
      ok: false,
      payloadJson: JSON.stringify(error.audit),
      errorCode: error.code,
    },
  };
}

export function buildNeutronToolSuccessEnvelope(
  invocation: NeutronToolInvocation,
  payload: unknown,
): NeutronToolEnvelope {
  return {
    schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
    invocation,
    result: {
      invocationId: invocation.invocationId,
      ok: true,
      payloadJson: JSON.stringify(payload),
      errorCode: null,
    },
  };
}

export function auditFields(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool | string,
  denialClass: string,
  reason: string,
): Omit<NeutronToolFailureAudit, "operationExecuted"> {
  return {
    toolName,
    invocationId: invocation.invocationId,
    sessionId: invocation.sessionId,
    root: invocation.root,
    denialClass,
    reason,
  };
}
