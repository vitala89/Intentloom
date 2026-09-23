import { resolve } from "node:path";
import type { FileSystem } from "./index.js";
import type { GeneratedFile } from "@intentloom/core";
import {
  NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
} from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronMutationReviewFileView } from "../../protocol/src/neutron-mutation-review-view.js";
import { digestGeneratedFileContent } from "../../validator/src/neutron-mutation.js";
import { isSecretLikeRelativePath } from "./neutron-context-secret-paths.js";
import {
  assertNeutronMutationPathContained,
  canonicalizeNeutronMutationRoot,
} from "./neutron-mutation-containment.js";

export type NeutronMutationReviewFileProjection =
  | {
      readonly ok: true;
      readonly files: readonly NeutronMutationReviewFileView[];
    }
  | {
      readonly ok: false;
      readonly outcome: "path-security-failed" | "review-too-large";
    };

export async function projectNeutronMutationReviewFiles(input: {
  readonly root: string;
  readonly files: readonly GeneratedFile[];
  readonly fs: FileSystem;
}): Promise<NeutronMutationReviewFileProjection> {
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    input.root,
    input.fs,
  );
  if (canonicalRoot === undefined) {
    return { ok: false, outcome: "path-security-failed" };
  }
  const projected: NeutronMutationReviewFileView[] = [];
  let aggregate = 0;
  for (const file of input.files) {
    const one = await projectOneReviewFile({
      canonicalRoot,
      file,
      fs: input.fs,
    });
    if (!one.ok) return one;
    aggregate += Buffer.byteLength(one.file.proposedContent ?? "", "utf8");
    aggregate += Buffer.byteLength(one.file.currentContent ?? "", "utf8");
    if (aggregate > NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES) {
      return { ok: false, outcome: "review-too-large" };
    }
    projected.push(one.file);
  }
  return { ok: true, files: projected };
}

async function projectOneReviewFile(input: {
  readonly canonicalRoot: string;
  readonly file: GeneratedFile;
  readonly fs: FileSystem;
}): Promise<
  | { readonly ok: true; readonly file: NeutronMutationReviewFileView }
  | {
      readonly ok: false;
      readonly outcome: "path-security-failed" | "review-too-large";
    }
> {
  const contained = await assertNeutronMutationPathContained(
    input.canonicalRoot,
    input.file.path,
    input.fs,
  );
  if (!contained) return { ok: false, outcome: "path-security-failed" };
  const absolute = resolve(input.canonicalRoot, input.file.path);
  const exists = await input.fs.exists(absolute);
  const current = exists
    ? await readCurrentReviewBytes(absolute, input.fs)
    : undefined;
  if (current !== undefined && current.tooLarge) {
    return { ok: false, outcome: "review-too-large" };
  }
  if (
    Buffer.byteLength(input.file.content, "utf8") >
    NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES
  ) {
    return { ok: false, outcome: "review-too-large" };
  }
  return {
    ok: true,
    file: classifyReviewFile({
      path: input.file.path,
      proposedContent: input.file.content,
      currentContent: current?.content,
      currentExists: exists,
    }),
  };
}

async function readCurrentReviewBytes(
  absolute: string,
  fs: FileSystem,
): Promise<{ readonly content: string; readonly tooLarge: boolean }> {
  const content = await fs.read(absolute);
  return {
    content,
    tooLarge:
      Buffer.byteLength(content, "utf8") >
      NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
  };
}

function classifyReviewFile(input: {
  readonly path: string;
  readonly proposedContent: string;
  readonly currentContent: string | undefined;
  readonly currentExists: boolean;
}): NeutronMutationReviewFileView {
  const proposedContentDigest = digestGeneratedFileContent(
    input.proposedContent,
  );
  const secret = isSecretLikeRelativePath(input.path);
  const operation =
    !input.currentExists || input.currentContent === undefined
      ? "create"
      : input.currentContent === input.proposedContent
        ? "unchanged"
        : "update";
  const currentContentDigest =
    input.currentContent === undefined
      ? undefined
      : digestGeneratedFileContent(input.currentContent);
  if (secret) {
    return {
      path: input.path,
      operation,
      status: "secret-path-unavailable",
      proposedContentDigest,
      existedBefore: input.currentExists,
      currentExists: input.currentExists,
    };
  }
  return {
    path: input.path,
    operation,
    status: "available",
    proposedContentDigest,
    existedBefore: input.currentExists,
    currentExists: input.currentExists,
    proposedContent: input.proposedContent,
    ...(input.currentContent === undefined
      ? {}
      : {
          currentContent: input.currentContent,
          ...(currentContentDigest === undefined
            ? {}
            : { currentContentDigest }),
        }),
  };
}
