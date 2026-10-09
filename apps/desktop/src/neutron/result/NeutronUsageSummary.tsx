import type { NeutronEvidenceUsage } from "./neutron-evidence-projection.js";

export interface NeutronUsageSummaryProps {
  readonly usage: NeutronEvidenceUsage;
}

function row(label: string, value: number | null) {
  if (value === null) return null;
  return (
    <p>
      {label}: {value}
    </p>
  );
}

export function NeutronUsageSummary({ usage }: NeutronUsageSummaryProps) {
  const hasAny =
    usage.inputTokens !== null ||
    usage.outputTokens !== null ||
    usage.contextTokens !== null ||
    usage.tokenBudget !== null;
  if (!hasAny && !usage.limitExceeded) {
    return <p>No canonical usage data is available for this result.</p>;
  }
  return (
    <section aria-label="Runtime usage">
      {row("Input tokens", usage.inputTokens)}
      {row("Output tokens", usage.outputTokens)}
      {row("Context tokens", usage.contextTokens)}
      {row("Total tokens", usage.totalTokens)}
      {row("Token budget", usage.tokenBudget)}
      {usage.limitExceeded ? (
        <p role="alert">Budget limit exceeded (canonical runtime).</p>
      ) : null}
    </section>
  );
}
