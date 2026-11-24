import { dirname } from "node:path";
import {
  validateSecurityAdapterMetadata,
  validateSecurityAdapterResult,
  type SecurityAdapterCategory,
  type SecurityAdapterMetadata,
  type SecurityAdapterResult,
  type SecurityFinding,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { securityFindingPath } from "./security-finding-store.js";
import { correlateSecurityFindings } from "./security-adapter-correlation.js";
import { scanConfigCategory } from "./security-adapter-config.js";
import { scanDependencyCategory } from "./security-adapter-dependency.js";
import { scanMcpCategory } from "./security-adapter-mcp.js";
import { scanSecretCategory } from "./security-adapter-secret.js";

const defaultCategories = [
  "dependency",
  "secret",
  "config",
  "source",
  "extension",
  "mcp",
  "hook",
  "agentic",
] as const satisfies readonly SecurityAdapterCategory[];

function createFindingIdAllocator(counter: { value: number }) {
  return (prefix: string) => `${prefix}${counter.value++}`;
}

async function collectCategoryFindings(
  category: SecurityAdapterCategory,
  root: string,
  now: string,
  nextFindingId: (prefix: string) => string,
  fs: FileSystem,
): Promise<SecurityFinding[]> {
  if (category === "dependency") {
    return scanDependencyCategory(
      root,
      now,
      () => nextFindingId("sec-dep-"),
      fs,
    );
  }
  if (category === "secret") {
    return scanSecretCategory(
      root,
      now,
      () => nextFindingId("sec-secret-"),
      fs,
    );
  }
  if (category === "config") {
    return scanConfigCategory(root, now, () => nextFindingId("sec-cfg-"), fs);
  }
  if (category === "mcp") {
    return scanMcpCategory(root, now, () => nextFindingId("sec-mcp-"), fs);
  }
  return [];
}

async function persistCorrelatedFindings(
  root: string,
  findings: readonly SecurityFinding[],
  fs: FileSystem,
): Promise<void> {
  for (const finding of findings) {
    const path = securityFindingPath(root, finding.id);
    if (!(await fs.exists(dirname(path)))) {
      await fs.mkdir(dirname(path));
    }
    await fs.write(path, `${JSON.stringify(finding, null, 2)}\n`);
  }
}

function buildAdapterResult(
  category: SecurityAdapterCategory,
  correlated: readonly SecurityFinding[],
  now: string,
): SecurityAdapterResult {
  const adapterMeta: SecurityAdapterMetadata = validateSecurityAdapterMetadata({
    schemaVersion: "1",
    name: `built-in:${category}-adapter`,
    category,
    version: "1.0.0",
    readOnly: true,
    networkAccess: false,
  });

  return validateSecurityAdapterResult({
    schemaVersion: "1",
    adapter: adapterMeta,
    findings: correlated,
    totalCount: correlated.length,
    executedAt: now,
  });
}

export async function runLocalSecurityAdapters(
  options: {
    root: string;
    categories?: readonly SecurityAdapterCategory[];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SecurityAdapterResult[]> {
  const activeCategories = options.categories?.length
    ? options.categories
    : defaultCategories;

  const results: SecurityAdapterResult[] = [];
  const now = new Date().toISOString();
  const counter = { value: 1 };
  const nextFindingId = createFindingIdAllocator(counter);

  for (const category of activeCategories) {
    const rawFindings = await collectCategoryFindings(
      category,
      options.root,
      now,
      nextFindingId,
      fs,
    );
    const correlated = correlateSecurityFindings(rawFindings);
    await persistCorrelatedFindings(options.root, correlated, fs);
    results.push(buildAdapterResult(category, correlated, now));
  }

  return results;
}
