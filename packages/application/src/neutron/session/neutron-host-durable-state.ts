export interface NeutronHostDurableState {
  readonly durableStateDirectory: string;
}

export function neutronHostDurableStateFromOptions(options: {
  readonly durableStateDirectory?: string;
}): NeutronHostDurableState | undefined {
  if (options.durableStateDirectory === undefined) {
    return undefined;
  }
  const durableStateDirectory = options.durableStateDirectory.trim();
  if (durableStateDirectory === "") {
    throw new Error("neutron-mutation-state-unusable");
  }
  return { durableStateDirectory };
}

export function requireNeutronHostDurableState(
  state: NeutronHostDurableState | undefined,
): NeutronHostDurableState {
  if (state === undefined) {
    throw new Error("neutron-mutation-state-unavailable");
  }
  return state;
}
