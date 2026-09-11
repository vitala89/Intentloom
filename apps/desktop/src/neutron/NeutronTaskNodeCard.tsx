import { useId, useState } from "react";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type { NeutronGraphNodeSnapshot } from "@intentloom/protocol";
import { NeutronAttemptHistory } from "./NeutronAttemptHistory.js";
import {
  capabilityLine,
  nodeDependencyLine,
  nodeHeading,
  nodeStateLabel,
} from "./neutron-graph-copy.js";

export interface NeutronTaskNodeProps {
  readonly node: NeutronGraphNodeSnapshot;
}

function toneForState(
  state: NeutronGraphNodeSnapshot["state"],
): "success" | "warning" | "error" | "info" | "neutral" {
  if (state === "completed") return "success";
  if (state === "running" || state === "ready" || state === "pending") {
    return "info";
  }
  if (state === "blocked") return "warning";
  return "error";
}

export function NeutronTaskNode({ node }: NeutronTaskNodeProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  return (
    <article aria-labelledby={headingId}>
      <header style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusChip
          label={nodeStateLabel(node.state)}
          tone={toneForState(node.state)}
        />
        <h3 id={headingId}>{nodeHeading(node)}</h3>
      </header>
      <p>Role: {node.role}</p>
      <p>{nodeDependencyLine(node)}</p>
      <p>
        Attempts: {node.attemptCount}
        {node.authoritativeAttempt !== null
          ? ` (authoritative ${node.authoritativeAttempt})`
          : ""}
      </p>
      <p>{capabilityLine(node)}</p>
      <p>
        Tools: {node.toolCount}. Context:{" "}
        {node.contextAvailable ? "available" : "none"}. Digest:{" "}
        {node.outputDigestPresent ? "present" : "none"}.
      </p>
      {node.providerKind !== null ? (
        <p>
          Provider: {node.providerKind}
          {node.modelId !== null ? ` / ${node.modelId}` : ""}
        </p>
      ) : null}
      {node.errorCode !== null ? <p>Error: {node.errorCode}</p> : null}
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide attempts" : "Show attempts"}
      </button>
      {open ? <NeutronAttemptHistory attempts={node.attempts} /> : null}
    </article>
  );
}
