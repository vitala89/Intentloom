import type {
  FoundationDiscoveryAdaptiveQuestionList,
  FoundationDiscoveryTurnResult,
} from "@intentloom/protocol";
import type { FoundationClientSurfaceState } from "./foundation-client-viewmodel.js";

export interface FoundationDiscoveryProposedQuestionRow {
  readonly id: string;
  readonly prompt: string;
  readonly category: string;
  readonly required: boolean;
  readonly source: string;
}

export interface FoundationDiscoveryVisibilityViewModel {
  readonly adapterId: string;
  readonly provider: string;
  readonly model: string;
  readonly effort: string;
  readonly networkMode: string;
  readonly credentialSource: string;
  readonly retention: string;
}

export interface FoundationDiscoveryCompletenessViewModel {
  readonly isComplete: boolean;
  readonly remainingRequiredCount: number;
  readonly missingRequiredQuestionIds: readonly string[];
}

export interface FoundationDiscoveryTurnViewModel {
  readonly workshopId: string;
  readonly turnIndex: number;
  readonly agentStatus: string;
  readonly workshopUnchanged: true;
  readonly visibility: FoundationDiscoveryVisibilityViewModel;
  readonly proposedQuestions: readonly FoundationDiscoveryProposedQuestionRow[];
  readonly completeness: FoundationDiscoveryCompletenessViewModel;
  readonly diagnostics: readonly string[];
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationDiscoveryQuestionsViewModel {
  readonly workshopId: string;
  readonly effort: string;
  readonly questions: readonly FoundationDiscoveryProposedQuestionRow[];
  readonly surfaceState: FoundationClientSurfaceState;
}

function mapProposedQuestion(
  input: FoundationDiscoveryTurnResult["proposedQuestions"][number],
): FoundationDiscoveryProposedQuestionRow {
  return {
    id: input.question.id,
    prompt: input.question.prompt,
    category: input.question.category,
    required: input.question.required,
    source: input.source,
  };
}

export function buildFoundationDiscoveryTurnViewModel(
  turn: FoundationDiscoveryTurnResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationDiscoveryTurnViewModel {
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
    proposedQuestions: turn.proposedQuestions.map(mapProposedQuestion),
    completeness: {
      isComplete: turn.completeness.isComplete,
      remainingRequiredCount: turn.completeness.remainingRequiredCount,
      missingRequiredQuestionIds: turn.completeness.missingRequiredQuestionIds,
    },
    diagnostics: turn.diagnostics,
    surfaceState,
  };
}

export function buildFoundationDiscoveryQuestionsViewModel(
  list: FoundationDiscoveryAdaptiveQuestionList,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationDiscoveryQuestionsViewModel {
  return {
    workshopId: list.workshopId,
    effort: list.effort,
    questions: list.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      required: question.required,
      source: "deterministic",
    })),
    surfaceState,
  };
}
