import type {
  SecurityFinding,
  SecurityFindingSeverity,
} from "@intentloom/protocol";

export function correlateSecurityFindings(
  findings: readonly SecurityFinding[],
): readonly SecurityFinding[] {
  const map = new Map<string, SecurityFinding>();
  for (const finding of findings) {
    const primaryPath = finding.evidence[0]?.path ?? "unknown";
    const key = `${finding.ruleId}:${primaryPath}`;
    if (!map.has(key)) {
      map.set(key, finding);
    } else {
      const existing = map.get(key)!;
      const severityRank: Record<SecurityFindingSeverity, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
        info: 1,
      };
      if (severityRank[finding.severity] > severityRank[existing.severity]) {
        map.set(key, finding);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}
