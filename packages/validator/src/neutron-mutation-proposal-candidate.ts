import {
  NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
  type NeutronMutationProposalCandidate,
  type NeutronMutationProposalCandidateFile,
} from "../../protocol/src/neutron-mutation-proposal-candidate.js";
import {
  NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILES,
  NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH,
} from "../../protocol/src/neutron-mutation-review-artifact.js";
import { canonicalizeNeutronMutationPaths } from "./neutron-mutation-canonical.js";
import { isObject, nonEmpty } from "./neutron-runtime-helpers.js";

const FORBIDDEN_CANDIDATE_KEYS = [
  "approved",
  "approvalId",
  "approvalToken",
  "approvalDigest",
  "grantedApprovals",
  "mutationAllowed",
  "reviewArtifactDigest",
  "artifactDigest",
  "planDigest",
  "projectStateDigest",
  "proposalDigest",
  "approvalSource",
  "grantWrite",
] as const;

const ALLOWED_CANDIDATE_KEYS = new Set(["schemaVersion", "files"]);
const ALLOWED_FILE_KEYS = new Set(["path", "content", "sources"]);
const MAX_SOURCE_ENTRIES = 8;
const MAX_SOURCE_LENGTH = 128;

export function parseNeutronMutationProposalCandidate(
  value: unknown,
): NeutronMutationProposalCandidate {
  const record = requireCandidateObject(value);
  rejectForbiddenKeys(record, "candidate");
  rejectUnknownKeys(record, ALLOWED_CANDIDATE_KEYS, "candidate");
  if (record.schemaVersion !== NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation proposal candidate schema");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
    files: parseCandidateFiles(record.files),
  };
}

export function parseNeutronMutationProposalCandidateOutput(
  output: string,
): NeutronMutationProposalCandidate {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    throw new Error("mutation proposal candidate must be JSON");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("mutation proposal candidate must be JSON");
  }
  return parseNeutronMutationProposalCandidate(parsed);
}

function requireCandidateObject(value: unknown): Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error("mutation proposal candidate must be an object");
  }
  return value;
}

function parseCandidateFiles(
  value: unknown,
): readonly NeutronMutationProposalCandidateFile[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("candidate.files must contain at least one file");
  }
  if (value.length > NEUTRON_MUTATION_REVIEW_MAX_FILES) {
    throw new Error("candidate.files exceeds maximum file count");
  }
  const files = value.map((entry, index) => parseCandidateFile(entry, index));
  canonicalizeNeutronMutationPaths(
    files.map((file) => file.path),
    "candidate.files",
  );
  assertCandidateAggregateBounds(files);
  return files;
}

function parseCandidateFile(
  value: unknown,
  index: number,
): NeutronMutationProposalCandidateFile {
  const field = `candidate.files[${String(index)}]`;
  if (!isObject(value)) throw new Error(`${field} must be an object`);
  rejectForbiddenKeys(value, field);
  rejectUnknownKeys(value, ALLOWED_FILE_KEYS, field);
  if (typeof value.content !== "string") {
    throw new Error(`${field}.content must be a string`);
  }
  const path = canonicalizeNeutronMutationPaths(
    [nonEmpty(value.path, `${field}.path`)],
    `${field}.path`,
  )[0]!;
  if (path.length > NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH) {
    throw new Error(`${field}.path exceeds maximum path length`);
  }
  const byteLength = Buffer.byteLength(value.content, "utf8");
  if (byteLength > NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES) {
    throw new Error(`${field} exceeds maximum content size`);
  }
  const sources = parseOptionalSources(value.sources, `${field}.sources`);
  return {
    path,
    content: value.content,
    ...(sources === undefined ? {} : { sources }),
  };
}

function parseOptionalSources(
  value: unknown,
  field: string,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  if (value.length > MAX_SOURCE_ENTRIES) {
    throw new Error(`${field} exceeds maximum entry count`);
  }
  return value.map((entry, index) => {
    const source = nonEmpty(entry, `${field}[${String(index)}]`);
    if (source.length > MAX_SOURCE_LENGTH) {
      throw new Error(`${field}[${String(index)}] exceeds maximum length`);
    }
    return source;
  });
}

function rejectForbiddenKeys(
  value: Record<string, unknown>,
  field: string,
): void {
  for (const key of FORBIDDEN_CANDIDATE_KEYS) {
    if (Object.hasOwn(value, key)) {
      throw new Error(`${field} must not include ${key}`);
    }
  }
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  field: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${field} must not include ${key}`);
    }
  }
}

export function assertCandidateAggregateBounds(
  files: readonly NeutronMutationProposalCandidateFile[],
): void {
  let aggregate = 0;
  for (const file of files) {
    aggregate += Buffer.byteLength(file.content, "utf8");
    if (aggregate > NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES) {
      throw new Error("candidate exceeds maximum aggregate content size");
    }
  }
}
