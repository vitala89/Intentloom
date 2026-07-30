import { useId } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "../core/Icon.js";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "checked" | "disabled" | "id" | "onChange" | "type"
> {
  checked?: boolean | undefined;
  /** Mixed state for parent rows in trees and filter groups. */
  indeterminate?: boolean | undefined;
  label: ReactNode;
  description?: ReactNode | undefined;
  disabled?: boolean | undefined;
  onChange?: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined;
  id?: string | undefined;
}

/** Checkbox with optional description. Supports the indeterminate state. */
export function Checkbox({
  checked,
  indeterminate,
  label,
  description,
  disabled,
  onChange,
  id,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const cbId = id || generatedId;
  const on = checked || indeterminate;
  return (
    <label
      htmlFor={cbId}
      style={{
        display: "flex",
        gap: 8,
        alignItems: description ? "flex-start" : "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          flex: "0 0 auto",
          marginTop: description ? 2 : 0,
          background: on ? "var(--action-primary)" : "var(--surface)",
          border: `1px solid ${on ? "var(--action-primary)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-xs)",
        }}
      >
        <input
          id={cbId}
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          onChange={onChange}
          readOnly={!onChange}
          {...rest}
          ref={(el: HTMLInputElement | null) => {
            if (el) el.indeterminate = !!indeterminate;
          }}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            margin: 0,
            cursor: "inherit",
          }}
        />
        {indeterminate ? (
          <Icon name="minus" size={12} color="var(--text-on-action)" />
        ) : checked ? (
          <Icon name="check" size={12} color="var(--text-on-action)" />
        ) : null}
      </span>
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
    </label>
  );
}
