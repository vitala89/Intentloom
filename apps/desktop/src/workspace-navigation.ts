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

type WorkspaceSidebarPlacement = "primary" | "footer" | "hidden";
type WorkspaceCommandCategory = "Navigation" | "Actions";

interface WorkspaceCommandDefinition {
  readonly id: string;
  readonly category: WorkspaceCommandCategory;
  readonly label: string;
  readonly shortcut?: string;
  readonly order: number;
}

interface WorkspaceNavigationDefinition {
  readonly id: string;
  readonly icon: string;
  readonly sidebar: WorkspaceSidebarPlacement;
  readonly command: WorkspaceCommandDefinition | null;
}

export const workspaceNavigation = [
  nav(
    "Overview",
    "◈",
    "primary",
    command("nav-overview", "Navigation", "Go to Overview", 0, "1"),
  ),
  nav(
    "Open existing project",
    "⌂",
    "primary",
    command(
      "nav-open-existing",
      "Navigation",
      "Go to Open existing project",
      2,
    ),
  ),
  nav(
    "Adoption preview",
    "▤",
    "primary",
    command("nav-adoption-preview", "Navigation", "Go to Adoption preview", 3),
  ),
  nav(
    "Feature intent",
    "◎",
    "primary",
    command("nav-feature-intent", "Navigation", "Go to Feature intent", 4),
  ),
  nav(
    "Bounded execution",
    "▷",
    "primary",
    command(
      "nav-bounded-execution",
      "Navigation",
      "Go to Bounded execution",
      5,
    ),
  ),
  nav(
    "Continuous loop",
    "↻",
    "primary",
    command("nav-continuous-loop", "Navigation", "Go to Continuous loop", 6),
  ),
  nav(
    "Neutron",
    "⚛",
    "primary",
    command("nav-neutron", "Navigation", "Go to Neutron", 7),
  ),
  nav(
    "New project",
    "✦",
    "primary",
    command("nav-new-project", "Navigation", "Go to New project", 1, "2"),
  ),
  nav("Foundation workshop", "◆", "primary", null),
  nav(
    "Inspect",
    "⌘",
    "primary",
    command("nav-inspect", "Navigation", "Go to Inspect", 8, "3"),
  ),
  nav(
    "Doctor",
    "✚",
    "primary",
    command("nav-doctor", "Navigation", "Go to Doctor", 9, "3"),
  ),
  nav(
    "Diff review",
    "⇄",
    "primary",
    command("nav-diff", "Navigation", "Go to Diff Review", 10, "4"),
  ),
  nav(
    "Timeline",
    "◷",
    "primary",
    command("nav-timeline", "Navigation", "Go to Timeline", 11, "5"),
  ),
  nav(
    "Settings",
    "⚙",
    "footer",
    command("nav-settings", "Navigation", "Go to Settings & Diagnostics", 12),
  ),
  nav(
    "External specialized pack review",
    "⎘",
    "hidden",
    command(
      "action-external-specialized-pack-preview",
      "Actions",
      "Review external specialized pack…",
      13,
    ),
  ),
] as const satisfies readonly WorkspaceNavigationDefinition[];

export type WorkspaceView = (typeof workspaceNavigation)[number]["id"];

export interface WorkspaceNavItem {
  readonly label: WorkspaceView;
  readonly icon: string;
}

export const workspaceViews: readonly WorkspaceNavItem[] = workspaceNavigation
  .filter((entry) => entry.sidebar === "primary")
  .map((entry) => ({ label: entry.id, icon: entry.icon }));

export const workspaceFooterViews: readonly WorkspaceNavItem[] =
  workspaceNavigation
    .filter((entry) => entry.sidebar === "footer")
    .map((entry) => ({ label: entry.id, icon: entry.icon }));

export interface WorkspaceCommandEntry {
  readonly view: WorkspaceView;
  readonly icon: string;
  readonly commandId: string;
  readonly category: WorkspaceCommandCategory;
  readonly label: string;
  readonly shortcut: string | undefined;
  readonly order: number;
}

export function workspaceCommandEntries(): readonly WorkspaceCommandEntry[] {
  const ordered: WorkspaceCommandEntry[] = [];
  for (const entry of workspaceNavigation) {
    if (entry.command === null) continue;
    ordered[entry.command.order] = {
      view: entry.id,
      icon: entry.icon,
      commandId: entry.command.id,
      category: entry.command.category,
      label: entry.command.label,
      shortcut: entry.command.shortcut,
      order: entry.command.order,
    };
  }
  return ordered.filter((entry) => entry !== undefined);
}

function nav<const TId extends string>(
  id: TId,
  icon: string,
  sidebar: WorkspaceSidebarPlacement,
  palette: WorkspaceCommandDefinition | null,
) {
  return { id, icon, sidebar, command: palette };
}

function command(
  id: string,
  category: WorkspaceCommandCategory,
  label: string,
  order: number,
  shortcut?: string,
): WorkspaceCommandDefinition {
  return shortcut === undefined
    ? { id, category, label, order }
    : { id, category, label, order, shortcut };
}
