import type { ReactNode } from "react";
import { Icon } from "../core/Icon.js";

/** Trust classes mirror the protocol's own `TrustClass` values plus the UI-only quality states. */
export type TrustClass =
  | "canonical-policy"
  | "verified-evidence"
  | "agent-generated"
  | "user-supplied"
  | "inferred"
  | "missing"
  | "stale"
  | "conflicting"
  | "unsupported";

interface TrustPresentation {
  fg: string;
  bd: string;
  bg: string;
  icon: string;
  label: string;
}

const TRUST: Record<TrustClass, TrustPresentation> = {
  "canonical-policy": {
    fg: "var(--status-healthy-fg)",
    bd: "var(--status-healthy-border)",
    bg: "var(--status-healthy-subtle)",
    icon: "shield-check",
    label: "Canonical policy",
  },
  "verified-evidence": {
    fg: "var(--status-healthy-fg)",
    bd: "var(--status-healthy-border)",
    bg: "var(--status-healthy-subtle)",
    icon: "badge-check",
    label: "Verified evidence",
  },
  "agent-generated": {
    fg: "var(--status-waiting-fg)",
    bd: "var(--status-waiting-border)",
    bg: "var(--status-waiting-subtle)",
    icon: "bot",
    label: "Agent generated",
  },
  "user-supplied": {
    fg: "var(--status-info-fg)",
    bd: "var(--status-info-border)",
    bg: "var(--status-info-subtle)",
    icon: "user",
    label: "User supplied",
  },
  inferred: {
    fg: "var(--status-degraded-fg)",
    bd: "var(--status-degraded-border)",
    bg: "var(--status-degraded-subtle)",
    icon: "sparkle",
    label: "Inferred",
  },
  missing: {
    fg: "var(--status-neutral-fg)",
    bd: "var(--status-neutral-border)",
    bg: "var(--status-neutral-subtle)",
    icon: "circle-dashed",
    label: "Missing",
  },
  stale: {
    fg: "var(--status-degraded-fg)",
    bd: "var(--status-degraded-border)",
    bg: "var(--status-degraded-subtle)",
    icon: "clock-alert",
    label: "Stale",
  },
  conflicting: {
    fg: "var(--status-error-fg)",
    bd: "var(--status-error-border)",
    bg: "var(--status-error-subtle)",
    icon: "git-fork",
    label: "Conflicting",
  },
  unsupported: {
    fg: "var(--status-neutral-fg)",
    bd: "var(--status-neutral-border)",
    bg: "var(--status-neutral-subtle)",
    icon: "slash",
    label: "Unsupported",
  },
};

export interface EvidenceBadgeProps {
  trust?: TrustClass;
  children?: ReactNode;
  size?: "sm" | "md";
}

/** Trust class of a piece of evidence. Trust must be visible wherever evidence drives a conclusion. */
export function EvidenceBadge({
  trust = "missing",
  children,
  size = "sm",
}: EvidenceBadgeProps) {
  const t = TRUST[trust] ?? TRUST.missing;
  return (
    <span
      title={t.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: size === "sm" ? 18 : 22,
        padding: "0 6px",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        borderRadius: "var(--radius-chip)",
        font: "var(--label-sm-weight) var(--caption-size)/1 var(--font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={t.icon} size={11} />
      {children || t.label}
    </span>
  );
}
