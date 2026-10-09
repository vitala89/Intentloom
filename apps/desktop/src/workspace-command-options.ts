import type { CommandOption } from "./views/CommandPaletteModal.js";
import {
  workspaceCommandEntries,
  type WorkspaceView,
} from "./workspace-navigation.js";

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
  const navigation = workspaceCommandEntries().map((entry) =>
    navigationCommand(entry, deps.setActiveView),
  );
  return [
    ...navigation,
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

function navigationCommand(
  entry: ReturnType<typeof workspaceCommandEntries>[number],
  setActiveView: (view: WorkspaceView) => void,
): CommandOption {
  const option: CommandOption = {
    id: entry.commandId,
    category: entry.category,
    label: entry.label,
    icon: entry.icon,
    action: () => setActiveView(entry.view),
  };
  if (entry.shortcut !== undefined && entry.shortcut.length > 0) {
    option.shortcut = entry.shortcut;
  }
  return option;
}
