import {
  createInceptionSession,
  deleteInceptionSession,
  exportInceptionSessionJson,
  getInceptionSessionViewmodel,
  identifyInceptionSessionConflicts,
  listInceptionQuestions,
  recordInceptionSessionAnswer,
  summarizeInceptionSessionViewmodel,
} from "@intentloom/application";
import type {
  DaemonCapability,
  InceptionAnswerRecordRequest,
  InceptionAnswerRecordResultPayload,
  InceptionConflictsIdentifyRequest,
  InceptionConflictsIdentifyResultPayload,
  InceptionQuestionsListRequest,
  InceptionQuestionsListResultPayload,
  InceptionSessionCreateRequest,
  InceptionSessionCreateResultPayload,
  InceptionSessionDeleteRequest,
  InceptionSessionDeleteResultPayload,
  InceptionSessionExportRequest,
  InceptionSessionExportResultPayload,
  InceptionSessionGetRequest,
  InceptionSessionGetResultPayload,
  InceptionStateSummarizeRequest,
  InceptionStateSummarizeResultPayload,
  InceptionViewmodelPayload,
} from "@intentloom/protocol";
import {
  INCEPTION_ANSWER_RECORD_METHOD,
  INCEPTION_CONFLICTS_IDENTIFY_METHOD,
  INCEPTION_QUESTIONS_LIST_METHOD,
  INCEPTION_SESSION_CREATE_METHOD,
  INCEPTION_SESSION_DELETE_METHOD,
  INCEPTION_SESSION_EXPORT_METHOD,
  INCEPTION_SESSION_GET_METHOD,
  INCEPTION_STATE_SUMMARIZE_METHOD,
  createInceptionAnswerRecordResponse,
  createInceptionConflictsIdentifyResponse,
  createInceptionQuestionsListResponse,
  createInceptionSessionCreateResponse,
  createInceptionSessionDeleteResponse,
  createInceptionSessionExportResponse,
  createInceptionSessionGetResponse,
  createInceptionStateSummarizeResponse,
  isInceptionDaemonMethod,
  type InceptionDaemonRequest,
} from "@intentloom/protocol";

export interface InceptionDaemonOptions {
  readonly inceptionSessionCreate?: (
    request: InceptionSessionCreateRequest,
  ) => Promise<Omit<InceptionSessionCreateResultPayload, "protocolVersion">>;
  readonly inceptionSessionGet?: (
    request: InceptionSessionGetRequest,
  ) => Promise<Omit<InceptionSessionGetResultPayload, "protocolVersion">>;
  readonly inceptionQuestionsList?: (
    request: InceptionQuestionsListRequest,
  ) => Promise<Omit<InceptionQuestionsListResultPayload, "protocolVersion">>;
  readonly inceptionAnswerRecord?: (
    request: InceptionAnswerRecordRequest,
  ) => Promise<Omit<InceptionAnswerRecordResultPayload, "protocolVersion">>;
  readonly inceptionStateSummarize?: (
    request: InceptionStateSummarizeRequest,
  ) => Promise<Omit<InceptionStateSummarizeResultPayload, "protocolVersion">>;
  readonly inceptionConflictsIdentify?: (
    request: InceptionConflictsIdentifyRequest,
  ) => Promise<
    Omit<InceptionConflictsIdentifyResultPayload, "protocolVersion">
  >;
  readonly inceptionSessionExport?: (
    request: InceptionSessionExportRequest,
  ) => Promise<Omit<InceptionSessionExportResultPayload, "protocolVersion">>;
  readonly inceptionSessionDelete?: (
    request: InceptionSessionDeleteRequest,
  ) => Promise<Omit<InceptionSessionDeleteResultPayload, "protocolVersion">>;
}

