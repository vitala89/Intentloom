import { Button } from "../design/components/core/Button.js";
import type {
  FoundationScaffoldApplyViewModel,
  FoundationScaffoldRollbackViewModel,
  FoundationScaffoldValidateViewModel,
} from "./foundation-scaffold-view-helpers.js";

export interface FoundationScaffoldApplyPanelProps {
  readonly validate: FoundationScaffoldValidateViewModel | null;
  readonly apply: FoundationScaffoldApplyViewModel | null;
  readonly rollback: FoundationScaffoldRollbackViewModel | null;
  readonly applyConfirmed: boolean;
  readonly loading: boolean;
  readonly onApplyConfirmedChange: (value: boolean) => void;
  readonly onApply: () => void;
  readonly onRollback: () => void;
}

export function FoundationScaffoldApplyPanel({
  validate,
  apply,
  rollback,
  applyConfirmed,
  loading,
  onApplyConfirmedChange,
  onApply,
  onRollback,
}: FoundationScaffoldApplyPanelProps) {
  if (!validate) return null;

  const transaction = rollback ?? apply;
  const transactionStatus = transaction?.status;
  const canApply =
    validate.valid && applyConfirmed && transactionStatus !== "applied";
  const canRollback =
    transactionStatus === "applied" || transactionStatus === "failed";

  return (
    <>
      <p
        style={{
          color: "var(--text-secondary)",
          marginTop: "var(--space-3)",
        }}
      >
        Validation: valid. Scaffold apply requires a separate explicit approval
        below — not blueprint approval. Digest{" "}
        <code>{validate.planDigest.slice(0, 12)}…</code>
      </p>

      <div
        style={{
          marginTop: "var(--space-4)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--border-subtle)",
          display: "grid",
          gap: "var(--space-3)",
        }}
      >
        <h4>Scaffold apply approval</h4>
        <p style={{ color: "var(--text-secondary)" }}>
          Apply writes scaffold files to an empty root only. Dependency install,
          Git init, remote creation, and CI provider actions are not part of
          this approval.
        </p>
        <label
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={applyConfirmed}
            disabled={loading || !validate.valid}
            onChange={(event) => onApplyConfirmedChange(event.target.checked)}
          />
          I confirm the target root is empty and approve scaffold apply
        </label>
        <div
          style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}
        >
          <Button
            variant="primary"
            disabled={loading || !canApply}
            onClick={onApply}
          >
            {loading ? "Loading…" : "Apply scaffold to empty root"}
          </Button>
          <Button
            variant="secondary"
            disabled={loading || !canRollback}
            onClick={onRollback}
          >
            Rollback scaffold apply
          </Button>
        </div>
      </div>

      {transaction ? (
        <div
          style={{
            marginTop: "var(--space-4)",
            display: "grid",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            Transaction status: <strong>{transaction.status}</strong> | Root:{" "}
            <code>{transaction.root}</code>
            {"rolledBackAt" in transaction
              ? ` | Rolled back at: ${transaction.rolledBackAt}`
              : ` | Revalidated at: ${transaction.revalidatedAt}`}
          </div>
          {transaction.status === "applied" ? (
            <p style={{ color: "var(--text-secondary)" }}>
              Written files: {transaction.writtenFiles.join(", ") || "none"}
            </p>
          ) : null}
          {transaction.error ? (
            <p role="alert" style={{ color: "var(--status-danger)" }}>
              {transaction.error}
            </p>
          ) : null}
          {transaction.status === "failed" ? (
            <p style={{ color: "var(--text-secondary)" }}>
              Apply failed and any partial writes were rolled back. Status is
              reported truthfully — not as success.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
