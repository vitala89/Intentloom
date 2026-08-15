import type { CommandOption } from "./views/CommandPaletteModal.js";
import type { WorkspaceView } from "./workspace-navigation.js";

export interface WorkspaceCommandOptionDeps {
  readonly theme: "dark" | "light";
  readonly setActiveView: (view: WorkspaceView) => void;
  readonly requestProjectSelect: () => void;
  readonly connectDaemon: () => void | Promise<void>;
  readonly loadDiff: () => void | Promise<void>;
  readonly loadTimeline: () => void | Promise<void>;
  readonly setTheme: (
    value: "dark" | "light" | ((current: "dark" | "light") => "dark" | "light"),
  ) => void;
}

export function buildWorkspaceCommandOptions(
  deps: WorkspaceCommandOptionDeps,
): CommandOption[] {
  return [
    {
      id: "nav-overview",
      category: "Navigation",
      label: "Go to Overview",
      icon: "◈",
      shortcut: "1",
      action: () => deps.setActiveView("Overview"),
    },
    {
      id: "nav-new-project",
      category: "Navigation",
      label: "Go to New project",
      icon: "✦",
      shortcut: "2",
      action: () => deps.setActiveView("New project"),
    },
    {
      id: "nav-open-existing",
      category: "Navigation",
      label: "Go to Open existing project",
      icon: "⌂",
      shortcut: "",
      action: () => deps.setActiveView("Open existing project"),
    },
    {
      id: "nav-feature-intent",
      category: "Navigation",
      label: "Go to Feature intent",
      icon: "◎",
      shortcut: "",
      action: () => deps.setActiveView("Feature intent"),
    },
    {
      id: "nav-bounded-execution",
      category: "Navigation",
      label: "Go to Bounded execution",
      icon: "▷",
      shortcut: "",
      action: () => deps.setActiveView("Bounded execution"),
    },
    {
      id: "nav-continuous-loop",
      category: "Navigation",
      label: "Go to Continuous loop",
      icon: "↻",
      shortcut: "",
      action: () => deps.setActiveView("Continuous loop"),
    },
    {
      id: "nav-inspect",
      category: "Navigation",
      label: "Go to Inspect",
      icon: "⌘",
      shortcut: "3",
      action: () => deps.setActiveView("Inspect"),
    },
    {
      id: "nav-doctor",
      category: "Navigation",
      label: "Go to Doctor",
      icon: "✚",
      shortcut: "3",
      action: () => deps.setActiveView("Doctor"),
    },
    {
      id: "nav-diff",
      category: "Navigation",
      label: "Go to Diff Review",
      icon: "⇄",
      shortcut: "4",
      action: () => deps.setActiveView("Diff review"),
    },
    {
      id: "nav-timeline",
      category: "Navigation",
      label: "Go to Timeline",
      icon: "◷",
      shortcut: "5",
      action: () => deps.setActiveView("Timeline"),
    },
    {
      id: "nav-settings",
      category: "Navigation",
      label: "Go to Settings & Diagnostics",
      icon: "⚙",
      action: () => deps.setActiveView("Settings"),
    },
    {
      id: "action-select-root",
      category: "Actions",
      label: "Select local project root...",
      icon: "⌂",
      action: () => deps.requestProjectSelect(),
    },
    {
      id: "action-reconnect",
      category: "Actions",
      label: "Reconnect daemon",
      icon: "↻",
      action: () => void deps.connectDaemon(),
    },
    {
      id: "action-load-diff",
      category: "Actions",
      label: "Load diff preview",
      icon: "⇄",
      action: () => void deps.loadDiff(),
    },
    {
      id: "action-load-timeline",
      category: "Actions",
      label: "Load project timeline",
      icon: "◷",
      action: () => void deps.loadTimeline(),
    },
    {
      id: "action-toggle-theme",
      category: "Actions",
      label: `Switch to ${deps.theme === "dark" ? "Light" : "Dark"} mode`,
      icon: deps.theme === "dark" ? "☼" : "☾",
      action: () =>
        deps.setTheme((current) => (current === "dark" ? "light" : "dark")),
    },
  ];
}
