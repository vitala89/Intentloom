import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CommandOption } from "./views/CommandPaletteModal.js";
import { CommandPaletteModal } from "./views/CommandPaletteModal.js";
import type { WorkspaceView } from "./workspace-navigation.js";
import { WorkspaceSidebar } from "./WorkspaceSidebar.js";
import { WorkspaceTopbar } from "./WorkspaceTopbar.js";

export interface DesktopShellProps {
  readonly theme: "dark" | "light";
  readonly activeView: WorkspaceView;
  readonly root: string | null;
  readonly connection: string;
  readonly isOperationLoading: boolean;
  readonly onSelectView: (view: WorkspaceView) => void;
  readonly onRequestProjectSelect: (
    triggerEl?: HTMLButtonElement | null,
  ) => void;
  readonly onCancelOperation: () => void;
  readonly onToggleTheme: () => void;
  readonly commandOptions: readonly CommandOption[];
  readonly children: ReactNode;
}

export function DesktopShell({
  theme,
  activeView,
  root,
  connection,
  isOperationLoading,
  onSelectView,
  onRequestProjectSelect,
  onCancelOperation,
  onToggleTheme,
  commandOptions,
  children,
}: DesktopShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const commandPaletteTriggerRef = useRef<HTMLButtonElement | null>(null);
  useCommandPaletteShortcut(setIsCommandPaletteOpen);
  return (
    <main className={`app-shell theme-${theme}`}>
      <a className="skip-link" href="#workspace-content">
        Skip to main content
      </a>
      <WorkspaceSidebar
        activeView={activeView}
        onRequestProjectSelect={onRequestProjectSelect}
        onSelectView={onSelectView}
        root={root}
      />
      <section className="workspace" id="workspace-content" tabIndex={-1}>
        <WorkspaceTopbar
          activeView={activeView}
          commandPaletteTriggerRef={commandPaletteTriggerRef}
          connection={connection}
          isOperationLoading={isOperationLoading}
          onCancelOperation={onCancelOperation}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleTheme={onToggleTheme}
          theme={theme}
        />
        <div className="content">{children}</div>
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          options={commandOptions}
          triggerRef={commandPaletteTriggerRef}
        />
      </section>
    </main>
  );
}

function useCommandPaletteShortcut(
  setOpen: (update: (open: boolean) => boolean) => void,
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);
}
