import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type { NeutronTurnToolActivity } from "@intentloom/protocol";
import type { StatusTone } from "../design/components/status/StatusChip.js";
import { toolActivityHeading } from "./neutron-activity-copy.js";

export interface NeutronToolActivityProps {
  readonly activity: readonly NeutronTurnToolActivity[];
}

export function NeutronToolActivity({ activity }: NeutronToolActivityProps) {
  return (
    <Card title="Tool activity">
      {activity.length === 0 ? (
        <p>No structured tool activity was recorded for this turn.</p>
      ) : (
        <ul aria-label="Tool activity">
          {activity.map((row) => (
            <li key={row.invocationId}>
              <article aria-label={toolActivityHeading(row)}>
                <StatusChip
                  label={toolActivityHeading(row)}
                  tone={statusTone(row.status)}
                />
                <p>Capability: {row.capability}</p>
                <p>Input: {row.inputSummary}</p>
                <p>Result: {row.resultSummary}</p>
                {row.errorCode !== null ? <p>Error: {row.errorCode}</p> : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function statusTone(status: NeutronTurnToolActivity["status"]): StatusTone {
  if (status === "completed") return "success";
  if (status === "denied") return "warning";
  return "error";
}
