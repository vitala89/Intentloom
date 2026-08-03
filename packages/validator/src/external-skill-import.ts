import type {
  ExternalSkillImportProposal,
  ExternalSkillImportRequest,
  ExternalSkillNormalizationResult,
  ExternalSkillRiskLevel,
  ExternalSkillSourceType,
} from "@intentloom/protocol";

const SOURCE_TYPES: readonly ExternalSkillSourceType[] = [
  "local-directory",
  "local-archive",
  "remote-pinned-sha256",
];

const RISK_LEVELS: readonly ExternalSkillRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export function validateExternalSkillImportRequest(
  value: unknown,
): ExternalSkillImportRequest {
  if (!isObject(value)) {
    throw new Error("external skill import request must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("import request schemaVersion must equal 1");
  }
  if (typeof value.skillName !== "string" || !value.skillName.trim()) {
    throw new Error("skillName must be a non-empty string");
  }
  if (!SOURCE_TYPES.includes(value.sourceType as ExternalSkillSourceType)) {
    throw new Error("invalid external skill source type");
  }
  if (typeof value.sourceUri !== "string" || !value.sourceUri.trim()) {
    throw new Error("sourceUri must be a non-empty string");
  }
  if (typeof value.content !== "string") {
    throw new Error("content must be a string");
  }
  if (
    value.expectedSha256 !== undefined &&
    (typeof value.expectedSha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(value.expectedSha256))
  ) {
    throw new Error(
      "expectedSha256 must be a 64-character hex string if provided",
    );
  }

  return {
    schemaVersion: 1,
    skillName: value.skillName,
    sourceType: value.sourceType as ExternalSkillSourceType,
    sourceUri: value.sourceUri,
    content: value.content,
    ...(typeof value.expectedSha256 === "string"
      ? { expectedSha256: value.expectedSha256.toLowerCase() }
      : {}),
  };
}

export function validateExternalSkillNormalizationResult(
  value: unknown,
): ExternalSkillNormalizationResult {
  if (!isObject(value)) {
    throw new Error("external skill normalization result must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("normalization result schemaVersion must equal 1");
  }
  if (
    typeof value.normalizedName !== "string" ||
    !value.normalizedName.trim()
  ) {
    throw new Error("normalizedName must be a non-empty string");
  }
  if (
    typeof value.digestSha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(value.digestSha256)
  ) {
    throw new Error("digestSha256 must be a 64-character hex string");
  }
  const declaredCapabilities = stringArray(
    value.declaredCapabilities,
    "declaredCapabilities",
  );
  if (
    value.license !== undefined &&
    (typeof value.license !== "string" || !value.license)
  ) {
    throw new Error("license must be a non-empty string if provided");
  }
  const entryPoints = stringArray(value.entryPoints, "entryPoints");
  if (!RISK_LEVELS.includes(value.riskLevel as ExternalSkillRiskLevel)) {
    throw new Error("invalid risk level");
  }
  const diagnostics = stringArray(value.diagnostics, "diagnostics");

  return {
    schemaVersion: 1,
    normalizedName: value.normalizedName,
    digestSha256: value.digestSha256.toLowerCase(),
    declaredCapabilities,
    ...(typeof value.license === "string" ? { license: value.license } : {}),
    entryPoints,
    riskLevel: value.riskLevel as ExternalSkillRiskLevel,
    diagnostics,
  };
}

export function validateExternalSkillImportProposal(
  value: unknown,
): ExternalSkillImportProposal {
  if (!isObject(value)) {
    throw new Error("external skill import proposal must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("import proposal schemaVersion must equal 1");
  }
  if (typeof value.proposalId !== "string" || !value.proposalId.trim()) {
    throw new Error("proposalId must be a non-empty string");
  }
  const normalization = validateExternalSkillNormalizationResult(
    value.normalization,
  );
  if (value.status !== "proposed" && value.status !== "inactive") {
    throw new Error("proposal status must be proposed or inactive");
  }
  const requiredApprovals = stringArray(
    value.requiredApprovals,
    "requiredApprovals",
  );
  if (
    typeof value.safeNextAction !== "string" ||
    !value.safeNextAction.trim()
  ) {
    throw new Error("safeNextAction must be a non-empty string");
  }

  return {
    schemaVersion: 1,
    proposalId: value.proposalId,
    normalization,
    status: value.status,
    requiredApprovals,
    safeNextAction: value.safeNextAction,
  };
}
