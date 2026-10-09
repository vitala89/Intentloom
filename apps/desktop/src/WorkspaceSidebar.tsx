import { Logo } from "./design/components/brand/Logo.js";
import { Wordmark } from "./design/components/brand/Wordmark.js";
import {
  workspaceFooterViews,
  workspaceViews,
  type WorkspaceView,
} from "./workspace-navigation.js";

export interface WorkspaceSidebarProps {
  readonly activeView: WorkspaceView;
  readonly root: string | null;
  readonly onSelectView: (view: WorkspaceView) => void;
  readonly onRequestProjectSelect: (
    triggerEl?: HTMLButtonElement | null,
  ) => void;
}

export function WorkspaceSidebar({
  activeView,
  root,
  onSelectView,
  onRequestProjectSelect,
}: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup" aria-label="Intentloom">
        <Logo size={24} />
        <Wordmark size={16} />
      </div>
      <button
        className="project-switcher"
        id="project-switcher"
        onClick={(event) => onRequestProjectSelect(event.currentTarget)}
        type="button"
      >
        <span className="project-glyph">⌂</span>
        <span className="project-copy">
          <strong>
            {root ? root.split(/[\\/]/).at(-1) : "No project selected"}
          </strong>
          <small>{root ?? "Choose a local root"}</small>
        </span>
        <span className="chevron">⌄</span>
      </button>
      <nav aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {workspaceViews.map((view) => (
          <button
            aria-current={activeView === view.label ? "page" : undefined}
            className={`nav-item ${activeView === view.label ? "active" : ""}`}
            key={view.label}
            onClick={() => onSelectView(view.label)}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              {view.icon}
            </span>
            {view.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {workspaceFooterViews.map((view) => (
          <button
            aria-current={activeView === view.label ? "page" : undefined}
            className={`nav-item ${activeView === view.label ? "active" : ""}`}
            key={view.label}
            onClick={() => onSelectView(view.label)}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              {view.icon}
            </span>
            {view.label}
          </button>
        ))}
        <div className="privacy-note">
          <span className="privacy-dot" />
          <span>
            <strong>Local-only</strong>
            <small>No data leaves this device</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
