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
  FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FOUNDATION_SCAFFOLD_GET_METHOD,
  FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
  FOUNDATION_SCAFFOLD_APPLY_METHOD,
  FOUNDATION_SCAFFOLD_ROLLBACK_METHOD,
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
  EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
  FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
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
import {
  createFoundationWorkshopCreateRequest,
  createFoundationWorkshopGetRequest,
  createFoundationQuestionsListRequest,
  createFoundationAnswerRecordRequest,
  createFoundationUnderstandingSummarizeRequest,
  createFoundationConflictsIdentifyRequest,
  createFoundationReadinessEvaluateRequest,
  createFoundationWorkshopExportRequest,
  createFoundationWorkshopDeleteRequest,
  createFoundationDiscoveryQuestionsRequest,
  createFoundationDiscoveryTurnRequest,
  createFoundationBlueprintProposeRequest,
  createFoundationBlueprintCompareRequest,
  createFoundationBlueprintApproveRequest,
  createFoundationBlueprintRevokeRequest,
} from "./foundation-daemon-rpc.js";
import type {
  FoundationWorkshopCreateRequest,
  FoundationWorkshopGetRequest,
  FoundationQuestionsListRequest,
  FoundationAnswerRecordRequest,
  FoundationUnderstandingSummarizeRequest,
  FoundationConflictsIdentifyRequest,
  FoundationReadinessEvaluateRequest,
  FoundationWorkshopExportRequest,
  FoundationWorkshopDeleteRequest,
  FoundationDiscoveryQuestionsRequest,
  FoundationDiscoveryTurnRequest,
  FoundationBlueprintProposeRequest,
  FoundationBlueprintCompareRequest,
  FoundationBlueprintApproveRequest,
  FoundationBlueprintRevokeRequest,
} from "./foundation-daemon-rpc.js";
import {
  parseWorkspaceSliceDaemonRequest,
  type WorkspaceSliceDaemonRequest,
} from "./workspace-slice-daemon-parse.js";
import type { SpecializedPacksChecksResponse } from "./engineering-quality/specialized-daemon-rpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import {
  isObject,
  parseBlueprintTier,
  parseFoundationAnswer,
  positiveInteger,
  stringValue,
} from "./workspace-daemon-request-helpers.js";

export type WorkspaceDaemonRequest =
  | SpecializedPacksChecksRequest
  | InceptionSessionCreateRequest
  | InceptionSessionGetRequest
  | InceptionQuestionsListRequest
  | InceptionAnswerRecordRequest
  | InceptionStateSummarizeRequest
  | InceptionConflictsIdentifyRequest
  | InceptionSessionExportRequest
  | InceptionSessionDeleteRequest
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
  | FoundationBlueprintRevokeRequest
  | WorkspaceSliceDaemonRequest;

export type WorkspaceDaemonResponse = SpecializedPacksChecksResponse;

