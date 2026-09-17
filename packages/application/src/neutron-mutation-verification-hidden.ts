import { NEUTRON_HIDDEN_GENERATED_METADATA_PATHS } from "../../protocol/src/neutron-mutation-verification.js";
import type { FileSystem } from "./index.js";

export async function snapshotHiddenGeneratedMetadata(
  root: string,
  fs: FileSystem,
): Promise<Readonly<Record<string, boolean>>> {
  const snapshot: Record<string, boolean> = {};
  for (const path of NEUTRON_HIDDEN_GENERATED_METADATA_PATHS) {
    snapshot[path] = await fs.exists(`${root}/${path}`);
  }
  return snapshot;
}

export function encodeHiddenMetadataDiagnostics(
  hidden: Readonly<Record<string, boolean>>,
): readonly string[] {
  return Object.entries(hidden).map(
    ([path, existed]) => `metadata-before:${path}=${existed ? "1" : "0"}`,
  );
}

export function hiddenMetadataFromDiagnostics(
  diagnostics: readonly string[],
): Readonly<Record<string, boolean>> {
  const snapshot: Record<string, boolean> = {};
  for (const item of diagnostics) {
    if (!item.startsWith("metadata-before:")) continue;
    const encoded = item.slice("metadata-before:".length);
    const separator = encoded.lastIndexOf("=");
    if (separator <= 0) continue;
    snapshot[encoded.slice(0, separator)] =
      encoded.slice(separator + 1) === "1";
  }
  return snapshot;
}
