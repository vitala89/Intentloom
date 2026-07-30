import { useId } from "react";
import type { ChangeEvent } from "react";
import { Icon } from "../core/Icon.js";

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectSize = "sm" | "md";

export interface SelectProps {
  options: SelectOption[];
  value?: string | undefined;
  onChange?: ((e: ChangeEvent<HTMLSelectElement>) => void) | undefined;
  label?: string | undefined;
  size?: SelectSize | undefined;
  disabled?: boolean | undefined;
  width?: number | string | undefined;
  id?: string | undefined;
}

/** Native select styled to match Intentloom controls. */
export function Select({
  options = [],
  value,
  onChange,
  label,
  size = "md",
  disabled,
  width,
  id,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width }}>
      {label ? (
        <label
          htmlFor={selectId}
          style={{
            font: "var(--label-sm-weight) var(--label-sm-size)/var(--label-sm-line) var(--font-sans)",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      ) : null}
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            appearance: "none",
            width: "100%",
            height:
              size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)",
            padding: "0 28px 0 8px",
            background: disabled ? "var(--surface-subtle)" : "var(--surface)",
            color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-control)",
            font: "400 var(--body-md-size)/1 var(--font-sans)",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={14}
          color="var(--text-tertiary)"
          style={{ position: "absolute", right: 8, pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}
