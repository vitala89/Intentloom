import { DesktopBridgeError } from "./desktop-client.js";
import type { WorkspaceInspectStatus } from "./workspace-navigation.js";

export function inspectStatusForError(error: unknown): WorkspaceInspectStatus {
  if (!(error instanceof DesktopBridgeError)) return "error";
  if (error.code === "stale_root") return "stale";
  if (error.code === "invalid_root") return "invalid-root";
  if (error.code === "disconnected" || error.code === "authentication_failed") {
    return "disconnected";
  }
  if (error.code === "protocol_incompatible") return "protocol-mismatch";
  return "error";
}
