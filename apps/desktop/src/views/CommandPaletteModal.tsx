import { useState, useEffect } from "react";
import { Modal } from "../design/components/overlays/Modal.js";
import { SearchInput } from "../design/components/forms/SearchInput.js";

export interface CommandOption {
  id: string;
  category: "Navigation" | "Actions" | "Diagnostics";
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  options,
  triggerRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: readonly CommandOption[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      opt.category.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle Arrow navigation and Enter
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) =>
          filteredOptions.length === 0 ? 0 : (i + 1) % filteredOptions.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          filteredOptions.length === 0
            ? 0
            : (i - 1 + filteredOptions.length) % filteredOptions.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredOptions[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, onClose]);

  // Focus return on close
  useEffect(() => {
    if (!isOpen) {
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Command Palette"
      description="Quickly navigate views or execute actions."
      width={600}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Type a command or search view..."
        />

        <div
          role="listbox"
          aria-label="Commands"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: "var(--space-5)",
                textAlign: "center",
                color: "var(--text-tertiary)",
                font: "var(--body-sm-weight) var(--body-sm-size)/1 var(--font-sans)",
              }}
            >
              No matching commands found.
            </div>
          ) : (
            filteredOptions.map((opt, index) => (
              <button
                key={opt.id}
                id={`cmd-item-${index}`}
                onClick={() => {
                  opt.action();
                  onClose();
                }}
                role="option"
                aria-selected={index === selectedIndex}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-2) var(--space-3)",
                  background:
                    index === selectedIndex
                      ? "var(--surface-raised)"
                      : "transparent",
                  border: 0,
                  borderRadius: "var(--radius-control)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  font: "var(--body-sm-weight) var(--body-sm-size)/1 var(--font-sans)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                  }}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {opt.shortcut ? (
                  <span
                    style={{
                      font: "var(--caption-weight) var(--caption-size)/1 var(--font-mono)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {opt.shortcut}
                  </span>
                ) : (
                  <span
                    style={{
                      font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {opt.category}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
