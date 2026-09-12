import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { ProvenanceDetail } from "../design/components/evidence/ProvenanceDetail.js";
import type { NeutronEvidenceProjection } from "./neutron-evidence-projection.js";

export interface NeutronProvenanceSummaryProps {
  readonly viewmodel: NeutronSessionViewmodel;
  readonly evidence: NeutronEvidenceProjection;
}

export function NeutronProvenanceSummary({
  viewmodel,
  evidence,
}: NeutronProvenanceSummaryProps) {
  const graph = viewmodel.graphSnapshot;
  const rows = [
    { label: "Session", value: viewmodel.session.sessionId },
    { label: "Project", value: viewmodel.session.projectId },
    { label: "Root", value: viewmodel.session.root },
    ...(evidence.graphId === null
      ? []
      : [{ label: "Graph", value: evidence.graphId }]),
    {
      label: "Provider",
      value: `${evidence.providerKind} · ${evidence.modelId}`,
    },
    {
      label: "Network",
      value: viewmodel.adapter.networkMode,
    },
    {
      label: "Mutation attempted",
      value: "false",
    },
  ];
  if (graph !== null) {
    rows.push({
      label: "Graph nodes",
      value: String(graph.nodeCounts.total),
    });
    for (const node of graph.nodes) {
      if (node.authoritativeAttempt !== null) {
        rows.push({
          label: `Authoritative attempt (${node.taskId})`,
          value: String(node.authoritativeAttempt),
        });
      }
    }
  }
  return (
    <ProvenanceDetail
      root={viewmodel.session.root}
      rows={rows}
      source="Neutron runtime snapshot"
      trust="verified-evidence"
    />
  );
}
