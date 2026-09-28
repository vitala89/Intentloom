export const NEUTRON_MUTATION_STATE_DIR_FLAG = "--neutron-mutation-state-dir";

export function desktopOwnedDaemonLaunchArgs({
  endpoint,
  tokenFile,
  catalogRoot,
  neutronMutationStateDir,
}) {
  if (
    typeof neutronMutationStateDir !== "string" ||
    neutronMutationStateDir.trim() === ""
  ) {
    throw new Error("neutron mutation state directory is required");
  }
  return [
    "--endpoint",
    endpoint,
    "--token-file",
    tokenFile,
    "--catalog-root",
    catalogRoot,
    NEUTRON_MUTATION_STATE_DIR_FLAG,
    neutronMutationStateDir,
  ];
}