export * from "./inception-common.js";
export * from "./inception-daemon-rpc.js";
export * from "./foundation-workshop.js";
export * from "./foundation-common.js";
export * from "./foundation-daemon-rpc.js";
export * from "./foundation-discovery.js";
export * from "./foundation-blueprint.js";
export * from "./foundation-scaffold.js";
export * from "./foundation-scaffold-daemon-rpc.js";
export * from "./existing-project-workspace.js";
export * from "./existing-project-daemon-rpc.js";
export * from "./adoption-plan.js";
export * from "./adoption-plan-daemon-rpc.js";
export * from "./adoption-decision.js";
export * from "./adoption-decision-parse.js";
export * from "./adoption-decision-daemon-rpc.js";
export * from "./feature-intent-workspace.js";
export * from "./feature-intent-daemon-rpc.js";
export * from "./bounded-execution-workspace.js";
export * from "./bounded-execution-daemon-rpc.js";
export * from "./continuous-loop-workspace.js";
export * from "./continuous-loop-daemon-rpc.js";
export * from "./workspace-slice-daemon-parse.js";
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
  FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FOUNDATION_SCAFFOLD_GET_METHOD,
  FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
  FOUNDATION_SCAFFOLD_APPLY_METHOD,
  FOUNDATION_SCAFFOLD_ROLLBACK_METHOD,
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
  EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
  FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
] as const;

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
  if (value.method === FOUNDATION_WORKSHOP_CREATE_METHOD) {
    const inceptionSessionId =
      params.inceptionSessionId === undefined
        ? undefined
        : stringValue(params.inceptionSessionId, "inceptionSessionId");
    return createFoundationWorkshopCreateRequest(
      id,
      stringValue(params.root, "root"),
      stringValue(params.idea, "idea"),
      inceptionSessionId,
    );
  }
  if (
    value.method === FOUNDATION_WORKSHOP_GET_METHOD ||
    value.method === FOUNDATION_QUESTIONS_LIST_METHOD ||
    value.method === FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD ||
    value.method === FOUNDATION_CONFLICTS_IDENTIFY_METHOD ||
    value.method === FOUNDATION_READINESS_EVALUATE_METHOD ||
    value.method === FOUNDATION_WORKSHOP_EXPORT_METHOD ||
    value.method === FOUNDATION_WORKSHOP_DELETE_METHOD
  ) {
    const workshopId = stringValue(params.workshopId, "workshopId");
    if (value.method === FOUNDATION_WORKSHOP_GET_METHOD)
      return createFoundationWorkshopGetRequest(id, workshopId);
    if (value.method === FOUNDATION_QUESTIONS_LIST_METHOD)
      return createFoundationQuestionsListRequest(id, workshopId);
    if (value.method === FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD)
      return createFoundationUnderstandingSummarizeRequest(id, workshopId);
    if (value.method === FOUNDATION_CONFLICTS_IDENTIFY_METHOD)
      return createFoundationConflictsIdentifyRequest(id, workshopId);
    if (value.method === FOUNDATION_READINESS_EVALUATE_METHOD)
      return createFoundationReadinessEvaluateRequest(id, workshopId);
    if (value.method === FOUNDATION_WORKSHOP_EXPORT_METHOD)
      return createFoundationWorkshopExportRequest(id, workshopId);
    return createFoundationWorkshopDeleteRequest(id, workshopId);
  }
  if (value.method === FOUNDATION_ANSWER_RECORD_METHOD) {
    return createFoundationAnswerRecordRequest(
      id,
      stringValue(params.workshopId, "workshopId"),
      parseFoundationAnswer(params.answer),
    );
  }
  if (
    value.method === FOUNDATION_DISCOVERY_QUESTIONS_METHOD ||
    value.method === FOUNDATION_DISCOVERY_TURN_METHOD
  ) {
    const workshopId = stringValue(params.workshopId, "workshopId");
    const effort =
      params.effort === undefined
        ? undefined
        : params.effort === "low" ||
            params.effort === "medium" ||
            params.effort === "high"
          ? params.effort
          : (() => {
              throw new ProtocolValidationError(-32602, "invalid effort");
            })();
    if (value.method === FOUNDATION_DISCOVERY_QUESTIONS_METHOD) {
      return createFoundationDiscoveryQuestionsRequest(id, workshopId, effort);
    }
    const turnIndex =
      params.turnIndex === undefined
        ? undefined
        : positiveInteger(params.turnIndex, "turnIndex");
    const modelProfile =
      params.modelProfile === undefined
        ? undefined
        : stringValue(params.modelProfile, "modelProfile");
    return createFoundationDiscoveryTurnRequest(id, workshopId, {
      ...(effort !== undefined ? { effort } : {}),
      ...(turnIndex !== undefined ? { turnIndex } : {}),
      ...(modelProfile !== undefined ? { modelProfile } : {}),
    });
  }
  if (value.method === FOUNDATION_BLUEPRINT_PROPOSE_METHOD) {
    return createFoundationBlueprintProposeRequest(
      id,
      stringValue(params.workshopId, "workshopId"),
    );
  }
  if (value.method === FOUNDATION_BLUEPRINT_COMPARE_METHOD) {
    return createFoundationBlueprintCompareRequest(
      id,
      stringValue(params.workshopId, "workshopId"),
      parseBlueprintTier(params.leftTier, "leftTier"),
      parseBlueprintTier(params.rightTier, "rightTier"),
    );
  }
  if (value.method === FOUNDATION_BLUEPRINT_APPROVE_METHOD) {
    const approver =
      params.approver === undefined
        ? undefined
        : stringValue(params.approver, "approver");
    return createFoundationBlueprintApproveRequest(
      id,
      stringValue(params.workshopId, "workshopId"),
      parseBlueprintTier(params.tier, "tier"),
      approver,
    );
  }
  if (value.method === FOUNDATION_BLUEPRINT_REVOKE_METHOD) {
    return createFoundationBlueprintRevokeRequest(
      id,
      stringValue(params.workshopId, "workshopId"),
    );
  }
  return parseWorkspaceSliceDaemonRequest(
    typeof value.method === "string" ? value.method : "",
    params,
    id,
  );
}
