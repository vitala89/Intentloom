export const GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY =
  "declared-paths-only" as const;

export type GeneratedFileSyncMode =
  "generated-files" | typeof GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY;

export function isDeclaredPathsOnlySyncMode(
  mode: GeneratedFileSyncMode | undefined,
): boolean {
  return mode === GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY;
}
