import { StatusChip } from "../design/components/status/StatusChip.js";
import type { NeutronGraphStaleSnapshot } from "@intentloom/protocol";

export interface NeutronStaleStateProps {
  readonly stale: NeutronGraphStaleSnapshot | null;
}

export function NeutronStaleState({ stale }: NeutronStaleStateProps) {
  if (stale === null || stale.accepted) return null;
  return (
    <section aria-label="Stale graph state">
      <StatusChip label="Not accepted" tone="warning" />
      <p role="alert">
        Stale {stale.kinds.join(", ")}. Rerun was not attempted.
      </p>
      <ul>
        {stale.mismatches.map((item) => (
          <li key={item.kind}>
            {item.kind}: expected {item.expected}, current {item.current}
          </li>
        ))}
      </ul>
    </section>
  );
}
