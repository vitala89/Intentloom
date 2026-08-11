import { randomUUID } from "node:crypto";
import type {
  FoundationDiscoveryEffort,
  FoundationDiscoveryNetworkMode,
  FoundationDiscoveryProposedQuestion,
  FoundationDiscoveryTurnResult,
  FoundationDiscoveryVisibility,
  HarnessAgentResultStatus,
} from "@intentloom/protocol";
import { FOUNDATION_DISCOVERY_TURN_SCHEMA_URN } from "@intentloom/protocol";
import { validateFoundationDiscoveryTurnResult } from "@intentloom/validator";
import type { HarnessAgentAdapter } from "./harness-agent.js";
import { executeHarnessAgent } from "./harness-agent.js";
import { createFakeHarnessAgentAdapter } from "./harness-agent-fake.js";
import {
  evaluateFoundationDiscoveryCompleteness,
  generateAdaptiveFoundationQuestions,
} from "./foundation-discovery.js";
import {
  getFoundationWorkshop,
  listFoundationQuestions,
} from "./foundation-workshop.js";

export interface RunFoundationDiscoveryTurnOptions {
  readonly effort?: FoundationDiscoveryEffort;
  readonly modelProfile?: string;
  readonly turnIndex?: number;
  readonly adapter?: HarnessAgentAdapter;
  readonly signal?: AbortSignal;
}

function mapNetworkMode(
  adapter: HarnessAgentAdapter,
): FoundationDiscoveryNetworkMode {
  return adapter.dataPolicy.networkAccess === "disabled"
    ? "disabled"
    : "explicit";
}

function buildVisibility(
  adapter: HarnessAgentAdapter,
  effort: FoundationDiscoveryEffort,
  modelProfile?: string,
): FoundationDiscoveryVisibility {
  return {
    adapterId: adapter.adapterId,
    provider: adapter.mode === "offline" ? "local-offline" : adapter.adapterId,
    model: modelProfile ?? "offline-deterministic",
    effort,
    networkMode: mapNetworkMode(adapter),
    dataPolicy: adapter.dataPolicy,
  };
}

function mapAgentStatus(
  status: HarnessAgentResultStatus,
): FoundationDiscoveryTurnResult["agentStatus"] {
  return status;
}

function buildProposedQuestions(
  workshopId: string,
  effort: FoundationDiscoveryEffort,
  agentRequestId: string,
): readonly FoundationDiscoveryProposedQuestion[] {
  const workshop = getFoundationWorkshop(workshopId);
  const adaptive = generateAdaptiveFoundationQuestions(workshop, { effort });
  return adaptive.map((question) => ({
    question,
    source: "deterministic" as const,
    provenanceRef: `${agentRequestId}:deterministic`,
  }));
}

export async function runFoundationDiscoveryTurn(
  workshopId: string,
  options: RunFoundationDiscoveryTurnOptions = {},
): Promise<FoundationDiscoveryTurnResult> {
  const workshop = getFoundationWorkshop(workshopId);
  const effort: FoundationDiscoveryEffort = options.effort ?? "medium";
  const turnIndex = options.turnIndex ?? 0;
  const adapter =
    options.adapter ??
    createFakeHarnessAgentAdapter({
      adapterId: "fake-offline-neutron-discovery",
    });
  const requestId = randomUUID();
  const pending = listFoundationQuestions(workshopId, { pendingOnly: true });

  const agentResult = await executeHarnessAgent({
    adapter,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
    request: {
      schemaVersion: 1,
      requestId,
      input: JSON.stringify({
        kind: "foundation-discovery-turn",
        workshopId,
        idea: workshop.idea,
        pendingQuestionIds: pending.pendingQuestionIds,
        effort,
      }),
      responseFormat: "text",
      requirements: {
        requiredFeatures: ["structured-output", "deterministic-settings"],
        estimatedInputTokens: 512,
        maxOutputTokens: 512,
      },
    },
  });

  const proposedQuestions = buildProposedQuestions(
    workshopId,
    effort,
    requestId,
  );
  const completeness = evaluateFoundationDiscoveryCompleteness(workshop);

  return validateFoundationDiscoveryTurnResult({
    schemaVersion: FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
    workshopId,
    turnIndex,
    visibility: buildVisibility(adapter, effort, options.modelProfile),
    proposedQuestions,
    completeness,
    agentStatus: mapAgentStatus(agentResult.status),
    diagnostics: [
      ...agentResult.diagnostics,
      `adaptive-proposals:${proposedQuestions.length}`,
      `discovery-effort:${effort}`,
    ],
    workshopUnchanged: true,
  });
}
