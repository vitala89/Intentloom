import type { FoundationQuestion } from "./foundation-workshop.js";
import type { HarnessAgentDataPolicy } from "./harness-agent.js";

export type FoundationDiscoveryEffort = "low" | "medium" | "high";

export type FoundationDiscoveryNetworkMode = "disabled" | "explicit";

export type FoundationDiscoveryProposalSource =
  "deterministic" | "agent-proposed";

export interface FoundationDiscoveryOptions {
  readonly effort?: FoundationDiscoveryEffort;
  readonly adapterId?: string;
  readonly modelProfile?: string;
  readonly networkMode?: FoundationDiscoveryNetworkMode;
  readonly maxTurnBudget?: number;
}

export interface FoundationDiscoveryProposedQuestion {
  readonly question: FoundationQuestion;
  readonly source: FoundationDiscoveryProposalSource;
  readonly provenanceRef?: string;
}

export interface FoundationDiscoveryVisibility {
  readonly adapterId: string;
  readonly provider: string;
  readonly model: string;
  readonly effort: FoundationDiscoveryEffort;
  readonly networkMode: FoundationDiscoveryNetworkMode;
  readonly dataPolicy: HarnessAgentDataPolicy;
}

export interface FoundationDiscoveryCompleteness {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly isComplete: boolean;
  readonly remainingRequiredCount: number;
  readonly missingRequiredQuestionIds: readonly string[];
}

export interface FoundationDiscoveryAdaptiveQuestionList {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly effort: FoundationDiscoveryEffort;
  readonly questions: readonly FoundationQuestion[];
}

export type FoundationDiscoveryAgentStatus =
  "completed" | "cancelled" | "error" | "unsupported";

export interface FoundationDiscoveryTurnResult {
  readonly schemaVersion: string;
  readonly workshopId: string;
  readonly turnIndex: number;
  readonly visibility: FoundationDiscoveryVisibility;
  readonly proposedQuestions: readonly FoundationDiscoveryProposedQuestion[];
  readonly completeness: FoundationDiscoveryCompleteness;
  readonly agentStatus: FoundationDiscoveryAgentStatus;
  readonly diagnostics: readonly string[];
  readonly workshopUnchanged: true;
}
