import type {
  EngineeringQualityPackProvenance,
  EngineeringQualityPackSourceReference,
} from "@intentloom/protocol";

export function provenance(
  references: readonly EngineeringQualityPackSourceReference[],
): EngineeringQualityPackProvenance {
  return {
    sourceKind: "first-party",
    publisher: "intentloom",
    license: "Apache-2.0",
    references,
  };
}

export const repoQualitySource = {
  id: "intentloom-code-quality-standards",
  title: "Intentloom Code Quality Standards",
  uri: "docs/governance/CODE_QUALITY_STANDARDS.md",
  kind: "repository-documentation",
} as const;

export const repoPrinciplesSource = {
  id: "intentloom-engineering-principles",
  title: "Intentloom Engineering Principles",
  uri: "docs/governance/ENGINEERING_PRINCIPLES.md",
  kind: "repository-documentation",
} as const;
