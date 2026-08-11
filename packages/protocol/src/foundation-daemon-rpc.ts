import {
  PROTOCOL_VERSION,
  FOUNDATION_WORKSHOP_CREATE_METHOD,
  FOUNDATION_WORKSHOP_GET_METHOD,
  FOUNDATION_QUESTIONS_LIST_METHOD,
  FOUNDATION_ANSWER_RECORD_METHOD,
  FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
  FOUNDATION_CONFLICTS_IDENTIFY_METHOD,
  FOUNDATION_READINESS_EVALUATE_METHOD,
  FOUNDATION_WORKSHOP_EXPORT_METHOD,
  FOUNDATION_WORKSHOP_DELETE_METHOD,
  FOUNDATION_DISCOVERY_QUESTIONS_METHOD,
  FOUNDATION_DISCOVERY_TURN_METHOD,
  FOUNDATION_BLUEPRINT_PROPOSE_METHOD,
  FOUNDATION_BLUEPRINT_COMPARE_METHOD,
  FOUNDATION_BLUEPRINT_APPROVE_METHOD,
  FOUNDATION_BLUEPRINT_REVOKE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import type { FoundationAnswer } from "./foundation-workshop.js";
import type { FoundationDiscoveryEffort } from "./foundation-discovery.js";
import type { FoundationBlueprintTier } from "./foundation-blueprint.js";

export type FoundationViewmodelPayload = Readonly<Record<string, unknown>>;

interface FoundationResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: FoundationViewmodelPayload;
}

type FoundationMethod =
  | typeof FOUNDATION_WORKSHOP_CREATE_METHOD
  | typeof FOUNDATION_WORKSHOP_GET_METHOD
  | typeof FOUNDATION_QUESTIONS_LIST_METHOD
  | typeof FOUNDATION_ANSWER_RECORD_METHOD
  | typeof FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD
  | typeof FOUNDATION_CONFLICTS_IDENTIFY_METHOD
  | typeof FOUNDATION_READINESS_EVALUATE_METHOD
  | typeof FOUNDATION_WORKSHOP_EXPORT_METHOD
  | typeof FOUNDATION_WORKSHOP_DELETE_METHOD
  | typeof FOUNDATION_DISCOVERY_QUESTIONS_METHOD
  | typeof FOUNDATION_DISCOVERY_TURN_METHOD
  | typeof FOUNDATION_BLUEPRINT_PROPOSE_METHOD
  | typeof FOUNDATION_BLUEPRINT_COMPARE_METHOD
  | typeof FOUNDATION_BLUEPRINT_APPROVE_METHOD
  | typeof FOUNDATION_BLUEPRINT_REVOKE_METHOD;

export interface FoundationWorkshopCreateParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly idea: string;
  readonly inceptionSessionId?: string;
}

export interface FoundationWorkshopIdParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
}

export interface FoundationAnswerRecordParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly answer: FoundationAnswer;
}

type FoundationRequest<
  Method extends FoundationMethod,
  Params extends object,
> = JsonRpcRequest<Method, Params>;

type FoundationResponse = JsonRpcSuccess<FoundationResultPayload>;

export type FoundationWorkshopCreateRequest = FoundationRequest<
  typeof FOUNDATION_WORKSHOP_CREATE_METHOD,
  FoundationWorkshopCreateParams
>;
export type FoundationWorkshopGetRequest = FoundationRequest<
  typeof FOUNDATION_WORKSHOP_GET_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationQuestionsListRequest = FoundationRequest<
  typeof FOUNDATION_QUESTIONS_LIST_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationAnswerRecordRequest = FoundationRequest<
  typeof FOUNDATION_ANSWER_RECORD_METHOD,
  FoundationAnswerRecordParams
>;
export type FoundationUnderstandingSummarizeRequest = FoundationRequest<
  typeof FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationConflictsIdentifyRequest = FoundationRequest<
  typeof FOUNDATION_CONFLICTS_IDENTIFY_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationReadinessEvaluateRequest = FoundationRequest<
  typeof FOUNDATION_READINESS_EVALUATE_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationWorkshopExportRequest = FoundationRequest<
  typeof FOUNDATION_WORKSHOP_EXPORT_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationWorkshopDeleteRequest = FoundationRequest<
  typeof FOUNDATION_WORKSHOP_DELETE_METHOD,
  FoundationWorkshopIdParams
