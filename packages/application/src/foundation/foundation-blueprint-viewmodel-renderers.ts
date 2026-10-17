import type {
  FoundationBlueprintApprovalViewModel,
  FoundationBlueprintCompareViewModel,
  FoundationBlueprintProposalViewModel,
} from "./foundation-blueprint-client-viewmodel.js";

export function renderFoundationBlueprintProposalText(
  vm: FoundationBlueprintProposalViewModel,
): string {
  const lines = [
    `Foundation blueprint proposal: ${vm.workshopId}`,
    `Recommended topology: ${vm.recommendedTopology}`,
    `Recommended tier: ${vm.recommendedTier}`,
    `Digest: ${vm.digest}`,
    `Workshop unchanged: ${vm.workshopUnchanged ? "yes" : "no"}`,
    `Candidates: ${vm.candidates.length}`,
    `Surface state: ${vm.surfaceState}`,
  ];

  for (const candidate of vm.candidates) {
    lines.push(
      `  - [${candidate.tier}] ${candidate.topology} (${candidate.packCount} packs, ${candidate.complexity}/${candidate.reversibility})`,
    );
    lines.push(`    ${candidate.rationale}`);
  }

  return lines.join("\n");
}

export function renderFoundationBlueprintCompareText(
  vm: FoundationBlueprintCompareViewModel,
): string {
  const lines = [
    `Foundation blueprint compare: ${vm.workshopId}`,
    `Left tier: ${vm.leftTier}`,
    `Right tier: ${vm.rightTier}`,
    `Topology match: ${vm.topologyMatch ? "yes" : "no"}`,
    `Pack differences: ${vm.packDifferences.length}`,
    `Surface state: ${vm.surfaceState}`,
  ];
  if (vm.packDifferences.length > 0) {
    lines.push(`Differences: ${vm.packDifferences.join(", ")}`);
  }
  return lines.join("\n");
}

export function renderFoundationBlueprintApprovalText(
  vm: FoundationBlueprintApprovalViewModel,
): string {
  return [
    `Foundation blueprint approval: ${vm.workshopId}`,
    `Tier: ${vm.tier}`,
    `Status: ${vm.status}`,
    `Approver: ${vm.approver}`,
    `Approved at: ${vm.approvedAt}`,
    `Expiry: ${vm.expiry}`,
    `Surface state: ${vm.surfaceState}`,
  ].join("\n");
}
