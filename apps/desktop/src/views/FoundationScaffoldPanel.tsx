import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { FoundationScaffoldApplyPanel } from "./FoundationScaffoldApplyPanel.js";
import type {
  FoundationScaffoldApplyViewModel,
  FoundationScaffoldCompareViewModel,
  FoundationScaffoldPrepareViewModel,
  FoundationScaffoldRollbackViewModel,
  FoundationScaffoldValidateViewModel,
} from "./foundation-scaffold-view-helpers.js";
import { scaffoldApplyStatusTone } from "./foundation-scaffold-view-helpers.js";

export interface FoundationScaffoldPanelProps {
  readonly prepare: FoundationScaffoldPrepareViewModel | null;
  readonly compare: FoundationScaffoldCompareViewModel | null;
  readonly validate: FoundationScaffoldValidateViewModel | null;
  readonly apply: FoundationScaffoldApplyViewModel | null;
  readonly rollback: FoundationScaffoldRollbackViewModel | null;
  readonly existingPaths: string;
  readonly applyConfirmed: boolean;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly onExistingPathsChange: (value: string) => void;
  readonly onApplyConfirmedChange: (value: boolean) => void;
  readonly onPrepare: () => void;
  readonly onCompare: () => void;
  readonly onValidate: () => void;
  readonly onApply: () => void;
  readonly onRollback: () => void;
}

export function FoundationScaffoldPanel({
  prepare,
  compare,
  validate,
  apply,
  rollback,
  existingPaths,
  applyConfirmed,
  loading,
  errorMessage,
  onExistingPathsChange,
  onApplyConfirmedChange,
  onPrepare,
  onCompare,
  onValidate,
  onApply,
  onRollback,
}: FoundationScaffoldPanelProps) {
  const transaction = rollback ?? apply;
  const transactionStatus = transaction?.status;

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
          <h3>Scaffold planner</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Preview the TypeScript library scaffold tree, dependencies, and
            verification checks. Plans are side-effect-free until a later apply
            approval.
          </p>
        </div>
        <StatusChip
          tone={
            transactionStatus
              ? scaffoldApplyStatusTone(transactionStatus)
              : validate?.valid
                ? "warning"
                : prepare
                  ? "warning"
                  : "neutral"
          }
          label={
            transactionStatus ??
            (validate?.valid ? "validated" : prepare ? "planned" : "no plan")
          }
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
        <Button variant="primary" disabled={loading} onClick={onPrepare}>
          {loading ? "Loading…" : "Prepare scaffold plan"}
        </Button>
        <Button
          variant="secondary"
          disabled={loading || !prepare}
          onClick={onValidate}
        >
          Validate plan
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ color: "var(--status-danger)" }}>
          {errorMessage}
        </p>
      ) : null}

      {prepare ? (
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            Plan: <code>{prepare.planId}</code> | Digest:{" "}
            <code>{prepare.planDigest.slice(0, 12)}…</code> | Root:{" "}
            <code>{prepare.root}</code>
          </div>
          <div style={{ color: "var(--text-secondary)" }}>
            Dependencies: {prepare.dependencies.join(", ") || "none"} | Scripts:{" "}
            {prepare.scripts.join(", ") || "none"}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>
            Capabilities: {prepare.requiredCapabilities.join(", ")} | Checks:{" "}
            {prepare.verificationChecks.join(", ")}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>
            Templates: {prepare.templateVersions.join(", ") || "none"}
          </div>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "var(--space-2)",
            }}
          >
            {prepare.files.map((file) => (
              <li key={file.path}>
                <strong>[{file.action}]</strong> {file.path}{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  ({file.ownership})
                </span>
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
        <label style={{ display: "flex", gap: "var(--space-2)", flex: 1 }}>
          Existing paths
          <input
            value={existingPaths}
            disabled={loading || !prepare}
            placeholder="README.md,package.json"
            onChange={(event) => onExistingPathsChange(event.target.value)}
            style={{ flex: 1 }}
          />
        </label>
        <Button
          variant="secondary"
          disabled={loading || !prepare}
          onClick={onCompare}
        >
          Compare paths
        </Button>
      </div>

      {compare ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Created: {compare.created.length} | Skipped: {compare.skipped.length}{" "}
          | Collisions:{" "}
          {compare.collisions.length > 0
            ? compare.collisions.join(", ")
            : "none"}
        </p>
      ) : null}

      <FoundationScaffoldApplyPanel
        validate={validate}
        apply={apply}
        rollback={rollback}
        applyConfirmed={applyConfirmed}
        loading={loading}
        onApplyConfirmedChange={onApplyConfirmedChange}
        onApply={onApply}
        onRollback={onRollback}
      />
    </Card>
  );
}