function vm(value: object): { readonly viewmodel: InceptionViewmodelPayload } {
  return { viewmodel: value as InceptionViewmodelPayload };
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function inceptionCapabilities(
  options: InceptionDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.inceptionSessionCreate
      ? enabled(INCEPTION_SESSION_CREATE_METHOD, "inception.session.create")
      : undefined,
    options.inceptionSessionGet
      ? enabled(INCEPTION_SESSION_GET_METHOD, "inception.session.get")
      : undefined,
    options.inceptionQuestionsList
      ? enabled(INCEPTION_QUESTIONS_LIST_METHOD, "inception.questions.list")
      : undefined,
    options.inceptionAnswerRecord
      ? enabled(INCEPTION_ANSWER_RECORD_METHOD, "inception.answer.record")
      : undefined,
    options.inceptionStateSummarize
      ? enabled(INCEPTION_STATE_SUMMARIZE_METHOD, "inception.state.summarize")
      : undefined,
    options.inceptionConflictsIdentify
      ? enabled(
          INCEPTION_CONFLICTS_IDENTIFY_METHOD,
          "inception.conflicts.identify",
        )
      : undefined,
    options.inceptionSessionExport
      ? enabled(INCEPTION_SESSION_EXPORT_METHOD, "inception.session.export")
      : undefined,
    options.inceptionSessionDelete
      ? enabled(INCEPTION_SESSION_DELETE_METHOD, "inception.session.delete")
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

export function isInceptionRequest(
  request: object,
): request is InceptionDaemonRequest {
  return (
    "method" in request &&
    typeof request.method === "string" &&
    isInceptionDaemonMethod(request.method)
  );
}

export async function dispatchInceptionRequest(
  request: InceptionDaemonRequest,
  options: InceptionDaemonOptions,
): Promise<object | undefined> {
  if (
    request.method === INCEPTION_SESSION_CREATE_METHOD &&
    options.inceptionSessionCreate
  ) {
    return createInceptionSessionCreateResponse(
      request.id,
      await options.inceptionSessionCreate(request),
    );
  }
  if (
    request.method === INCEPTION_SESSION_GET_METHOD &&
    options.inceptionSessionGet
  ) {
    return createInceptionSessionGetResponse(
      request.id,
      await options.inceptionSessionGet(request),
    );
  }
  if (
    request.method === INCEPTION_QUESTIONS_LIST_METHOD &&
    options.inceptionQuestionsList
  ) {
    return createInceptionQuestionsListResponse(
      request.id,
      await options.inceptionQuestionsList(request),
    );
  }
  if (
    request.method === INCEPTION_ANSWER_RECORD_METHOD &&
    options.inceptionAnswerRecord
  ) {
    return createInceptionAnswerRecordResponse(
      request.id,
      await options.inceptionAnswerRecord(request),
    );
  }
  if (
    request.method === INCEPTION_STATE_SUMMARIZE_METHOD &&
    options.inceptionStateSummarize
  ) {
    return createInceptionStateSummarizeResponse(
      request.id,
      await options.inceptionStateSummarize(request),
    );
  }
  if (
    request.method === INCEPTION_CONFLICTS_IDENTIFY_METHOD &&
    options.inceptionConflictsIdentify
  ) {
    return createInceptionConflictsIdentifyResponse(
      request.id,
      await options.inceptionConflictsIdentify(request),
    );
  }
  if (
    request.method === INCEPTION_SESSION_EXPORT_METHOD &&
    options.inceptionSessionExport
  ) {
    return createInceptionSessionExportResponse(
      request.id,
      await options.inceptionSessionExport(request),
    );
  }
  if (
    request.method === INCEPTION_SESSION_DELETE_METHOD &&
    options.inceptionSessionDelete
  ) {
    return createInceptionSessionDeleteResponse(
      request.id,
      await options.inceptionSessionDelete(request),
    );
  }
  return undefined;
}

export async function handleInceptionSessionCreate(
  request: InceptionSessionCreateRequest,
): Promise<Omit<InceptionSessionCreateResultPayload, "protocolVersion">> {
  const session = createInceptionSession({
    root: request.params.root,
    idea: request.params.idea,
  });
  return vm(getInceptionSessionViewmodel(session.id));
}

export async function handleInceptionSessionGet(
  request: InceptionSessionGetRequest,
): Promise<Omit<InceptionSessionGetResultPayload, "protocolVersion">> {
  return vm(getInceptionSessionViewmodel(request.params.sessionId));
}

export async function handleInceptionQuestionsList(
  request: InceptionQuestionsListRequest,
): Promise<Omit<InceptionQuestionsListResultPayload, "protocolVersion">> {
  return vm(listInceptionQuestions(request.params.sessionId));
}

export async function handleInceptionAnswerRecord(
  request: InceptionAnswerRecordRequest,
): Promise<Omit<InceptionAnswerRecordResultPayload, "protocolVersion">> {
  const session = recordInceptionSessionAnswer(
    request.params.sessionId,
    request.params.answer,
  );
  return vm(getInceptionSessionViewmodel(session.id));
}

export async function handleInceptionStateSummarize(
  request: InceptionStateSummarizeRequest,
): Promise<Omit<InceptionStateSummarizeResultPayload, "protocolVersion">> {
  return vm(summarizeInceptionSessionViewmodel(request.params.sessionId));
}

export async function handleInceptionConflictsIdentify(
  request: InceptionConflictsIdentifyRequest,
): Promise<Omit<InceptionConflictsIdentifyResultPayload, "protocolVersion">> {
  return vm(identifyInceptionSessionConflicts(request.params.sessionId));
}

export async function handleInceptionSessionExport(
  request: InceptionSessionExportRequest,
): Promise<Omit<InceptionSessionExportResultPayload, "protocolVersion">> {
  return vm(exportInceptionSessionJson(request.params.sessionId));
}

export async function handleInceptionSessionDelete(
  request: InceptionSessionDeleteRequest,
): Promise<Omit<InceptionSessionDeleteResultPayload, "protocolVersion">> {
  return vm(deleteInceptionSession(request.params.sessionId));
}
