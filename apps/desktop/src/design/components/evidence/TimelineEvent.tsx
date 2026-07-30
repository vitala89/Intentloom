import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";
import { EvidenceBadge } from "./EvidenceBadge.js";
import type { TrustClass } from "./EvidenceBadge.js";

export interface TimelineEventProps {
  title: ReactNode;
  /** ISO timestamp or preformatted absolute time. Rendered with tabular numerals. */
  timestamp: string;
  /** Where the event came from, e.g. "git" or "provider evidence". */
  source?: string;
  trust?: TrustClass;
  /** Short commit id, rendered in mono. */
  commit?: string;
  /** Changed paths for this event. */
  paths?: string[];
  /** Last item - hides the connector line. */
  last?: boolean;
  selected?: boolean;
  onClick?: () => void;
  /** Lucide icon name for the node. */
  icon?: string;
}

/** One event on the release / engineering timeline. Always paired with a table alternative. */
export function TimelineEvent({
  title,
  timestamp,
  source,
  trust,
  commit,
  paths = [],
  last,
  selected,
  onClick,
  icon = "git-commit-horizontal",
}: TimelineEventProps) {
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      style={{
        display: "flex",
        gap: 10,
        cursor: onClick ? "pointer" : "default",
        background: selected ? "var(--brand-subtle)" : "transparent",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "var(--radius-pill)",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <Icon name={icon} size={12} color="var(--text-secondary)" />
        </span>
        {!last ? (
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              width: 1,
              minHeight: 14,
              background: "var(--border)",
              marginTop: 2,
            }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 6 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              font: "var(--label-md-weight) var(--label-md-size)/var(--label-md-line) var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          {trust ? <EvidenceBadge trust={trust} /> : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 3,
            flexWrap: "wrap",
            font: "400 var(--caption-size)/var(--caption-line) var(--font-sans)",
            color: "var(--text-tertiary)",
          }}
        >
          <span className="il-tnum">{timestamp}</span>
          {source ? <span>· {source}</span> : null}
          {commit ? (
            <span style={{ fontFamily: "var(--font-mono)" }}>· {commit}</span>
          ) : null}
        </div>
        {paths.length > 0 ? (
          <div
            style={{
              marginTop: 4,
              font: "400 var(--code-sm-size)/var(--code-sm-line) var(--font-mono)",
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {paths.join("  ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
