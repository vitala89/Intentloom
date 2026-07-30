import { CopyButton } from "./CopyButton.js";

export interface CodeBlockProps {
  code: string;
  /** Shown in the header when no filename is given. */
  language?: string | undefined;
  filename?: string | undefined;
  lineNumbers?: boolean | undefined;
  copyable?: boolean | undefined;
  maxHeight?: number | string | undefined;
  wrap?: boolean | undefined;
}

/** Read-only code, JSON, or daemon output with optional line numbers. */
export function CodeBlock({
  code = "",
  language,
  filename,
  lineNumbers,
  copyable = true,
  maxHeight = 260,
  wrap,
}: CodeBlockProps) {
  const lines = String(code).replace(/\n$/, "").split("\n");
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--surface-subtle)",
      }}
    >
      {filename || language || copyable ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 30,
            padding: "0 6px 0 10px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              font: "400 var(--code-sm-size)/1 var(--font-mono)",
              color: "var(--text-tertiary)",
            }}
          >
            {filename || language}
          </span>
          {copyable ? <CopyButton value={code} /> : null}
        </div>
      ) : null}
      <pre
        style={{
          margin: 0,
          padding: "8px 0",
          maxHeight,
          overflow: "auto",
          font: "400 var(--code-md-size)/var(--code-md-line) var(--font-mono)",
          color: "var(--text-secondary)",
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "0 12px",
              whiteSpace: wrap ? "pre-wrap" : "pre",
            }}
          >
            {lineNumbers ? (
              <span
                className="il-tnum"
                aria-hidden="true"
                style={{
                  width: 28,
                  flex: "0 0 auto",
                  textAlign: "right",
                  color: "var(--diff-gutter-text)",
                  userSelect: "none",
                }}
              >
                {i + 1}
              </span>
            ) : null}
            <span style={{ minWidth: 0 }}>{l || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
