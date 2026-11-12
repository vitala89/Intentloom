import type { AdapterName } from "@intentloom/core";
import type { TransactionStage } from "../generated-file/transaction-contracts.js";
import type { Plan } from "../project-change.js";
import type { ProfileDetectionResult } from "../project-profile-detection.js";

export type AdoptionAction =
  | "create"
  | "map-existing-project-owned"
  | "map-existing-aif-compatible-document"
  | "generated-candidate"
  | "conflict"
  | "unsupported"
  | "skip"
  | "manual-decision-required";

export interface AdoptionProposalItem {
  readonly path: string;
  readonly action: AdoptionAction;
  readonly currentClassification:
    "absent" | "project-owned" | "aif-owned" | "aif-metadata";
  readonly proposedClassification:
    | "aif-generated"
    | "aif-metadata"
    | "project-owned"
    | "project-owned-documentation"
    | "unsupported";
  readonly reason: string;
  readonly canonicalSource: string | null;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
  readonly conflictDetails: readonly string[];
  readonly writeEligible: boolean;
  readonly manualDecisionRequired: boolean;
  readonly safeNextAction: string;
}

export interface AdoptionProposal extends Plan {
  readonly kind: "adoption-proposal";
  readonly items: readonly AdoptionProposalItem[];
  readonly profileDetection: ProfileDetectionResult;
  readonly applied: boolean;
  readonly applicationStatus:
    | "not-requested"
    | "blocked"
    | "applied"
    | "failed-restored"
    | "failed-incomplete";
  readonly transactionOutcome: AdoptionTransactionOutcome | null;
}

export interface AdoptionTransactionOutcome {
  readonly status: "success" | "failed";
  readonly failedStage: TransactionStage | null;
  readonly errorCode: string | null;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly diagnostics: readonly string[];
}
