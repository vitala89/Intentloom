import { DiffLine } from "./DiffLine.js";
import type { DiffLineProps } from "./DiffLine.js";
import { HunkHeader } from "./HunkHeader.js";

export interface DiffHunk {
  range: string;
  summary?: string | undefined;
  lines: DiffLineProps[];
  collapsed?: boolean | undefined;
  hiddenLines?: number | undefined;
}

export interface DiffViewerProps {
  hunks: DiffHunk[];
  mode?: "unified" | "split" | undefined;
  showWhitespace?: boolean | undefined;
  /** New-side line number under the keyboard cursor. */
  focusedLine?: number | undefined;
  selectedHunk?: number | undefined;
  onSelectHunk?: ((index: number) => void) | undefined;
}

/** Unified or side-by-side diff body for one file. Review-only, it renders no apply control. */
export function DiffViewer({
  hunks = [],
  mode = "unified",
  showWhitespace,
  focusedLine,
  selectedHunk,
  onSelectHunk,
}: DiffViewerProps) {
  if (mode === "split") {
    return (
      <div
        style={{
          display: "flex",
          minWidth: 0,
          borderTop: "1px solid var(--border)",
        }}
      >
        {(["old", "new"] as const).map((side) => (
          <div
            key={side}
            style={{
              flex: 1,
              minWidth: 0,
              borderRight:
                side === "old" ? "1px solid var(--border)" : undefined,
            }}
          >
            {hunks.map((h, hi) => (
              <div key={hi}>
                <HunkHeader
                  range={h.range}
                  summary={h.summary}
                  collapsed={false}
                  onToggle={() => onSelectHunk && onSelectHunk(hi)}
                />
                {h.lines
                  .filter((l) =>
                    side === "old" ? l.kind !== "add" : l.kind !== "del",
                  )
                  .map((l, i) => (
                    <DiffLine
                      key={i}
                      {...l}
                      showWhitespace={showWhitespace}
                      selected={selectedHunk === hi}
                    />
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ minWidth: 0, borderTop: "1px solid var(--border)" }}>
      {hunks.map((h, hi) => (
        <div key={hi}>
          <HunkHeader
            range={h.range}
            summary={h.summary}
            hiddenLines={h.hiddenLines}
            collapsed={h.collapsed}
            onToggle={() => onSelectHunk && onSelectHunk(hi)}
          />
          {h.collapsed
            ? null
            : h.lines.map((l, i) => (
                <DiffLine
                  key={i}
                  {...l}
                  showWhitespace={showWhitespace}
                  focused={focusedLine != null && focusedLine === l.newNumber}
                  selected={selectedHunk === hi}
                />
              ))}
        </div>
      ))}
    </div>
  );
}
