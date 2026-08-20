import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import { inspectStatusForError } from "./desktop-bridge-status.js";
import type {
  DaemonInfoResult,
  ProjectDiffResult,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
} from "./workspace-navigation.js";

interface LoaderContext {
  readonly root: string;
  readonly signal: AbortSignal;
  readonly daemonInfo: DaemonInfoResult | null;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
}

function connectionLabelForError(status: WorkspaceInspectStatus): string {
  if (status === "stale") return "Project root changed";
  if (status === "invalid-root") return "Project root unavailable";
  if (status === "protocol-mismatch") return "Protocol mismatch";
  return "Disconnected";
}

export async function loadProjectDiff(
  context: LoaderContext,
): Promise<ProjectDiffResult | null> {
  try {
    return await desktopClient.projectDiff(
      { root: context.root },
      context.signal,
    );
  } catch (error) {
    if (context.signal.aborted) return null;
    context.setConnection(
      connectionLabelForError(inspectStatusForError(error)),
    );
    context.setMessage(
      error instanceof DesktopBridgeError
        ? error.message
        : "The project diff could not be loaded.",
    );
    throw error;
  }
}

export async function loadProjectTimeline(context: LoaderContext): Promise<{
  readonly result: ProjectTimelineResult | null;
  readonly status: WorkspaceTimelineStatus;
}> {
  try {
    const result = await desktopClient.projectTimeline(
      {
        root: context.root,
        caseId: "desktop-release",
        limit: 50,
        timeoutMs: 5_000,
        maxOutputBytes: 512 * 1024,
      },
      context.signal,
    );
    return {
      result: result.events.length === 0 ? null : result,
      status: result.events.length === 0 ? "empty" : "ready",
    };
  } catch (error) {
    if (context.signal.aborted) {
      return { result: null, status: "idle" };
    }
    context.setConnection(
      connectionLabelForError(inspectStatusForError(error)),
    );
    context.setMessage(
      error instanceof DesktopBridgeError
        ? error.message
        : "The project timeline could not be loaded.",
    );
    throw error;
  }
}

export function connectedDaemonLabel(
  daemonInfo: DaemonInfoResult | null,
): string {
  return daemonInfo ? `Daemon ${daemonInfo.daemonVersion}` : "Daemon connected";
}
