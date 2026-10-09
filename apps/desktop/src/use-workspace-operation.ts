import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
} from "./workspace-navigation.js";

export interface WorkspaceOperationController {
  readonly isConnecting: boolean;
  readonly setIsConnecting: (value: boolean) => void;
  readonly startOperation: () => AbortSignal;
  readonly abortCurrentOperation: () => void;
}

export function useWorkspaceOperation(): WorkspaceOperationController {
  const operationRef = useRef<AbortController | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const startOperation = useCallback((): AbortSignal => {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    return controller.signal;
  }, []);
  const abortCurrentOperation = useCallback(() => {
    operationRef.current?.abort();
    operationRef.current = null;
  }, []);
  return {
    isConnecting,
    setIsConnecting,
    startOperation,
    abortCurrentOperation,
  };
}

export function cancelWorkspaceOperation(input: {
  readonly abortCurrentOperation: () => void;
  readonly setIsConnecting: (value: boolean) => void;
  readonly root: string | null;
  readonly inspectStatus: WorkspaceInspectStatus;
  readonly setInspectStatus: Dispatch<SetStateAction<WorkspaceInspectStatus>>;
  readonly doctorStatus: WorkspaceInspectStatus;
  readonly setDoctorStatus: Dispatch<SetStateAction<WorkspaceInspectStatus>>;
  readonly diffStatus: WorkspaceInspectStatus;
  readonly setDiffStatus: Dispatch<SetStateAction<WorkspaceInspectStatus>>;
  readonly timelineStatus: WorkspaceTimelineStatus;
  readonly setTimelineStatus: Dispatch<SetStateAction<WorkspaceTimelineStatus>>;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
}): void {
  input.abortCurrentOperation();
  input.setIsConnecting(false);
  if (input.inspectStatus === "loading") input.setInspectStatus("idle");
  if (input.doctorStatus === "loading") input.setDoctorStatus("idle");
  if (input.diffStatus === "loading") input.setDiffStatus("idle");
  if (input.timelineStatus === "loading") input.setTimelineStatus("idle");
  input.setConnection(input.root ? "Cancelled" : "Not connected");
  input.setMessage("Operation cancelled.");
}
