import type { ExternalSpecializedPackApplyViewModel } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { externalSpecializedPackActivationStatusLabel } from "./specialized-pack-external-activate-controller.js";
import type { ExternalSpecializedPackActivationSurfaceState } from "./specialized-pack-external-activate-controller.js";

function renderApplySummary(
  result: ExternalSpecializedPackApplyViewModel,
): string {
  if (result.status === "applied") {
    const lockPath = result.changedPaths[0] ?? ".aif/extension-lock.json";
    return `Project lock updated: ${lockPath}`;
  }
  if (result.status === "already-applied") {
    return "No project files changed.";
  }
  if (result.status === "conflict") {
    return "The same pack id is pinned differently in .aif/extension-lock.json. Automatic update or replace is not implemented.";
  }
  if (result.status === "denied") {
    return "Activation was denied.";
  }
  return "Activation failed.";
}

export function ExternalSpecializedPackActivateResultPanel(props: {
  readonly activationState: ExternalSpecializedPackActivationSurfaceState;
  readonly result: ExternalSpecializedPackApplyViewModel | null;
  readonly errorMessage: string | null;
}) {
  if (!props.result && !props.errorMessage) return null;
  const title = props.result
    ? externalSpecializedPackActivationStatusLabel(props.activationState)
    : externalSpecializedPackActivationStatusLabel(props.activationState);

  return (
    <Card aria-live="polite" title={title}>
      {props.result ? (
        <>
          <p>{renderApplySummary(props.result)}</p>
          {props.result.changedPaths.length > 0 ? (
            <ul>
              {props.result.changedPaths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          ) : null}
          {props.result.diagnostics.length > 0 ? (
            <div className="external-pack-diagnostics">
              <span className="eyebrow">Canonical diagnostics</span>
              <ul>
                {props.result.diagnostics.map((diagnostic) => (
                  <li key={diagnostic}>{diagnostic}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.result.status === "failed" &&
          props.result.rollbackAttempted ? (
            <p>
              Rollback completed:{" "}
              {props.result.rollbackCompleted ? "yes" : "no"}
            </p>
          ) : null}
        </>
      ) : (
        <p>{props.errorMessage ?? "Activation could not be completed."}</p>
      )}
    </Card>
  );
}
