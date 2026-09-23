import {
  NEUTRON_MUTATION_REVIEW_CURRENTNESS,
  NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
  type NeutronMutationReviewSummary,
  type NeutronMutationReviewView,
} from "../../protocol/src/neutron-mutation-review-view.js";
import { NEUTRON_MUTATION_CLASS } from "../../protocol/src/neutron-mutation.js";
import { NEUTRON_MUTATION_REVIEW_MAX_FILES } from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  contentDigest,
  finiteInt,
  nonEmpty,
  oneOf,
  positiveInt,
} from "./neutron-runtime-helpers.js";
import {
  asReviewObject,
  rejectReviewAuthorityKeys,
  rejectUnknownReviewKeys,
} from "./neutron-mutation-review-rpc-helpers.js";
import {
  assertReviewContentBounds,
  validateReviewFile,
} from "./neutron-mutation-review-rpc-file.js";

export function validateReviewSummary(
  value: unknown,
  field: string,
): NeutronMutationReviewSummary {
  const record = asReviewObject(value, field);
  rejectReviewAuthorityKeys(record, field);
  rejectUnknownReviewKeys(
    record,
    [
      "proposalId",
      "proposalDigest",
      "planDigest",
      "reviewArtifactDigest",
      "projectStateDigest",
      "mutationClass",
      "graphId",
      "taskId",
      "attempt",
      "changedPathCount",
      "currentness",
      "expiresAt",
    ],
    field,
  );
  return {
    proposalId: nonEmpty(record.proposalId, `${field}.proposalId`),
    proposalDigest: contentDigest(
      record.proposalDigest,
      `${field}.proposalDigest`,
    ),
    planDigest: contentDigest(record.planDigest, `${field}.planDigest`),
    reviewArtifactDigest: contentDigest(
      record.reviewArtifactDigest,
      `${field}.reviewArtifactDigest`,
    ),
    projectStateDigest: contentDigest(
      record.projectStateDigest,
      `${field}.projectStateDigest`,
    ),
    mutationClass: oneOf(
      record.mutationClass,
      [NEUTRON_MUTATION_CLASS],
      `${field}.mutationClass`,
    ),
    graphId: nonEmpty(record.graphId, `${field}.graphId`),
    taskId: nonEmpty(record.taskId, `${field}.taskId`),
    attempt: positiveInt(record.attempt, `${field}.attempt`),
    changedPathCount: finiteInt(
      record.changedPathCount,
      `${field}.changedPathCount`,
    ),
    currentness: oneOf(
      record.currentness,
      NEUTRON_MUTATION_REVIEW_CURRENTNESS,
      `${field}.currentness`,
    ),
    ...(record.expiresAt === undefined
      ? {}
      : { expiresAt: finiteInt(record.expiresAt, `${field}.expiresAt`) }),
  };
}

export function validateReviewView(
  value: unknown,
  field: string,
): NeutronMutationReviewView {
  const record = asReviewObject(value, field);
  rejectReviewAuthorityKeys(record, field);
  rejectUnknownReviewKeys(
    record,
    [
      "schemaVersion",
      "sessionId",
      "projectId",
      "root",
      "graphId",
      "taskId",
      "attempt",
      "proposalId",
      "proposalDigest",
      "planDigest",
      "reviewArtifactDigest",
      "projectStateDigest",
      "mutationClass",
      "currentness",
      "files",
      "expiresAt",
    ],
    field,
  );
  if (record.schemaVersion !== NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation review view schema");
  }
  if (!Array.isArray(record.files)) {
    throw new Error(`${field}.files must be an array`);
  }
  if (record.files.length > NEUTRON_MUTATION_REVIEW_MAX_FILES) {
    throw new Error(`${field}.files exceeds maximum file count`);
  }
  const files = record.files.map((item, index) =>
    validateReviewFile(item, `${field}.files[${index}]`),
  );
  assertReviewContentBounds(files, field);
  return {
    schemaVersion: NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
    sessionId: nonEmpty(record.sessionId, `${field}.sessionId`),
    projectId: nonEmpty(record.projectId, `${field}.projectId`),
    root: nonEmpty(record.root, `${field}.root`),
    graphId: nonEmpty(record.graphId, `${field}.graphId`),
    taskId: nonEmpty(record.taskId, `${field}.taskId`),
    attempt: positiveInt(record.attempt, `${field}.attempt`),
    proposalId: nonEmpty(record.proposalId, `${field}.proposalId`),
    proposalDigest: contentDigest(
      record.proposalDigest,
      `${field}.proposalDigest`,
    ),
    planDigest: contentDigest(record.planDigest, `${field}.planDigest`),
    reviewArtifactDigest: contentDigest(
      record.reviewArtifactDigest,
      `${field}.reviewArtifactDigest`,
    ),
    projectStateDigest: contentDigest(
      record.projectStateDigest,
      `${field}.projectStateDigest`,
    ),
    mutationClass: oneOf(
      record.mutationClass,
      [NEUTRON_MUTATION_CLASS],
      `${field}.mutationClass`,
    ),
    currentness: oneOf(
      record.currentness,
      NEUTRON_MUTATION_REVIEW_CURRENTNESS,
      `${field}.currentness`,
    ),
    files,
    ...(record.expiresAt === undefined
      ? {}
      : { expiresAt: finiteInt(record.expiresAt, `${field}.expiresAt`) }),
  };
}
