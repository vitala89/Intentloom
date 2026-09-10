import { Card } from "../design/components/layout/Card.js";
import type { NeutronTurnContextSourceRow } from "@intentloom/protocol";
import { contextSourceLine } from "./neutron-activity-copy.js";

export interface NeutronContextSourcesProps {
  readonly sources: readonly NeutronTurnContextSourceRow[];
}

export function NeutronContextSources({ sources }: NeutronContextSourcesProps) {
  if (sources.length === 0) {
    return (
      <Card title="Context sources">
        <p>No context sources were recorded for this turn.</p>
      </Card>
    );
  }
  return (
    <Card title="Context sources">
      <details>
        <summary>Show {sources.length} sources</summary>
        <ul aria-label="Context source rows">
          {sources.map((source) => (
            <li key={source.sourceId}>{contextSourceLine(source)}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
