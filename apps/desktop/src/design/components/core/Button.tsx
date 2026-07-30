import { useState } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Icon } from "./Icon.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface Tone {
  bg: string;
  fg: string;
  bd: string;
  hover: string;
  active: string;
}

interface SizeSpec {
  h: string;
  px: number;
  fs: string;
  icon: number;
}

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "style" | "children"
> {
  children?: ReactNode;
  /** `primary` for the single main action, `secondary` default, `ghost` for toolbars, `danger` for destructive intent. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon name rendered before the label. */
  icon?: string;
  iconEnd?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Marks the control as a mutation authority action - draws the extra containment ring. Read-only slices must not set it. */
  mutation?: boolean;
  onClick?: (e: MouseEvent) => void;
  type?: "button" | "submit";
}

const TONE: Record<ButtonVariant, Tone> = {
  primary: {
    bg: "var(--action-primary)",
    fg: "var(--text-on-action)",
    bd: "transparent",
    hover: "var(--action-primary-hover)",
    active: "var(--action-primary-active)",
  },
  secondary: {
    bg: "var(--surface-raised)",
    fg: "var(--text-primary)",
    bd: "var(--border-strong)",
    hover: "var(--surface-subtle)",
    active: "var(--surface-subtle)",
  },
  ghost: {
    bg: "transparent",
    fg: "var(--text-secondary)",
    bd: "transparent",
    hover: "var(--surface-subtle)",
    active: "var(--surface-subtle)",
  },
  danger: {
    bg: "var(--status-error-subtle)",
    fg: "var(--status-error-fg)",
    bd: "var(--status-error-border)",
    hover: "var(--status-error-subtle)",
    active: "var(--status-error-subtle)",
  },
};

const SIZE: Record<ButtonSize, SizeSpec> = {
  sm: { h: "var(--control-h-sm)", px: 8, fs: "var(--label-sm-size)", icon: 14 },
  md: {
    h: "var(--control-h-md)",
    px: 12,
    fs: "var(--label-md-size)",
    icon: 16,
  },
  lg: { h: "var(--control-h-lg)", px: 16, fs: "var(--body-md-size)", icon: 16 },
};

/** Primary action control. Mutation actions must never use `ghost`. */
export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  iconEnd,
  loading,
  disabled,
  fullWidth,
  mutation,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  const t = TONE[variant] || TONE.secondary;
  const s = SIZE[size] || SIZE.md;
  const [hover, setHover] = useState(false);
  const off = disabled || loading;
  return (
    <button
      type={type}
      disabled={off}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: s.h,
        minWidth: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : undefined,
        background: off ? "var(--surface-subtle)" : hover ? t.hover : t.bg,
        color: off ? "var(--text-tertiary)" : t.fg,
        border: `1px solid ${off ? "var(--border)" : t.bd}`,
        borderRadius: "var(--radius-control)",
        boxShadow:
          [
            variant === "primary" && !off ? "var(--sheen)" : null,
            mutation && !off
              ? "inset 0 0 0 1px var(--action-primary-hover)"
              : null,
          ]
            .filter(Boolean)
            .join(", ") || undefined,
        font: `var(--label-md-weight) ${s.fs}/1 var(--font-sans)`,
        cursor: off ? "not-allowed" : "pointer",
        transition: `background var(--motion-control) var(--ease-standard), color var(--motion-control) var(--ease-standard)`,
        whiteSpace: "nowrap",
      }}
    >
      {loading ? (
        <Icon name="loader" size={s.icon} />
      ) : icon ? (
        <Icon name={icon} size={s.icon} />
      ) : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={s.icon} /> : null}
    </button>
  );
}
