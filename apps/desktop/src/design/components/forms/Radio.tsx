import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

export interface RadioProps {
  checked?: boolean | undefined;
  label: ReactNode;
  description?: ReactNode | undefined;
  /** Shared group name - required for keyboard arrow traversal. */
  name: string;
  value: string;
  disabled?: boolean | undefined;
  onChange?: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined;
  id?: string | undefined;
}

/** Radio option in a `radiogroup`. Use for 2-5 exclusive choices with descriptions. */
export function Radio({
  checked,
  label,
  description,
  name,
  value,
  disabled,
  onChange,
  id,
}: RadioProps) {
  const generatedId = useId();
  const rId = id || generatedId;
  return (
    <label
      htmlFor={rId}
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
          background: "var(--surface)",
          border: `1px solid ${checked ? "var(--action-primary)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-pill)",
        }}
      >
        <input
          id={rId}
          type="radio"
          name={name}
          value={value}
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
        {checked ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              background: "var(--action-primary)",
            }}
          />
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
