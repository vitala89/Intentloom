import type { RefObject } from "react";
import type {
  DaemonInfoResult,
  DoctorResult,
  InspectResult,
  ProjectDiffResult,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
  WorkspaceView,
} from "./workspace-navigation.js";

export interface WorkspaceCompositionModel {
  readonly activeView: WorkspaceView;
  readonly setActiveView: (view: WorkspaceView) => void;
  readonly project: WorkspaceProjectModel;
  readonly connection: WorkspaceConnectionModel;
  readonly inspect: WorkspaceInspectModel;
  readonly doctor: WorkspaceDoctorModel;
  readonly diff: WorkspaceDiffModel;
  readonly timeline: WorkspaceTimelineModel;
  readonly theme: WorkspaceThemeModel;
}

export interface WorkspaceProjectModel {
  readonly root: string | null;
  readonly confirmSwitch: boolean;
  readonly loadedViews: readonly string[];
  readonly confirmTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly requestSelect: (triggerEl?: HTMLButtonElement | null) => void;
  readonly confirmChange: () => void;
  readonly cancelChange: () => void;
}

export interface WorkspaceConnectionModel {
  readonly connection: string;
  readonly message: string | null;
  readonly daemonInfo: DaemonInfoResult | null;
  readonly isConnecting: boolean;
  readonly retryCount: number;
  readonly connect: () => void;
}

export interface WorkspaceInspectModel {
  readonly result: InspectResult | null;
  readonly status: WorkspaceInspectStatus;
  readonly error: string | null;
}

export interface WorkspaceDoctorModel {
  readonly result: DoctorResult | null;
  readonly status: WorkspaceInspectStatus;
  readonly error: string | null;
  readonly load: () => void;
}

export interface WorkspaceDiffModel {
  readonly result: ProjectDiffResult | null;
  readonly status: WorkspaceInspectStatus;
  readonly error: string | null;
  readonly load: () => void;
}

export interface WorkspaceTimelineModel {
  readonly result: ProjectTimelineResult | null;
  readonly status: WorkspaceTimelineStatus;
  readonly error: string | null;
  readonly load: () => void;
}

export interface WorkspaceThemeModel {
  readonly theme: "dark" | "light";
  readonly setTheme: (theme: "dark" | "light") => void;
}
