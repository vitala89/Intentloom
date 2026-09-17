import type { NeutronMutationVerificationEvidence } from "../../protocol/src/neutron-mutation-verification.js";
import { checksum } from "@intentloom/core";
import { canonicalNeutronMutationJson } from "./neutron-mutation-canonical.js";

export function digestNeutronMutationVerificationEvidence(
  evidence: Omit<NeutronMutationVerificationEvidence, "evidenceDigest">,
): string {
  return `sha256:${checksum(canonicalNeutronMutationJson(evidence))}`;
}
