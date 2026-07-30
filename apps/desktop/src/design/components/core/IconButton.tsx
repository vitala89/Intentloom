import { useState } from "react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { Icon } from "./Icon.js";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "style"
> {
  /** Lucide icon name. */
  icon: string;
  /** Required accessible name; also used as the tooltip. */
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "solid";
  selected?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

/** Square icon-only control. `label` is required - it becomes the accessible name and the tooltip. */
export function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  selected,
  disabled,
  onClick,
  ...rest
}: IconButtonProps) {
  const box = size === "sm" ? 24 : size === "lg" ? 36 : 28;
  const [hover, setHover] = useState(false);
  const bg = selected
    ? "var(--brand-subtle)"
    : hover && !disabled
      ? "var(--surface-subtle)"
      : variant === "solid"
        ? "var(--surface-raised)"
        : "transparent";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: box,
        height: box,
        minWidth: 24,
        minHeight: 24,
        padding: 0,
        background: bg,
        color: disabled
          ? "var(--text-tertiary)"
          : selected
            ? "var(--text-primary)"
            : "var(--text-secondary)",
        border: `1px solid ${variant === "solid" ? "var(--border)" : "transparent"}`,
        borderRadius: "var(--radius-control)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background var(--motion-control) var(--ease-standard)",
      }}
    >
      <Icon name={icon} size={size === "lg" ? 18 : 16} />
    </button>
  );
}
