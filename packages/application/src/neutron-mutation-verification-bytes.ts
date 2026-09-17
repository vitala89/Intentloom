import type { NeutronMutationReviewFileBinding } from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronMutationByteCheck } from "../../protocol/src/neutron-mutation-verification.js";
import { digestGeneratedFileContent } from "../../validator/src/neutron-mutation-review-digest.js";
import type { FileSystem } from "./index.js";

export async function verifyNeutronMutationCommittedBytes(input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
}): Promise<readonly NeutronMutationByteCheck[]> {
  const checks: NeutronMutationByteCheck[] = [];
  for (const binding of input.fileBindings) {
    checks.push(await readCommittedByteCheck(input.root, input.fs, binding));
  }
  return checks;
}

async function readCommittedByteCheck(
  root: string,
  fs: FileSystem,
  binding: NeutronMutationReviewFileBinding,
): Promise<NeutronMutationByteCheck> {
  const fullPath = `${root}/${binding.path}`;
  try {
    if (!(await fs.exists(fullPath))) {
      return {
        path: binding.path,
        expectedContentDigest: binding.contentDigest,
        existed: false,
        matched: false,
      };
    }
    const actual = await fs.read(fullPath);
    const actualContentDigest = digestGeneratedFileContent(actual);
    return {
      path: binding.path,
      expectedContentDigest: binding.contentDigest,
      actualContentDigest,
      existed: true,
      matched: actualContentDigest === binding.contentDigest,
    };
  } catch {
    return {
      path: binding.path,
      expectedContentDigest: binding.contentDigest,
      existed: false,
      matched: false,
    };
  }
}
