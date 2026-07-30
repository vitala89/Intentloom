export interface WordmarkProps {
  /** Cap size in px. 14 in the title bar, 16 in the sidebar, 32+ on launch. */
  size?: number;
  color?: string;
  /** Show the version string. Requires `version`; nothing renders without it. */
  showVersion?: boolean;
  /**
   * Version to display. There is deliberately no default: a hardcoded fallback
   * would render a stale version as though it were the running one.
   */
  version?: string;
}

/**
 * Intentloom wordmark rendered in type, for the places that need the name
 * without the symbol. Use `Logo` when the mark should appear alongside it.
 */
export function Wordmark({
  size = 16,
  color = "var(--text-primary)",
  showVersion,
  version,
}: WordmarkProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          font: `650 ${size}px/1.1 var(--font-display)`,
          letterSpacing: "-0.02em",
          color,
        }}
      >
        intent<span style={{ color: "var(--action-primary)" }}>loom</span>
      </span>
      {showVersion && version ? (
        <span
          style={{
            font: `400 var(--caption-size)/1 var(--font-mono)`,
            color: "var(--text-tertiary)",
          }}
        >
          {version}
        </span>
      ) : null}
    </span>
  );
}
