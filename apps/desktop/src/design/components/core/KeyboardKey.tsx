export interface KeyboardKeyProps {
  /** One cap per key, in press order, e.g. ["⌘","K"] or ["Shift","↹"]. */
  keys: string[];
  size?: "sm" | "md";
}

/** Renders a keyboard shortcut. Pass keys as an array: ["⌘","K"]. */
export function KeyboardKey({ keys = [], size = "md" }: KeyboardKeyProps) {
  const fs = size === "sm" ? "var(--caption-size)" : "var(--code-sm-size)";
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {keys.map((k, i) => (
        <kbd
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            background: "var(--surface-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderBottomWidth: 2,
            borderRadius: "var(--radius-xs)",
            font: `500 ${fs}/1 var(--font-mono)`,
          }}
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
