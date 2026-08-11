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
