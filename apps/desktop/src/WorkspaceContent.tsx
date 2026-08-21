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
import { AdoptionPreviewPage } from "./views/AdoptionPreviewPage.js";
import { FeatureIntentView } from "./views/FeatureIntentView.js";
import { BoundedExecutionView } from "./views/BoundedExecutionView.js";
import { ContinuousLoopView } from "./views/ContinuousLoopView.js";
import { ExternalSpecializedPackPreviewPage } from "./views/ExternalSpecializedPackPreviewPage.js";
import { OverviewView } from "./views/OverviewView.js";
import { SettingsView } from "./views/SettingsView.js";
import { TimelineView } from "./views/TimelineView.js";
import type { WorkspaceView } from "./workspace-navigation.js";
import { createWorkspaceViewActions } from "./desktop-workspace-view-actions.js";
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
  readonly doctorStatus: WorkspaceInspectStatus;
  readonly doctorError: string | null;
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
  readonly onLoadDoctor: () => void;
  readonly onLoadDiff: () => void;
  readonly onLoadTimeline: () => void;
  readonly setActiveView: (view: WorkspaceView) => void;
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
  doctorStatus,
  doctorError,
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
  onLoadDoctor,
  onLoadDiff,
  onLoadTimeline,
  setActiveView,
  onThemeToggle,
}: WorkspaceContentProps) {
  const workspaceViewActions = createWorkspaceViewActions({
    setActiveView,
    loadDoctor: onLoadDoctor,
  });
  if (activeView === "New project") {
    return <NewProjectView />;
  }

  if (activeView === "Open existing project") {
    return (
      <OpenExistingProjectView
        onOpenAdoptionPreview={workspaceViewActions.openAdoptionPreview}
        onSelectProject={() => onRequestProjectSelect()}
        root={root}
      />
    );
  }

  if (activeView === "Adoption preview") {
    return (
      <AdoptionPreviewPage
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

  if (activeView === "Bounded execution") {
    return (
      <BoundedExecutionView
        onSelectProject={() => onRequestProjectSelect()}
        root={root}
      />
    );
  }

  if (activeView === "Continuous loop") {
    return (
      <ContinuousLoopView
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
        onOpenAdoptionPreview={workspaceViewActions.openAdoptionPreview}
        result={inspect}
        root={root}
        status={inspectStatus}
      />
    );
  }

  if (activeView === "Doctor") {
    return (
      <DoctorView
        errorMessage={doctorError ?? inspectError}
        onConnect={onConnectDaemon}
        onOpenExternalSpecializedPackPreview={
          workspaceViewActions.openExternalSpecializedPackPreview
        }
        onRefreshDoctor={onLoadDoctor}
        onSelectProject={() => onRequestProjectSelect()}
        result={doctor}
        root={root}
        status={doctorStatus}
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

  if (activeView === "External specialized pack review") {
    return (
      <ExternalSpecializedPackPreviewPage
        onOpenDoctor={workspaceViewActions.openDoctorView}
        onSelectProject={() => onRequestProjectSelect()}
        root={root}
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
        onOpenAdoptionPreview={workspaceViewActions.openAdoptionPreview}
        retryCount={retryCount}
        root={root}
      />
    </>
  );
}
