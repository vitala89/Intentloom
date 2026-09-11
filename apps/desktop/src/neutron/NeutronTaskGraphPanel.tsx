import { Card } from "../design/components/layout/Card.js";
import type { NeutronGraphSnapshot } from "@intentloom/protocol";
import { NeutronGraphSummary } from "./NeutronGraphSummary.js";
import { NeutronStaleState } from "./NeutronStaleState.js";
import { NeutronTaskNode } from "./NeutronTaskNodeCard.js";

export interface NeutronTaskGraphPanelProps {
  readonly snapshot: NeutronGraphSnapshot | null;
}

export function NeutronTaskGraphPanel({
  snapshot,
}: NeutronTaskGraphPanelProps) {
  if (snapshot === null) {
    return (
      <Card title="Task graph">
        <p>No task graph snapshot is available for this session.</p>
      </Card>
    );
  }
  return (
    <section aria-label="Neutron task graph">
      <NeutronGraphSummary snapshot={snapshot} />
      <NeutronStaleState stale={snapshot.stale} />
      {snapshot.nodes.map((node) => (
        <NeutronTaskNode key={node.taskId} node={node} />
      ))}
    </section>
  );
}
