import {
  buildQualityCatalogViewModel,
  buildQualityCheckersViewModel,
  buildQualityGraphViewModel,
  buildQualityStandardsViewModel,
  FIRST_PARTY_CATALOG_ENTRIES,
  getEffectiveEngineeringQualityPolicy,
  loadQualityGraphSnapshot,
  nodeFileSystem,
  QUALITY_CHECKER_ADAPTERS,
  type QualityCatalogViewModel,
  type QualityCheckersViewModel,
  type QualityGraphViewModel,
  type QualityStandardsViewModel,
} from "@intentloom/application";
import {
  assertNonSymlinkRoot,
  McpToolError,
  type McpServerOptions,
} from "./common.js";

export const QUALITY_STANDARDS_TOOL = "intentloom_quality_standards" as const;
export const QUALITY_CATALOG_TOOL = "intentloom_quality_catalog" as const;
export const QUALITY_CHECKERS_TOOL = "intentloom_quality_checkers" as const;
export const QUALITY_GRAPH_TOOL = "intentloom_quality_graph" as const;

const emptyInput = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;

function descriptor(
  name: string,
  description: string,
  outputId: string,
  required: readonly string[],
) {
  return {
    name,
    description,
    inputSchema: emptyInput,
    outputSchema: { $id: outputId, type: "object", required },
    annotations: { "x-intentloom-limits": { configuredRoot: 1, arguments: 0 } },
  } as const;
}

export const qualityStandardsTool = descriptor(
  QUALITY_STANDARDS_TOOL,
  "Read the effective Engineering Quality standards for the configured project root.",
  "urn:intentloom:mcp:quality-standards:output:1",
  [
    "policyId",
    "profileName",
    "rulesCount",
    "findingsCount",
    "baselineItemCount",
    "decompositionOptionCount",
  ],
);

export const qualityCatalogTool = descriptor(
  QUALITY_CATALOG_TOOL,
  "Read the first-party Engineering Quality catalog for the configured project root.",
  "urn:intentloom:mcp:quality-catalog:output:1",
  ["entries", "totalEntries"],
);

export const qualityCheckersTool = descriptor(
  QUALITY_CHECKERS_TOOL,
  "Read the available Engineering Quality checker adapters.",
  "urn:intentloom:mcp:quality-checkers:output:1",
  ["adapters", "defaultAdapterId"],
);

export const qualityGraphTool = descriptor(
  QUALITY_GRAPH_TOOL,
  "Read the project dependency graph for the configured project root.",
  "urn:intentloom:mcp:quality-graph:output:1",
  [
    "providerKind",
    "nodeCount",
    "edgeCount",
    "affectedProjects",
    "accessibleTree",
    "accessibleTable",
  ],
);

function emptyArguments(args: Record<string, unknown>): void {
  if (Object.keys(args).length > 0)
    throw new McpToolError(
      "arguments-invalid",
      "this tool does not accept arguments",
    );
}

export async function qualityStandards(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<QualityStandardsViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  return buildQualityStandardsViewModel({
    policy: getEffectiveEngineeringQualityPolicy(),
  });
}

export async function qualityCatalog(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<QualityCatalogViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  return buildQualityCatalogViewModel(FIRST_PARTY_CATALOG_ENTRIES);
}

export async function qualityCheckers(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<QualityCheckersViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  return buildQualityCheckersViewModel({ adapters: QUALITY_CHECKER_ADAPTERS });
}

export async function qualityGraph(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<QualityGraphViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  const snapshot = await loadQualityGraphSnapshot(options.root, nodeFileSystem);
  return buildQualityGraphViewModel({ snapshot });
}
