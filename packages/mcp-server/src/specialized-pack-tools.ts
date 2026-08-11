import {
  buildSpecializedPackCatalogViewModel,
  buildSpecializedPackDetectionViewModel,
  getFirstPartySpecializedPackEntries,
  nodeFileSystem,
  resolveFirstPartySpecializedPackDetection,
  validateFirstPartySpecializedPackCatalog,
  type SpecializedPackCatalogViewModel,
  type SpecializedPackDetectionViewModel,
} from "@intentloom/application";
import {
  assertNonSymlinkRoot,
  McpToolError,
  type McpServerOptions,
} from "./common.js";

export const SPECIALIZED_PACKS_CATALOG_TOOL =
  "intentloom_specialized_packs_catalog" as const;
export const SPECIALIZED_PACKS_DETECT_TOOL =
  "intentloom_specialized_packs_detect" as const;

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

export const specializedPacksCatalogTool = descriptor(
  SPECIALIZED_PACKS_CATALOG_TOOL,
  "Read the first-party specialized engineering pack catalog for the configured project root.",
  "urn:intentloom:mcp:specialized-packs-catalog:output:1",
  ["entries", "totalEntries"],
);

export const specializedPacksDetectTool = descriptor(
  SPECIALIZED_PACKS_DETECT_TOOL,
  "Detect compatible first-party specialized packs from read-only project paths.",
  "urn:intentloom:mcp:specialized-packs-detect:output:1",
  [
    "scannedPathCount",
    "excludedPathCount",
    "scanLimitReached",
    "compatiblePackIds",
    "candidates",
    "rejectedPackCount",
  ],
);

function emptyArguments(args: Record<string, unknown>): void {
  if (Object.keys(args).length > 0)
    throw new McpToolError(
      "arguments-invalid",
      "this tool does not accept arguments",
    );
}

export async function specializedPacksCatalog(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<SpecializedPackCatalogViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  const catalog = validateFirstPartySpecializedPackCatalog(
    getFirstPartySpecializedPackEntries(),
  );
  return buildSpecializedPackCatalogViewModel(catalog.entries);
}

export async function specializedPacksDetect(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<SpecializedPackDetectionViewModel> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  const projectPaths = (await nodeFileSystem.list(options.root)).slice(0, 5000);
  const resolution = resolveFirstPartySpecializedPackDetection({
    projectPaths,
    entries: getFirstPartySpecializedPackEntries(),
  });
  return buildSpecializedPackDetectionViewModel(resolution);
}
