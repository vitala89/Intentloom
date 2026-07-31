import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  /** `default` sits on the page, `subtle` recedes, `raised` lifts with elevation. */
  variant?: "default" | "subtle" | "raised";
  title?: string;
  /** Trailing control rendered in the header row. Only shown when `title` is set. */
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const SURFACES: Record<NonNullable<CardProps["variant"]>, CSSProperties> = {
  default: { background: "var(--surface)", boxShadow: "none" },
  subtle: { background: "var(--surface-subtle)", boxShadow: "none" },
  raised: {
    background: "var(--surface-raised)",
    boxShadow: "var(--elevation-1)",
  },
};

/**
 * Elevation container for grouping one section of a view.
 *
 * The card is presentational only: it never renders a placeholder body, so a
 * caller with nothing real to show must render a state view instead of an empty
 * card (design invariant: no empty cards, no synthetic zeroes).
 */
export function Card({
  children,
  variant = "default",
  title,
  action,
  footer,
  className,
  style,
}: CardProps) {
  return (
    <section
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        minWidth: 0,
        padding: "var(--space-4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        ...SURFACES[variant],
        ...style,
      }}
    >
      {title ? (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            minWidth: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              minWidth: 0,
              font: "var(--heading-sm-weight) var(--heading-sm-size)/var(--heading-sm-line) var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h3>
          {action ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                flex: "0 0 auto",
              }}
            >
              {action}
            </div>
          ) : null}
        </header>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          minWidth: 0,
        }}
      >
        {children}
      </div>
      {footer ? (
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid var(--border)",
            font: "var(--caption-weight) var(--caption-size)/var(--caption-line) var(--font-sans)",
            color: "var(--text-tertiary)",
          }}
        >
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
