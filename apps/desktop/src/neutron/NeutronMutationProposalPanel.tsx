import type { NeutronMutationProposal } from "@intentloom/protocol/neutron-session";
import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { shortenDigest } from "./neutron-digest-display.js";
import {
  NEUTRON_MUTATION_NOT_AUTHORIZED_COPY,
  mutationProposalPanelLines,
} from "./neutron-mutation-proposal-copy.js";
import { NeutronMutationProposalPaths } from "./neutron-mutation-proposal-paths.js";

export interface NeutronMutationProposalPanelProps {
  readonly proposal: NeutronMutationProposal | null;
}

export function NeutronMutationProposalPanel({
  proposal,
}: NeutronMutationProposalPanelProps) {
  if (proposal === null) return null;
  const lines = mutationProposalPanelLines(proposal);
  return (
    <Card title="Mutation proposal (review only)">
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <StatusChip
          label={NEUTRON_MUTATION_NOT_AUTHORIZED_COPY}
          tone="warning"
        />
        <StatusChip label="No Approve control" tone="neutral" />
        <StatusChip label="No Apply control" tone="neutral" />
      </div>
      <p role="status">{NEUTRON_MUTATION_NOT_AUTHORIZED_COPY}</p>
      <dl className="neutron-evidence-dl">
        <div>
          <dt>Proposal id</dt>
          <dd>{proposal.proposalId}</dd>
        </div>
        <div>
          <dt>Mutation class</dt>
          <dd>{proposal.mutationClass}</dd>
        </div>
        <div>
          <dt>Plan digest</dt>
          <dd title={proposal.plan.planDigest}>
            {shortenDigest(proposal.plan.planDigest)}
          </dd>
        </div>
        <div>
          <dt>Baseline digest</dt>
          <dd title={proposal.plan.projectStateDigest}>
            {shortenDigest(proposal.plan.projectStateDigest)}
          </dd>
        </div>
        <div>
          <dt>Proposal digest</dt>
          <dd title={proposal.proposalDigest}>
            {shortenDigest(proposal.proposalDigest)}
          </dd>
        </div>
      </dl>
      <section aria-label="Affected paths">
        <h3 className="neutron-evidence-heading">Affected paths</h3>
        <NeutronMutationProposalPaths proposal={proposal} />
      </section>
      <p className="neutron-evidence-note">{lines.join(" · ")}</p>
    </Card>
  );
}
