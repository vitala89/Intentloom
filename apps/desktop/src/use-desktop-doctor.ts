import { useEffect, useState } from "react";
import type { DaemonInfoResult, DoctorResult } from "@intentloom/protocol";
import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import { inspectStatusForError } from "./desktop-bridge-status.js";
import { shouldAutoLoadDoctor } from "./desktop-operation-lifecycle.js";
import type {
  WorkspaceInspectStatus,
  WorkspaceView,
} from "./workspace-navigation.js";

export interface UseDesktopDoctorOptions {
  readonly root: string | null;
  readonly activeView: WorkspaceView;
  readonly daemonInfo: DaemonInfoResult | null;
  readonly isConnecting: boolean;
  readonly startOperation: () => AbortSignal;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
}

export function useDesktopDoctor({
  root,
  activeView,
  daemonInfo,
  isConnecting,
  startOperation,
  setConnection,
  setMessage,
}: UseDesktopDoctorOptions) {
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [doctorStatus, setDoctorStatus] =
    useState<WorkspaceInspectStatus>("idle");
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorRoot, setDoctorRoot] = useState<string | null>(null);

  function resetDoctor() {
    setDoctor(null);
    setDoctorStatus("idle");
    setDoctorError(null);
    setDoctorRoot(null);
  }

  async function loadDoctor(existingSignal?: AbortSignal) {
    if (!root) {
      setDoctorStatus("idle");
      return;
    }
    if (doctorStatus === "loading" && existingSignal === undefined) return;
    const signal = existingSignal ?? startOperation();
    setMessage(null);
    setDoctorError(null);
    setDoctorStatus("loading");
    if (existingSignal === undefined) {
      setConnection("Running Doctor…");
    }
    try {
      const result = await desktopClient.doctorProject(root, signal);
      if (signal.aborted) return;
      setDoctor(result);
      setDoctorRoot(root);
      setDoctorStatus("ready");
      if (existingSignal === undefined) {
        setConnection(
          daemonInfo
            ? `Daemon ${daemonInfo.daemonVersion}`
            : "Daemon connected",
        );
      }
    } catch (error) {
      if (signal.aborted) return;
      const nextStatus = inspectStatusForError(error);
      setDoctorStatus(nextStatus);
      setDoctor(null);
      setDoctorRoot(null);
      if (error instanceof DesktopBridgeError) {
        setDoctorError(error.message);
      }
      if (existingSignal === undefined) {
        setConnection(
          nextStatus === "stale" || nextStatus === "invalid-root"
            ? nextStatus === "stale"
              ? "Project root changed"
              : "Project root unavailable"
            : nextStatus === "protocol-mismatch"
              ? "Protocol mismatch"
              : "Disconnected",
        );
        setMessage(
          error instanceof DesktopBridgeError
            ? error.message
            : "The project Doctor result could not be loaded.",
        );
      }
    }
  }

  useEffect(() => {
    if (root !== null && doctorRoot !== null && root !== doctorRoot) {
      resetDoctor();
    }
    // resetDoctor is stable for this lifecycle-only invalidation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, doctorRoot]);

  useEffect(() => {
    if (
      shouldAutoLoadDoctor({
        activeView,
        root,
        daemonInfo,
        doctorStatus,
        doctor,
        isConnecting,
      })
    ) {
      void loadDoctor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, root, daemonInfo, doctorStatus, doctor, isConnecting]);

  return {
    doctor,
    doctorStatus,
    doctorError,
    doctorRoot,
    resetDoctor,
    loadDoctor,
    setDoctorStatus,
  };
}
