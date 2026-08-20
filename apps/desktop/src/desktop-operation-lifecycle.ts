import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
  WorkspaceView,
} from "./workspace-navigation.js";

export interface OperationLoadingFlags {
  readonly isConnecting: boolean;
  readonly inspectStatus: WorkspaceInspectStatus;
  readonly doctorStatus: WorkspaceInspectStatus;
  readonly diffStatus: WorkspaceInspectStatus;
  readonly timelineStatus: WorkspaceTimelineStatus;
}

export function deriveIsOperationLoading(
  flags: OperationLoadingFlags,
): boolean {
  return (
    flags.isConnecting ||
    flags.inspectStatus === "loading" ||
    flags.doctorStatus === "loading" ||
    flags.diffStatus === "loading" ||
    flags.timelineStatus === "loading"
  );
}

/**
 * Connect may set inspect to loading and then return early when its AbortSignal
 * is superseded. Terminalize that stale loading flag on abort so Cancel stays
 * truthful once another operation finishes.
 */
export function terminalizeConnectAbortInspectStatus(
  status: WorkspaceInspectStatus,
  signalAborted: boolean,
): WorkspaceInspectStatus {
  if (signalAborted && status === "loading") {
    return "idle";
  }
  return status;
}

export function shouldAutoLoadDoctor(params: {
  readonly activeView: WorkspaceView;
  readonly root: string | null;
  readonly daemonInfo: unknown;
  readonly doctorStatus: WorkspaceInspectStatus;
  readonly doctor: unknown;
  readonly isConnecting: boolean;
}): boolean {
  return (
    params.activeView === "Doctor" &&
    params.root !== null &&
    params.daemonInfo !== null &&
    params.doctorStatus === "idle" &&
    params.doctor === null &&
    !params.isConnecting
  );
}

export function idleOperationLoadingFlags(): OperationLoadingFlags {
  return {
    isConnecting: false,
    inspectStatus: "idle",
    doctorStatus: "idle",
    diffStatus: "idle",
    timelineStatus: "idle",
  };
}
