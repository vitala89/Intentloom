import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type {
  FoundationBlueprintApprovalViewModel,
  FoundationBlueprintCompareViewModel,
  FoundationBlueprintProposalViewModel,
  FoundationBlueprintTier,
} from "./foundation-blueprint-view-helpers.js";

const TIERS: readonly FoundationBlueprintTier[] = [
  "minimal",
  "recommended",
  "extensible",
];

export interface FoundationBlueprintPanelProps {
  readonly proposal: FoundationBlueprintProposalViewModel | null;
  readonly compare: FoundationBlueprintCompareViewModel | null;
  readonly approval: FoundationBlueprintApprovalViewModel | null;
  readonly leftTier: FoundationBlueprintTier;
  readonly rightTier: FoundationBlueprintTier;
  readonly approveTier: FoundationBlueprintTier;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly onLeftTierChange: (tier: FoundationBlueprintTier) => void;
  readonly onRightTierChange: (tier: FoundationBlueprintTier) => void;
  readonly onApproveTierChange: (tier: FoundationBlueprintTier) => void;
  readonly onPropose: () => void;
  readonly onCompare: () => void;
  readonly onApprove: () => void;
  readonly onRevoke: () => void;
}

function approvalTone(
  status: string,
): "success" | "warning" | "error" | "neutral" {
  if (status === "approved") return "success";
  if (status === "revoked") return "warning";
  if (status === "expired") return "error";
  return "neutral";
}

export function FoundationBlueprintPanel({
  proposal,
  compare,
  approval,
  leftTier,
  rightTier,
  approveTier,
  loading,
  errorMessage,
  onLeftTierChange,
  onRightTierChange,
  onApproveTierChange,
  onPropose,
  onCompare,
  onApprove,
  onRevoke,
}: FoundationBlueprintPanelProps) {
  return (
    <Card variant="default">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          alignItems: "flex-start",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <h3>Blueprint alternatives</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Compare minimal, recommended, and extensible candidates. Approval is
            explicit and does not write project files.
          </p>
        </div>
        <StatusChip
          tone={approval ? approvalTone(approval.status) : "neutral"}
          label={approval?.status ?? "unapproved"}
          size="sm"
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <Button variant="primary" disabled={loading} onClick={onPropose}>
          {loading ? "Loading…" : "Propose blueprints"}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ color: "var(--status-danger)" }}>
          {errorMessage}
        </p>
      ) : null}

      {proposal ? (
        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            Recommended topology: {proposal.recommendedTopology} | Digest:{" "}
            <code>{proposal.digest.slice(0, 12)}…</code> | Workshop unchanged:
            yes
          </div>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "var(--space-3)",
            }}
          >
            {proposal.candidates.map((candidate) => (
              <li
                key={candidate.tier}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3)",
                }}
              >
                <strong>
                  {candidate.tier}
                  {candidate.tier === proposal.recommendedTier
                    ? " (recommended)"
                    : ""}
                </strong>
                <div style={{ color: "var(--text-secondary)" }}>
                  Topology: {candidate.topology} | Packs:{" "}
                  {candidate.packs.join(", ")}
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  Complexity: {candidate.complexity} | Reversibility:{" "}
                  {candidate.reversibility}
                </div>
                <p>{candidate.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "var(--space-3)",
        }}
      >
        <label style={{ display: "flex", gap: "var(--space-2)" }}>
          Compare
          <select
            value={leftTier}
            disabled={loading || !proposal}
            onChange={(event) =>
              onLeftTierChange(event.target.value as FoundationBlueprintTier)
            }
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          vs
          <select
            value={rightTier}
            disabled={loading || !proposal}
            onChange={(event) =>
              onRightTierChange(event.target.value as FoundationBlueprintTier)
            }
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="secondary"
          disabled={loading || !proposal}
          onClick={onCompare}
        >
          Compare tiers
        </Button>
      </div>

      {compare ? (
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}
        >
          Topology match: {compare.topologyMatch ? "yes" : "no"} | Pack
          differences:{" "}
          {compare.packDifferences.length > 0
            ? compare.packDifferences.join(", ")
            : "none"}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", gap: "var(--space-2)" }}>
          Approve tier
          <select
            value={approveTier}
            disabled={loading || !proposal}
            onChange={(event) =>
              onApproveTierChange(event.target.value as FoundationBlueprintTier)
            }
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="primary"
          disabled={loading || !proposal}
          onClick={onApprove}
        >
          Approve blueprint
        </Button>
        <Button
          variant="secondary"
          disabled={loading || !approval || approval.status !== "approved"}
          onClick={onRevoke}
        >
          Revoke approval
        </Button>
      </div>

      {approval ? (
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "var(--space-3)",
          }}
        >
          Approval: {approval.tier} by {approval.approver} ({approval.status})
        </p>
      ) : null}
    </Card>
  );
}
