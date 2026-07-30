import { useId, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Icon } from "../core/Icon.js";

export type TextInputSize = "sm" | "md" | "lg";

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "defaultValue"
  | "disabled"
  | "id"
  | "onChange"
  | "placeholder"
  | "readOnly"
  | "size"
  | "value"
> {
  value?: string | undefined;
  defaultValue?: string | undefined;
  placeholder?: string | undefined;
  label?: string | undefined;
  /** Quiet helper text below the field. */
  hint?: string | undefined;
  /** Error message; replaces `hint` and switches the field to the error border. */
  error?: string | undefined;
  /** Lucide icon rendered inside the field. */
  icon?: string | undefined;
  size?: TextInputSize | undefined;
  /** Use the mono face - required for paths, hashes, and identifiers. */
  mono?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  onChange?: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined;
  id?: string | undefined;
}

const H = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h-md)",
  lg: "var(--control-h-lg)",
};

/** Single-line text field. Set `mono` for paths, hashes, and identifiers. */
export function TextInput({
  value,
  defaultValue,
  placeholder,
  label,
  hint,
  error,
  icon,
  size = "md",
  mono,
  disabled,
  readOnly,
  onChange,
  id,
  ...rest
}: TextInputProps) {
  const [focus, setFocus] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}
    >
      {label ? (
        <label
          htmlFor={inputId}
          style={{
            font: "var(--label-sm-weight) var(--label-sm-size)/var(--label-sm-line) var(--font-sans)",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: H[size],
          padding: "0 8px",
          background: disabled ? "var(--surface-subtle)" : "var(--surface)",
          border: `1px solid ${
            error
              ? "var(--status-error-border)"
              : focus
                ? "var(--focus)"
                : "var(--border-strong)"
          }`,
          boxShadow: focus
            ? "0 0 0 2px color-mix(in oklab, var(--focus) 30%, transparent)"
            : undefined,
          borderRadius: "var(--radius-control)",
          transition: "border-color var(--motion-control) var(--ease-standard)",
        }}
      >
        {icon ? (
          <Icon name={icon} size={14} color="var(--text-tertiary)" />
        ) : null}
        <input
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...rest}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: 0,
            outline: "none",
            color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
            font: mono
              ? "400 var(--code-sm-size)/1 var(--font-mono)"
              : "400 var(--body-md-size)/1 var(--font-sans)",
          }}
        />
      </div>
      {error ? (
        <span
          style={{
            font: "var(--caption-weight) var(--caption-size)/var(--caption-line) var(--font-sans)",
            color: "var(--status-error-fg)",
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          style={{
            font: "var(--caption-weight) var(--caption-size)/var(--caption-line) var(--font-sans)",
            color: "var(--text-tertiary)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
