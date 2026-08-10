import { createHash } from "node:crypto";
import {
  QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN,
  type QualityExecutableMarketplaceDecision,
  type QualityExecutableMarketplaceEvaluation,
  type QualityExecutablePackSafetyOptions,
} from "@intentloom/protocol";
import {
  validateQualityExecutableMarketplaceDecision,
  validateQualityExecutableMarketplaceEvaluation,
  validateQualityExecutablePackSafetyOptions,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

const DEFAULT_REQUIRED_CAPABILITIES: readonly string[] = [
  "sandbox:strict",
  "signature:verified",
  "license:approved",
  "isolation:process-boundary",
];

const DEFAULT_SECURITY_REQUIREMENTS: readonly string[] = [
  "publisher-trust-root-binding",
  "reproducible-content-digest",
  "no-unrestricted-network",
  "no-unrestricted-filesystem-write",
];

export function evaluateExecutableMarketplacePolicy(options?: {
  readonly allowScopedExecutables?: boolean;
  readonly rationale?: string;
  readonly evaluatedAt?: string;
}): QualityExecutableMarketplaceDecision {
  const evaluatedAt = options?.evaluatedAt ?? new Date().toISOString();
  const allowScoped = options?.allowScopedExecutables ?? false;
  const status = allowScoped ? "accepted-scoped" : "rejected";
  const rationale =
    options?.rationale ??
    (allowScoped
      ? "Scoped third-party executable checkers permitted under strict sandbox capability constraints"
      : "Data-only is the default extension class; arbitrary executable checkers require explicit maintainer authorization and verified sandbox isolation");

  const id = `decision-${sha256(`${status}:${evaluatedAt}`).slice(0, 12)}`;

  return validateQualityExecutableMarketplaceDecision({
    schemaVersion: QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN,
    id,
    status,
    rationale,
    requiredCapabilityBoundary: DEFAULT_REQUIRED_CAPABILITIES,
    securityRequirements: DEFAULT_SECURITY_REQUIREMENTS,
    evaluatedAt,
  });
}

export function evaluateExecutablePackSafety(
  options: QualityExecutablePackSafetyOptions,
  activeTrustRoots?: readonly {
    readonly id: string;
    readonly status: string;
  }[],
  evaluatedAt?: string,
): QualityExecutableMarketplaceEvaluation {
  const validOptions = validateQualityExecutablePackSafetyOptions(options);
  const now = evaluatedAt ?? new Date().toISOString();

  const isSigned =
    validOptions.signature.startsWith("sig:") &&
    (activeTrustRoots === undefined ||
      (validOptions.trustRootId !== undefined &&
        activeTrustRoots.some(
          (r) => r.id === validOptions.trustRootId && r.status === "active",
        )));

  const forbiddenCaps = ["fs:write", "process:exec", "net:unrestricted"];
  const hasForbiddenCap = validOptions.requestedCapabilities.some((c) =>
    forbiddenCaps.includes(c),
  );

  const sandboxCompliant =
    (validOptions.sandboxProfile === "strict" ||
      validOptions.sandboxProfile === "workspace-read") &&
    !hasForbiddenCap;

  const licenseApproved = validOptions.licenseApproved;

  const isApproved =
    !validOptions.isExecutable ||
    (isSigned && sandboxCompliant && licenseApproved);

  const decision = isApproved ? "approved-sandbox" : "blocked";

  const evaluationDigest = sha256(
    JSON.stringify({
      packId: validOptions.packId,
      isExecutable: validOptions.isExecutable,
      decision,
      publisherSigned: isSigned,
      sandboxCompliant,
      licenseApproved,
    }),
  );

  return validateQualityExecutableMarketplaceEvaluation({
    packId: validOptions.packId,
    publisherSigned: isSigned,
    sandboxCompliant,
    licenseApproved,
    decision,
    evaluationDigest,
    evaluatedAt: now,
  });
}
