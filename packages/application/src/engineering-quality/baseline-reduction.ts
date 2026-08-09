import {
  QUALITY_BASELINE_REDUCTION_SCHEMA_URN,
  type EngineeringQualityBaseline,
  type EngineeringQualityBaselineReduction,
  type EngineeringQualityEvidence,
  type EngineeringQualityFinding,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityBaseline,
  validateEngineeringQualityBaselineReduction,
} from "@intentloom/validator";

function key(ruleId: string, artifactPath: string): string {
  return `${ruleId}\u0000${artifactPath}`;
}

export interface ReduceEngineeringQualityBaselineOptions {
  readonly baseline: EngineeringQualityBaseline;
  readonly findings: readonly EngineeringQualityFinding[];
  readonly currentEvidence?: readonly EngineeringQualityEvidence[];
  readonly preparedAt?: number;
}

export function reduceEngineeringQualityBaseline(
  options: ReduceEngineeringQualityBaselineOptions,
): EngineeringQualityBaselineReduction {
  const baseline = validateEngineeringQualityBaseline(options.baseline);
  const activeKeys = new Set(
    options.findings.map((finding) =>
      key(finding.ruleId, finding.artifactPath),
    ),
  );
  const evidenceByKey = new Map(
    (options.currentEvidence ?? []).map((evidence) => [
      evidence.artifactPath,
      evidence.contentDigest,
    ]),
  );
  const retainedItems = baseline.items.filter((item) => {
    const itemKey = key(item.ruleId, item.artifactPath);
    const changed =
      evidenceByKey.has(item.artifactPath) &&
      evidenceByKey.get(item.artifactPath) !== item.contentDigest;
    return activeKeys.has(itemKey) || changed;
  });
  const removedItems = baseline.items.filter(
    (item) => !retainedItems.includes(item),
  );
  return validateEngineeringQualityBaselineReduction({
    schemaVersion: QUALITY_BASELINE_REDUCTION_SCHEMA_URN,
    projectId: baseline.projectId,
    preparedAt: options.preparedAt ?? Date.now(),
    baseline: { ...baseline, items: retainedItems },
    removedItems,
    retainedItems,
  });
}

export const prepareEngineeringQualityBaselineReduction =
  reduceEngineeringQualityBaseline;
