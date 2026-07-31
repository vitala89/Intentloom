import { Icon } from "../core/Icon.js";

export type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

export interface StatusChipProps {
  tone?: StatusTone;
  /** Required word label. Colour is never the only signal. */
  label: string;
  /** Overrides the tone's default glyph. */
  icon?: string;
  size?: "sm" | "md";
  variant?: "subtle" | "plain";
}

interface ToneStyle {
  fg: string;
  border: string;
  bg: string;
  icon: string;
}

/**
 * Tones map onto the semantic status token families, not raw hues, so both
 * themes stay in contrast. `info` resolves to the cyan family, which the design
 * rules reserve for intelligence and live evidence - it never marks a user
 * action, and indigo (`--action-primary`) never appears here.
 */
export const STATUS_TONES: Record<StatusTone, ToneStyle> = {
  success: {
    fg: "var(--status-healthy-fg)",
    border: "var(--status-healthy-border)",
    bg: "var(--status-healthy-subtle)",
    icon: "circle-check",
  },
  warning: {
    fg: "var(--status-degraded-fg)",
    border: "var(--status-degraded-border)",
    bg: "var(--status-degraded-subtle)",
    icon: "triangle-alert",
  },
  error: {
    fg: "var(--status-error-fg)",
    border: "var(--status-error-border)",
    bg: "var(--status-error-subtle)",
    icon: "circle-x",
  },
  info: {
    fg: "var(--status-info-fg)",
    border: "var(--status-info-border)",
    bg: "var(--status-info-subtle)",
    icon: "info",
  },
  neutral: {
    fg: "var(--status-neutral-fg)",
    border: "var(--status-neutral-border)",
    bg: "var(--status-neutral-subtle)",
    icon: "circle",
  },
};

/** Compact state marker: glyph plus word label, in a semantic tone. */
export function StatusChip({
  tone = "neutral",
  label,
  icon,
  size = "md",
  variant = "subtle",
}: StatusChipProps) {
  const t = STATUS_TONES[tone] ?? STATUS_TONES.neutral;
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        maxWidth: "100%",
        height: sm ? 18 : 22,
        padding: sm ? "0 5px" : "0 7px",
        background: variant === "plain" ? "transparent" : t.bg,
        color: t.fg,
        border: `1px solid ${variant === "plain" ? "transparent" : t.border}`,
        borderRadius: "var(--radius-chip)",
        font: `var(--label-sm-weight) ${sm ? "var(--caption-size)" : "var(--label-sm-size)"}/1 var(--font-sans)`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={icon ?? t.icon} size={sm ? 11 : 12} />
      {label}
    </span>
  );
}
