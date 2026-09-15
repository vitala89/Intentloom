import {
  checksum,
  normalizeStoredPath,
  type GeneratedFile,
} from "@intentloom/core";
import type { NeutronMutationReviewArtifact } from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  digestGeneratedFileContent,
  exactNeutronMutationPathSetsEqual,
} from "../../validator/src/neutron-mutation.js";

export const MUTATION_PAYLOAD_VERIFICATION_CODES = [
  "artifact-digest-mismatch",
  "content-mismatch",
  "digest-mismatch",
  "duplicate-path",
  "extra-path",
  "path-missing",
  "path-normalization-mismatch",
  "root-mismatch",
] as const;

export type MutationPayloadVerificationCode =
  (typeof MUTATION_PAYLOAD_VERIFICATION_CODES)[number];

export interface MutationPayloadVerificationResult {
  readonly ok: boolean;
  readonly codes: readonly MutationPayloadVerificationCode[];
  readonly diagnostics: readonly string[];
}

function normalizePayloadPath(
  path: string,
  index: number,
): { ok: true; path: string } | { ok: false; detail: string } {
  try {
    return { ok: true, path: normalizeStoredPath(path) };
  } catch {
    return {
      ok: false,
      detail: `path-normalization:${String(index)}`,
    };
  }
}

export function verifyMutationPayloadAgainstReviewArtifact(input: {
  readonly artifact: NeutronMutationReviewArtifact;
  readonly files: readonly GeneratedFile[];
  readonly root?: string;
  readonly artifactDigest?: string;
}): MutationPayloadVerificationResult {
  const codes: MutationPayloadVerificationCode[] = [];
  const diagnostics: string[] = [];
  const push = (code: MutationPayloadVerificationCode, detail: string) => {
    if (!codes.includes(code)) codes.push(code);
    if (!diagnostics.includes(detail)) diagnostics.push(detail);
  };

  if (
    input.artifactDigest !== undefined &&
    input.artifactDigest !== input.artifact.artifactDigest
  ) {
    push("artifact-digest-mismatch", "artifact-digest-mismatch");
  }
  if (input.root !== undefined && input.root !== input.artifact.root) {
    push("root-mismatch", "root-mismatch");
  }

  const bindingByPath = new Map(
    input.artifact.fileBindings.map((binding) => [binding.path, binding]),
  );
  const payloadPaths: string[] = [];
  const seenPayloadPaths = new Set<string>();

  for (const [index, file] of input.files.entries()) {
    const normalized = normalizePayloadPath(file.path, index);
    if (!normalized.ok) {
      push("path-normalization-mismatch", normalized.detail);
      continue;
    }
    const path = normalized.path;
    if (seenPayloadPaths.has(path)) {
      push("duplicate-path", "duplicate-path");
      continue;
    }
    seenPayloadPaths.add(path);
    payloadPaths.push(path);

    const binding = bindingByPath.get(path);
    if (binding === undefined) {
      push("extra-path", "extra-path");
      continue;
    }
    if (typeof file.content !== "string") {
      push("content-mismatch", `content-type:${String(index)}`);
      continue;
    }
    const digest = digestGeneratedFileContent(file.content);
    if (digest !== binding.contentDigest) {
      push("content-mismatch", `content-digest:${path}`);
    }
    if (
      file.checksum !== undefined &&
      file.checksum !== checksum(file.content)
    ) {
      push("digest-mismatch", `file-checksum:${path}`);
    }
  }

  for (const path of input.artifact.changedPaths) {
    if (!seenPayloadPaths.has(path)) {
      push("path-missing", `path-missing:${path}`);
    }
  }

  if (
    !exactNeutronMutationPathSetsEqual(
      payloadPaths,
      input.artifact.changedPaths,
    )
  ) {
    if (!codes.includes("extra-path") && !codes.includes("path-missing")) {
      push("path-missing", "path-set-mismatch");
    }
  }

  return { ok: codes.length === 0, codes, diagnostics };
}
