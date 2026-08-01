import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

export interface EmptyStateProps {
  /** Lucide glyph name from the vendored set. */
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Presentation for a surface with nothing in it.
 *
 * The title must name the reason in words - "Not configured", "Not evaluated",
 * "Unsupported", "Future" - never a zero, dash, or blank panel.
 */
export function EmptyState({
  icon = "circle-dashed",
  title,
  description,
  action,
  compact,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        minWidth: 0,
        padding: compact
          ? "var(--space-7) var(--space-5)"
          : "var(--space-11) var(--space-7)",
        textAlign: "center",
      }}
    >
      <Icon name={icon} size={compact ? 20 : 26} color="var(--text-tertiary)" />
      <div
        style={{
          font: "var(--heading-sm-weight) var(--heading-sm-size)/var(--heading-sm-line) var(--font-sans)",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </div>
      {description ? (
        <p
          style={{
            margin: 0,
            maxWidth: 460,
            font: "400 var(--body-sm-size)/var(--body-sm-line) var(--font-sans)",
            color: "var(--text-secondary)",
            textWrap: "pretty",
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? (
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            marginTop: "var(--space-2)",
          }}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}
