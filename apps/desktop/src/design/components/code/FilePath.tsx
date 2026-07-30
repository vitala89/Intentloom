import { Icon } from "../core/Icon.js";
import { CopyButton } from "./CopyButton.js";

export interface FilePathProps {
  /** The complete value. Display truncates; the tooltip and copy keep it whole. */
  path: string;
  kind?: "path" | "dir" | "hash" | undefined;
  copyable?: boolean | undefined;
  /** Override the Lucide icon. */
  icon?: string | undefined;
  size?: "sm" | "md" | undefined;
  maxWidth?: number | string | undefined;
  dim?: boolean | undefined;
}

/** Mono path or hash with middle truncation, full value in the tooltip, and a copy action. */
export function FilePath({
  path,
  kind = "path",
  copyable = true,
  icon,
  size = "sm",
  maxWidth = 320,
  dim,
}: FilePathProps) {
  const mono = size === "md" ? "var(--code-md-size)" : "var(--code-sm-size)";
  const glyph =
    icon || (kind === "hash" ? "hash" : kind === "dir" ? "folder" : "file");
  return (
    <span
      title={path}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minWidth: 0,
        maxWidth,
      }}
    >
      <Icon name={glyph} size={12} color="var(--text-tertiary)" />
      <span
        dir={kind === "hash" ? "ltr" : "rtl"}
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "left",
          font: `400 ${mono}/var(--code-sm-line) var(--font-mono)`,
          color: dim ? "var(--text-tertiary)" : "var(--text-secondary)",
        }}
      >
        {path}
      </span>
      {copyable ? <CopyButton value={path} label={`Copy ${kind}`} /> : null}
    </span>
  );
}
