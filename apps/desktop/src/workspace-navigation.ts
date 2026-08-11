export type WorkspaceInspectStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "invalid-root"
  | "disconnected"
  | "protocol-mismatch"
  | "error";

export type WorkspaceTimelineStatus = WorkspaceInspectStatus | "empty";

export type WorkspaceView =
  | "Overview"
  | "New project"
  | "Inspect"
  | "Doctor"
  | "Diff review"
  | "Timeline"
  | "Settings";

export const workspaceViews: Array<{ label: WorkspaceView; icon: string }> = [
  { label: "Overview", icon: "◈" },
  { label: "New project", icon: "✦" },
  { label: "Inspect", icon: "⌘" },
  { label: "Doctor", icon: "✚" },
  { label: "Diff review", icon: "⇄" },
  { label: "Timeline", icon: "◷" },
];
