import { useState } from "react";
import { deriveIsOperationLoading } from "./desktop-operation-lifecycle.js";
import { DesktopShell } from "./DesktopShell.js";
import { cancelWorkspaceOperation } from "./use-workspace-operation.js";
import { useWorkspaceOperation } from "./use-workspace-operation.js";
import { useWorkspaceDaemonSession } from "./use-workspace-daemon-session.js";
import { useWorkspaceProjectReads } from "./use-workspace-project-reads.js";
import { useWorkspaceStatus } from "./use-workspace-status.js";
import {
  deriveLoadedWorkspaceViews,
  resetWorkspaceForNewRoot,
  useBindProjectSelection,
  useProjectSelection,
} from "./use-project-selection.js";
import { buildWorkspaceCommandOptions } from "./workspace-command-options.js";
import type { WorkspaceCompositionModel } from "./workspace-composition.js";
import type { WorkspaceView } from "./workspace-navigation.js";
import { WorkspaceContent } from "./WorkspaceContent.js";
import type { WorkspaceDaemonSession } from "./use-workspace-daemon-session.js";
import type { WorkspaceOperationController } from "./use-workspace-operation.js";
import type { WorkspaceProjectReads } from "./use-workspace-project-reads.js";
import type { ProjectSelectionController } from "./use-project-selection.js";
import type { WorkspaceStatusState } from "./use-workspace-status.js";

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>("Overview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const status = useWorkspaceStatus();
  const operation = useWorkspaceOperation();
  const project = useProjectSelection();
  const reads = useWorkspaceProjectReads({
    root: project.root,
    daemonInfo: status.daemonInfo,
    startOperation: operation.startOperation,
    setConnection: status.setConnection,
    setMessage: status.setMessage,
  });
  const daemon = useWorkspaceDaemonSession({
    root: project.root,
    activeView,
    status,
    operation,
    reads,
  });
  const loadedViews = deriveLoadedWorkspaceViews({
    inspect: reads.inspect.result,
    doctor: daemon.doctor,
    diffStatus: reads.diff.status,
    timelineStatus: reads.timeline.status,
  });
  useBindProjectSelection(project.bindSelection, {
    root: project.root,
    loadedViews,
    abortCurrentOperation: operation.abortCurrentOperation,
    resetRootBoundState: () =>
      resetWorkspaceForNewRoot({
        setConnection: status.setConnection,
        setDaemonInfo: status.setDaemonInfo,
        resetReads: reads.reset,
        resetDoctor: daemon.resetDoctor,
      }),
    setConnection: status.setConnection,
    setMessage: status.setMessage,
    setInspectError: reads.inspect.setError,
    setInspectStatus: reads.inspect.setStatus,
  });
  return (
    <DesktopWorkspace
      activeView={activeView}
      daemon={daemon}
      loadedViews={loadedViews}
      operation={operation}
      project={project}
      reads={reads}
      setActiveView={setActiveView}
      setTheme={setTheme}
      status={status}
      theme={theme}
    />
  );
}

interface DesktopWorkspaceProps {
  readonly activeView: WorkspaceView;
  readonly theme: "dark" | "light";
  readonly setActiveView: (view: WorkspaceView) => void;
  readonly setTheme: (
    value: "dark" | "light" | ((current: "dark" | "light") => "dark" | "light"),
  ) => void;
  readonly status: WorkspaceStatusState;
  readonly operation: WorkspaceOperationController;
  readonly project: ProjectSelectionController;
  readonly reads: WorkspaceProjectReads;
  readonly daemon: WorkspaceDaemonSession;
  readonly loadedViews: readonly string[];
}

function DesktopWorkspace({
  activeView,
  theme,
  setActiveView,
  setTheme,
  status,
  operation,
  project,
  reads,
  daemon,
  loadedViews,
}: DesktopWorkspaceProps) {
  const model = workspaceModel({
    activeView,
    setActiveView,
    theme,
    setTheme,
    status,
    operation,
    project,
    reads,
    daemon,
    loadedViews,
  });
  return (
    <DesktopShell
      activeView={activeView}
      commandOptions={buildWorkspaceCommandOptions({
        theme,
        setActiveView,
        requestProjectSelect: project.requestProjectSelect,
        connectDaemon: daemon.connectDaemon,
        loadDiff: reads.diff.load,
        loadTimeline: reads.timeline.load,
        setTheme,
      })}
      connection={status.connection}
      isOperationLoading={deriveIsOperationLoading({
        isConnecting: operation.isConnecting,
        inspectStatus: reads.inspect.status,
        doctorStatus: daemon.doctorStatus,
        diffStatus: reads.diff.status,
        timelineStatus: reads.timeline.status,
      })}
      onCancelOperation={() =>
        cancelWorkspaceOperation({
          abortCurrentOperation: operation.abortCurrentOperation,
          setIsConnecting: operation.setIsConnecting,
          root: project.root,
          inspectStatus: reads.inspect.status,
          setInspectStatus: reads.inspect.setStatus,
          doctorStatus: daemon.doctorStatus,
          setDoctorStatus: daemon.setDoctorStatus,
          diffStatus: reads.diff.status,
          setDiffStatus: reads.diff.setStatus,
          timelineStatus: reads.timeline.status,
          setTimelineStatus: reads.timeline.setStatus,
          setConnection: status.setConnection,
          setMessage: status.setMessage,
        })
      }
      onRequestProjectSelect={project.requestProjectSelect}
      onSelectView={setActiveView}
      onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      root={project.root}
      theme={theme}
    >
      <WorkspaceContent model={model} />
    </DesktopShell>
  );
}

function workspaceModel(
  input: DesktopWorkspaceProps,
): WorkspaceCompositionModel {
  return {
    activeView: input.activeView,
    setActiveView: input.setActiveView,
    project: {
      root: input.project.root,
      confirmSwitch: input.project.confirmSwitch,
      loadedViews: input.loadedViews,
      confirmTriggerRef: input.project.confirmTriggerRef,
      requestSelect: input.project.requestProjectSelect,
      confirmChange: input.project.confirmRootChange,
      cancelChange: input.project.cancelRootChange,
    },
    connection: {
      connection: input.status.connection,
      message: input.status.message,
      daemonInfo: input.status.daemonInfo,
      isConnecting: input.operation.isConnecting,
      retryCount: input.daemon.retryCount,
      connect: () => void input.daemon.connectDaemon(),
    },
    inspect: {
      result: input.reads.inspect.result,
      status: input.reads.inspect.status,
      error: input.reads.inspect.error,
    },
    doctor: {
      result: input.daemon.doctor,
      status: input.daemon.doctorStatus,
      error: input.daemon.doctorError,
      load: () => void input.daemon.loadDoctor(),
    },
    diff: {
      result: input.reads.diff.result,
      status: input.reads.diff.status,
      error: input.reads.diff.error,
      load: () => void input.reads.diff.load(),
    },
    timeline: {
      result: input.reads.timeline.result,
      status: input.reads.timeline.status,
      error: input.reads.timeline.error,
      load: () => void input.reads.timeline.load(),
    },
    theme: {
      theme: input.theme,
      setTheme: input.setTheme,
    },
  };
}
