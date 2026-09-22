import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import {
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
  type NeutronMutationReviewGetResult,
  type NeutronMutationReviewListResult,
  type NeutronMutationReviewOutcome,
} from "../../protocol/src/neutron-mutation-review-view.js";

export function emptyNeutronMutationReviewList(
  outcome: NeutronMutationReviewOutcome,
): NeutronMutationReviewListResult {
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
    outcome,
    reviews: [],
  };
}

export function failedNeutronMutationReviewGet(
  outcome: NeutronMutationReviewOutcome,
): NeutronMutationReviewGetResult {
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
    outcome,
  };
}
