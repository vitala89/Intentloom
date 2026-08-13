import type { RefObject } from "react";
import type {
  ApprovedApplyExecutionResult,
  ApprovedApplyPlan,
  DaemonInfoResult,
  DoctorResult,
  InspectResult,
  ProjectDiffResult,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import { ConfirmRootChange } from "./ConfirmRootChange.js";
import { ApprovedApplyModal } from "./ApprovedApplyModal.js";
import { DiffView } from "./views/DiffView.js";
import { DoctorView } from "./views/DoctorView.js";
import { InspectView } from "./views/InspectView.js";
import { NewProjectView } from "./views/NewProjectView.js";
import { FoundationWorkshopView } from "./views/FoundationWorkshopView.js";
import { OpenExistingProjectView } from "./views/OpenExistingProjectView.js";
import { FeatureIntentView } from "./views/FeatureIntentView.js";
import { OverviewView } from "./views/OverviewView.js";
import { SettingsView } from "./views/SettingsView.js";
import { TimelineView } from "./views/TimelineView.js";
import type { WorkspaceView } from "./workspace-navigation.js";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
} from "./workspace-navigation.js";

export interface WorkspaceContentProps {
  readonly activeView: WorkspaceView;
  readonly root: string | null;
  readonly connection: string;
  readonly theme: "dark" | "light";
  readonly daemonInfo: DaemonInfoResult | null;
  readonly inspect: InspectResult | null;
  readonly inspectStatus: WorkspaceInspectStatus;
  readonly inspectError: string | null;
  readonly doctor: DoctorResult | null;
  readonly diff: ProjectDiffResult | null;
  readonly diffStatus: WorkspaceInspectStatus;
  readonly diffError: string | null;
  readonly timeline: ProjectTimelineResult | null;
  readonly timelineStatus: WorkspaceTimelineStatus;
  readonly timelineError: string | null;
  readonly isConnecting: boolean;
  readonly retryCount: number;
  readonly message: string | null;
  readonly confirmSwitch: boolean;
  readonly loadedViews: readonly string[];
  readonly confirmTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly activeApprovedPlan: ApprovedApplyPlan | null;
  readonly isApprovedApplyModalOpen: boolean;
  readonly isApplyingPlan: boolean;
  readonly approvedApplyExecutionResult: ApprovedApplyExecutionResult | null;
  readonly onConfirmChange: () => void;
  readonly onCancelChange: () => void;
  readonly onCloseApprovedApplyModal: () => void;
  readonly onApprovePlan: (grantedApprovals: readonly string[]) => void;
  readonly onConnectDaemon: () => void;
  readonly onRequestProjectSelect: (
    triggerEl?: HTMLButtonElement | null,
  ) => void;
  readonly onLoadDiff: () => void;
  readonly onLoadTimeline: () => void;
  readonly onThemeToggle: (theme: "dark" | "light") => void;
}

export function WorkspaceContent({
  activeView,
  root,
  connection,
  theme,
  daemonInfo,
  inspect,
  inspectStatus,
  inspectError,
  doctor,
  diff,
  diffStatus,
  diffError,
  timeline,
  timelineStatus,
  timelineError,
  isConnecting,
  retryCount,
  message,
  confirmSwitch,
  loadedViews,
  confirmTriggerRef,
  activeApprovedPlan,
  isApprovedApplyModalOpen,
  isApplyingPlan,
  approvedApplyExecutionResult,
  onConfirmChange,
  onCancelChange,
  onCloseApprovedApplyModal,
  onApprovePlan,
  onConnectDaemon,
  onRequestProjectSelect,
  onLoadDiff,
  onLoadTimeline,
  onThemeToggle,
}: WorkspaceContentProps) {
  if (activeView === "New project") {
    return <NewProjectView />;
  }

  if (activeView === "Open existing project") {
    return (
      <OpenExistingProjectView
        onSelectProject={() => onRequestProjectSelect()}
        root={root}
      />
    );
  }

  if (activeView === "Feature intent") {
    return (
      <FeatureIntentView
        onSelectProject={() => onRequestProjectSelect()}
        root={root}
      />
    );
  }

  if (activeView === "Foundation workshop") {
    return <FoundationWorkshopView />;
  }

  if (activeView === "Inspect") {
    return (
      <InspectView
        errorMessage={inspectError}
        onConnect={onConnectDaemon}
        onSelectProject={() => onRequestProjectSelect()}
        result={inspect}
        root={root}
        status={inspectStatus}
      />
    );
  }

  if (activeView === "Doctor") {
    return (
      <DoctorView
        errorMessage={inspectError}
        onConnect={onConnectDaemon}
        onSelectProject={() => onRequestProjectSelect()}
        result={doctor}
        root={root}
        status={inspectStatus}
      />
    );
  }

  if (activeView === "Diff review") {
    return (
      <DiffView
        errorMessage={diffError}
        onLoadDiff={onLoadDiff}
        onSelectProject={() => onRequestProjectSelect()}
        result={diff}
        root={root}
        status={diffStatus}
      />
    );
  }

  if (activeView === "Timeline") {
    return (
      <TimelineView
        errorMessage={timelineError}
        onLoadTimeline={onLoadTimeline}
        onSelectProject={() => onRequestProjectSelect()}
        result={timeline}
        root={root}
        status={timelineStatus}
      />
    );
  }

  if (activeView === "Settings") {
    return (
      <SettingsView
        connection={connection}
        daemonInfo={daemonInfo}
        onThemeToggle={onThemeToggle}
        root={root}
        theme={theme}
      />
    );
  }

  return (
    <>
      {confirmSwitch && root ? (
        <ConfirmRootChange
          currentRoot={root}
          loadedViews={[...loadedViews]}
          onConfirm={onConfirmChange}
          onCancel={onCancelChange}
          triggerRef={confirmTriggerRef}
        />
      ) : null}
      <ApprovedApplyModal
        plan={activeApprovedPlan}
        isOpen={isApprovedApplyModalOpen}
        onClose={onCloseApprovedApplyModal}
        isApplying={isApplyingPlan}
        executionResult={approvedApplyExecutionResult}
        onApprove={onApprovePlan}
      />
      <OverviewView
        connection={connection}
        daemonInfo={daemonInfo}
        doctor={doctor}
        inspect={inspect}
        isConnecting={isConnecting}
        message={message}
        onConnectDaemon={onConnectDaemon}
        onRequestProjectSelect={onRequestProjectSelect}
        retryCount={retryCount}
        root={root}
      />
    </>
  );
}
