import { Icon } from "./Icon.js";

export interface SegmentedOption {
  value: string;
  label: string;
  /** Optional Lucide icon name. */
  icon?: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  /** Accessible name for the radiogroup. */
  ariaLabel?: string;
}

/** Mutually-exclusive view switch (unified/side-by-side, list/table, theme). */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedControlProps) {
  const h = size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        padding: 2,
        gap: 2,
        background: "var(--surface-subtle)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control)",
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            type="button"
            onClick={() => onChange && onChange(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: h,
              padding: "0 10px",
              background: on ? "var(--surface-raised)" : "transparent",
              color: on ? "var(--text-primary)" : "var(--text-secondary)",
              border: `1px solid ${on ? "var(--border)" : "transparent"}`,
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
              font: `var(--label-sm-weight) var(--label-sm-size)/1 var(--font-sans)`,
              transition:
                "background var(--motion-control) var(--ease-standard)",
            }}
          >
            {o.icon ? <Icon name={o.icon} size={14} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
