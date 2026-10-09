import type { RefObject } from "react";
import type { WorkspaceView } from "./workspace-navigation.js";

export interface WorkspaceTopbarProps {
  readonly activeView: WorkspaceView;
  readonly connection: string;
  readonly theme: "dark" | "light";
  readonly isOperationLoading: boolean;
  readonly commandPaletteTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly onOpenCommandPalette: () => void;
  readonly onCancelOperation: () => void;
  readonly onToggleTheme: () => void;
}

export function WorkspaceTopbar({
  activeView,
  connection,
  theme,
  isOperationLoading,
  commandPaletteTriggerRef,
  onOpenCommandPalette,
  onCancelOperation,
  onToggleTheme,
}: WorkspaceTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Workspace / {activeView}</span>
        <h1>{activeView}</h1>
      </div>
      <div className="topbar-actions">
        <button
          ref={commandPaletteTriggerRef}
          className="command-palette-trigger"
          onClick={onOpenCommandPalette}
          title="Open Command Palette (⌘K)"
          type="button"
        >
          <span aria-hidden="true">🔍</span>
          <span>Search commands...</span>
          <kbd>⌘K</kbd>
        </button>
        {isOperationLoading ? (
          <button
            className="cancel-button"
            onClick={onCancelOperation}
            title="Cancel the current operation"
            type="button"
            aria-label="Cancel current operation"
          >
            <span aria-hidden="true">×</span> Cancel
          </button>
        ) : null}
        <button
          className="icon-button"
          onClick={onToggleTheme}
          title="Toggle theme"
          type="button"
        >
          {theme === "dark" ? "\u263c" : "\u263e"}
        </button>
        <button className="avatar" title="Account" type="button">
          EK
        </button>
        <span
          className="status-chip"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          {connection}
        </span>
      </div>
    </header>
  );
}
