import {
  PROTOCOL_VERSION,
  INCEPTION_ANSWER_RECORD_METHOD,
  INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  INCEPTION_QUESTIONS_LIST_METHOD,
  INCEPTION_SESSION_CREATE_METHOD,
  INCEPTION_SESSION_DELETE_METHOD,
  INCEPTION_SESSION_EXPORT_METHOD,
  INCEPTION_SESSION_GET_METHOD,
  INCEPTION_STATE_SUMMARIZE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import type { InceptionAnswer } from "./inception.js";

export type InceptionViewmodelPayload = Readonly<Record<string, unknown>>;

interface InceptionResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: InceptionViewmodelPayload;
}

type InceptionMethod =
  | typeof INCEPTION_SESSION_CREATE_METHOD
  | typeof INCEPTION_SESSION_GET_METHOD
  | typeof INCEPTION_QUESTIONS_LIST_METHOD
  | typeof INCEPTION_ANSWER_RECORD_METHOD
  | typeof INCEPTION_STATE_SUMMARIZE_METHOD
  | typeof INCEPTION_CONFLICTS_IDENTIFY_METHOD
  | typeof INCEPTION_SESSION_EXPORT_METHOD
  | typeof INCEPTION_SESSION_DELETE_METHOD;

export interface InceptionSessionCreateParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly idea: string;
}

export interface InceptionSessionIdParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly sessionId: string;
}

export interface InceptionAnswerRecordParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly answer: InceptionAnswer;
}

type InceptionRequest<
  Method extends InceptionMethod,
  Params extends object,
> = JsonRpcRequest<Method, Params>;

type InceptionResponse = JsonRpcSuccess<InceptionResultPayload>;

export type InceptionSessionCreateRequest = InceptionRequest<
  typeof INCEPTION_SESSION_CREATE_METHOD,
  InceptionSessionCreateParams
>;
export type InceptionSessionGetRequest = InceptionRequest<
  typeof INCEPTION_SESSION_GET_METHOD,
  InceptionSessionIdParams
>;
export type InceptionQuestionsListRequest = InceptionRequest<
  typeof INCEPTION_QUESTIONS_LIST_METHOD,
  InceptionSessionIdParams
>;
export type InceptionAnswerRecordRequest = InceptionRequest<
  typeof INCEPTION_ANSWER_RECORD_METHOD,
  InceptionAnswerRecordParams
>;
export type InceptionStateSummarizeRequest = InceptionRequest<
  typeof INCEPTION_STATE_SUMMARIZE_METHOD,
  InceptionSessionIdParams
>;
export type InceptionConflictsIdentifyRequest = InceptionRequest<
  typeof INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  InceptionSessionIdParams
>;
export type InceptionSessionExportRequest = InceptionRequest<
  typeof INCEPTION_SESSION_EXPORT_METHOD,
  InceptionSessionIdParams
>;
export type InceptionSessionDeleteRequest = InceptionRequest<
  typeof INCEPTION_SESSION_DELETE_METHOD,
  InceptionSessionIdParams
>;

export type InceptionDaemonRequest =
  | InceptionSessionCreateRequest
  | InceptionSessionGetRequest
  | InceptionQuestionsListRequest
  | InceptionAnswerRecordRequest
  | InceptionStateSummarizeRequest
  | InceptionConflictsIdentifyRequest
  | InceptionSessionExportRequest
  | InceptionSessionDeleteRequest;

export type InceptionSessionCreateResultPayload = InceptionResultPayload;
export type InceptionSessionGetResultPayload = InceptionResultPayload;
export type InceptionQuestionsListResultPayload = InceptionResultPayload;
export type InceptionAnswerRecordResultPayload = InceptionResultPayload;
export type InceptionStateSummarizeResultPayload = InceptionResultPayload;
export type InceptionConflictsIdentifyResultPayload = InceptionResultPayload;
export type InceptionSessionExportResultPayload = InceptionResultPayload;
export type InceptionSessionDeleteResultPayload = InceptionResultPayload;

function createInceptionRequest<
  Method extends InceptionMethod,
  Params extends object,
