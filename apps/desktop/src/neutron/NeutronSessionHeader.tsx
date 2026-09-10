import { StatusChip } from "../design/components/status/StatusChip.js";
import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import type { NeutronUiPhase } from "./neutron-session-viewmodel.js";

export interface NeutronSessionHeaderProps {
  readonly root: string;
  readonly viewmodel: NeutronSessionViewmodel | null;
  readonly uiPhase: NeutronUiPhase;
}

export function NeutronSessionHeader({
  root,
  viewmodel,
  uiPhase,
}: NeutronSessionHeaderProps) {
  const session = viewmodel?.session;
  const adapter = viewmodel?.adapter;
  return (
    <header className="view-header">
      <div>
        <span className="hero-kicker">Agent Workspace</span>
        <h1 id="neutron-heading">Neutron</h1>
        <p className="view-lead">
          Read-only session over the authenticated daemon. Mutation is not
          authorized.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusChip label="Read-only" tone="info" />
        <StatusChip label={`Root ${root}`} tone="neutral" />
        {session ? (
          <StatusChip label={`Session ${session.state}`} tone="neutral" />
        ) : null}
        {adapter ? (
          <StatusChip
            label={`${adapter.providerKind} / ${adapter.modelId}`}
            tone="neutral"
          />
        ) : null}
        {uiPhase !== "idle" ? (
          <StatusChip label={uiPhase} tone="warning" />
        ) : null}
      </div>
    </header>
  );
}
