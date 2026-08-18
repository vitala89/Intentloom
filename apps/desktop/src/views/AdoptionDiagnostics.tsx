import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";

export interface AdoptionDiagnosticsProps {
  readonly diagnostics: readonly string[];
  readonly nextActions: readonly string[];
}

export function AdoptionDiagnostics({
  diagnostics,
  nextActions,
}: AdoptionDiagnosticsProps) {
  if (diagnostics.length === 0 && nextActions.length === 0) {
    return null;
  }
  return (
    <>
      {diagnostics.length > 0 ? (
        <Card
          title="Diagnostics"
          action={<StatusChip label="Reported" size="sm" tone="info" />}
        >
          <ul aria-label="Adoption diagnostics">
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic}>
                <StatusChip label="Diagnostic" size="sm" tone="neutral" />{" "}
                {diagnostic}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {nextActions.length > 0 ? (
        <Card title="Safe next actions">
          <ul aria-label="Safe next actions">
            {nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
