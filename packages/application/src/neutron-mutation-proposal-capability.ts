import {
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
  NEUTRON_MUTATION_PROPOSAL_ROLE,
} from "../../protocol/src/neutron-mutation-proposal-candidate.js";

export { NEUTRON_MUTATION_PROPOSAL_CAPABILITY, NEUTRON_MUTATION_PROPOSAL_ROLE };

export interface NeutronMutationProposalPermissionInput {
  readonly role: string;
  readonly nodeRequiredCapabilities: readonly string[];
  readonly parentRequiredCapabilities?: readonly string[];
  readonly sessionProposalCapabilities?: readonly string[];
  readonly profileProposalCapabilities?: readonly string[];
  readonly capabilityCeiling?: readonly string[];
}

export function neutronNodeMayPropose(
  input: NeutronMutationProposalPermissionInput,
): boolean {
  if (input.role !== NEUTRON_MUTATION_PROPOSAL_ROLE) return false;
  const layers: readonly (readonly string[])[] = [
    input.nodeRequiredCapabilities,
    input.sessionProposalCapabilities ?? [],
    ...optionalGrant(input.parentRequiredCapabilities),
    ...optionalGrant(input.profileProposalCapabilities),
    ...optionalGrant(input.capabilityCeiling),
  ];
  return layers.every((layer) =>
    layer.includes(NEUTRON_MUTATION_PROPOSAL_CAPABILITY),
  );
}

function optionalGrant(
  layer: readonly string[] | undefined,
): readonly (readonly string[])[] {
  return layer === undefined ? [] : [layer];
}
