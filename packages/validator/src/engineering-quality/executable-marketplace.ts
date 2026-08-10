import {
  QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN,
  type QualityExecutableMarketplaceDecision,
  type QualityExecutableMarketplaceDecisionStatus,
  type QualityExecutableMarketplaceEvaluation,
  type QualityExecutablePackEvaluationDecision,
  type QualityExecutablePackSafetyOptions,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const DECISION_STATUSES: readonly QualityExecutableMarketplaceDecisionStatus[] =
  ["rejected", "accepted-scoped", "deferred"];

const EVALUATION_DECISIONS: readonly QualityExecutablePackEvaluationDecision[] =
  ["blocked", "approved-sandbox"];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

export function validateQualityExecutableMarketplaceDecision(
  value: unknown,
): QualityExecutableMarketplaceDecision {
  if (!isObject(value))
    throw new Error("executable marketplace decision must be an object");
  if (value.schemaVersion !== QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN) {
    throw new Error(
      `executableMarketplaceDecision.schemaVersion must equal ${QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN}`,
    );
  }
  if (
    !DECISION_STATUSES.includes(
      value.status as QualityExecutableMarketplaceDecisionStatus,
    )
  ) {
    throw new Error("executableMarketplaceDecision.status must be valid");
  }
  return {
    schemaVersion: QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN,
    id: stringField(value.id, "executableMarketplaceDecision.id"),
    status: value.status as QualityExecutableMarketplaceDecisionStatus,
    rationale: stringField(
      value.rationale,
      "executableMarketplaceDecision.rationale",
    ),
    requiredCapabilityBoundary: strings(
      value.requiredCapabilityBoundary,
      "executableMarketplaceDecision.requiredCapabilityBoundary",
    ),
    securityRequirements: strings(
      value.securityRequirements,
      "executableMarketplaceDecision.securityRequirements",
    ),
    evaluatedAt: stringField(
      value.evaluatedAt,
      "executableMarketplaceDecision.evaluatedAt",
    ),
  };
}

export function validateQualityExecutablePackSafetyOptions(
  value: unknown,
): QualityExecutablePackSafetyOptions {
  if (!isObject(value))
    throw new Error("executable pack safety options must be an object");
  if (typeof value.isExecutable !== "boolean") {
    throw new Error(
      "executablePackSafetyOptions.isExecutable must be a boolean",
    );
  }
  if (typeof value.licenseApproved !== "boolean") {
    throw new Error(
      "executablePackSafetyOptions.licenseApproved must be a boolean",
    );
  }
  return {
    packId: stringField(value.packId, "executablePackSafetyOptions.packId"),
    publisherIdentity: stringField(
      value.publisherIdentity,
      "executablePackSafetyOptions.publisherIdentity",
    ),
    signature: stringField(
      value.signature,
      "executablePackSafetyOptions.signature",
    ),
    ...(typeof value.trustRootId === "string"
      ? { trustRootId: value.trustRootId }
      : {}),
    isExecutable: value.isExecutable,
    requestedCapabilities: strings(
      value.requestedCapabilities,
      "executablePackSafetyOptions.requestedCapabilities",
    ),
    sandboxProfile: stringField(
      value.sandboxProfile,
      "executablePackSafetyOptions.sandboxProfile",
    ),
    licenseApproved: value.licenseApproved,
  };
}

export function validateQualityExecutableMarketplaceEvaluation(
  value: unknown,
): QualityExecutableMarketplaceEvaluation {
  if (!isObject(value))
    throw new Error("executable marketplace evaluation must be an object");
  if (typeof value.publisherSigned !== "boolean") {
    throw new Error(
      "executableMarketplaceEvaluation.publisherSigned must be a boolean",
    );
  }
  if (typeof value.sandboxCompliant !== "boolean") {
    throw new Error(
      "executableMarketplaceEvaluation.sandboxCompliant must be a boolean",
    );
  }
  if (typeof value.licenseApproved !== "boolean") {
    throw new Error(
      "executableMarketplaceEvaluation.licenseApproved must be a boolean",
    );
  }
  if (
    !EVALUATION_DECISIONS.includes(
      value.decision as QualityExecutablePackEvaluationDecision,
    )
  ) {
    throw new Error("executableMarketplaceEvaluation.decision must be valid");
  }
  return {
    packId: stringField(value.packId, "executableMarketplaceEvaluation.packId"),
    publisherSigned: value.publisherSigned,
    sandboxCompliant: value.sandboxCompliant,
    licenseApproved: value.licenseApproved,
    decision: value.decision as QualityExecutablePackEvaluationDecision,
    evaluationDigest: stringField(
      value.evaluationDigest,
      "executableMarketplaceEvaluation.evaluationDigest",
    ),
    evaluatedAt: stringField(
      value.evaluatedAt,
      "executableMarketplaceEvaluation.evaluatedAt",
    ),
  };
}
