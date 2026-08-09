import type {
  CatalogEntry,
  EngineeringQualityBaselinePreview,
  EngineeringQualityDecompositionPlan,
  EngineeringQualityFinding,
  EngineeringQualityPolicy,
  EngineeringGraphSnapshot,
  GraphNode,
} from "@intentloom/protocol";

export interface QualityStandardsViewModel {
  readonly policyId: string;
  readonly profileName: string;
  readonly rulesCount: number;
  readonly findingsCount: number;
  readonly baselineItemCount: number;
  readonly decompositionOptionCount: number;
}

export interface QualityCatalogEntryViewModel {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly trustClass: string;
  readonly supportStatus: string;
  readonly executable: boolean;
  readonly requiresApproval: boolean;
}

export interface QualityCatalogViewModel {
  readonly entries: readonly QualityCatalogEntryViewModel[];
  readonly totalEntries: number;
}

export interface QualityCheckerAdapterViewModel {
  readonly adapterId: string;
  readonly adapterName: string;
  readonly supportedFormats: readonly string[];
}

export interface QualityCheckersViewModel {
  readonly adapters: readonly QualityCheckerAdapterViewModel[];
  readonly defaultAdapterId: string;
}

export interface QualityGraphTreeNode {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly QualityGraphTreeNode[];
}

export interface QualityGraphTableRow {
  readonly projectId: string;
  readonly root: string;
  readonly dependenciesCount: number;
}

export interface QualityGraphViewModel {
  readonly providerKind: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly affectedProjects: readonly string[];
  readonly accessibleTree: readonly QualityGraphTreeNode[];
  readonly accessibleTable: readonly QualityGraphTableRow[];
}

export function buildQualityStandardsViewModel(options: {
  readonly policy: EngineeringQualityPolicy;
  readonly findings?: readonly EngineeringQualityFinding[];
  readonly baselinePreview?: EngineeringQualityBaselinePreview;
  readonly decompositionPlan?: EngineeringQualityDecompositionPlan;
}): QualityStandardsViewModel {
  return {
    policyId: options.policy.policyId,
    profileName: options.policy.profileName,
    rulesCount: options.policy.defaultRules.length,
    findingsCount: options.findings?.length ?? 0,
    baselineItemCount: options.baselinePreview?.candidateItems.length ?? 0,
    decompositionOptionCount: options.decompositionPlan?.options.length ?? 0,
  };
}

export function buildQualityCatalogViewModel(
  catalogEntries: readonly CatalogEntry[],
): QualityCatalogViewModel {
  const entries: QualityCatalogEntryViewModel[] = catalogEntries.map(
    (entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      trustClass: entry.trustClass,
      supportStatus: entry.supportStatus,
      executable: entry.executable,
      requiresApproval: entry.trustClass !== "first-party",
    }),
  );

  return {
    entries,
    totalEntries: entries.length,
  };
}

export function buildQualityCheckersViewModel(options: {
  readonly adapters: readonly {
    adapterId: string;
    adapterName: string;
    supportedReportFormats: readonly string[];
  }[];
}): QualityCheckersViewModel {
  const adapters: QualityCheckerAdapterViewModel[] = options.adapters.map(
    (a) => ({
      adapterId: a.adapterId,
      adapterName: a.adapterName,
      supportedFormats: a.supportedReportFormats,
    }),
  );

  return {
    adapters,
    defaultAdapterId: adapters[0]?.adapterId ?? "eslint-json",
  };
}

export function buildQualityGraphViewModel(options: {
  readonly snapshot: EngineeringGraphSnapshot;
  readonly affectedProjects?: readonly string[];
}): QualityGraphViewModel {
  const nodes = options.snapshot.nodes;
  const edges = options.snapshot.edges;

  const accessibleTable: QualityGraphTableRow[] = nodes.map((n: GraphNode) => {
    const deps = edges.filter((e) => e.source === n.id);
    return {
      projectId: n.id,
      root: n.path ?? n.name,
      dependenciesCount: deps.length,
    };
  });

  const accessibleTree: QualityGraphTreeNode[] = nodes.map((n: GraphNode) => {
    const deps = edges.filter((e) => e.source === n.id);
    return {
      id: n.id,
      label: `${n.id} (${n.path ?? n.name})`,
      children: deps.map((e) => ({
        id: `${n.id}->${e.target}`,
        label: `depends on ${e.target}`,
      })),
    };
  });

  return {
    providerKind: options.snapshot.providerKind,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    affectedProjects: options.affectedProjects ?? [],
    accessibleTree,
    accessibleTable,
  };
}
