import type {
  NeutronTurnContextSourceRow,
  NeutronTurnContextSummary,
  NeutronTurnToolActivity,
} from "@intentloom/protocol";

export function contextSummaryLines(
  summary: NeutronTurnContextSummary,
): readonly string[] {
  return [
    `Context items: ${String(summary.itemCount)}`,
    `Included: ${String(summary.includedCount)}`,
    `Excluded: ${String(summary.excludedCount)}`,
    `Token estimate: ${String(summary.estimatedTokens)}`,
    `Budget: ${String(summary.tokenBudget)}`,
    `Context tokens: ${String(summary.contextTokens)}`,
    `Budget exceeded: ${summary.limitExceeded ? "yes" : "no"}`,
    `Excluded secret paths: ${String(summary.excludedSecretLikePaths.length)}`,
  ];
}

export function contextSourceLine(source: NeutronTurnContextSourceRow): string {
  const parts = [
    source.kind,
    source.path,
    source.trustClass,
    source.included ? "included" : "excluded",
    source.exclusionReason,
    source.loadingLevel !== undefined
      ? `skill ${source.loadingLevel}`
      : undefined,
  ].filter((part): part is string => part !== undefined && part.length > 0);
  return parts.join(" · ");
}

export function toolActivityHeading(row: NeutronTurnToolActivity): string {
  return `${row.toolName} ${row.status}`;
}
