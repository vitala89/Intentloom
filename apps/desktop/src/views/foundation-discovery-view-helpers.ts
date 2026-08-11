import type { FoundationDiscoveryTurnResult } from "@intentloom/protocol";

export interface FoundationDiscoveryProposedQuestionRow {
  readonly id: string;
  readonly prompt: string;
  readonly category: string;
  readonly required: boolean;
  readonly source: string;
}

export interface FoundationDiscoveryTurnViewModel {
  readonly workshopId: string;
  readonly turnIndex: number;
  readonly agentStatus: string;
  readonly workshopUnchanged: true;
  readonly visibility: {
    readonly adapterId: string;
    readonly provider: string;
    readonly model: string;
    readonly effort: string;
    readonly networkMode: string;
    readonly credentialSource: string;
    readonly retention: string;
  };
  readonly proposedQuestions: readonly FoundationDiscoveryProposedQuestionRow[];
  readonly completeness: {
    readonly isComplete: boolean;
    readonly remainingRequiredCount: number;
    readonly missingRequiredQuestionIds: readonly string[];
  };
  readonly diagnostics: readonly string[];
}

export function extractDiscoveryTurnViewmodel(
  payload: unknown,
): FoundationDiscoveryTurnResult {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid foundation discovery turn viewmodel");
  }
  return payload as FoundationDiscoveryTurnResult;
}

export function buildDiscoveryTurnProgress(
  payload: unknown,
): FoundationDiscoveryTurnViewModel {
  const turn = extractDiscoveryTurnViewmodel(payload);
  return {
    workshopId: turn.workshopId,
    turnIndex: turn.turnIndex,
    agentStatus: turn.agentStatus,
    workshopUnchanged: true,
    visibility: {
      adapterId: turn.visibility.adapterId,
      provider: turn.visibility.provider,
      model: turn.visibility.model,
      effort: turn.visibility.effort,
      networkMode: turn.visibility.networkMode,
      credentialSource: turn.visibility.dataPolicy.credentialSource,
      retention: turn.visibility.dataPolicy.retention,
    },
    proposedQuestions: turn.proposedQuestions.map((entry) => ({
      id: entry.question.id,
      prompt: entry.question.prompt,
      category: entry.question.category,
      required: entry.question.required,
      source: entry.source,
    })),
    completeness: {
      isComplete: turn.completeness.isComplete,
      remainingRequiredCount: turn.completeness.remainingRequiredCount,
      missingRequiredQuestionIds: turn.completeness.missingRequiredQuestionIds,
    },
    diagnostics: turn.diagnostics,
  };
}
