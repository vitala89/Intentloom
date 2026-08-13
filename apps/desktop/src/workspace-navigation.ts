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
  | "Open existing project"
  | "Feature intent"
  | "Bounded execution"
  | "New project"
  | "Foundation workshop"
  | "Inspect"
  | "Doctor"
  | "Diff review"
  | "Timeline"
  | "Settings";

export const workspaceViews: Array<{ label: WorkspaceView; icon: string }> = [
  { label: "Overview", icon: "◈" },
  { label: "Open existing project", icon: "⌂" },
  { label: "Feature intent", icon: "◎" },
  { label: "Bounded execution", icon: "▷" },
  { label: "New project", icon: "✦" },
  { label: "Foundation workshop", icon: "◆" },
  { label: "Inspect", icon: "⌘" },
  { label: "Doctor", icon: "✚" },
  { label: "Diff review", icon: "⇄" },
  { label: "Timeline", icon: "◷" },
];
