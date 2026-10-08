/**
 * Claim stored on a Slice 3.1 transaction record after U2.
 * Digests only. Restoration bytes stay in the host-private snapshot store.
 */
export const NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-restoration:1" as const;

export interface NeutronMutationUndoRestorationClaim {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN;
  readonly state: "applied-source";
  readonly manifestDigest: string;
}
