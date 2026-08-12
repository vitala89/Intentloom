import { relative, resolve } from "node:path";
import type {
  FeatureIntent,
  FeatureIntentAffectedScope,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { getFirstPartySpecializedPackEntries } from "./engineering-quality/first-party-specialized-pack-runtime.js";
import { resolveFirstPartySpecializedPackDetection } from "./engineering-quality/specialized-pack-catalog-engine.js";
import {
  createGraphSnapshotFromTypeScriptWorkspace,
  resolveAffectedEngineeringScopes,
} from "./engineering-quality/graph-provider.js";
import { detectNxWorkspace } from "./engineering-quality/nx-graph.js";

const DEFAULT_MAX_PATHS = 5000;

export interface ResolveAffectedScopeOptions {
  readonly root: string;
  readonly intent: FeatureIntent;
}

function normalizeRelative(root: string, absolutePath: string): string {
  return relative(root, absolutePath).replaceAll("\\", "/");
}

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function packageIdFromPath(relativePath: string): string | undefined {
  const parts = relativePath.split("/");
  if ((parts[0] === "packages" || parts[0] === "apps") && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return undefined;
}

function isPublicApi(relativePath: string): boolean {
  return (
    relativePath.endsWith("/src/index.ts") || relativePath === "src/index.ts"
  );
}

function isDecisionPath(relativePath: string): boolean {
  return (
    relativePath.startsWith("docs/decisions/") ||
    relativePath.includes("/adr/") ||
    relativePath.startsWith("docs/adr/")
  );
}

function isFoundationMarker(relativePath: string): boolean {
  return (
    relativePath === ".aif/config.yaml" ||
    relativePath.startsWith(".aif/") ||
    relativePath === "docs/decisions"
  );
}

export async function resolveAffectedScope(
  options: ResolveAffectedScopeOptions,
  fs: FileSystem,
): Promise<FeatureIntentAffectedScope> {
  const root = resolve(options.root);
  const listed = (await fs.list(root)).slice(0, DEFAULT_MAX_PATHS);
  const relativePaths = listed.map((absolutePath) =>
    normalizeRelative(root, absolutePath),
  );
  const tokens = tokenize(`${options.intent.title} ${options.intent.summary}`);
  const packages = [
    ...new Set(
      relativePaths
        .map(packageIdFromPath)
        .filter((value): value is string => value !== undefined),
    ),
  ].sort();
  const matchedPaths = relativePaths.filter((path) =>
    tokens.some((token) => path.toLowerCase().includes(token)),
  );
  const publicApiSurfaces = relativePaths.filter(isPublicApi).sort();
  const decisionPaths = relativePaths.filter(isDecisionPath).sort();
  const graphPackages = (packages.length > 0 ? packages : ["."]).map(
    (packageId) => ({
      name: packageId,
      path: packageId === "." ? root : `${root}/${packageId}`,
    }),
  );
  const snapshot = createGraphSnapshotFromTypeScriptWorkspace({
    projectRoot: root,
    packages: graphPackages,
  });
  const selectors =
    matchedPaths.length > 0
      ? graphPackages
          .filter((entry) =>
            matchedPaths.some(
              (path) =>
                path === entry.name || path.startsWith(`${entry.name}/`),
            ),
          )
          .map((entry) => entry.name)
      : graphPackages.map((entry) => entry.name);
  const graphNodeIds = resolveAffectedEngineeringScopes(
    snapshot,
    selectors.length > 0 ? selectors : graphPackages.map((entry) => entry.name),
  );
  const specialized = resolveFirstPartySpecializedPackDetection({
    projectPaths: listed,
    entries: getFirstPartySpecializedPackEntries(),
    maxPaths: DEFAULT_MAX_PATHS,
  });
  const nx = detectNxWorkspace({ workspaceRoot: root, files: relativePaths });
  return {
    packages: packages.length > 0 ? packages : ["."],
    matchedPaths,
    publicApiSurfaces,
    graphNodeIds,
    graphProviderKind: nx.detected ? "nx-workspace" : snapshot.providerKind,
    specializedPackIds: specialized.compatiblePackIds,
    decisionPaths,
    foundationPresent: relativePaths.some(isFoundationMarker),
  };
}
