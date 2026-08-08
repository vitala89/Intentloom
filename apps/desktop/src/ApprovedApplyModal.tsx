import { Modal } from "./design/components/overlays/Modal.js";
import { Button } from "./design/components/core/Button.js";
import type {
  ApprovedApplyPlan,
  ApprovedApplyExecutionResult,
} from "@intentloom/protocol";

export function ApprovedApplyModal({
  plan,
  isOpen,
  onClose,
  onApprove,
  isApplying = false,
  executionResult = null,
}: {
  plan: ApprovedApplyPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (grantedApprovals: readonly string[]) => void;
  isApplying?: boolean;
  executionResult?: ApprovedApplyExecutionResult | null;
}) {
  if (!isOpen || !plan) return null;

  const isExpired = plan.expiresAt !== undefined && Date.now() > plan.expiresAt;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approved Apply Transaction Review"
      description="Review proposed plan details and grant explicit human approval before mutating files."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onApprove(["atomic-commit-approval"])}
            disabled={
              isApplying || isExpired || executionResult?.applied === true
            }
          >
            {isApplying ? "Applying..." : "Approve & Apply Plan"}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              marginBottom: "var(--space-1)",
              font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Plan Digest
          </span>
          <code
            style={{
              display: "block",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              font: "400 var(--body-sm-size)/1 var(--font-mono)",
              color: "var(--text-primary)",
              wordBreak: "break-all",
            }}
          >
            {plan.planDigest}
          </code>
        </div>

        <div>
          <span
            style={{
              display: "block",
              marginBottom: "var(--space-1)",
              font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Target Root & Changed Paths ({plan.changedPaths.length})
          </span>
          <code
            style={{
              display: "block",
              marginBottom: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              font: "400 var(--body-sm-size)/1 var(--font-mono)",
              color: "var(--text-secondary)",
              wordBreak: "break-all",
            }}
          >
            {plan.targetRoot}
          </code>
          <ul
            style={{
              margin: 0,
              paddingLeft: "var(--space-4)",
              font: "400 var(--body-sm-size)/1.5 var(--font-mono)",
              color: "var(--text-primary)",
            }}
          >
            {plan.changedPaths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        {isExpired && (
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--status-error-subtle)",
              border: "1px solid var(--status-error-border)",
              borderRadius: "var(--radius-control)",
              color: "var(--status-error-text)",
              font: "400 var(--body-sm-size)/1.4 var(--font-sans)",
            }}
          >
            ⚠️ Plan has expired and cannot be applied without refreshing.
          </div>
        )}

        {executionResult && (
          <div
            style={{
              padding: "var(--space-3)",
              background: executionResult.applied
                ? "var(--status-success-subtle)"
                : "var(--status-error-subtle)",
              border: `1px solid ${
                executionResult.applied
                  ? "var(--status-success-border)"
                  : "var(--status-error-border)"
              }`,
              borderRadius: "var(--radius-control)",
              font: "400 var(--body-sm-size)/1.4 var(--font-sans)",
            }}
          >
            <strong>
              {executionResult.applied
                ? "✅ Applied Successfully"
                : "❌ Apply Failed"}
            </strong>
            {executionResult.rollbackEvidence && (
              <p style={{ margin: "var(--space-2) 0 0 0" }}>
                Rollback evidence captured for{" "}
                {executionResult.rollbackEvidence.rollbackFiles.length} file(s).
              </p>
            )}
            {executionResult.diagnostics.length > 0 && (
              <ul
                style={{
                  margin: "var(--space-2) 0 0 0",
                  paddingLeft: "var(--space-4)",
                }}
              >
                {executionResult.diagnostics.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
