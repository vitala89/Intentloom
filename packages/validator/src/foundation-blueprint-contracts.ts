import type {
  FoundationBlueprintApprovalRecord,
  FoundationBlueprintCandidate,
  FoundationBlueprintCompareResult,
  FoundationBlueprintDecisionMetadata,
  FoundationBlueprintProposalResult,
  FoundationBlueprintTier,
} from "@intentloom/protocol";
import {
  FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateBlueprintApproval,
  validateProjectBlueprint,
} from "./inception-base.js";

const TIERS = new Set(["minimal", "recommended", "extensible"]);
const COMPLEXITIES = new Set(["low", "medium", "high"]);
const REVERSIBILITIES = new Set(["easy", "moderate", "hard"]);

function assertSchemaVersion(
  value: unknown,
  field: string,
  expected: string,
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as Record<string, unknown>).schemaVersion !== expected
  ) {
    throw new Error(`Invalid ${field}: unsupported schema version`);
  }
}

function validateTier(value: unknown, field: string): FoundationBlueprintTier {
  if (typeof value !== "string" || !TIERS.has(value)) {
    throw new Error(`Invalid ${field}: tier`);
  }
  return value as FoundationBlueprintTier;
}

function validateMetadata(value: unknown): FoundationBlueprintDecisionMetadata {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation blueprint metadata: expected object");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.complexity !== "string" ||
    !COMPLEXITIES.has(record.complexity)
  ) {
    throw new Error("Invalid foundation blueprint metadata: complexity");
  }
  if (
    typeof record.reversibility !== "string" ||
    !REVERSIBILITIES.has(record.reversibility)
  ) {
    throw new Error("Invalid foundation blueprint metadata: reversibility");
  }
  if (
    !Array.isArray(record.migrationNotes) ||
    !record.migrationNotes.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid foundation blueprint metadata: migrationNotes");
  }
  if (
    !Array.isArray(record.deferredDecisions) ||
    !record.deferredDecisions.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid foundation blueprint metadata: deferredDecisions");
  }
  return value as FoundationBlueprintDecisionMetadata;
}

function validateCandidate(value: unknown): FoundationBlueprintCandidate {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation blueprint candidate: expected object");
  }
  const record = value as Record<string, unknown>;
  validateTier(record.tier, "foundation blueprint candidate");
  if (typeof record.rationale !== "string" || record.rationale.length === 0) {
    throw new Error("Invalid foundation blueprint candidate: rationale");
  }
  validateMetadata(record.metadata);
  validateProjectBlueprint(record.blueprint);
  return value as FoundationBlueprintCandidate;
}

export function validateFoundationBlueprintProposalResult(
  value: unknown,
): FoundationBlueprintProposalResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation blueprint proposal: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation blueprint proposal",
    FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0) {
    throw new Error("Invalid foundation blueprint proposal: workshopId");
  }
  if (typeof record.recommendedTopology !== "string") {
    throw new Error(
      "Invalid foundation blueprint proposal: recommendedTopology",
    );
  }
  if (typeof record.digest !== "string" || record.digest.length === 0) {
    throw new Error("Invalid foundation blueprint proposal: digest");
  }
  if (record.workshopUnchanged !== true) {
    throw new Error(
      "Invalid foundation blueprint proposal: workshopUnchanged must be true",
    );
  }
  validateCandidate(record.recommended);
  if (
    !Array.isArray(record.alternatives) ||
    !record.alternatives.every((item) => {
      try {
        validateCandidate(item);
        return true;
      } catch {
        return false;
      }
    })
  ) {
    throw new Error("Invalid foundation blueprint proposal: alternatives");
  }
  return value as FoundationBlueprintProposalResult;
}

export function validateFoundationBlueprintCompareResult(
  value: unknown,
): FoundationBlueprintCompareResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation blueprint compare: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation blueprint compare",
    FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0) {
    throw new Error("Invalid foundation blueprint compare: workshopId");
  }
  validateTier(record.leftTier, "foundation blueprint compare leftTier");
  validateTier(record.rightTier, "foundation blueprint compare rightTier");
  if (typeof record.topologyMatch !== "boolean") {
    throw new Error("Invalid foundation blueprint compare: topologyMatch");
  }
  if (
    !Array.isArray(record.packDifferences) ||
    !record.packDifferences.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid foundation blueprint compare: packDifferences");
  }
  return value as FoundationBlueprintCompareResult;
}

export function validateFoundationBlueprintApprovalRecord(
  value: unknown,
): FoundationBlueprintApprovalRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation blueprint approval: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation blueprint approval",
    FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  if (typeof record.workshopId !== "string" || record.workshopId.length === 0) {
    throw new Error("Invalid foundation blueprint approval: workshopId");
  }
  validateTier(record.tier, "foundation blueprint approval");
  validateBlueprintApproval(record.approval);
  return value as FoundationBlueprintApprovalRecord;
}
