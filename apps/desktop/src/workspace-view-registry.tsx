import type { ReactNode } from "react";
import { ConfirmRootChange } from "./ConfirmRootChange.js";
import { desktopDaemonAuthenticated } from "./desktop-daemon-ready.js";
import {
  createWorkspaceViewActions,
  type WorkspaceViewActions,
} from "./desktop-workspace-view-actions.js";
import { AdoptionPreviewPage } from "./features/adoption/AdoptionPreviewPage.js";
import { ExternalSpecializedPackPreviewPage } from "./features/external-specialized-pack/ExternalSpecializedPackPreviewPage.js";
import { FoundationWorkshopView } from "./features/foundation/workshop/FoundationWorkshopView.js";
import { NeutronWorkspace } from "./neutron/NeutronWorkspace.js";
import { BoundedExecutionView } from "./views/BoundedExecutionView.js";
import { ContinuousLoopView } from "./views/ContinuousLoopView.js";
import { DiffView } from "./views/DiffView.js";
import { DoctorView } from "./views/DoctorView.js";
import { FeatureIntentView } from "./views/FeatureIntentView.js";
import { InspectView } from "./views/InspectView.js";
import { NewProjectView } from "./views/NewProjectView.js";
import { OpenExistingProjectView } from "./views/OpenExistingProjectView.js";
import { OverviewView } from "./views/OverviewView.js";
import { SettingsView } from "./views/SettingsView.js";
import { TimelineView } from "./views/TimelineView.js";
import type { WorkspaceCompositionModel } from "./workspace-composition.js";
import type { WorkspaceView } from "./workspace-navigation.js";

type WorkspaceViewRenderer = (
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
) => ReactNode;

export const workspaceViewRenderers = {
  Overview: renderOverview,
  "Open existing project": renderOpenExistingProject,
  "Adoption preview": renderAdoptionPreview,
  "Feature intent": renderFeatureIntent,
  "Bounded execution": renderBoundedExecution,
  "Continuous loop": renderContinuousLoop,
  Neutron: renderNeutron,
  "New project": renderNewProject,
  "Foundation workshop": renderFoundationWorkshop,
  Inspect: renderInspect,
  Doctor: renderDoctor,
  "Diff review": renderDiff,
  Timeline: renderTimeline,
  Settings: renderSettings,
  "External specialized pack review": renderExternalSpecializedPack,
} as const satisfies Record<WorkspaceView, WorkspaceViewRenderer>;

export function renderWorkspaceView(
  view: WorkspaceView,
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return workspaceViewRenderers[view](model, actions);
}

export function workspaceActionsFor(
  model: WorkspaceCompositionModel,
): WorkspaceViewActions {
  return createWorkspaceViewActions({
    setActiveView: model.setActiveView,
    loadDoctor: model.doctor.load,
  });
}

function selectProject(model: WorkspaceCompositionModel): () => void {
  return () => model.project.requestSelect();
}

function renderNewProject(): ReactNode {
  return <NewProjectView />;
}

function renderOpenExistingProject(
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return (
    <OpenExistingProjectView
      onOpenAdoptionPreview={actions.openAdoptionPreview}
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderAdoptionPreview(model: WorkspaceCompositionModel): ReactNode {
  return (
    <AdoptionPreviewPage
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderFeatureIntent(model: WorkspaceCompositionModel): ReactNode {
  return (
    <FeatureIntentView
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderBoundedExecution(model: WorkspaceCompositionModel): ReactNode {
  return (
    <BoundedExecutionView
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderContinuousLoop(model: WorkspaceCompositionModel): ReactNode {
  return (
    <ContinuousLoopView
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderNeutron(model: WorkspaceCompositionModel): ReactNode {
  return (
    <NeutronWorkspace
      daemonReady={desktopDaemonAuthenticated({
        connection: model.connection.connection,
        daemonInfo: model.connection.daemonInfo,
        inspectStatus: model.inspect.status,
        isConnecting: model.connection.isConnecting,
      })}
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderFoundationWorkshop(): ReactNode {
  return <FoundationWorkshopView />;
}

function renderInspect(
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return (
    <InspectView
      errorMessage={model.inspect.error}
      onConnect={model.connection.connect}
      onOpenAdoptionPreview={actions.openAdoptionPreview}
      onSelectProject={selectProject(model)}
      result={model.inspect.result}
      root={model.project.root}
      status={model.inspect.status}
    />
  );
}

function renderDoctor(
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return (
    <DoctorView
      errorMessage={model.doctor.error ?? model.inspect.error}
      onConnect={model.connection.connect}
      onOpenExternalSpecializedPackPreview={
        actions.openExternalSpecializedPackPreview
      }
      onRefreshDoctor={model.doctor.load}
      onSelectProject={selectProject(model)}
      result={model.doctor.result}
      root={model.project.root}
      status={model.doctor.status}
    />
  );
}

function renderDiff(model: WorkspaceCompositionModel): ReactNode {
  return (
    <DiffView
      errorMessage={model.diff.error}
      onLoadDiff={model.diff.load}
      onSelectProject={selectProject(model)}
      result={model.diff.result}
      root={model.project.root}
      status={model.diff.status}
    />
  );
}

function renderTimeline(model: WorkspaceCompositionModel): ReactNode {
  return (
    <TimelineView
      errorMessage={model.timeline.error}
      onLoadTimeline={model.timeline.load}
      onSelectProject={selectProject(model)}
      result={model.timeline.result}
      root={model.project.root}
      status={model.timeline.status}
    />
  );
}

function renderExternalSpecializedPack(
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return (
    <ExternalSpecializedPackPreviewPage
      daemonConnected={model.connection.daemonInfo !== null}
      onLoadDoctor={model.doctor.load}
      onOpenDoctor={actions.openDoctorView}
      onSelectProject={selectProject(model)}
      root={model.project.root}
    />
  );
}

function renderSettings(model: WorkspaceCompositionModel): ReactNode {
  return (
    <SettingsView
      connection={model.connection.connection}
      daemonInfo={model.connection.daemonInfo}
      onThemeToggle={model.theme.setTheme}
      root={model.project.root}
      theme={model.theme.theme}
    />
  );
}

function renderOverview(
  model: WorkspaceCompositionModel,
  actions: WorkspaceViewActions,
): ReactNode {
  return (
    <>
      {model.project.confirmSwitch && model.project.root ? (
        <ConfirmRootChange
          currentRoot={model.project.root}
          loadedViews={[...model.project.loadedViews]}
          onCancel={model.project.cancelChange}
          onConfirm={model.project.confirmChange}
          triggerRef={model.project.confirmTriggerRef}
        />
      ) : null}
      <OverviewView
        connection={model.connection.connection}
        daemonInfo={model.connection.daemonInfo}
        doctor={model.doctor.result}
        inspect={model.inspect.result}
        isConnecting={model.connection.isConnecting}
        message={model.connection.message}
        onConnectDaemon={model.connection.connect}
        onOpenAdoptionPreview={actions.openAdoptionPreview}
        onRequestProjectSelect={model.project.requestSelect}
        retryCount={model.connection.retryCount}
        root={model.project.root}
      />
    </>
  );
}
