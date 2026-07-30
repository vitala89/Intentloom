import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

export interface HunkHeaderProps {
  /** Unified range, e.g. "@@ -18,7 +18,9 @@". */
  range: string;
  /** Optional plain-language summary of the hunk. */
  summary?: ReactNode | undefined;
  collapsed?: boolean | undefined;
  /** Count shown when the hunk stands in for collapsed unchanged lines. */
  hiddenLines?: number | undefined;
  onToggle?: (() => void) | undefined;
}

/** Hunk boundary. Also used as the "collapsed unchanged lines" expander. */
export function HunkHeader({
  range,
  summary,
  collapsed,
  hiddenLines,
  onToggle,
}: HunkHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        height: 26,
        padding: "0 10px",
        background: "var(--surface-subtle)",
        border: 0,
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        textAlign: "left",
        font: "400 var(--code-sm-size)/1 var(--font-mono)",
      }}
    >
      <Icon
        name={collapsed ? "chevrons-up-down" : "chevrons-down-up"}
        size={12}
      />
      <span>{range}</span>
      {summary ? (
        <span
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--caption-size)",
          }}
        >
          {summary}
        </span>
      ) : null}
      {hiddenLines ? (
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--caption-size)",
          }}
        >
          {hiddenLines} unchanged lines
        </span>
      ) : null}
    </button>
  );
}
