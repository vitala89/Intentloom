import type { NeutronGraphStaleReport } from "./neutron-scheduler-stale.js";

export function neutronGraphMutationMaterializationIsCurrent(input: {
  readonly stale: NeutronGraphStaleReport | null;
  readonly attemptFingerprint: string;
  readonly currentFingerprint: string;
}): boolean {
  if (input.stale !== null && input.stale.accepted === false) return false;
  return (
    input.attemptFingerprint.length > 0 &&
    input.attemptFingerprint === input.currentFingerprint
  );
}

export function assertNeutronGraphMutationMaterializationCurrent(input: {
  readonly stale: NeutronGraphStaleReport | null;
  readonly attemptFingerprint: string;
  readonly currentFingerprint: string;
}): void {
  if (!neutronGraphMutationMaterializationIsCurrent(input)) {
    throw new Error("neutron mutation proposal candidate is stale");
  }
}

export function neutronGraphMutationProjectStateDigest(
  attemptFingerprint: string,
): string {
  return `sha256:${attemptFingerprint}`;
}
