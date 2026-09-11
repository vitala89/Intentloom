import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type { NeutronGraphSnapshot } from "@intentloom/protocol";
import { graphSummaryLines, staleWarning } from "./neutron-graph-copy.js";

export interface NeutronGraphSummaryProps {
  readonly snapshot: NeutronGraphSnapshot;
}

function toneForStatus(
  status: NeutronGraphSnapshot["status"],
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "completed") return "success";
  if (status === "stale" || status === "incomplete") return "warning";
  if (status === "failed" || status === "timed-out" || status === "cancelled") {
    return "error";
  }
  return "neutral";
}

export function NeutronGraphSummary({ snapshot }: NeutronGraphSummaryProps) {
  const warning = staleWarning(snapshot);
  return (
    <Card title="Task graph">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusChip
          label={snapshot.status}
          tone={toneForStatus(snapshot.status)}
        />
        <StatusChip
          label={`Concurrency ${snapshot.concurrency.maxConcurrency}`}
          tone="neutral"
        />
        <StatusChip
          label={`Nodes ${snapshot.nodeCounts.total}`}
          tone="neutral"
        />
      </div>
      <p>Graph ID: {snapshot.graphId}</p>
      <ul>
        {graphSummaryLines(snapshot).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {warning !== null ? <p role="alert">{warning}</p> : null}
    </Card>
  );
}
