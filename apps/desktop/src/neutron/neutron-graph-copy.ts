import type {
  NeutronGraphNodeSnapshot,
  NeutronGraphSnapshot,
  NeutronGraphStatus,
  NeutronTaskState,
} from "@intentloom/protocol";

export function graphStatusLabel(status: NeutronGraphStatus): string {
  return status;
}

export function nodeStateLabel(state: NeutronTaskState): string {
  return state;
}

export function graphSummaryLines(snapshot: NeutronGraphSnapshot): string[] {
  return [
    `Graph ${snapshot.graphId}`,
    `Status ${snapshot.status}`,
    `Nodes ${snapshot.nodeCounts.total}`,
    `Concurrency ${snapshot.concurrency.maxConcurrency} (default ${snapshot.concurrency.defaultConcurrency}, max ${snapshot.concurrency.hardMaximum})`,
    snapshot.stale !== null && !snapshot.stale.accepted
      ? `Stale ${snapshot.stale.kinds.join(", ")}`
      : "Not stale",
    snapshot.cancellationAcknowledged
      ? "Cancellation acknowledged"
      : "Cancellation not acknowledged",
    snapshot.accepted ? "Accepted" : "Not accepted",
    snapshot.rerunAttempted ? "Rerun attempted" : "Rerun not attempted",
  ];
}

export function nodeHeading(node: NeutronGraphNodeSnapshot): string {
  return `${node.taskId} ${node.state}`;
}

export function nodeDependencyLine(node: NeutronGraphNodeSnapshot): string {
  if (node.blockingDependencyIds.length > 0) {
    return `Blocked by ${node.blockingDependencyIds.join(", ")}`;
  }
  if (node.dependencies.length === 0) return "No dependencies";
  return `Depends on ${node.dependencies.join(", ")}`;
}

export function capabilityLine(node: NeutronGraphNodeSnapshot): string {
  const tools = node.effectiveCapabilities?.allowedTools ?? node.allowedTools;
  if (tools.length === 0) return "Capabilities none";
  return `Capabilities ${tools.join(", ")}`;
}

export function attemptLine(
  snapshot: NeutronGraphSnapshot["nodes"][number]["attempts"][number],
): string {
  const reason =
    snapshot.retryReason === null ? "" : ` retry ${snapshot.retryReason}`;
  return `Attempt ${snapshot.attempt} ${snapshot.state}${reason}`;
}

export function staleWarning(snapshot: NeutronGraphSnapshot): string | null {
  if (snapshot.stale === null || snapshot.stale.accepted) return null;
  return `Graph result is not accepted (${snapshot.stale.kinds.join(", ")}). Rerun was not attempted.`;
}
