import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { NeutronFingerprintSummary } from "./NeutronFingerprintSummary.js";
import { NeutronProvenanceSummary } from "./NeutronProvenanceSummary.js";
import { NeutronResultSummary } from "./NeutronResultSummary.js";
import { NeutronUsageSummary } from "./NeutronUsageSummary.js";
import { NeutronWarnings } from "./NeutronWarnings.js";
import { projectNeutronEvidence } from "./neutron-evidence-projection.js";

export interface NeutronEvidencePanelProps {
  readonly viewmodel: NeutronSessionViewmodel;
}

export function NeutronEvidencePanel({ viewmodel }: NeutronEvidencePanelProps) {
  const evidence = projectNeutronEvidence(viewmodel);
  if (evidence === null) return null;
  return (
    <Card title="Evidence and provenance">
      <NeutronResultSummary
        evidence={evidence}
        responseText={viewmodel.responseText}
      />
      <p>
        Evidence summary: {evidence.counts.toolInvocations} tool invocation(s),{" "}
        {evidence.counts.contextSourcesIncluded} included context source(s),{" "}
        {evidence.counts.warnings} warning(s).
      </p>
      <NeutronWarnings warnings={evidence.warnings} />
      <details>
        <summary>Usage</summary>
        <NeutronUsageSummary usage={evidence.usage} />
      </details>
      <details>
        <summary>Provenance</summary>
        <NeutronProvenanceSummary evidence={evidence} viewmodel={viewmodel} />
      </details>
      <details>
        <summary>Fingerprints and digests</summary>
        <NeutronFingerprintSummary fingerprints={evidence.fingerprints} />
      </details>
    </Card>
  );
}
