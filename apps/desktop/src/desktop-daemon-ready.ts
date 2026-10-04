import type { DaemonInfoResult } from "@intentloom/protocol";
import type { WorkspaceInspectStatus } from "./workspace-navigation.js";

const UNAUTHENTICATED_CONNECTION = new Set([
  "Not connected",
  "Connecting…",
  "Reconnecting…",
  "Disconnected",
  "Protocol mismatch",
  "Cancelled",
  "Project root changed",
  "Project root unavailable",
]);

/**
 * Authenticated daemon session from the existing connect lifecycle.
 * Protocol mismatch stays fail closed. Label changes such as "Loading diff…"
 * do not count as a disconnect.
 */
export function desktopDaemonAuthenticated(input: {
  readonly daemonInfo: DaemonInfoResult | null;
  readonly connection: string;
  readonly isConnecting: boolean;
  readonly inspectStatus: WorkspaceInspectStatus;
}): boolean {
  if (input.isConnecting || input.daemonInfo === null) return false;
  if (input.daemonInfo.compatibility.status !== "compatible") return false;
  if (input.inspectStatus === "protocol-mismatch") return false;
  return !UNAUTHENTICATED_CONNECTION.has(input.connection);
}
