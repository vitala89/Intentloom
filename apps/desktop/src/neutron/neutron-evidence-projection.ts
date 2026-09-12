import type {
  NeutronGraphSnapshot,
  NeutronGraphUsageSnapshot,
  NeutronSessionViewmodel,
} from "@intentloom/protocol";
import {
  authoritativeNeutronOutcome,
  type NeutronAuthoritativeOutcome,
} from "./neutron-evidence-outcome.js";

export interface NeutronEvidenceUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly contextTokens: number | null;
  readonly tokenBudget: number | null;
  readonly limitExceeded: boolean;
  readonly totalTokens: number | null;
}

export interface NeutronEvidenceFingerprints {
  readonly projectBefore: string | null;
  readonly projectAfter: string | null;
  readonly graphOutputDigest: string | null;
  readonly staleMismatches: readonly {
    readonly kind: string;
    readonly expected: string;
    readonly current: string;
  }[];
}

export interface NeutronEvidenceCounts {
  readonly toolInvocations: number;
  readonly contextSourcesIncluded: number;
  readonly contextSourcesExcluded: number;
  readonly graphNodes: number;
  readonly warnings: number;
}

export interface NeutronEvidenceProjection {
  readonly outcome: NeutronAuthoritativeOutcome;
  readonly usage: NeutronEvidenceUsage;
  readonly fingerprints: NeutronEvidenceFingerprints;
  readonly warnings: readonly string[];
  readonly counts: NeutronEvidenceCounts;
  readonly graphId: string | null;
  readonly providerKind: string;
  readonly modelId: string;
}

export function projectNeutronEvidence(
  viewmodel: NeutronSessionViewmodel,
): NeutronEvidenceProjection | null {
  const outcome = authoritativeNeutronOutcome(viewmodel);
  if (outcome === null) return null;
  const graph = viewmodel.graphSnapshot;
  return {
    counts: evidenceCounts(viewmodel, graph),
    fingerprints: evidenceFingerprints(viewmodel, graph),
    graphId: graph?.graphId ?? null,
    modelId: viewmodel.adapter.modelId,
    outcome,
    providerKind: viewmodel.adapter.providerKind,
    usage: evidenceUsage(viewmodel, graph),
    warnings: collectWarnings(viewmodel, graph),
  };
}

function evidenceUsage(
  viewmodel: NeutronSessionViewmodel,
  graph: NeutronGraphSnapshot | null,
): NeutronEvidenceUsage {
  const graphUsage = graph?.usage ?? null;
  const context = viewmodel.contextSummary;
  if (graphUsage !== null) return usageFromGraph(graphUsage);
  if (context === null) {
    return emptyUsage();
  }
  return {
    contextTokens: context.contextTokens,
    inputTokens: null,
    limitExceeded: context.limitExceeded,
    outputTokens: null,
    tokenBudget: context.tokenBudget,
    totalTokens: context.estimatedTokens,
  };
}

function usageFromGraph(
  usage: NeutronGraphUsageSnapshot,
): NeutronEvidenceUsage {
  return {
    contextTokens: usage.contextTokens,
    inputTokens: usage.inputTokens,
    limitExceeded: usage.limitExceeded,
    outputTokens: usage.outputTokens,
    tokenBudget: usage.tokenBudget,
    totalTokens: usage.inputTokens + usage.outputTokens + usage.contextTokens,
  };
}

function emptyUsage(): NeutronEvidenceUsage {
  return {
    contextTokens: null,
    inputTokens: null,
    limitExceeded: false,
    outputTokens: null,
    tokenBudget: null,
    totalTokens: null,
  };
}

function evidenceFingerprints(
  viewmodel: NeutronSessionViewmodel,
  graph: NeutronGraphSnapshot | null,
): NeutronEvidenceFingerprints {
  return {
    graphOutputDigest: graph?.outputDigest ?? null,
    projectAfter: viewmodel.projectFingerprintAfter,
    projectBefore: viewmodel.projectFingerprintBefore,
    staleMismatches: graph?.stale?.mismatches ?? [],
  };
}

function collectWarnings(
  viewmodel: NeutronSessionViewmodel,
  graph: NeutronGraphSnapshot | null,
): readonly string[] {
  const warnings = [...(graph?.warnings ?? [])];
  if (graph?.budgetExceeded === true && !warnings.includes("budget-exceeded")) {
    warnings.push("budget-exceeded");
  }
  if (viewmodel.contextSummary?.limitExceeded === true) {
    warnings.push("context-budget-exceeded");
  }
  return [...new Set(warnings)];
}

function evidenceCounts(
  viewmodel: NeutronSessionViewmodel,
  graph: NeutronGraphSnapshot | null,
): NeutronEvidenceCounts {
  const toolInvocations =
    graph?.nodes.reduce((sum, node) => sum + node.toolInvocations.length, 0) ??
    viewmodel.toolActivity.length;
  return {
    contextSourcesExcluded: viewmodel.contextSummary?.excludedCount ?? 0,
    contextSourcesIncluded: viewmodel.contextSummary?.includedCount ?? 0,
    graphNodes: graph?.nodeCounts.total ?? 0,
    toolInvocations,
    warnings: collectWarnings(viewmodel, graph).length,
  };
}
