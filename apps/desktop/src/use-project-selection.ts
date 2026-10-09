import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type {
  DaemonInfoResult,
  DoctorResult,
  InspectResult,
} from "@intentloom/protocol";
import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
} from "./workspace-navigation.js";

export interface ProjectSelectionBinding {
  readonly root: string | null;
  readonly loadedViews: readonly string[];
  readonly abortCurrentOperation: () => void;
  readonly resetRootBoundState: () => void;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
  readonly setInspectError: (value: string | null) => void;
  readonly setInspectStatus: (value: WorkspaceInspectStatus) => void;
}

export interface ProjectSelectionController {
  readonly root: string | null;
  readonly confirmSwitch: boolean;
  readonly confirmTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly requestProjectSelect: (triggerEl?: HTMLButtonElement | null) => void;
  readonly confirmRootChange: () => void;
  readonly cancelRootChange: () => void;
  readonly bindSelection: (binding: ProjectSelectionBinding) => void;
}

export function deriveLoadedWorkspaceViews(input: {
  readonly inspect: InspectResult | null;
  readonly doctor: DoctorResult | null;
  readonly diffStatus: WorkspaceInspectStatus;
  readonly timelineStatus: WorkspaceTimelineStatus;
}): string[] {
  const loadedViews: string[] = [];
  if (input.inspect !== null) loadedViews.push("Inspect");
  if (input.doctor !== null) loadedViews.push("Doctor");
  if (input.diffStatus === "ready") loadedViews.push("Diff Review");
  if (input.timelineStatus === "ready" || input.timelineStatus === "empty") {
    loadedViews.push("Timeline");
  }
  return loadedViews;
}

export function resetWorkspaceForNewRoot(input: {
  readonly setConnection: (value: string) => void;
  readonly setDaemonInfo: (value: DaemonInfoResult | null) => void;
  readonly resetReads: () => void;
  readonly resetDoctor: () => void;
}): void {
  input.setConnection("Not connected");
  input.setDaemonInfo(null);
  input.resetReads();
  input.resetDoctor();
}

export async function selectDesktopProjectRoot(input: {
  readonly selectProjectRoot: () => Promise<string | null>;
  readonly abortCurrentOperation: () => void;
  readonly setMessage: (value: string | null) => void;
  readonly setRoot: (root: string) => void;
  readonly resetRootBoundState: () => void;
  readonly setInspectError: (value: string | null) => void;
  readonly setInspectStatus: (value: WorkspaceInspectStatus) => void;
}): Promise<void> {
  input.abortCurrentOperation();
  input.setMessage(null);
  try {
    const selectedRoot = await input.selectProjectRoot();
    if (selectedRoot) {
      input.setRoot(selectedRoot);
      input.resetRootBoundState();
    }
  } catch (error) {
    const selectionMessage =
      error instanceof DesktopBridgeError
        ? error.message
        : "The project directory could not be selected.";
    input.setInspectError(selectionMessage);
    input.setInspectStatus("error");
    input.setMessage(selectionMessage);
  }
}

export function useProjectSelection(): ProjectSelectionController {
  const [root, setRoot] = useState<string | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bindingRef = useRef<ProjectSelectionBinding | null>(null);
  const selectProject = useCallback(() => {
    const binding = requireProjectSelectionBinding(bindingRef.current);
    return selectDesktopProjectRoot({
      selectProjectRoot: () => desktopClient.selectProjectRoot(),
      abortCurrentOperation: binding.abortCurrentOperation,
      setMessage: binding.setMessage,
      setRoot,
      resetRootBoundState: binding.resetRootBoundState,
      setInspectError: binding.setInspectError,
      setInspectStatus: binding.setInspectStatus,
    });
  }, []);
  const requestProjectSelect = useCallback(
    (triggerEl?: HTMLButtonElement | null) => {
      const binding = requireProjectSelectionBinding(bindingRef.current);
      if (binding.root !== null && binding.loadedViews.length > 0) {
        confirmTriggerRef.current = triggerEl ?? null;
        setConfirmSwitch(true);
        return;
      }
      void selectProject();
    },
    [selectProject],
  );
  const confirmRootChange = useCallback(() => {
    setConfirmSwitch(false);
    void selectProject();
  }, [selectProject]);
  const cancelRootChange = useCallback(() => {
    setConfirmSwitch(false);
  }, []);
  const bindSelection = useCallback((binding: ProjectSelectionBinding) => {
    bindingRef.current = binding;
  }, []);
  return {
    root,
    confirmSwitch,
    confirmTriggerRef,
    requestProjectSelect,
    confirmRootChange,
    cancelRootChange,
    bindSelection,
  };
}

export function useBindProjectSelection(
  bindSelection: (binding: ProjectSelectionBinding) => void,
  binding: ProjectSelectionBinding,
): void {
  useEffect(() => {
    bindSelection(binding);
  }, [bindSelection, binding]);
}

function requireProjectSelectionBinding(
  binding: ProjectSelectionBinding | null,
): ProjectSelectionBinding {
  if (binding === null) {
    throw new Error("Project selection is not bound.");
  }
  return binding;
}
