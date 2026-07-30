import { useId, useState } from "react";
import { Icon } from "../core/Icon.js";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional mono suffix, e.g. a path or count. */
  meta?: string | undefined;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  label?: string | undefined;
  width?: number | string | undefined;
}

/** Filterable single-select. Opens a listbox and narrows options as you type. */
export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  label,
  width = 240,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const listId = useId();
  const shown = options.filter((o) =>
    o.label.toLowerCase().includes(q.toLowerCase()),
  );
  const current = options.find((o) => o.value === value);
  return (
    <div style={{ position: "relative", width }}>
      {label ? (
        <div
          style={{
            font: "var(--label-sm-weight) var(--label-sm-size)/var(--label-sm-line) var(--font-sans)",
            color: "var(--text-secondary)",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: "var(--control-h-md)",
          padding: "0 8px",
          background: "var(--surface)",
          border: `1px solid ${open ? "var(--focus)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-control)",
          cursor: "pointer",
        }}
      >
        <input
          value={open ? q : current ? current.label : ""}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: 0,
            outline: "none",
            color: "var(--text-primary)",
            font: "400 var(--body-md-size)/1 var(--font-sans)",
            cursor: "inherit",
          }}
        />
        <Icon name="chevrons-up-down" size={14} color="var(--text-tertiary)" />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--glass-bg)",
            backdropFilter:
              "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            WebkitBackdropFilter:
              "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-2), inset 0 1px 0 var(--hairline)",
          }}
        >
          {shown.length === 0 ? (
            <li
              style={{
                padding: "8px 10px",
                color: "var(--text-tertiary)",
                font: "400 var(--body-sm-size)/1 var(--font-sans)",
              }}
            >
              No matches
            </li>
          ) : (
            shown.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange && onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  background:
                    o.value === value ? "var(--brand-subtle)" : "transparent",
                  color: "var(--text-primary)",
                  font: "400 var(--body-md-size)/1 var(--font-sans)",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.label}
                </span>
                {o.meta ? (
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      font: "400 var(--code-sm-size)/1 var(--font-mono)",
                    }}
                  >
                    {o.meta}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
