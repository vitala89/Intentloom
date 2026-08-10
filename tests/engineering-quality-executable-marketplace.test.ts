import { describe, expect, it } from "vitest";
import {
  evaluateExecutableMarketplacePolicy,
  evaluateExecutablePackSafety,
} from "@intentloom/application";
import { QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN } from "@intentloom/protocol";
import {
  validateQualityExecutableMarketplaceDecision,
  validateQualityExecutableMarketplaceEvaluation,
  validateQualityExecutablePackSafetyOptions,
} from "@intentloom/validator";

describe("Engineering Quality Phase Q18: Executable Marketplace Decision", () => {
  it("evaluates marketplace policy to fail-closed rejected status by default", () => {
    const decision = evaluateExecutableMarketplacePolicy({
      evaluatedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(decision.schemaVersion).toBe(
      QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN,
    );
    expect(decision.status).toBe("rejected");
    expect(decision.rationale).toContain(
      "Data-only is the default extension class",
    );
    expect(decision.securityRequirements).toContain(
      "publisher-trust-root-binding",
    );

    const validated = validateQualityExecutableMarketplaceDecision(decision);
    expect(validated.id).toBe(decision.id);
  });

  it("allows scoped executables when explicitly authorized", () => {
    const decision = evaluateExecutableMarketplacePolicy({
      allowScopedExecutables: true,
      evaluatedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(decision.status).toBe("accepted-scoped");
    expect(decision.rationale).toContain(
      "Scoped third-party executable checkers permitted",
    );
  });

  it("approves data-only quality pack evaluation", () => {
    const evaluation = evaluateExecutablePackSafety({
      packId: "first-party/typescript",
      publisherIdentity: "Intentloom Core",
      signature: "sig:valid-sig-123",
      isExecutable: false,
      requestedCapabilities: [],
      sandboxProfile: "strict",
      licenseApproved: true,
    });

    expect(evaluation.decision).toBe("approved-sandbox");
    expect(evaluation.licenseApproved).toBe(true);
  });

  it("blocks executable pack with forbidden capabilities or unapproved license", () => {
    const blockedCap = evaluateExecutablePackSafety({
      packId: "untrusted/checker",
      publisherIdentity: "Unknown Publisher",
      signature: "sig:valid-sig-123",
      isExecutable: true,
      requestedCapabilities: ["fs:write", "process:exec"],
      sandboxProfile: "strict",
      licenseApproved: true,
    });

    expect(blockedCap.decision).toBe("blocked");
    expect(blockedCap.sandboxCompliant).toBe(false);

    const blockedLicense = evaluateExecutablePackSafety({
      packId: "untrusted/checker-2",
      publisherIdentity: "Unknown Publisher",
      signature: "sig:valid-sig-123",
      isExecutable: true,
      requestedCapabilities: [],
      sandboxProfile: "strict",
      licenseApproved: false,
    });

    expect(blockedLicense.decision).toBe("blocked");
    expect(blockedLicense.licenseApproved).toBe(false);
  });

  it("approves executable pack when publisher is signed, sandbox compliant, and license approved", () => {
    const trustRoots = [{ id: "trustroot-001", status: "active" }];

    const evaluation = evaluateExecutablePackSafety(
      {
        packId: "org-acme/linter-plugin",
        publisherIdentity: "Acme Corp",
        signature: "sig:acme-sig",
        trustRootId: "trustroot-001",
        isExecutable: true,
        requestedCapabilities: ["read:workspace"],
        sandboxProfile: "workspace-read",
        licenseApproved: true,
      },
      trustRoots,
    );

    expect(evaluation.decision).toBe("approved-sandbox");
    expect(evaluation.publisherSigned).toBe(true);
    expect(evaluation.sandboxCompliant).toBe(true);

    const validated =
      validateQualityExecutableMarketplaceEvaluation(evaluation);
    expect(validated.packId).toBe("org-acme/linter-plugin");
  });

  it("validates executable pack safety options schema boundary", () => {
    const options = validateQualityExecutablePackSafetyOptions({
      packId: "test/pack",
      publisherIdentity: "Test Publisher",
      signature: "sig:123",
      isExecutable: false,
      requestedCapabilities: ["cap-1"],
      sandboxProfile: "strict",
      licenseApproved: true,
    });

    expect(options.packId).toBe("test/pack");

    expect(() =>
      validateQualityExecutablePackSafetyOptions({
        packId: "test/pack",
        publisherIdentity: "Test Publisher",
        signature: "sig:123",
        isExecutable: "not-a-boolean",
        requestedCapabilities: [],
        sandboxProfile: "strict",
        licenseApproved: true,
      }),
    ).toThrow(/executablePackSafetyOptions.isExecutable/i);
  });
});
