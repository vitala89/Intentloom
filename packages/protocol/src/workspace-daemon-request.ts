import {
  SPECIALIZED_PACKS_CHECKS_METHOD,
  INCEPTION_SESSION_CREATE_METHOD,
  INCEPTION_SESSION_GET_METHOD,
  INCEPTION_QUESTIONS_LIST_METHOD,
  INCEPTION_ANSWER_RECORD_METHOD,
  INCEPTION_STATE_SUMMARIZE_METHOD,
  INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  INCEPTION_SESSION_EXPORT_METHOD,
  INCEPTION_SESSION_DELETE_METHOD,
} from "./jsonrpc.js";
import type { RequestId } from "./jsonrpc.js";
import { createSpecializedPacksChecksRequest } from "./engineering-quality/specialized-daemon-rpc.js";
import type { SpecializedPacksChecksRequest } from "./engineering-quality/specialized-daemon-rpc.js";
import {
  createInceptionSessionCreateRequest,
  createInceptionSessionGetRequest,
  createInceptionQuestionsListRequest,
  createInceptionAnswerRecordRequest,
  createInceptionStateSummarizeRequest,
  createInceptionConflictsIdentifyRequest,
  createInceptionSessionExportRequest,
  createInceptionSessionDeleteRequest,
} from "./inception-daemon-rpc.js";
import type {
  InceptionSessionCreateRequest,
  InceptionSessionGetRequest,
  InceptionQuestionsListRequest,
  InceptionAnswerRecordRequest,
  InceptionStateSummarizeRequest,
  InceptionConflictsIdentifyRequest,
  InceptionSessionExportRequest,
  InceptionSessionDeleteRequest,
} from "./inception-daemon-rpc.js";
import type { SpecializedPacksChecksResponse } from "./engineering-quality/specialized-daemon-rpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export type WorkspaceDaemonRequest =
  | SpecializedPacksChecksRequest
  | InceptionSessionCreateRequest
  | InceptionSessionGetRequest
  | InceptionQuestionsListRequest
  | InceptionAnswerRecordRequest
  | InceptionStateSummarizeRequest
  | InceptionConflictsIdentifyRequest
  | InceptionSessionExportRequest
  | InceptionSessionDeleteRequest;

export type WorkspaceDaemonResponse = SpecializedPacksChecksResponse;

export * from "./inception-common.js";
export * from "./inception-daemon-rpc.js";
export { ProtocolValidationError } from "./protocol-validation-error.js";

export const WORKSPACE_DAEMON_REQUEST_METHODS = [
  SPECIALIZED_PACKS_CHECKS_METHOD,
  INCEPTION_SESSION_CREATE_METHOD,
  INCEPTION_SESSION_GET_METHOD,
  INCEPTION_QUESTIONS_LIST_METHOD,
  INCEPTION_ANSWER_RECORD_METHOD,
  INCEPTION_STATE_SUMMARIZE_METHOD,
  INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  INCEPTION_SESSION_EXPORT_METHOD,
  INCEPTION_SESSION_DELETE_METHOD,
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a positive integer`,
    );
  return value;
}

export function parseWorkspaceDaemonRequest(
  value: Record<string, unknown>,
  id: RequestId,
): WorkspaceDaemonRequest | null {
  if (!isObject(value.params))
    throw new ProtocolValidationError(-32602, "params must be an object");
  const params = value.params;
  if (value.method === SPECIALIZED_PACKS_CHECKS_METHOD)
    return createSpecializedPacksChecksRequest(
      id,
      stringValue(params.root, "root"),
    );
  if (value.method === INCEPTION_SESSION_CREATE_METHOD)
    return createInceptionSessionCreateRequest(
      id,
      stringValue(params.root, "root"),
      stringValue(params.idea, "idea"),
    );
  if (
    value.method === INCEPTION_SESSION_GET_METHOD ||
    value.method === INCEPTION_QUESTIONS_LIST_METHOD ||
    value.method === INCEPTION_STATE_SUMMARIZE_METHOD ||
    value.method === INCEPTION_CONFLICTS_IDENTIFY_METHOD ||
    value.method === INCEPTION_SESSION_EXPORT_METHOD ||
    value.method === INCEPTION_SESSION_DELETE_METHOD
  ) {
    const sessionId = stringValue(params.sessionId, "sessionId");
    if (value.method === INCEPTION_SESSION_GET_METHOD)
      return createInceptionSessionGetRequest(id, sessionId);
    if (value.method === INCEPTION_QUESTIONS_LIST_METHOD)
      return createInceptionQuestionsListRequest(id, sessionId);
    if (value.method === INCEPTION_STATE_SUMMARIZE_METHOD)
      return createInceptionStateSummarizeRequest(id, sessionId);
    if (value.method === INCEPTION_CONFLICTS_IDENTIFY_METHOD)
      return createInceptionConflictsIdentifyRequest(id, sessionId);
    if (value.method === INCEPTION_SESSION_EXPORT_METHOD)
      return createInceptionSessionExportRequest(id, sessionId);
    return createInceptionSessionDeleteRequest(id, sessionId);
  }
  if (value.method === INCEPTION_ANSWER_RECORD_METHOD) {
    if (!isObject(params.answer))
      throw new ProtocolValidationError(-32602, "answer must be an object");
    const answer = params.answer;
    const confidence = answer.confidence;
    if (
      confidence !== "confirmed" &&
      confidence !== "assumed" &&
      confidence !== "preference"
    ) {
      throw new ProtocolValidationError(-32602, "invalid answer confidence");
    }
    return createInceptionAnswerRecordRequest(
      id,
      stringValue(params.sessionId, "sessionId"),
      {
        questionId: stringValue(answer.questionId, "answer.questionId"),
        value: typeof answer.value === "string" ? answer.value : "",
        confidence,
        timestamp: positiveInteger(answer.timestamp, "answer.timestamp"),
      },
    );
  }
  return null;
}
