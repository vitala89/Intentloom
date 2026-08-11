import {
  createFoundationWorkshop,
  deleteFoundationWorkshop,
  discoverFoundationAdaptiveQuestions,
  evaluateFoundationWorkshopReadiness,
  exportFoundationWorkshopJson,
  getFoundationWorkshopViewmodel,
  identifyFoundationWorkshopConflicts,
  listFoundationQuestions,
  recordFoundationWorkshopAnswer,
  runFoundationDiscoveryTurn,
  summarizeFoundationUnderstandingViewmodel,
  proposeFoundationBlueprints,
  compareFoundationBlueprintTiers,
  approveFoundationBlueprint,
  revokeFoundationBlueprintApproval,
} from "@intentloom/application";
import type {
  DaemonCapability,
  FoundationAnswerRecordRequest,
  FoundationAnswerRecordResultPayload,
  FoundationConflictsIdentifyRequest,
  FoundationConflictsIdentifyResultPayload,
  FoundationDiscoveryQuestionsRequest,
  FoundationDiscoveryQuestionsResultPayload,
  FoundationDiscoveryTurnRequest,
  FoundationDiscoveryTurnResultPayload,
  FoundationBlueprintProposeRequest,
  FoundationBlueprintProposeResultPayload,
  FoundationBlueprintCompareRequest,
  FoundationBlueprintCompareResultPayload,
  FoundationBlueprintApproveRequest,
  FoundationBlueprintApproveResultPayload,
  FoundationBlueprintRevokeRequest,
  FoundationBlueprintRevokeResultPayload,
  FoundationQuestionsListRequest,
  FoundationQuestionsListResultPayload,
  FoundationReadinessEvaluateRequest,
  FoundationReadinessEvaluateResultPayload,
  FoundationUnderstandingSummarizeRequest,
  FoundationUnderstandingSummarizeResultPayload,
  FoundationWorkshopCreateRequest,
  FoundationWorkshopCreateResultPayload,
  FoundationWorkshopDeleteRequest,
  FoundationWorkshopDeleteResultPayload,
  FoundationWorkshopExportRequest,
  FoundationWorkshopExportResultPayload,
  FoundationWorkshopGetRequest,
  FoundationWorkshopGetResultPayload,
  FoundationViewmodelPayload,
} from "@intentloom/protocol";
import {
  FOUNDATION_ANSWER_RECORD_METHOD,
  FOUNDATION_CONFLICTS_IDENTIFY_METHOD,
  FOUNDATION_DISCOVERY_QUESTIONS_METHOD,
  FOUNDATION_DISCOVERY_TURN_METHOD,
  FOUNDATION_BLUEPRINT_PROPOSE_METHOD,
  FOUNDATION_BLUEPRINT_COMPARE_METHOD,
  FOUNDATION_BLUEPRINT_APPROVE_METHOD,
  FOUNDATION_BLUEPRINT_REVOKE_METHOD,
  FOUNDATION_QUESTIONS_LIST_METHOD,
  FOUNDATION_READINESS_EVALUATE_METHOD,
  FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
  FOUNDATION_WORKSHOP_CREATE_METHOD,
  FOUNDATION_WORKSHOP_DELETE_METHOD,
  FOUNDATION_WORKSHOP_EXPORT_METHOD,
  FOUNDATION_WORKSHOP_GET_METHOD,
  createFoundationAnswerRecordResponse,
  createFoundationConflictsIdentifyResponse,
  createFoundationDiscoveryQuestionsResponse,
  createFoundationDiscoveryTurnResponse,
  createFoundationBlueprintProposeResponse,
  createFoundationBlueprintCompareResponse,
  createFoundationBlueprintApproveResponse,
  createFoundationBlueprintRevokeResponse,
  createFoundationQuestionsListResponse,
  createFoundationReadinessEvaluateResponse,
  createFoundationUnderstandingSummarizeResponse,
  createFoundationWorkshopCreateResponse,
  createFoundationWorkshopDeleteResponse,
  createFoundationWorkshopExportResponse,
  createFoundationWorkshopGetResponse,
  isFoundationDaemonMethod,
  type FoundationDaemonRequest,
} from "@intentloom/protocol";

