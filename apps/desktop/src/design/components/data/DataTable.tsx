import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

/** Row values are rendered directly, so every cell must already be a renderable node. */
export type DataTableRow = Record<string, ReactNode>;

export interface DataTableColumn<Row extends DataTableRow = DataTableRow> {
  key: string;
  label: ReactNode;
  width?: number | string;
  maxWidth?: number | string;
  align?: "left" | "right" | "center";
  /** Mono face - for paths, hashes, codes. */
  mono?: boolean;
  /** Tabular numerals - for counts and durations. */
  numeric?: boolean;
  muted?: boolean;
  wrap?: boolean;
  sortable?: boolean;
  render?: (row: Row) => ReactNode;
}

export interface DataTableProps<Row extends DataTableRow = DataTableRow> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  /** Field used as the React key and selection id. Defaults to "id". */
  rowKey?: string;
  emptyLabel?: ReactNode;
  /** Accessible name for the scroll region; also rendered as a caption. */
  caption?: string;
  stickyHeader?: boolean;
}

/** Dense engineering table. Square corners, 1px rules, tabular numerals, full keyboard row traversal. */
export function DataTable<Row extends DataTableRow = DataTableRow>({
  columns = [],
  rows = [],
  selectedId,
  onSelect,
  sortKey,
  sortDir = "asc",
  onSort,
  rowKey = "id",
  emptyLabel = "No rows",
  caption,
  stickyHeader = true,
}: DataTableProps<Row>) {
  return (
    <div
      role="region"
      aria-label={caption}
      style={{ width: "100%", overflow: "auto" }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          font: "400 var(--body-sm-size)/var(--body-sm-line) var(--font-sans)",
        }}
      >
        {caption ? (
          <caption
            style={{
              captionSide: "top",
              textAlign: "left",
              padding: "0 0 8px",
              color: "var(--text-tertiary)",
              font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
            }}
          >
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={
                  sortKey === c.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                style={{
                  position: stickyHeader ? "sticky" : "static",
                  top: 0,
                  zIndex: 1,
                  textAlign: c.align || "left",
                  width: c.width,
                  whiteSpace: "nowrap",
                  padding: "0 12px",
                  height: 30,
                  background: "var(--surface-subtle)",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text-tertiary)",
                  font: "var(--label-sm-weight) var(--label-sm-size)/1 var(--font-sans)",
                }}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSort) onSort(c.key);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    {c.label}
                    <Icon
                      name={
                        sortKey === c.key
                          ? sortDir === "asc"
                            ? "arrow-up"
                            : "arrow-down"
                          : "chevrons-up-down"
                      }
                      size={11}
                    />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                }}
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((r, index) => {
              const rawId = r[rowKey];
              const id = typeof rawId === "string" ? rawId : undefined;
              const on = id !== undefined && id === selectedId;
              return (
                <tr
                  key={id ?? index}
                  tabIndex={0}
                  aria-selected={on}
                  onClick={() => {
                    if (onSelect && id !== undefined) onSelect(id);
                  }}
                  style={{
                    height: "var(--row-h)",
                    cursor: onSelect ? "pointer" : "default",
                    background: on ? "var(--brand-subtle)" : "transparent",
                    boxShadow: on
                      ? "inset 2px 0 0 var(--action-primary)"
                      : undefined,
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={c.numeric ? "il-tnum" : undefined}
                      style={{
                        padding: "0 12px",
                        textAlign: c.align || "left",
                        borderBottom: "1px solid var(--border)",
                        color: c.muted
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                        fontFamily: c.mono ? "var(--font-mono)" : undefined,
                        fontSize: c.mono ? "var(--code-sm-size)" : undefined,
                        maxWidth: c.maxWidth,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: c.wrap ? "normal" : "nowrap",
                      }}
                    >
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
