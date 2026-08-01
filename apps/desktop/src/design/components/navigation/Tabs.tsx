import { useRef } from "react";
import type { KeyboardEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
  /** Figure rendered beside the label. Omit when there is no real count. */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: Array<TabItem>;
  activeId: string;
  onChange: (id: string) => void;
  /** Accessible name for the tab list. */
  ariaLabel?: string;
  /** Id of the panel the active tab controls, for `aria-controls`. */
  panelId?: string;
}

/**
 * Underline tab bar with roving tabindex.
 *
 * Only the active tab is in the tab order; ArrowLeft/ArrowRight move between
 * tabs (wrapping, skipping disabled ones) and Home/End jump to the ends, which
 * is the pattern assistive technology expects from `role="tablist"`.
 */
export function Tabs({
  items = [],
  activeId,
  onChange,
  ariaLabel,
  panelId,
}: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const enabled = items.filter((i) => !i.disabled);

  const focus = (id: string) => {
    onChange(id);
    refs.current[id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (enabled.length === 0) return;
    const at = enabled.findIndex((i) => i.id === activeId);
    const from = at === -1 ? 0 : at;
    let next: TabItem | undefined;
    if (e.key === "ArrowRight") next = enabled[(from + 1) % enabled.length];
    else if (e.key === "ArrowLeft")
      next = enabled[(from - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    else return;
    e.preventDefault();
    if (next) focus(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        gap: "var(--space-1)",
        alignItems: "flex-end",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {items.map((t) => {
        const on = t.id === activeId;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={on ? panelId : undefined}
            aria-disabled={t.disabled || undefined}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.id)}
            onKeyDown={onKeyDown}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              height: 34,
              padding: "0 10px",
              marginBottom: -1,
              background: "transparent",
              border: 0,
              borderBottom: `2px solid ${on ? "var(--action-primary)" : "transparent"}`,
              color: t.disabled
                ? "var(--text-tertiary)"
                : on
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              cursor: t.disabled ? "not-allowed" : "pointer",
              font: `${on ? "var(--label-md-weight)" : "400"} var(--label-md-size)/1 var(--font-sans)`,
              transition: "color var(--motion-control) var(--ease-standard)",
            }}
          >
            {t.label}
            {t.count != null ? (
              <span
                className="il-tnum"
                style={{
                  padding: "1px 5px",
                  borderRadius: "var(--radius-chip)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-tertiary)",
                  font: "var(--label-sm-weight) var(--caption-size)/1 var(--font-sans)",
                }}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
