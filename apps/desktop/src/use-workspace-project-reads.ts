import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  DaemonInfoResult,
  InspectResult,
  ProjectDiffResult,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import { DesktopBridgeError } from "./desktop-client.js";
import { inspectStatusForError } from "./desktop-bridge-status.js";
import {
  connectedDaemonLabel,
  loadProjectDiff,
  loadProjectTimeline,
} from "./desktop-workspace-loaders.js";
import type {
  WorkspaceInspectStatus,
  WorkspaceTimelineStatus,
} from "./workspace-navigation.js";

export interface WorkspaceInspectControls {
  readonly result: InspectResult | null;
  readonly status: WorkspaceInspectStatus;
  readonly error: string | null;
  readonly setResult: (value: InspectResult | null) => void;
  readonly setStatus: Dispatch<SetStateAction<WorkspaceInspectStatus>>;
  readonly setError: (value: string | null) => void;
}

export interface WorkspaceDiffControls {
  readonly result: ProjectDiffResult | null;
  readonly status: WorkspaceInspectStatus;
  readonly error: string | null;
  readonly setResult: (value: ProjectDiffResult | null) => void;
  readonly setStatus: Dispatch<SetStateAction<WorkspaceInspectStatus>>;
  readonly setError: (value: string | null) => void;
  readonly load: () => Promise<void>;
}

export interface WorkspaceTimelineControls {
  readonly result: ProjectTimelineResult | null;
  readonly status: WorkspaceTimelineStatus;
  readonly error: string | null;
  readonly setResult: (value: ProjectTimelineResult | null) => void;
  readonly setStatus: Dispatch<SetStateAction<WorkspaceTimelineStatus>>;
  readonly setError: (value: string | null) => void;
  readonly load: () => Promise<void>;
}

export interface WorkspaceProjectReads {
  readonly inspect: WorkspaceInspectControls;
  readonly diff: WorkspaceDiffControls;
  readonly timeline: WorkspaceTimelineControls;
  readonly reset: () => void;
}

interface ReadLoadContext {
  readonly root: string | null;
  readonly daemonInfo: DaemonInfoResult | null;
  readonly startOperation: () => AbortSignal;
  readonly setConnection: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
}

export function resetRootBoundReads(target: {
  readonly setInspect: (value: null) => void;
  readonly setInspectStatus: (value: "idle") => void;
  readonly setInspectError: (value: null) => void;
  readonly setDiff: (value: null) => void;
  readonly setDiffStatus: (value: "idle") => void;
  readonly setDiffError: (value: null) => void;
  readonly setTimeline: (value: null) => void;
  readonly setTimelineStatus: (value: "idle") => void;
  readonly setTimelineError: (value: null) => void;
}): void {
  target.setInspect(null);
  target.setInspectStatus("idle");
  target.setInspectError(null);
  target.setDiff(null);
  target.setDiffStatus("idle");
  target.setDiffError(null);
  target.setTimeline(null);
  target.setTimelineStatus("idle");
  target.setTimelineError(null);
}

export function useWorkspaceProjectReads(
  context: ReadLoadContext,
): WorkspaceProjectReads {
  const inspect = useWorkspaceInspectState();
  const diff = useProjectDiff(context);
  const timeline = useProjectTimeline(context);
  const reset = useCallback(() => {
    resetRootBoundReads({
      setInspect: inspect.setResult,
      setInspectStatus: inspect.setStatus,
      setInspectError: inspect.setError,
      setDiff: diff.setResult,
      setDiffStatus: diff.setStatus,
      setDiffError: diff.setError,
      setTimeline: timeline.setResult,
      setTimelineStatus: timeline.setStatus,
      setTimelineError: timeline.setError,
    });
  }, [
    diff.setError,
    diff.setResult,
    diff.setStatus,
    inspect.setError,
    inspect.setResult,
    inspect.setStatus,
    timeline.setError,
    timeline.setResult,
    timeline.setStatus,
  ]);
  return { inspect, diff, timeline, reset };
}

function useWorkspaceInspectState(): WorkspaceInspectControls {
  const [result, setResult] = useState<InspectResult | null>(null);
  const [status, setStatus] = useState<WorkspaceInspectStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  return { result, status, error, setResult, setStatus, setError };
}

function useProjectDiff(context: ReadLoadContext): WorkspaceDiffControls {
  const [result, setResult] = useState<ProjectDiffResult | null>(null);
  const [status, setStatus] = useState<WorkspaceInspectStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!context.root) {
      setStatus("idle");
      return;
    }
    const signal = context.startOperation();
    context.setMessage(null);
    setResult(null);
    setError(null);
    setStatus("loading");
    context.setConnection("Loading diff…");
    try {
      const loaded = await loadProjectDiff({
        root: context.root,
        signal,
        daemonInfo: context.daemonInfo,
        setConnection: context.setConnection,
        setMessage: context.setMessage,
      });
      if (signal.aborted || loaded === null) return;
      setResult(loaded);
      setStatus("ready");
      context.setConnection(connectedDaemonLabel(context.daemonInfo));
    } catch (caught) {
      if (signal.aborted) return;
      setStatus(inspectStatusForError(caught));
      if (caught instanceof DesktopBridgeError) setError(caught.message);
    }
  }, [context]);
  return { result, status, error, setResult, setStatus, setError, load };
}

function useProjectTimeline(
  context: ReadLoadContext,
): WorkspaceTimelineControls {
  const [result, setResult] = useState<ProjectTimelineResult | null>(null);
  const [status, setStatus] = useState<WorkspaceTimelineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!context.root) {
      setStatus("idle");
      return;
    }
    const signal = context.startOperation();
    context.setMessage(null);
    setResult(null);
    setError(null);
    setStatus("loading");
    context.setConnection("Loading timeline…");
    try {
      const loaded = await loadProjectTimeline({
        root: context.root,
        signal,
        daemonInfo: context.daemonInfo,
        setConnection: context.setConnection,
        setMessage: context.setMessage,
      });
      if (signal.aborted) return;
      setResult(loaded.result);
      setStatus(loaded.status);
      if (loaded.status === "ready") {
        context.setConnection(connectedDaemonLabel(context.daemonInfo));
      }
    } catch (caught) {
      if (signal.aborted) return;
      setStatus(inspectStatusForError(caught));
      if (caught instanceof DesktopBridgeError) setError(caught.message);
    }
  }, [context]);
  return { result, status, error, setResult, setStatus, setError, load };
}