export interface FoundationDaemonOptions {
  readonly foundationWorkshopCreate?: (
    request: FoundationWorkshopCreateRequest,
  ) => Promise<Omit<FoundationWorkshopCreateResultPayload, "protocolVersion">>;
  readonly foundationWorkshopGet?: (
    request: FoundationWorkshopGetRequest,
  ) => Promise<Omit<FoundationWorkshopGetResultPayload, "protocolVersion">>;
  readonly foundationQuestionsList?: (
    request: FoundationQuestionsListRequest,
  ) => Promise<Omit<FoundationQuestionsListResultPayload, "protocolVersion">>;
  readonly foundationAnswerRecord?: (
    request: FoundationAnswerRecordRequest,
  ) => Promise<Omit<FoundationAnswerRecordResultPayload, "protocolVersion">>;
  readonly foundationUnderstandingSummarize?: (
    request: FoundationUnderstandingSummarizeRequest,
  ) => Promise<
    Omit<FoundationUnderstandingSummarizeResultPayload, "protocolVersion">
  >;
  readonly foundationConflictsIdentify?: (
    request: FoundationConflictsIdentifyRequest,
  ) => Promise<
    Omit<FoundationConflictsIdentifyResultPayload, "protocolVersion">
  >;
  readonly foundationReadinessEvaluate?: (
    request: FoundationReadinessEvaluateRequest,
  ) => Promise<
    Omit<FoundationReadinessEvaluateResultPayload, "protocolVersion">
  >;
  readonly foundationWorkshopExport?: (
    request: FoundationWorkshopExportRequest,
  ) => Promise<Omit<FoundationWorkshopExportResultPayload, "protocolVersion">>;
  readonly foundationWorkshopDelete?: (
    request: FoundationWorkshopDeleteRequest,
  ) => Promise<Omit<FoundationWorkshopDeleteResultPayload, "protocolVersion">>;
  readonly foundationDiscoveryQuestions?: (
    request: FoundationDiscoveryQuestionsRequest,
  ) => Promise<
    Omit<FoundationDiscoveryQuestionsResultPayload, "protocolVersion">
  >;
  readonly foundationDiscoveryTurn?: (
    request: FoundationDiscoveryTurnRequest,
  ) => Promise<Omit<FoundationDiscoveryTurnResultPayload, "protocolVersion">>;
  readonly foundationBlueprintPropose?: (
    request: FoundationBlueprintProposeRequest,
  ) => Promise<
    Omit<FoundationBlueprintProposeResultPayload, "protocolVersion">
  >;
  readonly foundationBlueprintCompare?: (
    request: FoundationBlueprintCompareRequest,
  ) => Promise<
    Omit<FoundationBlueprintCompareResultPayload, "protocolVersion">
  >;
  readonly foundationBlueprintApprove?: (
    request: FoundationBlueprintApproveRequest,
  ) => Promise<
    Omit<FoundationBlueprintApproveResultPayload, "protocolVersion">
  >;
  readonly foundationBlueprintRevoke?: (
    request: FoundationBlueprintRevokeRequest,
  ) => Promise<Omit<FoundationBlueprintRevokeResultPayload, "protocolVersion">>;
}

