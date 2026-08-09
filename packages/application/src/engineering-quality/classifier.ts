import type { QualityArtifactClassification } from "@intentloom/protocol";

export interface ClassifyArtifactOptions {
  readonly path: string;
  readonly isTestFile?: boolean;
  readonly isGeneratedFile?: boolean;
  readonly isVendoredFile?: boolean;
  readonly explicitClassification?: QualityArtifactClassification;
}

export function classifyEngineeringArtifact(
  options: ClassifyArtifactOptions,
): QualityArtifactClassification {
  if (options.explicitClassification !== undefined) {
    return options.explicitClassification;
  }

  const path = options.path.toLowerCase().replace(/\\/g, "/");

  if (
    options.isGeneratedFile === true ||
    path.includes("/generated/") ||
    path.includes(".generated.")
  ) {
    return "generated-source";
  }

  if (
    options.isVendoredFile === true ||
    path.includes("/vendor/") ||
    path.includes("/node_modules/")
  ) {
    return "vendored-source";
  }

  if (
    options.isTestFile === true ||
    path.includes(".test.") ||
    path.includes(".spec.") ||
    path.includes("/tests/") ||
    path.includes("/__tests__/")
  ) {
    return "hand-written-test";
  }

  if (
    path.endsWith(".schema.json") ||
    path.endsWith(".proto") ||
    path.endsWith(".graphql")
  ) {
    return "schema-or-protocol";
  }

  if (
    path.endsWith(".json") ||
    path.endsWith(".yaml") ||
    path.endsWith(".yml") ||
    path.endsWith(".toml")
  ) {
    return "declarative-config";
  }

  if (path.endsWith(".snap") || path.includes("/snapshots/")) {
    return "snapshot";
  }

  if (path.includes("/migrations/") || path.endsWith(".migration.ts")) {
    return "migration";
  }

  if (
    path.endsWith(".md") ||
    path.endsWith(".rst") ||
    path.endsWith(".txt") ||
    path.includes("/docs/")
  ) {
    return "documentation";
  }

  if (
    path.endsWith(".ts") ||
    path.endsWith(".tsx") ||
    path.endsWith(".js") ||
    path.endsWith(".jsx") ||
    path.endsWith(".rs") ||
    path.endsWith(".py") ||
    path.endsWith(".go")
  ) {
    return "hand-written-production";
  }

  return "unknown";
}
