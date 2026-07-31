import { useState } from "react";
import type { DaemonInfoResult } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { Button } from "../design/components/core/Button.js";

export interface SettingsViewProps {
  theme: "dark" | "light";
  onThemeToggle: (theme: "dark" | "light") => void;
  root: string | null;
  daemonInfo: DaemonInfoResult | null;
  connection: string;
}

export function SettingsView({
  theme,
  onThemeToggle,
  root,
  daemonInfo,
  connection,
}: SettingsViewProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyRoot() {
    if (!root) return;
    void navigator.clipboard.writeText(root);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Desktop Configuration & Status</span>
          <h2 id="settings-title">Settings & Diagnostics</h2>
        </div>
        <StatusChip tone="info" label="Read-only Scope" size="sm" />
      </div>

      <div className="settings-grid">
        <Card variant="default" title="Appearance & Preferences">
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Customize Desktop shell color theme and accessibility preferences.
          </p>
          <div className="settings-field-group">
            <div
              className="theme-btn-group"
              role="group"
              aria-label="Theme selector"
            >
              <button
                className={`theme-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => onThemeToggle("dark")}
                type="button"
              >
                ☾ Dark
              </button>
              <button
                className={`theme-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => onThemeToggle("light")}
                type="button"
              >
                ☼ Light
              </button>
            </div>
          </div>
        </Card>

        <Card variant="default" title="Daemon Diagnostics">
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Local authenticated daemon IPC details and wire protocol
            compatibility.
          </p>
          <dl className="change-facts">
            <div>
              <dt>Protocol version</dt>
              <dd>v{daemonInfo?.protocolVersion ?? 1}</dd>
            </div>
            <div>
              <dt>Daemon version</dt>
              <dd>{daemonInfo?.daemonVersion ?? "0.5.0-beta.1"}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>{connection}</dd>
            </div>
            <div>
              <dt>Transport</dt>
              <dd>IPC Unix socket / Named Pipe</dd>
            </div>
            <div>
              <dt>Capabilities</dt>
              <dd>{daemonInfo?.capabilities.length ?? 5} read-only methods</dd>
            </div>
          </dl>
        </Card>

        <Card variant="default" title="Project & Data Boundary">
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Canonical project root and local storage confidentiality bounds.
          </p>
          <div className="confirm-current">
            <span className="eyebrow">Active root</span>
            <code className="confirm-root-path">
              {root ?? "No project selected"}
            </code>
          </div>
          {root ? (
            <div style={{ marginTop: "var(--space-3)" }}>
              <Button variant="secondary" onClick={handleCopyRoot}>
                {copied ? "Copied path!" : "Copy root path"}
              </Button>
            </div>
          ) : null}
          <p style={{ marginTop: "var(--space-3)", marginBottom: 0 }}>
            <strong>Local-only execution:</strong> No telemetric data,
            analytics, or source code leaves your local workstation.
          </p>
        </Card>
      </div>

      <Card variant="subtle" title="Keyboard Shortcuts Cheat Sheet">
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Essential navigation and control shortcuts for keyboard-first
          operation.
        </p>
        <table className="shortcut-table">
          <thead>
            <tr>
              <th scope="col">Shortcut</th>
              <th scope="col">Action</th>
              <th scope="col">Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <kbd>⌘ K</kbd> / <kbd>Ctrl K</kbd>
              </td>
              <td>Open Command Palette</td>
              <td>Global</td>
            </tr>
            <tr>
              <td>
                <kbd>Esc</kbd>
              </td>
              <td>Close modal dialogs / Cancel confirm overlay</td>
              <td>Global</td>
            </tr>
            <tr>
              <td>
                <kbd>↑</kbd> / <kbd>↓</kbd>
              </td>
              <td>Navigate findings, diff changes, and timeline events</td>
              <td>Doctor / Diff / Timeline</td>
            </tr>
            <tr>
              <td>
                <kbd>Tab</kbd> (first)
              </td>
              <td>Focus "Skip to main content" link</td>
              <td>App shell root</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </section>
  );
}
