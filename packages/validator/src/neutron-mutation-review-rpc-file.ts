import {
  NEUTRON_MUTATION_REVIEW_FILE_OPERATIONS,
  NEUTRON_MUTATION_REVIEW_FILE_STATUSES,
  type NeutronMutationReviewFileView,
} from "../../protocol/src/neutron-mutation-review-view.js";
import {
  NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH,
} from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  contentDigest,
  oneOf,
  projectRelativePath,
} from "./neutron-runtime-helpers.js";
import {
  asReviewObject,
  rejectReviewAuthorityKeys,
  rejectUnknownReviewKeys,
} from "./neutron-mutation-review-rpc-helpers.js";

export function validateReviewFile(
  value: unknown,
  field: string,
): NeutronMutationReviewFileView {
  const record = asReviewObject(value, field);
  rejectReviewAuthorityKeys(record, field);
  rejectUnknownReviewKeys(
    record,
    [
      "path",
      "operation",
      "status",
      "proposedContentDigest",
      "existedBefore",
      "currentExists",
      "proposedContent",
      "currentContent",
      "currentContentDigest",
    ],
    field,
  );
  const path = projectRelativePath(record.path, `${field}.path`);
  if (path.length > NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH) {
    throw new Error(`${field}.path exceeds maximum length`);
  }
  const status = oneOf(
    record.status,
    NEUTRON_MUTATION_REVIEW_FILE_STATUSES,
    `${field}.status`,
  );
  const proposedContent = optionalReviewContent(
    record.proposedContent,
    `${field}.proposedContent`,
    status,
  );
  const currentContent = optionalReviewContent(
    record.currentContent,
    `${field}.currentContent`,
    status,
  );
  return {
    path,
    operation: oneOf(
      record.operation,
      NEUTRON_MUTATION_REVIEW_FILE_OPERATIONS,
      `${field}.operation`,
    ),
    status,
    proposedContentDigest: contentDigest(
      record.proposedContentDigest,
      `${field}.proposedContentDigest`,
    ),
    existedBefore: record.existedBefore === true,
    currentExists: record.currentExists === true,
    ...(proposedContent === undefined ? {} : { proposedContent }),
    ...(currentContent === undefined ? {} : { currentContent }),
    ...(record.currentContentDigest === undefined
      ? {}
      : {
          currentContentDigest: contentDigest(
            record.currentContentDigest,
            `${field}.currentContentDigest`,
          ),
        }),
  };
}

export function assertReviewContentBounds(
  files: readonly NeutronMutationReviewFileView[],
  field: string,
): void {
  let aggregate = 0;
  for (const file of files) {
    aggregate += Buffer.byteLength(file.proposedContent ?? "", "utf8");
    aggregate += Buffer.byteLength(file.currentContent ?? "", "utf8");
    if (aggregate > NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES) {
      throw new Error(`${field} exceeds maximum aggregate content size`);
    }
  }
}

function optionalReviewContent(
  value: unknown,
  field: string,
  status: (typeof NEUTRON_MUTATION_REVIEW_FILE_STATUSES)[number],
): string | undefined {
  if (value === undefined) return undefined;
  if (status === "secret-path-unavailable") {
    throw new Error(`${field} must be omitted for secret-path-unavailable`);
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  if (
    Buffer.byteLength(value, "utf8") >
    NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES
  ) {
    throw new Error(`${field} exceeds maximum content size`);
  }
  return value;
}
