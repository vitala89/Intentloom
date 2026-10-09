import { useDesktopConnect } from "./use-desktop-connect.js";
import { useDesktopDoctor } from "./use-desktop-doctor.js";
import type { WorkspaceOperationController } from "./use-workspace-operation.js";
import type { WorkspaceProjectReads } from "./use-workspace-project-reads.js";
import type { WorkspaceStatusState } from "./use-workspace-status.js";
import type { WorkspaceView } from "./workspace-navigation.js";

export function useWorkspaceDaemonSession(input: {
  readonly root: string | null;
  readonly activeView: WorkspaceView;
  readonly status: WorkspaceStatusState;
  readonly operation: WorkspaceOperationController;
  readonly reads: WorkspaceProjectReads;
}) {
  const doctor = useDesktopDoctor({
    root: input.root,
    activeView: input.activeView,
    daemonInfo: input.status.daemonInfo,
    isConnecting: input.operation.isConnecting,
    startOperation: input.operation.startOperation,
    setConnection: input.status.setConnection,
    setMessage: input.status.setMessage,
  });
  const connected = useDesktopConnect({
    root: input.root,
    doctorRoot: doctor.doctorRoot,
    doctor: doctor.doctor,
    isConnecting: input.operation.isConnecting,
    setIsConnecting: input.operation.setIsConnecting,
    startOperation: input.operation.startOperation,
    loadDoctor: doctor.loadDoctor,
    resetDoctor: doctor.resetDoctor,
    setConnection: input.status.setConnection,
    setMessage: input.status.setMessage,
    setDaemonInfo: input.status.setDaemonInfo,
    setInspect: input.reads.inspect.setResult,
    setInspectStatus: input.reads.inspect.setStatus,
    setInspectError: input.reads.inspect.setError,
    setDiff: input.reads.diff.setResult,
    setDiffStatus: input.reads.diff.setStatus,
    setDiffError: input.reads.diff.setError,
    setTimeline: input.reads.timeline.setResult,
    setTimelineStatus: input.reads.timeline.setStatus,
    setTimelineError: input.reads.timeline.setError,
  });
  return {
    doctor: doctor.doctor,
    doctorStatus: doctor.doctorStatus,
    doctorError: doctor.doctorError,
    resetDoctor: doctor.resetDoctor,
    loadDoctor: doctor.loadDoctor,
    setDoctorStatus: doctor.setDoctorStatus,
    connectDaemon: connected.connectDaemon,
    retryCount: connected.retryCount,
  };
}

export type WorkspaceDaemonSession = ReturnType<
  typeof useWorkspaceDaemonSession
>;
