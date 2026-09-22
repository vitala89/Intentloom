import {
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_OUTCOMES,
  type NeutronMutationReviewGetResult,
  type NeutronMutationReviewListResult,
} from "../../protocol/src/neutron-mutation-review-view.js";
import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import { oneOf } from "./neutron-runtime-helpers.js";
import {
  asReviewObject,
  rejectReviewAuthorityKeys,
  rejectUnknownReviewKeys,
} from "./neutron-mutation-review-rpc-helpers.js";
import {
  validateReviewSummary,
  validateReviewView,
} from "./neutron-mutation-review-rpc-view.js";

export function validateNeutronMutationReviewListResult(
  value: unknown,
): NeutronMutationReviewListResult {
  const record = asReviewObject(value, "mutation review list");
  rejectReviewAuthorityKeys(record, "mutation review list");
  rejectUnknownReviewKeys(
    record,
    ["protocolVersion", "schemaVersion", "outcome", "reviews"],
    "mutation review list",
  );
  if (record.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error("mutation review list protocolVersion is invalid");
  }
  if (record.schemaVersion !== NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation review list schema");
  }
  const outcome = oneOf(
    record.outcome,
    NEUTRON_MUTATION_REVIEW_OUTCOMES,
    "mutation review list.outcome",
  );
  if (!Array.isArray(record.reviews)) {
    throw new Error("mutation review list.reviews must be an array");
  }
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
    outcome,
    reviews: record.reviews.map((item, index) =>
      validateReviewSummary(item, `mutation review list.reviews[${index}]`),
    ),
  };
}

export function validateNeutronMutationReviewGetResult(
  value: unknown,
): NeutronMutationReviewGetResult {
  const record = asReviewObject(value, "mutation review get");
  rejectReviewAuthorityKeys(record, "mutation review get");
  rejectUnknownReviewKeys(
    record,
    ["protocolVersion", "schemaVersion", "outcome", "review"],
    "mutation review get",
  );
  if (record.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error("mutation review get protocolVersion is invalid");
  }
  if (record.schemaVersion !== NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation review get schema");
  }
  const outcome = oneOf(
    record.outcome,
    NEUTRON_MUTATION_REVIEW_OUTCOMES,
    "mutation review get.outcome",
  );
  if (outcome !== "ok") {
    if (record.review !== undefined) {
      throw new Error("failed mutation review get must not include review");
    }
    return {
      protocolVersion: PROTOCOL_VERSION,
      schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
      outcome,
    };
  }
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
    outcome,
    review: validateReviewView(record.review, "mutation review get.review"),
  };
}
