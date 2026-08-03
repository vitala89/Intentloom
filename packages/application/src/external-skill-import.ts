import { createHash } from "node:crypto";
import type {
  ExternalSkillImportProposal,
  ExternalSkillImportRequest,
  ExternalSkillNormalizationResult,
  ExternalSkillRiskLevel,
} from "@intentloom/protocol";
import {
  validateExternalSkillImportProposal,
  validateExternalSkillImportRequest,
  validateExternalSkillNormalizationResult,
} from "@intentloom/validator";

export function normalizeExternalSkill(
  request: ExternalSkillImportRequest,
): ExternalSkillNormalizationResult {
  const validatedRequest = validateExternalSkillImportRequest(request);
  const digestSha256 = createHash("sha256")
    .update(validatedRequest.content)
    .digest("hex");

  if (
    validatedRequest.expectedSha256 &&
    validatedRequest.expectedSha256 !== digestSha256
  ) {
    throw new Error(
      `external skill checksum mismatch: expected ${validatedRequest.expectedSha256}, got ${digestSha256}`,
    );
  }

  const rawNormalized = validatedRequest.skillName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");

  let start = 0;
  while (start < rawNormalized.length && rawNormalized[start] === "-") {
    start++;
  }
  let end = rawNormalized.length;
  while (end > start && rawNormalized[end - 1] === "-") {
    end--;
  }
  const normalizedName = rawNormalized.slice(start, end);

  const content = validatedRequest.content;
  const diagnostics: string[] = [];
  const declaredCapabilities: string[] = [];
  const entryPoints: string[] = ["SKILL.md"];

  // Scan capabilities
  if (/process|exec|shell|command/i.test(content)) {
    declaredCapabilities.push("process:exec");
  }
  if (/network|fetch|http|curl|wget/i.test(content)) {
    declaredCapabilities.push("network:connect");
  }
  if (/filesystem|write|read_file|write_file/i.test(content)) {
    declaredCapabilities.push("filesystem:read-write");
  } else {
    declaredCapabilities.push("filesystem:read-only");
  }

  // Scan license
  const licenseMatch =
    /(?:license|spdx-license-identifier)\s*:\s*([A-Za-z0-9.-]+)/i.exec(content);
  const license = licenseMatch ? licenseMatch[1] : undefined;

  // Scan entrypoints
  const scriptMatches = content.matchAll(
    /(?:scripts|references|assets)\/[A-Za-z0-9_.-]+/gi,
  );
  for (const match of scriptMatches) {
    if (!entryPoints.includes(match[0])) {
      entryPoints.push(match[0]);
    }
  }

  // Assess risk level
  let riskLevel: ExternalSkillRiskLevel = "low";
  if (
    /ignore previous instructions|system prompt override|eval\(|rm -rf|chmod \+x/i.test(
      content,
    )
  ) {
    riskLevel = "critical";
    diagnostics.push(
      "detected potential prompt injection or unsafe shell pattern",
    );
  } else if (
    declaredCapabilities.includes("process:exec") ||
    declaredCapabilities.includes("network:connect")
  ) {
    riskLevel = "high";
    diagnostics.push("skill requires process execution or network access");
  } else if (declaredCapabilities.includes("filesystem:read-write")) {
    riskLevel = "medium";
  }

  return validateExternalSkillNormalizationResult({
    schemaVersion: 1,
    normalizedName: normalizedName || "external-skill",
    digestSha256,
    declaredCapabilities,
    ...(license ? { license } : {}),
    entryPoints,
    riskLevel,
    diagnostics,
  });
}

export function proposeExternalSkillImport(
  request: ExternalSkillImportRequest,
): ExternalSkillImportProposal {
  const normalization = normalizeExternalSkill(request);
  const proposalId = `prop-import-${normalization.digestSha256.slice(0, 12)}`;

  const requiredApprovals: string[] = ["managed-extension-activation-approval"];
  if (
    normalization.riskLevel === "high" ||
    normalization.riskLevel === "critical"
  ) {
    requiredApprovals.push("security-boundary-approval");
  }

  return validateExternalSkillImportProposal({
    schemaVersion: 1,
    proposalId,
    normalization,
    status: "proposed",
    requiredApprovals,
    safeNextAction:
      "review proposal and run harness scenario verification before activation",
  });
}
