import { NEUTRON_HIDDEN_GENERATED_METADATA_PATHS } from "../../protocol/src/neutron-mutation-verification.js";
import type { NeutronMutationWriteSetVerification } from "../../protocol/src/neutron-mutation-verification.js";
import { canonicalizeNeutronMutationPaths } from "../../validator/src/neutron-mutation-canonical.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import type { FileSystem } from "./index.js";

export async function verifyNeutronMutationWriteSet(input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly approvedChangedPaths: readonly string[];
  readonly accountedPaths: readonly string[];
  readonly hiddenMetadataExistedBefore: Readonly<Record<string, boolean>>;
}): Promise<NeutronMutationWriteSetVerification> {
  const approved = canonicalizeNeutronMutationPaths(
    input.approvedChangedPaths,
    "approvedChangedPaths",
  );
  const accounted =
    input.accountedPaths.length === 0
      ? []
      : canonicalizeNeutronMutationPaths(
          input.accountedPaths,
          "accountedPaths",
        );
  const undeclaredPaths = [...undeclaredAccounted(approved, accounted)];
  const missingApprovedPaths = approved.filter(
    (path) => !accounted.includes(path),
  );
  undeclaredPaths.push(
    ...(await undeclaredHiddenMetadata(input.root, input.fs, approved, input)),
  );
  const uniqueUndeclared = [...new Set(undeclaredPaths)].sort();
  const exact =
    exactNeutronMutationPathSetsEqual(approved, accounted) &&
    uniqueUndeclared.length === 0;
  return {
    status: exact ? "matched" : "mismatched",
    undeclaredPaths: uniqueUndeclared,
    missingApprovedPaths,
  };
}

function undeclaredAccounted(
  approved: readonly string[],
  accounted: readonly string[],
): readonly string[] {
  const allowed = new Set(approved);
  return accounted.filter((path) => !allowed.has(path));
}

async function undeclaredHiddenMetadata(
  root: string,
  fs: FileSystem,
  approved: readonly string[],
  input: {
    readonly hiddenMetadataExistedBefore: Readonly<Record<string, boolean>>;
  },
): Promise<readonly string[]> {
  const approvedSet = new Set(approved);
  const unexpected: string[] = [];
  for (const path of NEUTRON_HIDDEN_GENERATED_METADATA_PATHS) {
    if (approvedSet.has(path)) continue;
    const existedBefore = input.hiddenMetadataExistedBefore[path] === true;
    const existsNow = await fs.exists(`${root}/${path}`);
    if (!existedBefore && existsNow) unexpected.push(path);
  }
  return unexpected;
}
