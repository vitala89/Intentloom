import { DiffViewer } from "../design/components/code/DiffViewer.js";
import type { NeutronMutationProposal } from "@intentloom/protocol/neutron-session";

export interface NeutronMutationProposalPathsProps {
  readonly proposal: NeutronMutationProposal;
}

export function NeutronMutationProposalPaths({
  proposal,
}: NeutronMutationProposalPathsProps) {
  const lines = proposal.plan.changedPaths.map(
    (path: string, index: number) => ({
      kind: "add" as const,
      content: path,
      newNumber: index + 1,
    }),
  );
  return (
    <DiffViewer
      hunks={[
        {
          range: "Changed paths (review only)",
          summary: `${proposal.plan.changedPaths.length} path(s) in scope`,
          lines,
        },
      ]}
    />
  );
}
