import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

export interface TreeNode {
  id: string;
  label: ReactNode;
  /** Lucide icon name. */
  icon?: string;
  /** CSS color for the icon, usually a diff or status token. */
  tone?: string;
  /** Render the label in the mono face - file and directory names. */
  mono?: boolean;
  /** Trailing element, e.g. a change count or StatusChip. */
  badge?: ReactNode;
  children?: TreeNode[];
}

export interface TreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Controlled expansion set; omit for internal state. */
  expanded?: Set<string>;
  onToggle?: (id: string) => void;
  indent?: number;
  ariaLabel?: string;
}

/** Disclosure tree for file trees, capability groups, and catalog structure. */
export function Tree({
  nodes = [],
  selectedId,
  onSelect,
  expanded,
  onToggle,
  indent = 14,
  ariaLabel = "Tree",
}: TreeProps) {
  const [localOpen, setLocalOpen] = useState<Set<string>>(
    () => new Set(nodes.map((n) => n.id)),
  );
  const open = expanded || localOpen;
  const toggle = (id: string): void => {
    if (onToggle) return onToggle(id);
    setLocalOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };
  const render = (node: TreeNode, depth: number): ReactNode => {
    const kids = node.children ?? [];
    const hasKids = kids.length > 0;
    const isOpen = open.has(node.id);
    const on = node.id === selectedId;
    return (
      <Fragment key={node.id}>
        <div
          role="treeitem"
          aria-expanded={hasKids ? isOpen : undefined}
          aria-selected={on}
          tabIndex={0}
          onClick={() => {
            if (hasKids) toggle(node.id);
            if (onSelect) onSelect(node.id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 26,
            paddingLeft: 6 + depth * indent,
            paddingRight: 8,
            cursor: "pointer",
            background: on ? "var(--brand-subtle)" : "transparent",
            color: on ? "var(--text-primary)" : "var(--text-secondary)",
            font: "400 var(--body-sm-size)/1 var(--font-sans)",
          }}
        >
          {hasKids ? (
            <Icon
              name={isOpen ? "chevron-down" : "chevron-right"}
              size={12}
              color="var(--text-tertiary)"
            />
          ) : (
            <span style={{ width: 12, flex: "0 0 auto" }} />
          )}
          {node.icon ? (
            <Icon
              name={node.icon}
              size={13}
              color={node.tone || "var(--text-tertiary)"}
            />
          ) : null}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: node.mono ? "var(--font-mono)" : undefined,
              fontSize: node.mono ? "var(--code-sm-size)" : undefined,
            }}
          >
            {node.label}
          </span>
          {node.badge}
        </div>
        {hasKids && isOpen ? kids.map((c) => render(c, depth + 1)) : null}
      </Fragment>
    );
  };
  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}
    >
      {nodes.map((n) => render(n, 0))}
    </div>
  );
}