function vm(value: object): { readonly viewmodel: FoundationViewmodelPayload } {
  return { viewmodel: value as FoundationViewmodelPayload };
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function foundationCapabilities(
  options: FoundationDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.foundationWorkshopCreate
      ? enabled(FOUNDATION_WORKSHOP_CREATE_METHOD, "foundation.workshop.create")
      : undefined,
    options.foundationWorkshopGet
      ? enabled(FOUNDATION_WORKSHOP_GET_METHOD, "foundation.workshop.get")
      : undefined,
    options.foundationQuestionsList
      ? enabled(FOUNDATION_QUESTIONS_LIST_METHOD, "foundation.questions.list")
      : undefined,
    options.foundationAnswerRecord
      ? enabled(FOUNDATION_ANSWER_RECORD_METHOD, "foundation.answer.record")
      : undefined,
    options.foundationUnderstandingSummarize
      ? enabled(
          FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD,
          "foundation.understanding.summarize",
        )
      : undefined,
    options.foundationConflictsIdentify
      ? enabled(
          FOUNDATION_CONFLICTS_IDENTIFY_METHOD,
          "foundation.conflicts.identify",
        )
      : undefined,
    options.foundationReadinessEvaluate
      ? enabled(
          FOUNDATION_READINESS_EVALUATE_METHOD,
          "foundation.readiness.evaluate",
        )
      : undefined,
    options.foundationWorkshopExport
      ? enabled(FOUNDATION_WORKSHOP_EXPORT_METHOD, "foundation.workshop.export")
      : undefined,
    options.foundationWorkshopDelete
      ? enabled(FOUNDATION_WORKSHOP_DELETE_METHOD, "foundation.workshop.delete")
      : undefined,
    options.foundationDiscoveryQuestions
      ? enabled(
          FOUNDATION_DISCOVERY_QUESTIONS_METHOD,
          "foundation.discovery.questions",
        )
      : undefined,
    options.foundationDiscoveryTurn
      ? enabled(FOUNDATION_DISCOVERY_TURN_METHOD, "foundation.discovery.turn")
      : undefined,
    options.foundationBlueprintPropose
      ? enabled(
          FOUNDATION_BLUEPRINT_PROPOSE_METHOD,
          "foundation.blueprint.propose",
        )
      : undefined,
    options.foundationBlueprintCompare
      ? enabled(
          FOUNDATION_BLUEPRINT_COMPARE_METHOD,
          "foundation.blueprint.compare",
        )
      : undefined,
    options.foundationBlueprintApprove
      ? enabled(
          FOUNDATION_BLUEPRINT_APPROVE_METHOD,
          "foundation.blueprint.approve",
        )
      : undefined,
    options.foundationBlueprintRevoke
      ? enabled(
          FOUNDATION_BLUEPRINT_REVOKE_METHOD,
          "foundation.blueprint.revoke",
        )
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

export function isFoundationRequest(
  request: object,
): request is FoundationDaemonRequest {
  return (
    "method" in request &&
    typeof request.method === "string" &&
    isFoundationDaemonMethod(request.method)
  );
}

export async function dispatchFoundationRequest(
  request: FoundationDaemonRequest,
  options: FoundationDaemonOptions,
): Promise<object | undefined> {
  if (
    request.method === FOUNDATION_WORKSHOP_CREATE_METHOD &&
    options.foundationWorkshopCreate
  ) {
    return createFoundationWorkshopCreateResponse(
      request.id,
      await options.foundationWorkshopCreate(request),
    );
  }
  if (
    request.method === FOUNDATION_WORKSHOP_GET_METHOD &&
    options.foundationWorkshopGet
  ) {
    return createFoundationWorkshopGetResponse(
      request.id,
      await options.foundationWorkshopGet(request),
    );
  }
  if (
    request.method === FOUNDATION_QUESTIONS_LIST_METHOD &&
    options.foundationQuestionsList
  ) {
    return createFoundationQuestionsListResponse(
      request.id,
      await options.foundationQuestionsList(request),
    );
  }
  if (
    request.method === FOUNDATION_ANSWER_RECORD_METHOD &&
    options.foundationAnswerRecord
  ) {
    return createFoundationAnswerRecordResponse(
      request.id,
      await options.foundationAnswerRecord(request),
    );
  }
  if (
    request.method === FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD &&
    options.foundationUnderstandingSummarize
  ) {
    return createFoundationUnderstandingSummarizeResponse(
      request.id,
      await options.foundationUnderstandingSummarize(request),
    );
  }
  if (
    request.method === FOUNDATION_CONFLICTS_IDENTIFY_METHOD &&
    options.foundationConflictsIdentify
  ) {
    return createFoundationConflictsIdentifyResponse(
      request.id,
      await options.foundationConflictsIdentify(request),
    );
  }
  if (
    request.method === FOUNDATION_READINESS_EVALUATE_METHOD &&
    options.foundationReadinessEvaluate
  ) {
    return createFoundationReadinessEvaluateResponse(
      request.id,
      await options.foundationReadinessEvaluate(request),
    );
  }
  if (
    request.method === FOUNDATION_WORKSHOP_EXPORT_METHOD &&
    options.foundationWorkshopExport
  ) {
    return createFoundationWorkshopExportResponse(
      request.id,
      await options.foundationWorkshopExport(request),
    );
  }
  if (
    request.method === FOUNDATION_WORKSHOP_DELETE_METHOD &&
    options.foundationWorkshopDelete
  ) {
    return createFoundationWorkshopDeleteResponse(
      request.id,
      await options.foundationWorkshopDelete(request),
    );
  }
  if (
    request.method === FOUNDATION_DISCOVERY_QUESTIONS_METHOD &&
    options.foundationDiscoveryQuestions
  ) {
    return createFoundationDiscoveryQuestionsResponse(
      request.id,
      await options.foundationDiscoveryQuestions(request),
    );
  }
  if (
    request.method === FOUNDATION_DISCOVERY_TURN_METHOD &&
    options.foundationDiscoveryTurn
  ) {
    return createFoundationDiscoveryTurnResponse(
      request.id,
      await options.foundationDiscoveryTurn(request),
    );
  }
  if (
    request.method === FOUNDATION_BLUEPRINT_PROPOSE_METHOD &&
    options.foundationBlueprintPropose
  ) {
    return createFoundationBlueprintProposeResponse(
      request.id,
      await options.foundationBlueprintPropose(request),
    );
  }
  if (
    request.method === FOUNDATION_BLUEPRINT_COMPARE_METHOD &&
    options.foundationBlueprintCompare
  ) {
    return createFoundationBlueprintCompareResponse(
      request.id,
      await options.foundationBlueprintCompare(request),
    );
  }
  if (
    request.method === FOUNDATION_BLUEPRINT_APPROVE_METHOD &&
    options.foundationBlueprintApprove
  ) {
    return createFoundationBlueprintApproveResponse(
      request.id,
      await options.foundationBlueprintApprove(request),
    );
  }
  if (
    request.method === FOUNDATION_BLUEPRINT_REVOKE_METHOD &&
    options.foundationBlueprintRevoke
  ) {
    return createFoundationBlueprintRevokeResponse(
      request.id,
      await options.foundationBlueprintRevoke(request),
    );
  }
  return undefined;
}

export async function handleFoundationWorkshopCreate(
  request: FoundationWorkshopCreateRequest,
): Promise<Omit<FoundationWorkshopCreateResultPayload, "protocolVersion">> {
  const workshop = createFoundationWorkshop({
    root: request.params.root,
    idea: request.params.idea,
    ...(request.params.inceptionSessionId !== undefined
      ? { inceptionSessionId: request.params.inceptionSessionId }
      : {}),
  });
  return vm(getFoundationWorkshopViewmodel(workshop.id));
}

export async function handleFoundationWorkshopGet(
  request: FoundationWorkshopGetRequest,
): Promise<Omit<FoundationWorkshopGetResultPayload, "protocolVersion">> {
  return vm(getFoundationWorkshopViewmodel(request.params.workshopId));
}

export async function handleFoundationQuestionsList(
  request: FoundationQuestionsListRequest,
): Promise<Omit<FoundationQuestionsListResultPayload, "protocolVersion">> {
  return vm(listFoundationQuestions(request.params.workshopId));
}

export async function handleFoundationAnswerRecord(
  request: FoundationAnswerRecordRequest,
): Promise<Omit<FoundationAnswerRecordResultPayload, "protocolVersion">> {
  const workshop = recordFoundationWorkshopAnswer(
    request.params.workshopId,
    request.params.answer,
  );
  return vm(getFoundationWorkshopViewmodel(workshop.id));
}

export async function handleFoundationUnderstandingSummarize(
  request: FoundationUnderstandingSummarizeRequest,
): Promise<
  Omit<FoundationUnderstandingSummarizeResultPayload, "protocolVersion">
> {
  return vm(
    summarizeFoundationUnderstandingViewmodel(request.params.workshopId),
  );
}

export async function handleFoundationConflictsIdentify(
  request: FoundationConflictsIdentifyRequest,
): Promise<Omit<FoundationConflictsIdentifyResultPayload, "protocolVersion">> {
  return vm(identifyFoundationWorkshopConflicts(request.params.workshopId));
}

export async function handleFoundationReadinessEvaluate(
  request: FoundationReadinessEvaluateRequest,
): Promise<Omit<FoundationReadinessEvaluateResultPayload, "protocolVersion">> {
  return vm(evaluateFoundationWorkshopReadiness(request.params.workshopId));
}

export async function handleFoundationWorkshopExport(
  request: FoundationWorkshopExportRequest,
): Promise<Omit<FoundationWorkshopExportResultPayload, "protocolVersion">> {
  return vm(exportFoundationWorkshopJson(request.params.workshopId));
}

export async function handleFoundationWorkshopDelete(
  request: FoundationWorkshopDeleteRequest,
): Promise<Omit<FoundationWorkshopDeleteResultPayload, "protocolVersion">> {
  return vm(deleteFoundationWorkshop(request.params.workshopId));
}

export async function handleFoundationDiscoveryQuestions(
  request: FoundationDiscoveryQuestionsRequest,
): Promise<Omit<FoundationDiscoveryQuestionsResultPayload, "protocolVersion">> {
  return vm(
    discoverFoundationAdaptiveQuestions(
      request.params.workshopId,
      request.params.effort !== undefined
        ? { effort: request.params.effort }
        : undefined,
    ),
  );
}

export async function handleFoundationDiscoveryTurn(
  request: FoundationDiscoveryTurnRequest,
): Promise<Omit<FoundationDiscoveryTurnResultPayload, "protocolVersion">> {
  const turn = await runFoundationDiscoveryTurn(request.params.workshopId, {
    ...(request.params.effort !== undefined
      ? { effort: request.params.effort }
      : {}),
    ...(request.params.turnIndex !== undefined
      ? { turnIndex: request.params.turnIndex }
      : {}),
    ...(request.params.modelProfile !== undefined
      ? { modelProfile: request.params.modelProfile }
      : {}),
  });
  return vm(turn);
}

export async function handleFoundationBlueprintPropose(
  request: FoundationBlueprintProposeRequest,
): Promise<Omit<FoundationBlueprintProposeResultPayload, "protocolVersion">> {
  return vm(proposeFoundationBlueprints(request.params.workshopId));
}

export async function handleFoundationBlueprintCompare(
  request: FoundationBlueprintCompareRequest,
): Promise<Omit<FoundationBlueprintCompareResultPayload, "protocolVersion">> {
  return vm(
    compareFoundationBlueprintTiers(
      request.params.workshopId,
      request.params.leftTier,
      request.params.rightTier,
    ),
  );
}

export async function handleFoundationBlueprintApprove(
  request: FoundationBlueprintApproveRequest,
): Promise<Omit<FoundationBlueprintApproveResultPayload, "protocolVersion">> {
  return vm(
    approveFoundationBlueprint(
      request.params.workshopId,
      request.params.tier,
      request.params.approver,
    ),
  );
}

export async function handleFoundationBlueprintRevoke(
  request: FoundationBlueprintRevokeRequest,
): Promise<Omit<FoundationBlueprintRevokeResultPayload, "protocolVersion">> {
  return vm(revokeFoundationBlueprintApproval(request.params.workshopId));
}
