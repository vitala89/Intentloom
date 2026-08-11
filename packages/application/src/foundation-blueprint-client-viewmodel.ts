import type {
  FoundationBlueprintApprovalRecord,
  FoundationBlueprintCandidate,
  FoundationBlueprintCompareResult,
  FoundationBlueprintProposalResult,
  FoundationBlueprintTier,
} from "@intentloom/protocol";
import type { FoundationClientSurfaceState } from "./foundation-client-viewmodel.js";

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
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationBlueprintCompareViewModel {
  readonly workshopId: string;
  readonly leftTier: FoundationBlueprintTier;
  readonly rightTier: FoundationBlueprintTier;
  readonly topologyMatch: boolean;
  readonly packDifferences: readonly string[];
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationBlueprintApprovalViewModel {
  readonly workshopId: string;
  readonly tier: FoundationBlueprintTier;
  readonly status: string;
  readonly approver: string;
  readonly approvedAt: number;
  readonly expiry: number;
  readonly surfaceState: FoundationClientSurfaceState;
}

function mapCandidate(
  candidate: FoundationBlueprintCandidate,
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

export function buildFoundationBlueprintProposalViewModel(
  proposal: FoundationBlueprintProposalResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationBlueprintProposalViewModel {
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
    surfaceState,
  };
}

export function buildFoundationBlueprintCompareViewModel(
  compare: FoundationBlueprintCompareResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationBlueprintCompareViewModel {
  return {
    workshopId: compare.workshopId,
    leftTier: compare.leftTier,
    rightTier: compare.rightTier,
    topologyMatch: compare.topologyMatch,
    packDifferences: compare.packDifferences,
    surfaceState,
  };
}

export function buildFoundationBlueprintApprovalViewModel(
  record: FoundationBlueprintApprovalRecord,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationBlueprintApprovalViewModel {
  return {
    workshopId: record.workshopId,
    tier: record.tier,
    status: record.approval.status,
    approver: record.approval.approver,
    approvedAt: record.approval.approvedAt,
    expiry: record.approval.expiry,
    surfaceState,
  };
}
