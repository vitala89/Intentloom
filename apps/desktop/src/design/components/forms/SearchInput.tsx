import { useState } from "react";
import type { ChangeEvent } from "react";
import { Icon } from "../core/Icon.js";
import { KeyboardKey } from "../core/KeyboardKey.js";

export type SearchInputSize = "sm" | "md";

export interface SearchInputProps {
  value?: string | undefined;
  placeholder?: string | undefined;
  /** Shortcut caps shown at the right while empty, e.g. ["/"]. */
  shortcut?: string[] | undefined;
  onChange?: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined;
  onClear?: (() => void) | undefined;
  size?: SearchInputSize | undefined;
  width?: number | string | undefined;
}

/** Filter field used above lists, tables, and trees. */
export function SearchInput({
  value,
  placeholder = "Search",
  shortcut,
  onChange,
  onClear,
  size = "md",
  width,
}: SearchInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width,
        minWidth: 0,
        height: size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)",
        padding: "0 8px",
        background: "var(--surface)",
        borderRadius: "var(--radius-control)",
        border: `1px solid ${focus ? "var(--focus)" : "var(--border-strong)"}`,
      }}
    >
      <Icon name="search" size={14} color="var(--text-tertiary)" />
      <input
        type="search"
        role="searchbox"
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: 0,
          outline: "none",
          color: "var(--text-primary)",
          font: "400 var(--body-md-size)/1 var(--font-sans)",
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          style={{
            display: "inline-flex",
            background: "transparent",
            border: 0,
            padding: 2,
            cursor: "pointer",
            color: "var(--text-tertiary)",
          }}
        >
          <Icon name="x" size={14} />
        </button>
      ) : shortcut ? (
        <KeyboardKey keys={shortcut} size="sm" />
      ) : null}
    </div>
  );
}
