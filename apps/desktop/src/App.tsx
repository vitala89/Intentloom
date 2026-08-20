import { useState, useRef, useEffect, useCallback } from "react";
import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import { Logo } from "./design/components/brand/Logo.js";
import { Wordmark } from "./design/components/brand/Wordmark.js";
import type {
  ApprovedApplyExecutionResult,
  ApprovedApplyPlan,
  DaemonInfoResult,
  InspectResult,
  ProjectDiffResult,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import { WorkspaceContent } from "./WorkspaceContent.js";
import { inspectStatusForError } from "./desktop-bridge-status.js";
import { deriveIsOperationLoading } from "./desktop-operation-lifecycle.js";
import { useDesktopConnect } from "./use-desktop-connect.js";
import { useDesktopDoctor } from "./use-desktop-doctor.js";
import {
  connectedDaemonLabel,
  loadProjectDiff,
  loadProjectTimeline,
} from "./desktop-workspace-loaders.js";
import { CommandPaletteModal } from "./views/CommandPaletteModal.js";
import { buildWorkspaceCommandOptions } from "./workspace-command-options.js";
import {
  workspaceViews,
  type WorkspaceInspectStatus,
  type WorkspaceTimelineStatus,
  type WorkspaceView,
} from "./workspace-navigation.js";

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>("Overview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [connection, setConnection] = useState("Not connected");
  const [root, setRoot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [daemonInfo, setDaemonInfo] = useState<DaemonInfoResult | null>(null);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [inspectStatus, setInspectStatus] =
    useState<WorkspaceInspectStatus>("idle");
  const [inspectError, setInspectError] = useState<string | null>(null);
  const operationRef = useRef<AbortController | null>(null);
  const startOperation = useCallback((): AbortSignal => {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    return controller.signal;
  }, []);
  const [isConnecting, setIsConnecting] = useState(false);
  const [diff, setDiff] = useState<ProjectDiffResult | null>(null);
  const [diffStatus, setDiffStatus] = useState<WorkspaceInspectStatus>("idle");
  const [diffError, setDiffError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<ProjectTimelineResult | null>(null);
  const [timelineStatus, setTimelineStatus] =
    useState<WorkspaceTimelineStatus>("idle");
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const {
    doctor,
    doctorStatus,
    doctorError,
    doctorRoot,
    resetDoctor,
    loadDoctor,
    setDoctorStatus,
  } = useDesktopDoctor({
    root,
    activeView,
    daemonInfo,
    isConnecting,
    startOperation,
    setConnection,
    setMessage,
  });
  const { connectDaemon, retryCount } = useDesktopConnect({
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
  });
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeApprovedPlan, _setActiveApprovedPlan] =
    useState<ApprovedApplyPlan | null>(null);
  const [isApprovedApplyModalOpen, setIsApprovedApplyModalOpen] =
    useState(false);
  const [isApplyingPlan, setIsApplyingPlan] = useState(false);
  const [approvedApplyExecutionResult, setApprovedApplyExecutionResult] =
    useState<ApprovedApplyExecutionResult | null>(null);
  // Ref to the element that triggered the confirm overlay, for focus return
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Ref to the element that triggered the Command Palette
  const commandPaletteTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Derived loading state — true whenever any daemon operation is in-flight
  const isOperationLoading = deriveIsOperationLoading({
    isConnecting,
    inspectStatus,
    doctorStatus,
    diffStatus,
    timelineStatus,
  });

  // Derived: which views currently hold loaded data
  const loadedViews: string[] = [];
  if (inspect !== null) loadedViews.push("Inspect");
  if (doctor !== null) loadedViews.push("Doctor");
  if (diffStatus === "ready") loadedViews.push("Diff Review");
  if (timelineStatus === "ready" || timelineStatus === "empty")
    loadedViews.push("Timeline");

  // Wrap selectProject with a confirmation guard when data is loaded
  const requestProjectSelect = useCallback(
    (triggerEl?: HTMLButtonElement | null) => {
      if (root !== null && loadedViews.length > 0) {
        confirmTriggerRef.current = triggerEl ?? null;
        setConfirmSwitch(true);
      } else {
        void selectProject();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, loadedViews.join(",")],
  );

  // Global ⌘K / Ctrl+K keyboard shortcut listener for Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * Cancel the current in-flight operation (if any).
   * Called by the Cancel button in the topbar.
   */
  function cancelOperation() {
    operationRef.current?.abort();
    operationRef.current = null;
    setIsConnecting(false);
    if (inspectStatus === "loading") setInspectStatus("idle");
    if (doctorStatus === "loading") setDoctorStatus("idle");
    if (diffStatus === "loading") setDiffStatus("idle");
    if (timelineStatus === "loading") setTimelineStatus("idle");
    setConnection(root ? "Cancelled" : "Not connected");
    setMessage("Operation cancelled.");
  }

  function handleConfirmChange() {
    setConfirmSwitch(false);
    void selectProject();
  }

  function handleCancelChange() {
    setConfirmSwitch(false);
  }

  async function selectProject() {
    // Cancel any in-flight daemon operation before clearing state
    operationRef.current?.abort();
    operationRef.current = null;
    setMessage(null);
    try {
      const selectedRoot = await desktopClient.selectProjectRoot();
      if (selectedRoot) {
        setRoot(selectedRoot);
        setConnection("Not connected");
        setDaemonInfo(null);
        setInspect(null);
        setInspectStatus("idle");
        setInspectError(null);
        resetDoctor();
        setDiff(null);
        setDiffStatus("idle");
        setDiffError(null);
        setTimeline(null);
        setTimelineStatus("idle");
        setTimelineError(null);
      }
    } catch (error) {
      const selectionMessage =
        error instanceof DesktopBridgeError
          ? error.message
          : "The project directory could not be selected.";
      setInspectError(selectionMessage);
      setInspectStatus("error");
      setMessage(selectionMessage);
    }
  }

  async function loadDiff() {
    if (!root) {
      setDiffStatus("idle");
      return;
    }
    const signal = startOperation();
    setMessage(null);
    setDiff(null);
    setDiffError(null);
    setDiffStatus("loading");
    setConnection("Loading diff…");
    try {
      const result = await loadProjectDiff({
        root,
        signal,
        daemonInfo,
        setConnection,
        setMessage,
      });
      if (signal.aborted || result === null) return;
      setDiff(result);
      setDiffStatus("ready");
      setConnection(connectedDaemonLabel(daemonInfo));
    } catch (error) {
      if (signal.aborted) return;
      setDiffStatus(inspectStatusForError(error));
      if (error instanceof DesktopBridgeError) {
        setDiffError(error.message);
      }
    }
  }

  async function loadTimeline() {
    if (!root) {
      setTimelineStatus("idle");
      return;
    }
    const signal = startOperation();
    setMessage(null);
    setTimeline(null);
    setTimelineError(null);
    setTimelineStatus("loading");
    setConnection("Loading timeline…");
    try {
      const loaded = await loadProjectTimeline({
        root,
        signal,
        daemonInfo,
        setConnection,
        setMessage,
      });
      if (signal.aborted) return;
      setTimeline(loaded.result);
      setTimelineStatus(loaded.status);
      if (loaded.status === "ready") {
        setConnection(connectedDaemonLabel(daemonInfo));
      }
    } catch (error) {
      if (signal.aborted) return;
      setTimelineStatus(inspectStatusForError(error));
      if (error instanceof DesktopBridgeError) {
        setTimelineError(error.message);
      }
    }
  }

  const commandOptions = buildWorkspaceCommandOptions({
    theme,
    setActiveView,
    requestProjectSelect,
    connectDaemon,
    loadDiff,
    loadTimeline,
    setTheme,
  });

  return (
    <main className={`app-shell theme-${theme}`}>
      {/* Skip to main content link for keyboard/screen-reader users */}
      <a className="skip-link" href="#workspace-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="Intentloom">
          <Logo size={24} />
          <Wordmark size={16} />
        </div>

        <button
          className="project-switcher"
          id="project-switcher"
          onClick={(e) => requestProjectSelect(e.currentTarget)}
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
              onClick={() => setActiveView(view.label)}
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
          <button
            aria-current={activeView === "Settings" ? "page" : undefined}
            className={`nav-item ${activeView === "Settings" ? "active" : ""}`}
            onClick={() => setActiveView("Settings")}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            Settings
          </button>
          <div className="privacy-note">
            <span className="privacy-dot" />
            <span>
              <strong>Local-only</strong>
              <small>No data leaves this device</small>
            </span>
          </div>
        </div>
      </aside>

      <section className="workspace" id="workspace-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <span className="eyebrow">Workspace / {activeView}</span>
            <h1>{activeView}</h1>
          </div>
          <div className="topbar-actions">
            <button
              ref={commandPaletteTriggerRef}
              className="command-palette-trigger"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Open Command Palette (⌘K)"
              type="button"
            >
              <span aria-hidden="true">🔍</span>
              <span>Search commands...</span>
              <kbd>⌘K</kbd>
            </button>
            {/* Cancel button — visible only during any loading operation */}
            {isOperationLoading ? (
              <button
                className="cancel-button"
                onClick={cancelOperation}
                title="Cancel the current operation"
                type="button"
                aria-label="Cancel current operation"
              >
                <span aria-hidden="true">×</span> Cancel
              </button>
            ) : null}
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
              type="button"
            >
              {theme === "dark" ? "\u263c" : "\u263e"}
            </button>
            <button className="avatar" title="Account" type="button">
              EK
            </button>
            {/* Live region for connection status changes */}
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

        <div className="content">
          <WorkspaceContent
            activeView={activeView}
            root={root}
            connection={connection}
            theme={theme}
            daemonInfo={daemonInfo}
            inspect={inspect}
            inspectStatus={inspectStatus}
            inspectError={inspectError}
            doctor={doctor}
            doctorStatus={doctorStatus}
            doctorError={doctorError}
            diff={diff}
            diffStatus={diffStatus}
            diffError={diffError}
            timeline={timeline}
            timelineStatus={timelineStatus}
            timelineError={timelineError}
            isConnecting={isConnecting}
            retryCount={retryCount}
            message={message}
            confirmSwitch={confirmSwitch}
            loadedViews={loadedViews}
            confirmTriggerRef={confirmTriggerRef}
            activeApprovedPlan={activeApprovedPlan}
            isApprovedApplyModalOpen={isApprovedApplyModalOpen}
            isApplyingPlan={isApplyingPlan}
            approvedApplyExecutionResult={approvedApplyExecutionResult}
            onConfirmChange={handleConfirmChange}
            onCancelChange={handleCancelChange}
            onCloseApprovedApplyModal={() => setIsApprovedApplyModalOpen(false)}
            onApprovePlan={() => {
              if (!activeApprovedPlan || !root) return;
              setIsApplyingPlan(true);
              setTimeout(() => {
                setIsApplyingPlan(false);
                setApprovedApplyExecutionResult({
                  schemaVersion: 1,
                  targetResourceId: root,
                  applied: true,
                  gateResult: {
                    schemaVersion: 1,
                    targetResourceId: root,
                    passed: true,
                    diagnostics: [],
                    safeNextAction: "action-applied-successfully",
                  },
                  rollbackEvidence: {
                    schemaVersion: 1,
                    planDigest: activeApprovedPlan.planDigest,
                    targetRoot: root,
                    rollbackFiles: activeApprovedPlan.changedPaths.map((p) => ({
                      path: p,
                      previousContent: "// previous snapshot content",
                    })),
                  },
                  diagnostics: [],
                });
              }, 600);
            }}
            onConnectDaemon={() => void connectDaemon()}
            onRequestProjectSelect={requestProjectSelect}
            onLoadDoctor={() => void loadDoctor()}
            onLoadDiff={() => void loadDiff()}
            onLoadTimeline={() => void loadTimeline()}
            onOpenAdoptionPreview={() => setActiveView("Adoption preview")}
            onThemeToggle={setTheme}
          />
        </div>

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
