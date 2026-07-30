import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

export interface SwitchProps {
  checked?: boolean | undefined;
  label: ReactNode;
  description?: ReactNode | undefined;
  disabled?: boolean | undefined;
  onChange?: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined;
  id?: string | undefined;
}

/** Binary setting that applies immediately. Never use for destructive or mutating actions. */
export function Switch({
  checked,
  label,
  description,
  disabled,
  onChange,
  id,
}: SwitchProps) {
  const generatedId = useId();
  const sId = id || generatedId;
  return (
    <label
      htmlFor={sId}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <span
          style={{
            font: "400 var(--body-md-size)/var(--body-md-line) var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        {description ? (
          <span
            style={{
              font: "400 var(--body-sm-size)/var(--body-sm-line) var(--font-sans)",
              color: "var(--text-tertiary)",
            }}
          >
            {description}
          </span>
        ) : null}
      </span>
      <span
        style={{
          position: "relative",
          flex: "0 0 auto",
          width: 34,
          height: 20,
          borderRadius: "var(--radius-pill)",
          background: checked
            ? "var(--action-primary)"
            : "var(--surface-subtle)",
          border: `1px solid ${checked ? "var(--action-primary)" : "var(--border-strong)"}`,
          transition: "background var(--motion-control) var(--ease-standard)",
        }}
      >
        <input
          id={sId}
          type="checkbox"
          role="switch"
          checked={!!checked}
          disabled={disabled}
          onChange={onChange}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            margin: 0,
            cursor: "inherit",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: "var(--radius-pill)",
            background: checked
              ? "var(--text-on-action)"
              : "var(--text-tertiary)",
            transition: "left var(--motion-control) var(--ease-standard)",
          }}
        />
      </span>
    </label>
  );
}
