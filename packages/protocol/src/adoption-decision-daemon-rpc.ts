import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import { stringValue } from "./workspace-daemon-request-helpers.js";
import { parseSelectedAdoptionDecisions } from "./adoption-decision-parse.js";
import {
  type ExistingProjectAdoptionDecisionViewModel,
  type SelectedAdoptionDecision,
} from "./adoption-decision.js";
import { ADOPTION_PREVIEW_IDENTITY_PATTERN } from "./adoption-plan.js";

export type {
  AdoptionDecisionEvaluation,
  AdoptionDecisionInvalidReason,
  AdoptionDecisionKind,
  ExistingProjectAdoptionDecisionViewModel,
  SelectedAdoptionDecision,
} from "./adoption-decision.js";

export interface ExistingProjectAdoptionDecisionsParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly previewIdentity: string;
  readonly projectId?: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
}

export type ExistingProjectAdoptionDecisionsRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
  ExistingProjectAdoptionDecisionsParams
>;

interface ExistingProjectAdoptionDecisionsResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionDecisionViewModel;
}

export type ExistingProjectAdoptionDecisionsResponse =
  JsonRpcSuccess<ExistingProjectAdoptionDecisionsResult>;

export function createExistingProjectAdoptionDecisionsRequest(
  id: RequestId,
  root: string,
  previewIdentity: string,
  decisions: readonly SelectedAdoptionDecision[],
  projectId?: string,
): ExistingProjectAdoptionDecisionsRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      previewIdentity,
      decisions,
      ...(projectId !== undefined ? { projectId } : {}),
    },
  };
}

export function createExistingProjectAdoptionDecisionsResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionDecisionViewModel,
): ExistingProjectAdoptionDecisionsResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function isExistingProjectAdoptionDecisionsMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD;
}

export function parseExistingProjectAdoptionDecisionsRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionDecisionsRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  const previewIdentity = stringValue(
    params.previewIdentity,
    "previewIdentity",
  );
  if (!ADOPTION_PREVIEW_IDENTITY_PATTERN.test(previewIdentity)) {
    throw new ProtocolValidationError(
      -32602,
      "previewIdentity must be a sha256 hex digest",
    );
  }
  const decisions = parseSelectedAdoptionDecisions(params.decisions);
  if (params.projectId === undefined) {
    return createExistingProjectAdoptionDecisionsRequest(
      id,
      params.root,
      previewIdentity,
      decisions,
    );
  }
  if (typeof params.projectId !== "string" || params.projectId.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "projectId must be a non-empty string when provided",
    );
  }
  return createExistingProjectAdoptionDecisionsRequest(
    id,
    params.root,
    previewIdentity,
    decisions,
    params.projectId,
  );
}
