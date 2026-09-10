import { Card } from "../design/components/layout/Card.js";
import type { NeutronTurnContextSummary } from "@intentloom/protocol";
import { contextSummaryLines } from "./neutron-activity-copy.js";

export interface NeutronContextSummaryProps {
  readonly summary: NeutronTurnContextSummary;
}

export function NeutronContextSummary({ summary }: NeutronContextSummaryProps) {
  return (
    <Card title="Context summary">
      {contextSummaryLines(summary).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {summary.excludedSecretLikePaths.length > 0 ? (
        <ul aria-label="Excluded secret-like paths">
          {summary.excludedSecretLikePaths.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
