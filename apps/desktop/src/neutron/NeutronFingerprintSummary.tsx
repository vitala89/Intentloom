import { shortenDigest } from "./neutron-digest-display.js";
import type { NeutronEvidenceFingerprints } from "./neutron-evidence-projection.js";

export interface NeutronFingerprintSummaryProps {
  readonly fingerprints: NeutronEvidenceFingerprints;
}

export function NeutronFingerprintSummary({
  fingerprints,
}: NeutronFingerprintSummaryProps) {
  const rows: { label: string; full: string; short: string }[] = [];
  if (fingerprints.projectBefore !== null) {
    rows.push({
      full: fingerprints.projectBefore,
      label: "Project fingerprint (before)",
      short: shortenDigest(fingerprints.projectBefore),
    });
  }
  if (fingerprints.projectAfter !== null) {
    rows.push({
      full: fingerprints.projectAfter,
      label: "Project fingerprint (after)",
      short: shortenDigest(fingerprints.projectAfter),
    });
  }
  if (fingerprints.graphOutputDigest !== null) {
    rows.push({
      full: fingerprints.graphOutputDigest,
      label: "Graph output digest",
      short: shortenDigest(fingerprints.graphOutputDigest),
    });
  }
  for (const mismatch of fingerprints.staleMismatches) {
    const full = `${mismatch.expected} → ${mismatch.current}`;
    rows.push({
      full,
      label: `Stale ${mismatch.kind}`,
      short: `${shortenDigest(mismatch.expected)} → ${shortenDigest(mismatch.current)}`,
    });
  }
  if (rows.length === 0) {
    return <p>No fingerprint or digest values are available.</p>;
  }
  return (
    <section aria-label="Fingerprints and digests">
      <ul>
        {rows.map((item) => (
          <li key={item.label}>
            <span>{item.label}: </span>
            <code title={item.full}>{item.short}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
