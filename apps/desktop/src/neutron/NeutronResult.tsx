import { Card } from "../design/components/layout/Card.js";
import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { NeutronEvidencePanel } from "./NeutronEvidencePanel.js";
import type { NeutronSurfaceKind } from "./neutron-session-viewmodel.js";

export interface NeutronResultProps {
  readonly viewmodel: NeutronSessionViewmodel | null;
  readonly infrastructureError: string | null;
  readonly surface: NeutronSurfaceKind;
}

export function NeutronResult({
  viewmodel,
  infrastructureError,
  surface,
}: NeutronResultProps) {
  if (surface === "infrastructure-error") {
    return (
      <Card title="Infrastructure error">
        <p role="alert">{infrastructureError}</p>
      </Card>
    );
  }
  if (viewmodel === null || surface === "empty") {
    return (
      <Card title="Session">
        <p>Create a Neutron session to run one read-only turn.</p>
      </Card>
    );
  }
  if (surface === "runtime-error") {
    return (
      <>
        <Card title="Runtime error">
          <p role="alert">
            {viewmodel.errorCode ?? "operation-failed"}:{" "}
            {viewmodel.errorMessage ?? "Neutron turn failed"}
          </p>
          <p>Session state: {viewmodel.session.state}</p>
        </Card>
        <NeutronEvidencePanel viewmodel={viewmodel} />
      </>
    );
  }
  return (
    <>
      <Card title="Result">
        <section aria-label="Model and runtime output">
          <h3 className="neutron-evidence-heading">Model / runtime output</h3>
          <p>{viewmodel.prompt ?? "—"}</p>
          <blockquote cite="model-response">
            {viewmodel.responseText ?? "—"}
          </blockquote>
          <p className="neutron-evidence-note">
            Output text above is not authoritative for acceptance, stale state,
            or mutation status.
          </p>
        </section>
      </Card>
      <NeutronEvidencePanel viewmodel={viewmodel} />
    </>
  );
}
