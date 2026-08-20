import { useCallback, useRef, useState } from "react";
import type { DaemonInfoResult, InspectResult } from "@intentloom/protocol";
import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import { inspectStatusForError } from "./desktop-bridge-status.js";
import { terminalizeConnectAbortInspectStatus } from "./desktop-operation-lifecycle.js";
import type { WorkspaceInspectStatus } from "./workspace-navigation.js";

export interface UseDesktopConnectOptions {
  readonly root: string | null;
  readonly doctorRoot: string | null;
  readonly doctor: unknown;
  readonly isConnecting: boolean;
  readonly setIsConnecting: (value: boolean) => void;
  readonly startOperation: () => AbortSignal;
  readonly loadDoctor: (existingSignal?: AbortSignal) => Promise<void>;
  readonly resetDoctor: () => void;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
  readonly setDaemonInfo: (value: DaemonInfoResult | null) => void;
  readonly setInspect: (value: InspectResult | null) => void;
  readonly setInspectStatus: (
    value:
      | WorkspaceInspectStatus
      | ((current: WorkspaceInspectStatus) => WorkspaceInspectStatus),
  ) => void;
  readonly setInspectError: (value: string | null) => void;
  readonly setDiff: (value: null) => void;
  readonly setDiffStatus: (value: WorkspaceInspectStatus) => void;
  readonly setDiffError: (value: string | null) => void;
  readonly setTimeline: (value: null) => void;
  readonly setTimelineStatus: (value: WorkspaceInspectStatus) => void;
  readonly setTimelineError: (value: string | null) => void;
}

export function useDesktopConnect({
  root,
  doctorRoot,
  doctor,
  isConnecting,
  setIsConnecting,
  startOperation,
  loadDoctor,
  resetDoctor,
  setConnection,
  setMessage,
  setDaemonInfo,
  setInspect,
  setInspectStatus,
  setInspectError,
  setDiff,
  setDiffStatus,
  setDiffError,
  setTimeline,
  setTimelineStatus,
  setTimelineError,
}: UseDesktopConnectOptions) {
  const [retryCount, setRetryCount] = useState(0);
  const connectDaemonRef = useRef<() => Promise<void>>(async () => {});

  const connectDaemon = useCallback(async () => {
    if (isConnecting) return;
    const signal = startOperation();
    setConnection("Connecting…");
    setMessage(null);
    setIsConnecting(true);
    setInspectError(null);
    if (root) {
      setInspect(null);
      setInspectStatus("loading");
      resetDoctor();
      setDiff(null);
      setDiffStatus("idle");
      setDiffError(null);
      setTimeline(null);
      setTimelineStatus("idle");
      setTimelineError(null);
    }
    try {
      const info = await desktopClient.daemonInfo(signal);
      if (signal.aborted) return;
      setDaemonInfo(info);
      setRetryCount(0);
      if (info.compatibility.status === "incompatible") {
        setInspectStatus(root ? "protocol-mismatch" : "idle");
        setConnection("Protocol mismatch");
        setMessage(
          info.compatibility.reason ??
            "The local daemon is not compatible with this Desktop client.",
        );
        return;
      }
      if (root) {
        setConnection("Reading project…");
        const projectInspect = await desktopClient.inspectProject(root, signal);
        if (signal.aborted) return;
        setInspect(projectInspect);
        setInspectStatus("ready");
        if (doctorRoot !== root || doctor === null) {
          await loadDoctor(signal);
        }
      }
      setConnection(`Daemon ${info.daemonVersion}`);
    } catch (error) {
      if (signal.aborted) return;
      const nextInspectStatus = root ? inspectStatusForError(error) : "idle";
      setInspectStatus(nextInspectStatus);
      if (error instanceof DesktopBridgeError) {
        setInspectError(error.message);
      }
      const isTransientDisconnect =
        error instanceof DesktopBridgeError &&
        (error.code === "disconnected" ||
          error.code === "native_bridge_unavailable");
      if (isTransientDisconnect && retryCount < 1) {
        setRetryCount((current) => current + 1);
        setConnection("Reconnecting…");
        setMessage("Daemon not ready — retrying in 1.5s…");
        setIsConnecting(false);
        setTimeout(() => {
          void connectDaemonRef.current();
        }, 1500);
        return;
      }
      setConnection(
        nextInspectStatus === "stale" || nextInspectStatus === "invalid-root"
          ? nextInspectStatus === "stale"
            ? "Project root changed"
            : "Project root unavailable"
          : nextInspectStatus === "protocol-mismatch"
            ? "Protocol mismatch"
            : "Disconnected",
      );
      setMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "The local daemon could not be reached.",
      );
    } finally {
      setIsConnecting(false);
      if (signal.aborted) {
        setInspectStatus((current) =>
          terminalizeConnectAbortInspectStatus(current, true),
        );
      }
    }
  }, [
    doctor,
    doctorRoot,
    isConnecting,
    loadDoctor,
    resetDoctor,
    retryCount,
    root,
    setConnection,
    setDaemonInfo,
    setDiff,
    setDiffError,
    setDiffStatus,
    setInspect,
    setInspectError,
    setInspectStatus,
    setIsConnecting,
    setMessage,
    setTimeline,
    setTimelineError,
    setTimelineStatus,
    startOperation,
  ]);

  connectDaemonRef.current = connectDaemon;

  return { connectDaemon, retryCount };
}
