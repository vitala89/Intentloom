import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";
import { EvidenceBadge } from "./EvidenceBadge.js";
import type { TrustClass } from "./EvidenceBadge.js";
import { FilePath } from "../code/FilePath.js";

export interface ProvenanceRow {
  label: string;
  value: ReactNode;
}

export interface ProvenanceDetailProps {
  /** Which subsystem produced the result, e.g. "intentloomd · project.doctor.v1". */
  source?: ReactNode;
  trust?: TrustClass;
  /** Freshness timestamp. */
  collectedAt?: string;
  /** Canonical project root the result applies to. */
  root?: string;
  /** Explicit statement of what is not known. */
  uncertainty?: ReactNode;
  rows?: ProvenanceRow[];
  children?: ReactNode;
}

/** Where a result came from: source, trust, freshness, root, and uncertainty. */
export function ProvenanceDetail({
  source,
  trust,
  collectedAt,
  root,
  uncertainty,
  rows = [],
  children,
}: ProvenanceDetailProps) {
  const line = (label: string, value: ReactNode) => (
    <div
      key={label}
      style={{
        display: "grid",
        gridTemplateColumns: "104px 1fr",
        gap: 8,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          font: "var(--caption-weight) var(--caption-size)/var(--caption-line) var(--font-sans)",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          minWidth: 0,
          font: "400 var(--body-sm-size)/var(--body-sm-line) var(--font-sans)",
          color: "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: "var(--surface-subtle)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="scan-search" size={14} color="var(--text-tertiary)" />
        <span
          style={{
            flex: 1,
            font: "var(--label-md-weight) var(--label-md-size)/1 var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          Provenance
        </span>
        {trust ? <EvidenceBadge trust={trust} /> : null}
      </div>
      {source ? line("Source", source) : null}
      {collectedAt
        ? line("Collected", <span className="il-tnum">{collectedAt}</span>)
        : null}
      {root
        ? line(
            "Project root",
            <FilePath path={root} kind="dir" maxWidth="100%" />,
          )
        : null}
      {uncertainty ? line("Uncertainty", uncertainty) : null}
      {rows.map((r) => line(r.label, r.value))}
      {children}
    </div>
  );
}
