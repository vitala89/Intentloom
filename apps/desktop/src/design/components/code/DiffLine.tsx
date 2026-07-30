export interface DiffLineProps {
  kind?: "add" | "del" | "context" | undefined;
  oldNumber?: number | null | undefined;
  newNumber?: number | null | undefined;
  content?: string | undefined;
  /** Keyboard cursor line. */
  focused?: boolean | undefined;
  /** Part of the selected hunk. */
  selected?: boolean | undefined;
  /** Render spaces as · and tabs as → for whitespace-only changes. */
  showWhitespace?: boolean | undefined;
}

const KIND = {
  add: {
    bg: "var(--diff-add-bg)",
    gutter: "var(--diff-add-gutter)",
    marker: "var(--diff-add-marker)",
    sign: "+",
    label: "added",
  },
  del: {
    bg: "var(--diff-del-bg)",
    gutter: "var(--diff-del-gutter)",
    marker: "var(--diff-del-marker)",
    sign: "−",
    label: "removed",
  },
  context: {
    bg: "var(--diff-context-bg)",
    gutter: "transparent",
    marker: "var(--diff-gutter-text)",
    sign: " ",
    label: "unchanged",
  },
};

/** One diff line. Meaning is carried by the sign, the edge marker, and a screen-reader label, not by color. */
export function DiffLine({
  kind = "context",
  oldNumber,
  newNumber,
  content = "",
  focused,
  selected,
  showWhitespace,
}: DiffLineProps) {
  const k = KIND[kind] || KIND.context;
  const text = showWhitespace
    ? content.replace(/ /g, "·").replace(/\t/g, "→   ")
    : content;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minWidth: 0,
        background: selected ? "var(--diff-line-focus)" : k.bg,
        outline: focused ? "1px solid var(--focus)" : "none",
        outlineOffset: -1,
        font: "400 var(--code-md-size)/var(--code-md-line) var(--font-mono)",
      }}
    >
      <span
        aria-hidden="true"
        className="il-tnum"
        style={{
          width: 44,
          flex: "0 0 auto",
          textAlign: "right",
          padding: "0 6px",
          background: k.gutter,
          color: "var(--diff-gutter-text)",
          userSelect: "none",
        }}
      >
        {oldNumber ?? ""}
      </span>
      <span
        aria-hidden="true"
        className="il-tnum"
        style={{
          width: 44,
          flex: "0 0 auto",
          textAlign: "right",
          padding: "0 6px",
          background: k.gutter,
          color: "var(--diff-gutter-text)",
          userSelect: "none",
        }}
      >
        {newNumber ?? ""}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 3,
          flex: "0 0 auto",
          background: kind === "context" ? "transparent" : k.marker,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 16,
          flex: "0 0 auto",
          textAlign: "center",
          color: k.marker,
          userSelect: "none",
        }}
      >
        {k.sign}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          padding: "0 8px 0 0",
          whiteSpace: "pre",
          overflow: "hidden",
          color: "var(--text-primary)",
        }}
      >
        <span
          className="il-sr"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          {k.label} line
        </span>
        {text || " "}
      </span>
    </div>
  );
}
