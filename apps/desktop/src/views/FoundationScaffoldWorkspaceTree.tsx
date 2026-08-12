import { StatusChip } from "../design/components/status/StatusChip.js";
import type { FoundationScaffoldWorkspaceSection } from "./foundation-scaffold-view-helpers.js";

export interface FoundationScaffoldWorkspaceTreeProps {
  readonly workspace: FoundationScaffoldWorkspaceSection;
}

export function FoundationScaffoldWorkspaceTree({
  workspace,
}: FoundationScaffoldWorkspaceTreeProps) {
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--text-secondary)" }}>
          Workspace topology: <code>{workspace.topology}</code>
        </span>
        {workspace.hasNx ? (
          <StatusChip tone="neutral" label="Nx" size="sm" />
        ) : null}
      </div>
      {workspace.groups.map((group) => (
        <div key={group.label}>
          <div
            style={{
              color: "var(--text-secondary)",
              marginBottom: "var(--space-2)",
              fontWeight: 600,
            }}
          >
            {group.label} ({group.files.length} files)
          </div>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "var(--space-2)",
            }}
          >
            {group.files.map((file) => (
              <li key={file.path}>
                <strong>[{file.action}]</strong> {file.path}{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  ({file.ownership})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
