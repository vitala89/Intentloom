import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_FIELDS,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
  type NeutronMutationApprovalIntent,
} from "../../protocol/src/neutron-mutation-approval-intent.js";
import { isObject, nonEmpty, oneOf } from "./neutron-runtime-helpers.js";

const ALLOWED_FIELDS = new Set<string>(NEUTRON_MUTATION_APPROVAL_INTENT_FIELDS);

export function validateNeutronMutationApprovalIntent(
  value: unknown,
): NeutronMutationApprovalIntent {
  if (!isObject(value)) {
    throw new Error("mutation approval intent must be an object");
  }
  rejectUnexpectedIntentFields(value);
  if (value.schemaVersion !== NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation approval intent schema");
  }
  if (value.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error("mutation approval intent protocolVersion is invalid");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    action: oneOf(
      value.action,
      [NEUTRON_MUTATION_APPROVAL_INTENT_ACTION] as const,
      "action",
    ),
    root: nonEmpty(value.root, "root"),
    sessionId: nonEmpty(value.sessionId, "sessionId"),
    projectId: nonEmpty(value.projectId, "projectId"),
    graphId: nonEmpty(value.graphId, "graphId"),
    proposalId: nonEmpty(value.proposalId, "proposalId"),
  };
}

function rejectUnexpectedIntentFields(value: Record<string, unknown>): void {
  for (const key of Object.keys(value)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`mutation approval intent must not include ${key}`);
    }
  }
}
