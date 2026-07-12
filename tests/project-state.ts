import type { FileSystem } from "@aif/cli";

export async function snapshotProjectState(
  fs: FileSystem & { files: Map<string, string> },
): Promise<readonly [string, string][]> {
  return [...fs.files.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

export function assertProjectStateUnchanged(
  before: readonly [string, string][],
  after: readonly [string, string][],
): void {
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error(
      `project state changed\nbefore=${JSON.stringify(before)}\nafter=${JSON.stringify(after)}`,
    );
}
