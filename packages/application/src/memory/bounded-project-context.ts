import { relative } from "node:path";
import {
  validateContextRetrievalRequest,
  validateContextRetrievalResult,
  type ContextRetrievalRequest,
  type ContextRetrievalResult,
  type ContextSource,
  type ContextSourceType,
  type TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

const contextPathExclusionPatterns = [
  /\.env$/u,
  /\.env\./u,
  /\.pem$/u,
  /\.key$/u,
  /credentials\.json$/u,
  /id_rsa$/u,
  /id_ed25519$/u,
  /\.git\//u,
  /node_modules\//u,
];

interface ClassifiedContextPath {
  readonly type: ContextSourceType;
  readonly trustClass: TrustClass;
}

interface BoundedContextCandidateScan {
  readonly items: ContextSource[];
  readonly excludedPathsCount: number;
}

interface BoundedContextSelection {
  readonly items: ContextSource[];
  readonly totalTokens: number;
}

function normalizeListedContextPath(root: string, rawPath: string): string {
  const relativePath = rawPath.startsWith(root)
    ? relative(root, rawPath)
    : rawPath;
  return relativePath.replaceAll("\\", "/");
}

function isExcludedContextPath(normalizedPath: string): boolean {
  return contextPathExclusionPatterns.some((pattern) =>
    pattern.test(normalizedPath),
  );
}

function classifyBoundedContextPath(
  normalizedPath: string,
): ClassifiedContextPath | null {
  if (normalizedPath.startsWith("docs/specs/")) {
    return { type: "intent", trustClass: "canonical-policy" };
  }
  if (normalizedPath.startsWith("docs/decisions/")) {
    return { type: "adr", trustClass: "canonical-policy" };
  }
  if (normalizedPath.startsWith("docs/")) {
    return { type: "documentation", trustClass: "verified-evidence" };
  }
  if (
    normalizedPath === "PROJECT_STATE.md" ||
    normalizedPath === "DUTY_WATCH.md"
  ) {
    return { type: "ownership", trustClass: "verified-evidence" };
  }
  if (normalizedPath.startsWith(".aif/memory/")) {
    return { type: "evidence", trustClass: "verified-evidence" };
  }
  return null;
}

function contextSourceMatchesQuery(
  normalizedPath: string,
  content: string,
  query: string | undefined,
): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  return (
    normalizedPath.toLowerCase().includes(normalizedQuery) ||
    content.toLowerCase().includes(normalizedQuery)
  );
}

function summarizeBoundedContextContent(content: string): string {
  return content.slice(0, 150).replace(/\n+/gu, " ").trim();
}

function estimateBoundedContextTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function resolveListedContextFile(
  root: string,
  rawPath: string,
  normalizedPath: string,
): string {
  return rawPath.startsWith(root) ? rawPath : inside(root, normalizedPath);
}

async function readBoundedContextSource(
  root: string,
  rawPath: string,
  normalizedPath: string,
  classified: ClassifiedContextPath,
  query: string | undefined,
  fs: FileSystem,
): Promise<ContextSource | null> {
  try {
    const content = await fs.read(
      resolveListedContextFile(root, rawPath, normalizedPath),
    );
    if (!contextSourceMatchesQuery(normalizedPath, content, query)) {
      return null;
    }
    return {
      id: `ctx-${classified.type}-${normalizedPath.replaceAll("/", "-")}`,
      type: classified.type,
      path: normalizedPath,
      summary: summarizeBoundedContextContent(content),
      trustClass: classified.trustClass,
      tokenCount: estimateBoundedContextTokens(content),
    };
  } catch {
    // Unreadable files are skipped and are not exclusion counts.
    return null;
  }
}

async function collectBoundedContextCandidates(
  root: string,
  request: ContextRetrievalRequest,
  fs: FileSystem,
): Promise<BoundedContextCandidateScan> {
  let excludedPathsCount = 0;
  const items: ContextSource[] = [];
  for (const rawPath of await fs.list(root)) {
    const normalizedPath = normalizeListedContextPath(root, rawPath);
    if (isExcludedContextPath(normalizedPath)) {
      excludedPathsCount += 1;
      continue;
    }
    const classified = classifyBoundedContextPath(normalizedPath);
    if (
      !classified ||
      (request.sourceTypes && !request.sourceTypes.includes(classified.type))
    ) {
      continue;
    }
    const source = await readBoundedContextSource(
      root,
      rawPath,
      normalizedPath,
      classified,
      request.query,
      fs,
    );
    if (source) items.push(source);
  }
  return { items, excludedPathsCount };
}

function selectBoundedContextItems(
  candidates: readonly ContextSource[],
  maxTokens: number,
  maxItems: number,
): BoundedContextSelection {
  let totalTokens = 0;
  const items: ContextSource[] = [];
  for (const item of candidates) {
    if (items.length >= maxItems) break;
    if (totalTokens + item.tokenCount > maxTokens && items.length > 0) break;
    items.push(item);
    totalTokens += item.tokenCount;
  }
  return { items, totalTokens };
}

export async function getBoundedProjectContext(
  requestInput: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContextRetrievalResult> {
  const request = validateContextRetrievalRequest(
    requestInput ?? { schemaVersion: "1" },
  );
  const root = options.root;
  const collected = await collectBoundedContextCandidates(root, request, fs);
  const selected = selectBoundedContextItems(
    collected.items,
    request.maxTokens ?? 4000,
    request.maxItems ?? 20,
  );
  return validateContextRetrievalResult({
    schemaVersion: "1",
    root,
    totalTokens: selected.totalTokens,
    items: selected.items,
    excludedPathsCount: collected.excludedPathsCount,
    retrievedAt: new Date().toISOString(),
  });
}
