import type {
  FoundationBlueprintApprovalRecord,
  FoundationBlueprintCompareResult,
  FoundationBlueprintProposalResult,
  FoundationBlueprintTier,
} from "@intentloom/protocol";

export type { FoundationBlueprintTier };

export interface FoundationBlueprintCandidateRow {
  readonly tier: FoundationBlueprintTier;
  readonly topology: string;
  readonly packCount: number;
  readonly packs: readonly string[];
  readonly rationale: string;
  readonly complexity: string;
  readonly reversibility: string;
  readonly migrationNoteCount: number;
  readonly deferredDecisionCount: number;
  readonly digest: string;
}

export interface FoundationBlueprintProposalViewModel {
  readonly workshopId: string;
  readonly recommendedTopology: string;
  readonly recommendedTier: FoundationBlueprintTier;
  readonly digest: string;
  readonly workshopUnchanged: true;
  readonly candidates: readonly FoundationBlueprintCandidateRow[];
}

export interface FoundationBlueprintCompareViewModel {
  readonly workshopId: string;
  readonly leftTier: FoundationBlueprintTier;
  readonly rightTier: FoundationBlueprintTier;
  readonly topologyMatch: boolean;
  readonly packDifferences: readonly string[];
}

export interface FoundationBlueprintApprovalViewModel {
  readonly workshopId: string;
  readonly tier: FoundationBlueprintTier;
  readonly status: string;
  readonly approver: string;
}

function mapCandidate(
  candidate: FoundationBlueprintProposalResult["recommended"],
): FoundationBlueprintCandidateRow {
  return {
    tier: candidate.tier,
    topology: candidate.blueprint.topology,
    packCount: candidate.blueprint.recommendedPacks.length,
    packs: candidate.blueprint.recommendedPacks,
    rationale: candidate.rationale,
    complexity: candidate.metadata.complexity,
    reversibility: candidate.metadata.reversibility,
    migrationNoteCount: candidate.metadata.migrationNotes.length,
    deferredDecisionCount: candidate.metadata.deferredDecisions.length,
    digest: candidate.blueprint.digest,
  };
}

export function buildBlueprintProposalProgress(
  payload: unknown,
): FoundationBlueprintProposalViewModel {
  const proposal = payload as FoundationBlueprintProposalResult;
  if (typeof proposal !== "object" || proposal === null) {
    throw new Error("Invalid foundation blueprint proposal viewmodel");
  }
  const candidates = [
    ...proposal.alternatives.map(mapCandidate),
    mapCandidate(proposal.recommended),
  ].sort((left, right) => left.tier.localeCompare(right.tier));
  return {
    workshopId: proposal.workshopId,
    recommendedTopology: proposal.recommendedTopology,
    recommendedTier: proposal.recommended.tier,
    digest: proposal.digest,
    workshopUnchanged: true,
    candidates,
  };
}

export function buildBlueprintCompareProgress(
  payload: unknown,
): FoundationBlueprintCompareViewModel {
  const compare = payload as FoundationBlueprintCompareResult;
  if (typeof compare !== "object" || compare === null) {
    throw new Error("Invalid foundation blueprint compare viewmodel");
  }
  return {
    workshopId: compare.workshopId,
    leftTier: compare.leftTier,
    rightTier: compare.rightTier,
    topologyMatch: compare.topologyMatch,
    packDifferences: compare.packDifferences,
  };
}

export function buildBlueprintApprovalProgress(
  payload: unknown,
): FoundationBlueprintApprovalViewModel {
  const record = payload as FoundationBlueprintApprovalRecord;
  if (typeof record !== "object" || record === null) {
    throw new Error("Invalid foundation blueprint approval viewmodel");
  }
  return {
    workshopId: record.workshopId,
    tier: record.tier,
    status: record.approval.status,
    approver: record.approval.approver,
  };
}