>;

export interface FoundationDiscoveryParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly effort?: FoundationDiscoveryEffort;
  readonly turnIndex?: number;
  readonly modelProfile?: string;
}

export type FoundationDiscoveryQuestionsRequest = FoundationRequest<
  typeof FOUNDATION_DISCOVERY_QUESTIONS_METHOD,
  FoundationDiscoveryParams
>;
export type FoundationDiscoveryTurnRequest = FoundationRequest<
  typeof FOUNDATION_DISCOVERY_TURN_METHOD,
  FoundationDiscoveryParams
>;

export type FoundationDiscoveryQuestionsResultPayload = FoundationResultPayload;
export type FoundationDiscoveryTurnResultPayload = FoundationResultPayload;

export interface FoundationBlueprintCompareParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly leftTier: FoundationBlueprintTier;
  readonly rightTier: FoundationBlueprintTier;
}

export interface FoundationBlueprintApproveParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly tier: FoundationBlueprintTier;
  readonly approver?: string;
}

export type FoundationBlueprintProposeRequest = FoundationRequest<
  typeof FOUNDATION_BLUEPRINT_PROPOSE_METHOD,
  FoundationWorkshopIdParams
>;
export type FoundationBlueprintCompareRequest = FoundationRequest<
  typeof FOUNDATION_BLUEPRINT_COMPARE_METHOD,
  FoundationBlueprintCompareParams
>;
export type FoundationBlueprintApproveRequest = FoundationRequest<
  typeof FOUNDATION_BLUEPRINT_APPROVE_METHOD,
  FoundationBlueprintApproveParams
>;
export type FoundationBlueprintRevokeRequest = FoundationRequest<
  typeof FOUNDATION_BLUEPRINT_REVOKE_METHOD,
  FoundationWorkshopIdParams
>;

export type FoundationBlueprintProposeResultPayload = FoundationResultPayload;
export type FoundationBlueprintCompareResultPayload = FoundationResultPayload;
export type FoundationBlueprintApproveResultPayload = FoundationResultPayload;
export type FoundationBlueprintRevokeResultPayload = FoundationResultPayload;

export type FoundationDaemonRequest =
  | FoundationWorkshopCreateRequest
  | FoundationWorkshopGetRequest
  | FoundationQuestionsListRequest
  | FoundationAnswerRecordRequest
  | FoundationUnderstandingSummarizeRequest
  | FoundationConflictsIdentifyRequest
  | FoundationReadinessEvaluateRequest
  | FoundationWorkshopExportRequest
  | FoundationWorkshopDeleteRequest
  | FoundationDiscoveryQuestionsRequest
  | FoundationDiscoveryTurnRequest
  | FoundationBlueprintProposeRequest
  | FoundationBlueprintCompareRequest
  | FoundationBlueprintApproveRequest
  | FoundationBlueprintRevokeRequest;

export type FoundationWorkshopCreateResultPayload = FoundationResultPayload;
export type FoundationWorkshopGetResultPayload = FoundationResultPayload;
export type FoundationQuestionsListResultPayload = FoundationResultPayload;
export type FoundationAnswerRecordResultPayload = FoundationResultPayload;
export type FoundationUnderstandingSummarizeResultPayload =
  FoundationResultPayload;
export type FoundationConflictsIdentifyResultPayload = FoundationResultPayload;
export type FoundationReadinessEvaluateResultPayload = FoundationResultPayload;
export type FoundationWorkshopExportResultPayload = FoundationResultPayload;
export type FoundationWorkshopDeleteResultPayload = FoundationResultPayload;

function createFoundationRequest<
  Method extends FoundationMethod,
  Params extends object,
>(
  id: RequestId,
  method: Method,
  params: Params,
): FoundationRequest<Method, Params> {
  return { jsonrpc: "2.0", id, method, params };
}

function createFoundationResponse(
  id: RequestId,
  result: Omit<FoundationResultPayload, "protocolVersion">,
): FoundationResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, ...result },
  };
}

