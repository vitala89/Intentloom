import type {
  QualityCatalogViewModel,
  QualityGraphViewModel,
  QualityStandardsViewModel,
} from "./viewmodel.js";

export function renderQualityStandardsSummaryText(
  vm: QualityStandardsViewModel,
): string {
  return [
    `Policy ID: ${vm.policyId}`,
    `Profile: ${vm.profileName}`,
    `Rules: ${vm.rulesCount}`,
    `Active Findings: ${vm.findingsCount}`,
    `Baseline Items: ${vm.baselineItemCount}`,
    `Decomposition Options: ${vm.decompositionOptionCount}`,
  ].join("\n");
}

export function renderQualityCatalogTreeText(
  vm: QualityCatalogViewModel,
): string {
  const lines: string[] = [`Catalog Entries (${vm.totalEntries}):`];
  for (const entry of vm.entries) {
    const approval = entry.requiresApproval ? " [Requires Approval]" : "";
    lines.push(
      `  - ${entry.id}@${entry.version} (${entry.name}) [${entry.trustClass}]${approval}`,
    );
  }
  return lines.join("\n");
}

export function renderQualityGraphAccessibleText(
  vm: QualityGraphViewModel,
): string {
  const lines: string[] = [
    `Graph Topology (${vm.providerKind}): ${vm.nodeCount} nodes, ${vm.edgeCount} edges`,
    `Affected Projects (${vm.affectedProjects.length}): ${vm.affectedProjects.join(", ") || "none"}`,
    "Projects:",
  ];

  for (const row of vm.accessibleTable) {
    lines.push(
      `  - ${row.projectId} (root: ${row.root}, deps: ${row.dependenciesCount})`,
    );
  }

  return lines.join("\n");
}

export function renderApprovalPreviewText(
  type: "baseline" | "activation" | "decomposition",
  details: {
    readonly id: string;
    readonly summary: string;
    readonly requiresApproval: boolean;
  },
): string {
  const badge = details.requiresApproval
    ? "[APPROVAL REQUIRED]"
    : "[AUTO-APPROVED]";
  return `Approval Preview [${type.toUpperCase()}] ${badge}\nID: ${details.id}\nSummary: ${details.summary}`;
}
