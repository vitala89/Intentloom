import {
  PROTOCOL_VERSION,
  NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NEUTRON_MUTATION_REVIEW_LIST_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
} from "./neutron-mutation-review-view.js";

export {
  NEUTRON_MUTATION_REVIEW_CURRENTNESS,
  NEUTRON_MUTATION_REVIEW_FILE_OPERATIONS,
  NEUTRON_MUTATION_REVIEW_FILE_STATUSES,
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_OUTCOMES,
  NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
} from "./neutron-mutation-review-view.js";
export type {
  NeutronMutationReviewCurrentness,
  NeutronMutationReviewFileOperation,
  NeutronMutationReviewFileStatus,
  NeutronMutationReviewFileView,
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
  NeutronMutationReviewOutcome,
  NeutronMutationReviewSummary,
  NeutronMutationReviewView,
} from "./neutron-mutation-review-view.js";
export {
  parseNeutronMutationReviewGetResponse,
  parseNeutronMutationReviewListResponse,
} from "./neutron-mutation-review-parse.js";

export const NEUTRON_MUTATION_REVIEW_FORBIDDEN_PARAM_KEYS = [
  "approvalToken",
  "approvalDigest",
  "approvalId",
  "grantedApprovals",
  "approved",
  "mutationAllowed",
  "files",
  "content",
  "paths",
  "changedPaths",
  "proposedContent",
  "currentContent",
  "previousContent",
] as const;

export interface NeutronMutationReviewListParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
}

export interface NeutronMutationReviewGetParams extends NeutronMutationReviewListParams {
  readonly proposalId: string;
}

export type NeutronMutationReviewListRequest = JsonRpcRequest<
  typeof NEUTRON_MUTATION_REVIEW_LIST_METHOD,
  NeutronMutationReviewListParams
>;
export type NeutronMutationReviewGetRequest = JsonRpcRequest<
  typeof NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NeutronMutationReviewGetParams
>;

export type NeutronMutationReviewDaemonRequest =
  NeutronMutationReviewListRequest | NeutronMutationReviewGetRequest;

export type NeutronMutationReviewListResponse =
  JsonRpcSuccess<NeutronMutationReviewListResult>;
export type NeutronMutationReviewGetResponse =
  JsonRpcSuccess<NeutronMutationReviewGetResult>;

type NeutronMutationReviewMethod =
  | typeof NEUTRON_MUTATION_REVIEW_LIST_METHOD
  | typeof NEUTRON_MUTATION_REVIEW_GET_METHOD;

export function isNeutronMutationReviewDaemonMethod(
  method: string,
): method is NeutronMutationReviewMethod {
  return (
    method === NEUTRON_MUTATION_REVIEW_LIST_METHOD ||
    method === NEUTRON_MUTATION_REVIEW_GET_METHOD
  );
}

export function createNeutronMutationReviewListRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  graphId?: string,
): NeutronMutationReviewListRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_MUTATION_REVIEW_LIST_METHOD,
    params: boundReviewParams(root, sessionId, projectId, graphId),
  };
}

export function createNeutronMutationReviewGetRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  proposalId: string,
  graphId?: string,
): NeutronMutationReviewGetRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_MUTATION_REVIEW_GET_METHOD,
    params: {
      ...boundReviewParams(root, sessionId, projectId, graphId),
      proposalId,
    },
  };
}

export function createNeutronMutationReviewListResponse(
  id: RequestId,
  result: NeutronMutationReviewListResult,
): NeutronMutationReviewListResponse {
  return { jsonrpc: "2.0", id, result };
}

export function createNeutronMutationReviewGetResponse(
  id: RequestId,
  result: NeutronMutationReviewGetResult,
): NeutronMutationReviewGetResponse {
  return { jsonrpc: "2.0", id, result };
}

export function parseNeutronMutationReviewDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronMutationReviewDaemonRequest | null {
  if (!isNeutronMutationReviewDaemonMethod(method)) return null;
  rejectUnknownReviewParams(params, method);
  const bound = parseBoundReviewParams(params);
  if (method === NEUTRON_MUTATION_REVIEW_LIST_METHOD) {
    return createNeutronMutationReviewListRequest(
      id,
      bound.root,
      bound.sessionId,
      bound.projectId,
      bound.graphId,
    );
  }
  return createNeutronMutationReviewGetRequest(
    id,
    bound.root,
    bound.sessionId,
    bound.projectId,
    requiredReviewParam(params.proposalId, "proposalId"),
    bound.graphId,
  );
}

function boundReviewParams(
  root: string,
  sessionId: string,
  projectId: string,
  graphId?: string,
): NeutronMutationReviewListParams {
  return {
    protocolVersion: PROTOCOL_VERSION,
    root,
    sessionId,
    projectId,
    ...(graphId === undefined ? {} : { graphId }),
  };
}

function parseBoundReviewParams(
  params: Record<string, unknown>,
): NeutronMutationReviewListParams {
  const graphId =
    params.graphId === undefined
      ? undefined
      : requiredReviewParam(params.graphId, "graphId");
  return boundReviewParams(
    requiredReviewParam(params.root, "root"),
    requiredReviewParam(params.sessionId, "sessionId"),
    requiredReviewParam(params.projectId, "projectId"),
    graphId,
  );
}

function requiredReviewParam(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  return value;
}

function rejectUnknownReviewParams(
  params: Record<string, unknown>,
  method: NeutronMutationReviewMethod,
): void {
  const allowed = new Set<string>([
    "protocolVersion",
    "root",
    "sessionId",
    "projectId",
    "graphId",
    ...(method === NEUTRON_MUTATION_REVIEW_GET_METHOD ? ["proposalId"] : []),
  ]);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `params must not include ${key}`,
      );
    }
    if (
      (
        NEUTRON_MUTATION_REVIEW_FORBIDDEN_PARAM_KEYS as readonly string[]
      ).includes(key)
    ) {
      throw new ProtocolValidationError(
        -32602,
        `params must not include ${key}`,
      );
    }
  }
}
