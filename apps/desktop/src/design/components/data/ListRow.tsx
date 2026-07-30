import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

export interface ListRowProps {
  title: ReactNode;
  /** Rendered in mono - usually the affected path. */
  subtitle?: ReactNode;
  /** Lucide icon name or a node. */
  leading?: string | ReactNode;
  trailing?: ReactNode;
  /** Chips rendered inline after the title. */
  meta?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** CSS color for the severity rail on the left edge. */
  tone?: string;
  dense?: boolean;
}

/** Selectable list row for master lists (findings, sessions, releases). */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  meta,
  selected,
  onClick,
  tone,
  dense,
}: ListRowProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="option"
      aria-selected={!!selected}
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
        padding: dense ? "6px 12px" : "9px 12px",
        borderBottom: "1px solid var(--border)",
        background: selected
          ? "var(--brand-subtle)"
          : hover
            ? "var(--surface-subtle)"
            : "transparent",
        boxShadow: selected ? "inset 2px 0 0 var(--action-primary)" : undefined,
        cursor: "pointer",
      }}
    >
      {tone ? (
        <span
          aria-hidden="true"
          style={{
            width: 3,
            alignSelf: "stretch",
            borderRadius: 2,
            background: tone,
            flex: "0 0 auto",
          }}
        />
      ) : null}
      {typeof leading === "string" ? (
        <Icon name={leading} size={15} color="var(--text-tertiary)" />
      ) : (
        leading
      )}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              font: "var(--label-md-weight) var(--label-md-size)/var(--label-md-line) var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          {meta}
        </div>
        {subtitle ? (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              font: "400 var(--code-sm-size)/var(--code-sm-line) var(--font-mono)",
              color: "var(--text-tertiary)",
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