export function createFoundationWorkshopCreateRequest(
  id: RequestId,
  root: string,
  idea: string,
  inceptionSessionId?: string,
): FoundationWorkshopCreateRequest {
  return createFoundationRequest(id, FOUNDATION_WORKSHOP_CREATE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    root,
    idea,
    ...(inceptionSessionId !== undefined ? { inceptionSessionId } : {}),
  });
}

export function createFoundationWorkshopGetRequest(
  id: RequestId,
  workshopId: string,
): FoundationWorkshopGetRequest {
  return createFoundationRequest(id, FOUNDATION_WORKSHOP_GET_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationQuestionsListRequest(
  id: RequestId,
  workshopId: string,
): FoundationQuestionsListRequest {
  return createFoundationRequest(id, FOUNDATION_QUESTIONS_LIST_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationAnswerRecordRequest(
  id: RequestId,
  workshopId: string,
  answer: FoundationAnswer,
): FoundationAnswerRecordRequest {
  return createFoundationRequest(id, FOUNDATION_ANSWER_RECORD_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    answer,
  });
}

export function createFoundationUnderstandingSummarizeRequest(
  id: RequestId,
  workshopId: string,
): FoundationUnderstandingSummarizeRequest {
  return createFoundationRequest(
    id,
    FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
    { protocolVersion: PROTOCOL_VERSION, workshopId },
  );
}

export function createFoundationConflictsIdentifyRequest(
  id: RequestId,
  workshopId: string,
): FoundationConflictsIdentifyRequest {
  return createFoundationRequest(id, FOUNDATION_CONFLICTS_IDENTIFY_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationReadinessEvaluateRequest(
  id: RequestId,
  workshopId: string,
): FoundationReadinessEvaluateRequest {
  return createFoundationRequest(id, FOUNDATION_READINESS_EVALUATE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationWorkshopExportRequest(
  id: RequestId,
  workshopId: string,
): FoundationWorkshopExportRequest {
  return createFoundationRequest(id, FOUNDATION_WORKSHOP_EXPORT_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationWorkshopDeleteRequest(
  id: RequestId,
  workshopId: string,
): FoundationWorkshopDeleteRequest {
  return createFoundationRequest(id, FOUNDATION_WORKSHOP_DELETE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationDiscoveryQuestionsRequest(
  id: RequestId,
  workshopId: string,
  effort?: FoundationDiscoveryEffort,
): FoundationDiscoveryQuestionsRequest {
  return createFoundationRequest(id, FOUNDATION_DISCOVERY_QUESTIONS_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    ...(effort !== undefined ? { effort } : {}),
  });
}

export function createFoundationDiscoveryTurnRequest(
  id: RequestId,
  workshopId: string,
  options?: {
    readonly effort?: FoundationDiscoveryEffort;
    readonly turnIndex?: number;
    readonly modelProfile?: string;
  },
): FoundationDiscoveryTurnRequest {
  return createFoundationRequest(id, FOUNDATION_DISCOVERY_TURN_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    ...(options?.effort !== undefined ? { effort: options.effort } : {}),
    ...(options?.turnIndex !== undefined
      ? { turnIndex: options.turnIndex }
      : {}),
    ...(options?.modelProfile !== undefined
      ? { modelProfile: options.modelProfile }
      : {}),
  });
}

export function createFoundationBlueprintProposeRequest(
  id: RequestId,
  workshopId: string,
): FoundationBlueprintProposeRequest {
  return createFoundationRequest(id, FOUNDATION_BLUEPRINT_PROPOSE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationBlueprintCompareRequest(
  id: RequestId,
  workshopId: string,
  leftTier: FoundationBlueprintTier,
  rightTier: FoundationBlueprintTier,
): FoundationBlueprintCompareRequest {
  return createFoundationRequest(id, FOUNDATION_BLUEPRINT_COMPARE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    leftTier,
    rightTier,
  });
}

export function createFoundationBlueprintApproveRequest(
  id: RequestId,
  workshopId: string,
  tier: FoundationBlueprintTier,
  approver?: string,
): FoundationBlueprintApproveRequest {
  return createFoundationRequest(id, FOUNDATION_BLUEPRINT_APPROVE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    tier,
    ...(approver !== undefined ? { approver } : {}),
  });
}

export function createFoundationBlueprintRevokeRequest(
  id: RequestId,
  workshopId: string,
): FoundationBlueprintRevokeRequest {
  return createFoundationRequest(id, FOUNDATION_BLUEPRINT_REVOKE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
  });
}

export function createFoundationWorkshopCreateResponse(
  id: RequestId,
  result: Omit<FoundationWorkshopCreateResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationWorkshopCreateResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationWorkshopGetResponse(
  id: RequestId,
  result: Omit<FoundationWorkshopGetResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationWorkshopGetResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationQuestionsListResponse(
  id: RequestId,
  result: Omit<FoundationQuestionsListResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationQuestionsListResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationAnswerRecordResponse(
  id: RequestId,
  result: Omit<FoundationAnswerRecordResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationAnswerRecordResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationUnderstandingSummarizeResponse(
  id: RequestId,
  result: Omit<
    FoundationUnderstandingSummarizeResultPayload,
    "protocolVersion"
  >,
): JsonRpcSuccess<FoundationUnderstandingSummarizeResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationConflictsIdentifyResponse(
  id: RequestId,
  result: Omit<FoundationConflictsIdentifyResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationConflictsIdentifyResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationReadinessEvaluateResponse(
  id: RequestId,
  result: Omit<FoundationReadinessEvaluateResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationReadinessEvaluateResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationWorkshopExportResponse(
  id: RequestId,
  result: Omit<FoundationWorkshopExportResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationWorkshopExportResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationWorkshopDeleteResponse(
  id: RequestId,
  result: Omit<FoundationWorkshopDeleteResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationWorkshopDeleteResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationDiscoveryQuestionsResponse(
  id: RequestId,
  result: Omit<FoundationDiscoveryQuestionsResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationDiscoveryQuestionsResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationDiscoveryTurnResponse(
  id: RequestId,
  result: Omit<FoundationDiscoveryTurnResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationDiscoveryTurnResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationBlueprintProposeResponse(
  id: RequestId,
  result: Omit<FoundationBlueprintProposeResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationBlueprintProposeResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationBlueprintCompareResponse(
  id: RequestId,
  result: Omit<FoundationBlueprintCompareResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationBlueprintCompareResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationBlueprintApproveResponse(
  id: RequestId,
  result: Omit<FoundationBlueprintApproveResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationBlueprintApproveResultPayload> {
  return createFoundationResponse(id, result);
}

export function createFoundationBlueprintRevokeResponse(
  id: RequestId,
  result: Omit<FoundationBlueprintRevokeResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationBlueprintRevokeResultPayload> {
  return createFoundationResponse(id, result);
}

const FOUNDATION_METHODS: readonly FoundationMethod[] = [
  FOUNDATION_WORKSHOP_CREATE_METHOD,
  FOUNDATION_WORKSHOP_GET_METHOD,
  FOUNDATION_QUESTIONS_LIST_METHOD,
  FOUNDATION_ANSWER_RECORD_METHOD,
  FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
  FOUNDATION_CONFLICTS_IDENTIFY_METHOD,
  FOUNDATION_READINESS_EVALUATE_METHOD,
  FOUNDATION_WORKSHOP_EXPORT_METHOD,
  FOUNDATION_WORKSHOP_DELETE_METHOD,
  FOUNDATION_DISCOVERY_QUESTIONS_METHOD,
  FOUNDATION_DISCOVERY_TURN_METHOD,
  FOUNDATION_BLUEPRINT_PROPOSE_METHOD,
  FOUNDATION_BLUEPRINT_COMPARE_METHOD,
  FOUNDATION_BLUEPRINT_APPROVE_METHOD,
  FOUNDATION_BLUEPRINT_REVOKE_METHOD,
];

export function isFoundationDaemonMethod(
  method: string,
): method is FoundationMethod {
  return FOUNDATION_METHODS.includes(method as FoundationMethod);
}
