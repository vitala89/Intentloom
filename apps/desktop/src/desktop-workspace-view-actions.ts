import type { WorkspaceView } from "./workspace-navigation.js";

export interface WorkspaceViewActions {
  readonly openAdoptionPreview: () => void;
  readonly openDoctorView: () => void;
  readonly openExternalSpecializedPackPreview: () => void;
}

export function createWorkspaceViewActions(deps: {
  readonly setActiveView: (view: WorkspaceView) => void;
  readonly loadDoctor: () => void | Promise<void>;
}): WorkspaceViewActions {
  return {
    openAdoptionPreview: () => deps.setActiveView("Adoption preview"),
    openDoctorView: () => {
      deps.setActiveView("Doctor");
      void deps.loadDoctor();
    },
    openExternalSpecializedPackPreview: () =>
      deps.setActiveView("External specialized pack review"),
  };
}
