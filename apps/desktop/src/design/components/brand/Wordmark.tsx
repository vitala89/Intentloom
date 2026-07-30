export interface WordmarkProps {
  /** Cap size in px. 14 in the title bar, 16 in the sidebar, 32+ on launch. */
  size?: number;
  color?: string;
  showVersion?: boolean;
  version?: string;
}

/**
 * Intentloom wordmark rendered in type. The provided sources contain no logo file,
 * so this is a plain typographic placeholder - replace it with the real mark when supplied.
 */
export function Wordmark({
  size = 16,
  color = "var(--text-primary)",
  showVersion,
  version = "v0.6.0-beta.1",
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
      {showVersion ? (
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
