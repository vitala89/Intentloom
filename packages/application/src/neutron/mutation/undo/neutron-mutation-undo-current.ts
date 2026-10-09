import { digestGeneratedFileContent } from "../../../../../validator/src/neutron-mutation-review-digest.js";
import type { FileSystem } from "../../../index.js";
import {
  assertNeutronMutationPathContained,
  canonicalizeNeutronMutationRoot,
} from "../apply/neutron-mutation-containment.js";
import type { NeutronMutationUndoInspection } from "./neutron-mutation-undo-eligibility.js";

export type NeutronMutationUndoCurrent =
  "match" | "stale" | "escape" | "unprovable";

/**
 * Read-only currentness check. A future Undo must not overwrite a later edit.
 * Path containment is the same helper Apply uses.
 */
export async function inspectNeutronMutationUndoCurrent(input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly inspection: NeutronMutationUndoInspection;
}): Promise<NeutronMutationUndoCurrent> {
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    input.root,
    input.fs,
  );
  if (canonicalRoot === undefined) return "escape";
  const scope = [
    ...input.inspection.createdPaths,
    ...input.inspection.updatedPaths,
  ];
  let stale = false;
  let unprovable = false;
  for (const path of scope) {
    const observed = await observeUndoPath(
      canonicalRoot,
      path,
      input.fs,
      input.inspection.expectedDigests.get(path),
    );
    if (observed === "escape") return "escape";
    if (observed === "stale") stale = true;
    if (observed === "unprovable") unprovable = true;
  }
  if (stale) return "stale";
  if (unprovable) return "unprovable";
  return "match";
}

async function observeUndoPath(
  canonicalRoot: string,
  path: string,
  fs: FileSystem,
  expectedDigest: string | undefined,
): Promise<NeutronMutationUndoCurrent> {
  const contained = await assertNeutronMutationPathContained(
    canonicalRoot,
    path,
    fs,
  );
  if (!contained) return "escape";
  if (expectedDigest === undefined) return "unprovable";
  return readMatchesExpected(canonicalRoot, path, fs, expectedDigest);
}

async function readMatchesExpected(
  canonicalRoot: string,
  path: string,
  fs: FileSystem,
  expectedDigest: string,
): Promise<"match" | "stale" | "escape"> {
  const fullPath = `${canonicalRoot}/${path}`;
  try {
    if (!(await fs.exists(fullPath))) return "stale";
    const actual = digestGeneratedFileContent(await fs.read(fullPath));
    return actual === expectedDigest ? "match" : "stale";
  } catch {
    return "escape";
  }
}
