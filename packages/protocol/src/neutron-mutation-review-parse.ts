import { ProtocolValidationError } from "./protocol-validation-error.js";
import { PROTOCOL_VERSION } from "./jsonrpc.js";
import {
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_OUTCOMES,
  type NeutronMutationReviewGetResult,
  type NeutronMutationReviewListResult,
  type NeutronMutationReviewOutcome,
} from "./neutron-mutation-review-view.js";

export function parseNeutronMutationReviewListResponse(
  value: unknown,
): NeutronMutationReviewListResult {
  const result = jsonRpcResult(value);
  if (result.schemaVersion !== NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation review list schema",
    );
  }
  if (!Array.isArray(result.reviews)) {
    throw new ProtocolValidationError(
      -32602,
      "mutation review list.reviews must be an array",
    );
  }
  return result as unknown as NeutronMutationReviewListResult;
}

export function parseNeutronMutationReviewGetResponse(
  value: unknown,
): NeutronMutationReviewGetResult {
  const result = jsonRpcResult(value);
  const outcome = reviewOutcome(result.outcome);
  if (result.schemaVersion !== NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation review get schema",
    );
  }
  if (outcome !== "ok" && result.review !== undefined) {
    throw new ProtocolValidationError(
      -32602,
      "failed mutation review get must not include review",
    );
  }
  return result as unknown as NeutronMutationReviewGetResult;
}

function jsonRpcResult(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(
      -32600,
      "jsonrpc response must be an object",
    );
  }
  const record = value as Record<string, unknown>;
  if (record.jsonrpc !== "2.0") {
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  }
  if (
    typeof record.result !== "object" ||
    record.result === null ||
    Array.isArray(record.result)
  ) {
    throw new ProtocolValidationError(-32602, "result must be an object");
  }
  const result = record.result as Record<string, unknown>;
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
  reviewOutcome(result.outcome);
  return result;
}

function reviewOutcome(value: unknown): NeutronMutationReviewOutcome {
  if (
    typeof value !== "string" ||
    !(NEUTRON_MUTATION_REVIEW_OUTCOMES as readonly string[]).includes(value)
  ) {
    throw new ProtocolValidationError(
      -32602,
      "mutation review outcome is invalid",
    );
  }
  return value as NeutronMutationReviewOutcome;
}
