import type {
  FoundationDiscoveryAdaptiveQuestionList,
  FoundationDiscoveryCompleteness,
  FoundationDiscoveryEffort,
  FoundationDiscoveryOptions,
  FoundationDiscoveryProposedQuestion,
  FoundationDiscoveryTurnResult,
  FoundationDiscoveryVisibility,
} from "@intentloom/protocol";
import {
  FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
  FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
} from "@intentloom/protocol";
import { validateFoundationQuestion } from "./foundation-base.js";
import { validateHarnessAgentDataPolicy } from "./harness-agent.js";

function assertSchemaVersion(
  value: unknown,
  field: string,
  expected: string,
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as Record<string, unknown>).schemaVersion !== expected
  ) {
    throw new Error(`Invalid ${field}: unsupported schema version`);
  }
}

const EFFORTS = new Set(["low", "medium", "high"]);
const NETWORK_MODES = new Set(["disabled", "explicit"]);
const PROPOSAL_SOURCES = new Set(["deterministic", "agent-proposed"]);
const AGENT_STATUSES = new Set([
  "completed",
  "cancelled",
  "error",
  "unsupported",
]);

export function validateFoundationDiscoveryOptions(
  value: unknown,
): FoundationDiscoveryOptions {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation discovery options: expected object");
  const record = value as Record<string, unknown>;
  if (
    record.effort !== undefined &&
    (typeof record.effort !== "string" || !EFFORTS.has(record.effort))
  ) {
    throw new Error("Invalid foundation discovery options: effort");
  }
  if (
    record.networkMode !== undefined &&
    (typeof record.networkMode !== "string" ||
      !NETWORK_MODES.has(record.networkMode))
  ) {
    throw new Error("Invalid foundation discovery options: networkMode");
  }
  const effort =
    record.effort !== undefined
      ? (record.effort as FoundationDiscoveryEffort)
      : undefined;
  const adapterId =
    typeof record.adapterId === "string" ? record.adapterId : undefined;
  const modelProfile =
    typeof record.modelProfile === "string" ? record.modelProfile : undefined;
  const networkMode =
    record.networkMode !== undefined
      ? (record.networkMode as FoundationDiscoveryOptions["networkMode"])
      : undefined;
  const maxTurnBudget =
    typeof record.maxTurnBudget === "number" ? record.maxTurnBudget : undefined;

  return {
    ...(effort !== undefined ? { effort } : {}),
    ...(adapterId !== undefined ? { adapterId } : {}),
    ...(modelProfile !== undefined ? { modelProfile } : {}),
    ...(networkMode !== undefined ? { networkMode } : {}),
    ...(maxTurnBudget !== undefined ? { maxTurnBudget } : {}),
  } as FoundationDiscoveryOptions;
}

export function validateFoundationDiscoveryCompleteness(
  value: unknown,
): FoundationDiscoveryCompleteness {
  if (typeof value !== "object" || value === null)
    throw new Error(
      "Invalid foundation discovery completeness: expected object",
    );
  assertSchemaVersion(
    value,
    "foundation discovery completeness",
    FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0)
    throw new Error("Invalid foundation discovery completeness: workshopId");
  if (typeof record.isComplete !== "boolean")
    throw new Error("Invalid foundation discovery completeness: isComplete");
  if (typeof record.remainingRequiredCount !== "number")
    throw new Error(
      "Invalid foundation discovery completeness: remainingRequiredCount",
    );
  if (
    !Array.isArray(record.missingRequiredQuestionIds) ||
    !record.missingRequiredQuestionIds.every((item) => typeof item === "string")
  ) {
    throw new Error(
      "Invalid foundation discovery completeness: missingRequiredQuestionIds",
    );
  }
  return value as FoundationDiscoveryCompleteness;
}

