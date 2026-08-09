import {
  QUALITY_BASELINE_RATCHET_SCHEMA_URN,
  type EngineeringQualityBaselineItem,
  type EngineeringQualityBaselineRatchetIssue,
  type EngineeringQualityBaselineRatchetOptions,
  type EngineeringQualityBaselineRatchetResult,
  type EngineeringQualityEvidence,
  type EngineeringQualityFinding,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityBaseline,
  validateEngineeringQualityBaselineRatchetResult,
} from "@intentloom/validator";

function key(ruleId: string, artifactPath: string): string {
  return `${ruleId}\u0000${artifactPath}`;
}

function byKey<T extends { ruleId: string; artifactPath: string }>(
  values: readonly T[],
): Map<string, T> {
  return new Map(
    values.map((value) => [key(value.ruleId, value.artifactPath), value]),
  );
}

function byPath<T extends { artifactPath: string }>(
  values: readonly T[],
): Map<string, T> {
  return new Map(values.map((value) => [value.artifactPath, value]));
}

function legacyFinding(
  finding: EngineeringQualityFinding,
  item: EngineeringQualityBaselineItem,
): EngineeringQualityFinding {
  return {
    ...finding,
    state: "legacy-baseline",
    thresholdValue: item.baselineMeasuredValue,
    message: `Legacy baseline retained for ${finding.artifactPath} at ${item.baselineMeasuredValue} physical lines.`,
  };
}

function addIssue(
  issues: EngineeringQualityBaselineRatchetIssue[],
  input: EngineeringQualityBaselineRatchetIssue,
): void {
  issues.push(input);
}

function compareItem(
  item: EngineeringQualityBaselineItem,
  finding: EngineeringQualityFinding | undefined,
  currentEvidence: EngineeringQualityEvidence | undefined,
  now: number,
  result: {
    issues: EngineeringQualityBaselineRatchetIssue[];
    legacyFindings: EngineeringQualityFinding[];
    growthViolations: EngineeringQualityFinding[];
    staleItems: EngineeringQualityBaselineItem[];
    expiredItems: EngineeringQualityBaselineItem[];
    resolvedItems: EngineeringQualityBaselineItem[];
  },
): void {
  const stale =
    currentEvidence !== undefined &&
    currentEvidence.contentDigest !== item.contentDigest;
  const expiry = item.expiresAt ?? item.reviewAt;
  const expired = expiry !== undefined && expiry <= now;
  if (stale) {
    result.staleItems.push(item);
    addIssue(result.issues, {
      kind: "stale",
      ruleId: item.ruleId,
      artifactPath: item.artifactPath,
      baselineItemId: item.id,
      message: `Baseline content digest for ${item.artifactPath} no longer matches current evidence.`,
    });
  }
  if (expired) {
    result.expiredItems.push(item);
    addIssue(result.issues, {
      kind: "expired",
      ruleId: item.ruleId,
      artifactPath: item.artifactPath,
      baselineItemId: item.id,
      message: `Baseline review window for ${item.artifactPath} has expired.`,
    });
  }
  if (finding === undefined) {
    result.resolvedItems.push(item);
    addIssue(result.issues, {
      kind: "resolved",
      ruleId: item.ruleId,
      artifactPath: item.artifactPath,
      baselineItemId: item.id,
      message: `Legacy debt for ${item.artifactPath} is no longer present.`,
    });
    return;
  }
  const allowedCeiling = item.baselineMeasuredValue + item.allowedGrowth;
  if (finding.measuredValue > allowedCeiling) {
    result.growthViolations.push(finding);
    addIssue(result.issues, {
      kind: "growth",
      ruleId: item.ruleId,
      artifactPath: item.artifactPath,
      baselineItemId: item.id,
      findingId: finding.findingId,
      baselineMeasuredValue: item.baselineMeasuredValue,
      measuredValue: finding.measuredValue,
      allowedCeiling,
      message: `Quality debt grew from ${item.baselineMeasuredValue} to ${finding.measuredValue} physical lines at ${finding.artifactPath}.`,
    });
    return;
  }
  result.legacyFindings.push(legacyFinding(finding, item));
}

export function compareEngineeringQualityRatchet(
  options: EngineeringQualityBaselineRatchetOptions,
): EngineeringQualityBaselineRatchetResult {
  const baseline = validateEngineeringQualityBaseline(options.baseline);
  const findings = byKey(options.findings);
  const evidence = byPath(options.evidence ?? []);
  const now = options.now ?? Date.now();
  const result = {
    issues: [] as EngineeringQualityBaselineRatchetIssue[],
    legacyFindings: [] as EngineeringQualityFinding[],
    growthViolations: [] as EngineeringQualityFinding[],
    staleItems: [] as EngineeringQualityBaselineItem[],
    expiredItems: [] as EngineeringQualityBaselineItem[],
    resolvedItems: [] as EngineeringQualityBaselineItem[],
  };
  const baselineKeys = new Set<string>();
  for (const item of baseline.items) {
    const itemKey = key(item.ruleId, item.artifactPath);
    baselineKeys.add(itemKey);
    compareItem(
      item,
      findings.get(itemKey),
      evidence.get(item.artifactPath) ?? findings.get(itemKey)?.evidence,
      now,
      result,
    );
  }
  const newViolations: EngineeringQualityFinding[] = [];
  for (const finding of options.findings) {
    if (!baselineKeys.has(key(finding.ruleId, finding.artifactPath))) {
      newViolations.push(finding);
      addIssue(result.issues, {
        kind: "new-violation",
        ruleId: finding.ruleId,
        artifactPath: finding.artifactPath,
        findingId: finding.findingId,
        measuredValue: finding.measuredValue,
        message: `New quality violation at ${finding.artifactPath}; no approved legacy baseline entry exists.`,
      });
    }
  }
  return validateEngineeringQualityBaselineRatchetResult({
    schemaVersion: QUALITY_BASELINE_RATCHET_SCHEMA_URN,
    projectId: baseline.projectId,
    status:
      newViolations.length > 0 || result.growthViolations.length > 0
        ? "failed"
        : "passed",
    requiresReview:
      result.staleItems.length > 0 || result.expiredItems.length > 0,
    issues: result.issues,
    legacyFindings: result.legacyFindings,
    newViolations,
    growthViolations: result.growthViolations,
    staleItems: result.staleItems,
    expiredItems: result.expiredItems,
    resolvedItems: result.resolvedItems,
  });
}

export const evaluateEngineeringQualityRatchet =
  compareEngineeringQualityRatchet;