>(
  id: RequestId,
  method: Method,
  params: Params,
): InceptionRequest<Method, Params> {
  return { jsonrpc: "2.0", id, method, params };
}

function createInceptionResponse(
  id: RequestId,
  result: Omit<InceptionResultPayload, "protocolVersion">,
): InceptionResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, ...result },
  };
}

export function createInceptionSessionCreateRequest(
  id: RequestId,
  root: string,
  idea: string,
): InceptionSessionCreateRequest {
  return createInceptionRequest(id, INCEPTION_SESSION_CREATE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    root,
    idea,
  });
}

export function createInceptionSessionGetRequest(
  id: RequestId,
  sessionId: string,
): InceptionSessionGetRequest {
  return createInceptionRequest(id, INCEPTION_SESSION_GET_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionQuestionsListRequest(
  id: RequestId,
  sessionId: string,
): InceptionQuestionsListRequest {
  return createInceptionRequest(id, INCEPTION_QUESTIONS_LIST_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionAnswerRecordRequest(
  id: RequestId,
  sessionId: string,
  answer: InceptionAnswer,
): InceptionAnswerRecordRequest {
  return createInceptionRequest(id, INCEPTION_ANSWER_RECORD_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
    answer,
  });
}

export function createInceptionStateSummarizeRequest(
  id: RequestId,
  sessionId: string,
): InceptionStateSummarizeRequest {
  return createInceptionRequest(id, INCEPTION_STATE_SUMMARIZE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionConflictsIdentifyRequest(
  id: RequestId,
  sessionId: string,
): InceptionConflictsIdentifyRequest {
  return createInceptionRequest(id, INCEPTION_CONFLICTS_IDENTIFY_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionSessionExportRequest(
  id: RequestId,
  sessionId: string,
): InceptionSessionExportRequest {
  return createInceptionRequest(id, INCEPTION_SESSION_EXPORT_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionSessionDeleteRequest(
  id: RequestId,
  sessionId: string,
): InceptionSessionDeleteRequest {
  return createInceptionRequest(id, INCEPTION_SESSION_DELETE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
  });
}

export function createInceptionSessionCreateResponse(
  id: RequestId,
  result: Omit<InceptionSessionCreateResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionSessionCreateResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionSessionGetResponse(
  id: RequestId,
  result: Omit<InceptionSessionGetResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionSessionGetResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionQuestionsListResponse(
  id: RequestId,
  result: Omit<InceptionQuestionsListResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionQuestionsListResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionAnswerRecordResponse(
  id: RequestId,
  result: Omit<InceptionAnswerRecordResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionAnswerRecordResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionStateSummarizeResponse(
  id: RequestId,
  result: Omit<InceptionStateSummarizeResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionStateSummarizeResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionConflictsIdentifyResponse(
  id: RequestId,
  result: Omit<InceptionConflictsIdentifyResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionConflictsIdentifyResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionSessionExportResponse(
  id: RequestId,
  result: Omit<InceptionSessionExportResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionSessionExportResultPayload> {
  return createInceptionResponse(id, result);
}

export function createInceptionSessionDeleteResponse(
  id: RequestId,
  result: Omit<InceptionSessionDeleteResultPayload, "protocolVersion">,
): JsonRpcSuccess<InceptionSessionDeleteResultPayload> {
  return createInceptionResponse(id, result);
}

const INCEPTION_METHODS: readonly InceptionMethod[] = [
  INCEPTION_SESSION_CREATE_METHOD,
  INCEPTION_SESSION_GET_METHOD,
  INCEPTION_QUESTIONS_LIST_METHOD,
  INCEPTION_ANSWER_RECORD_METHOD,
  INCEPTION_STATE_SUMMARIZE_METHOD,
  INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  INCEPTION_SESSION_EXPORT_METHOD,
  INCEPTION_SESSION_DELETE_METHOD,
];

export function isInceptionDaemonMethod(
  method: string,
): method is InceptionMethod {
  return INCEPTION_METHODS.includes(method as InceptionMethod);
}
