import { Card } from "../design/components/layout/Card.js";
import type { NeutronSessionViewmodel } from "@intentloom/protocol";
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
      <Card title="Runtime error">
        <p role="alert">
          {viewmodel.errorCode ?? "operation-failed"}:{" "}
          {viewmodel.errorMessage ?? "Neutron turn failed"}
        </p>
        <p>Session state: {viewmodel.session.state}</p>
      </Card>
    );
  }
  return (
    <Card title="Latest result">
      <p>Prompt: {viewmodel.prompt ?? "—"}</p>
      <p>Response: {viewmodel.responseText ?? "—"}</p>
      <p>Tool: {viewmodel.toolName ?? "—"}</p>
      <p>Streaming: {String(viewmodel.adapter.supportsStreaming)}</p>
      <p>Network: {viewmodel.adapter.networkMode}</p>
      <p>Data handling: {viewmodel.adapter.dataHandling}</p>
    </Card>
  );
}