export function validateFoundationDiscoveryAdaptiveQuestionList(
  value: unknown,
): FoundationDiscoveryAdaptiveQuestionList {
  if (typeof value !== "object" || value === null)
    throw new Error(
      "Invalid foundation discovery question list: expected object",
    );
  assertSchemaVersion(
    value,
    "foundation discovery question list",
    FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0)
    throw new Error("Invalid foundation discovery question list: workshopId");
  if (typeof record.effort !== "string" || !EFFORTS.has(record.effort)) {
    throw new Error("Invalid foundation discovery question list: effort");
  }
  if (!Array.isArray(record.questions))
    throw new Error("Invalid foundation discovery question list: questions");
  return {
    schemaVersion: FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
    workshopId: record.workshopId,
    effort: record.effort as FoundationDiscoveryAdaptiveQuestionList["effort"],
    questions: record.questions.map((item) => validateFoundationQuestion(item)),
  };
}

function validateProposedQuestion(
  value: unknown,
): FoundationDiscoveryProposedQuestion {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation discovery proposal: expected object");
  const record = value as Record<string, unknown>;
  if (
    typeof record.source !== "string" ||
    !PROPOSAL_SOURCES.has(record.source)
  ) {
    throw new Error("Invalid foundation discovery proposal: source");
  }
  return {
    question: validateFoundationQuestion(record.question),
    source: record.source as FoundationDiscoveryProposedQuestion["source"],
    ...(typeof record.provenanceRef === "string"
      ? { provenanceRef: record.provenanceRef }
      : {}),
  };
}

function validateDiscoveryVisibility(
  value: unknown,
): FoundationDiscoveryVisibility {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation discovery visibility: expected object");
  const record = value as Record<string, unknown>;
  if (typeof record.adapterId !== "string" || record.adapterId.length === 0)
    throw new Error("Invalid foundation discovery visibility: adapterId");
  if (typeof record.provider !== "string" || record.provider.length === 0)
    throw new Error("Invalid foundation discovery visibility: provider");
  if (typeof record.model !== "string" || record.model.length === 0)
    throw new Error("Invalid foundation discovery visibility: model");
  if (typeof record.effort !== "string" || !EFFORTS.has(record.effort))
    throw new Error("Invalid foundation discovery visibility: effort");
  if (
    typeof record.networkMode !== "string" ||
    !NETWORK_MODES.has(record.networkMode)
  ) {
    throw new Error("Invalid foundation discovery visibility: networkMode");
  }
  return {
    adapterId: record.adapterId,
    provider: record.provider,
    model: record.model,
    effort: record.effort as FoundationDiscoveryVisibility["effort"],
    networkMode:
      record.networkMode as FoundationDiscoveryVisibility["networkMode"],
    dataPolicy: validateHarnessAgentDataPolicy(record.dataPolicy),
  };
}

export function validateFoundationDiscoveryTurnResult(
  value: unknown,
): FoundationDiscoveryTurnResult {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation discovery turn: expected object");
  assertSchemaVersion(
    value,
    "foundation discovery turn",
    FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0)
    throw new Error("Invalid foundation discovery turn: workshopId");
  if (typeof record.turnIndex !== "number")
    throw new Error("Invalid foundation discovery turn: turnIndex");
  if (
    typeof record.agentStatus !== "string" ||
    !AGENT_STATUSES.has(record.agentStatus)
  ) {
    throw new Error("Invalid foundation discovery turn: agentStatus");
  }
  if (record.workshopUnchanged !== true)
    throw new Error("Invalid foundation discovery turn: workshopUnchanged");
  if (!Array.isArray(record.proposedQuestions))
    throw new Error("Invalid foundation discovery turn: proposedQuestions");
  if (!Array.isArray(record.diagnostics))
    throw new Error("Invalid foundation discovery turn: diagnostics");
  return {
    schemaVersion: FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
    workshopId: record.workshopId,
    turnIndex: record.turnIndex,
    visibility: validateDiscoveryVisibility(record.visibility),
    proposedQuestions: record.proposedQuestions.map((item) =>
      validateProposedQuestion(item),
    ),
    completeness: validateFoundationDiscoveryCompleteness(record.completeness),
    agentStatus:
      record.agentStatus as FoundationDiscoveryTurnResult["agentStatus"],
    diagnostics: record.diagnostics as readonly string[],
    workshopUnchanged: true,
  };
}
