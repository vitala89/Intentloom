import { neutronMutationContentDigest } from "../../validator/src/neutron-mutation-canonical.js";
import { canonicalNeutronMutationJson } from "../../validator/src/neutron-mutation-canonical.js";
import { digestGeneratedFileContent } from "../../validator/src/neutron-mutation-review-digest.js";
import { NEUTRON_HIDDEN_GENERATED_METADATA_PATHS } from "../../protocol/src/neutron-mutation-verification.js";
import { fingerprintNeutronProjectRoot } from "./neutron-session-fingerprint.js";
import type { FileSystem } from "./index.js";

export async function digestNeutronMutationObservedState(input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly paths: readonly string[];
}): Promise<string> {
  const inspection = await fingerprintNeutronProjectRoot(input.root, input.fs);
  const unique = [
    ...new Set([...input.paths, ...NEUTRON_HIDDEN_GENERATED_METADATA_PATHS]),
  ].sort();
  const pathBytes = [];
  for (const path of unique) {
    pathBytes.push(await digestObservedPath(input.root, input.fs, path));
  }
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({ inspection, pathBytes }),
  );
}

async function digestObservedPath(
  root: string,
  fs: FileSystem,
  path: string,
): Promise<{
  readonly path: string;
  readonly existed: boolean;
  readonly contentDigest: string | null;
}> {
  const fullPath = `${root}/${path}`;
  try {
    if (!(await fs.exists(fullPath))) {
      return { path, existed: false, contentDigest: null };
    }
    const actual = await fs.read(fullPath);
    return {
      path,
      existed: true,
      contentDigest: digestGeneratedFileContent(actual),
    };
  } catch {
    return { path, existed: false, contentDigest: null };
  }
}
