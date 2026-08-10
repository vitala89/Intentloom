import { describe, expect, it } from "vitest";
import {
  evaluateSpecializedPackCompatibility,
  evaluateSpecializedPackTrustState,
  registerSpecializedPackManifest,
} from "@intentloom/application";
import {
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackManifest,
  validateQualitySpecializedPackTrustState,
} from "@intentloom/validator";

describe("Specialized Engineering Packs Phase S2: Pack Manifests and Trust States", () => {
  it("registers specialized pack manifests with target disciplines and required tooling", () => {
    const embeddedPack = registerSpecializedPackManifest({
      id: "pack-embedded-firmware",
      version: "1.0.0",
      name: "Embedded Firmware & RTOS Pack",
      publisher: "Intentloom First-Party",
      targetDisciplineIds: ["discipline-embedded-iot"],
      providedArchitectureStrategies: [
        "hal-application-services",
        "rtos-event-loop",
      ],
      providedRuleIds: [
        "EMB-001-unsafe-hal-review",
        "EMB-002-interrupt-latency-budget",
      ],
      requiredTooling: ["arm-none-eabi-gcc", "cargo-embed"],
      permissionsRequired: ["local-hardware-device-read"],
    });

    expect(embeddedPack.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    );
    expect(embeddedPack.id).toBe("pack-embedded-firmware");
    expect(embeddedPack.requiredTooling).toContain("cargo-embed");

    const validated = validateQualitySpecializedPackManifest(embeddedPack);
    expect(validated.id).toBe(embeddedPack.id);
  });

  it("evaluates trust states with verified levels and revocation metadata", () => {
    const trustState = evaluateSpecializedPackTrustState({
      packId: "pack-embedded-firmware",
      trustLevel: "verified-first-party",
      verifiedBy: "intentloom-security-team",
      verifiedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(trustState.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
    );
    expect(trustState.trustLevel).toBe("verified-first-party");
    expect(trustState.verifiedBy).toBe("intentloom-security-team");

    const validated = validateQualitySpecializedPackTrustState(trustState);
    expect(validated.packId).toBe(trustState.packId);
  });

  it("evaluates pack compatibility and enforces fail-closed rejection on quarantine, missing dependencies, or conflicts", () => {
    const mainPack = registerSpecializedPackManifest({
      id: "pack-cloud-aws",
      version: "1.0.0",
      name: "AWS Cloud Engineering",
      publisher: "Intentloom First-Party",
      targetDisciplineIds: ["discipline-devops-sre"],
      dependencies: ["pack-terraform-base"],
    });

    const basePack = registerSpecializedPackManifest({
      id: "pack-terraform-base",
      version: "1.0.0",
      name: "Terraform Base IaC",
      publisher: "Intentloom First-Party",
      targetDisciplineIds: ["discipline-devops-sre"],
    });

    const quarantinedPack = registerSpecializedPackManifest({
      id: "pack-malicious-external",
      version: "0.1.0",
      name: "Malicious Pack",
      publisher: "Untrusted Vendor",
    });

    const conflictingPack = registerSpecializedPackManifest({
      id: "pack-cloud-gcp",
      version: "1.0.0",
      name: "GCP Cloud Engineering",
      publisher: "Intentloom First-Party",
      conflicts: ["pack-cloud-aws"],
    });

    const trustStates = [
      evaluateSpecializedPackTrustState({
        packId: "pack-cloud-aws",
        trustLevel: "verified-first-party",
      }),
      evaluateSpecializedPackTrustState({
        packId: "pack-terraform-base",
        trustLevel: "verified-first-party",
      }),
      evaluateSpecializedPackTrustState({
        packId: "pack-malicious-external",
        trustLevel: "quarantined",
        revocationReason: "Known malicious payload pattern detected",
      }),
      evaluateSpecializedPackTrustState({
        packId: "pack-cloud-gcp",
        trustLevel: "untrusted-external",
      }),
    ];

    const evaluation = evaluateSpecializedPackCompatibility(
      [mainPack, basePack, quarantinedPack, conflictingPack],
      trustStates,
    );

    const compatibleIds = evaluation.compatiblePacks.map((p) => p.id);
    expect(compatibleIds).toContain("pack-cloud-aws");
    expect(compatibleIds).toContain("pack-terraform-base");
    expect(compatibleIds).not.toContain("pack-malicious-external");
    expect(compatibleIds).not.toContain("pack-cloud-gcp");

    const rejectedReasons = evaluation.rejectedPacks.map((r) => r.reason);
    expect(rejectedReasons.some((r) => r.includes("quarantined"))).toBe(true);
    expect(rejectedReasons.some((r) => r.includes("Conflicting pack"))).toBe(
      true,
    );
  });

  it("validates pack manifest and trust state schema boundaries", () => {
    expect(() =>
      validateQualitySpecializedPackManifest({
        schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
        id: "pack-invalid",
        version: "1.0.0",
        name: "Invalid",
        publisher: "Vendor",
        targetDisciplineIds: "not-an-array",
      }),
    ).toThrow(/specializedPackManifest.targetDisciplineIds/i);

    expect(() =>
      validateQualitySpecializedPackTrustState({
        schemaVersion: QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
        packId: "pack-invalid",
        trustLevel: "unknown-level-value",
        verifiedAt: "2026-08-10T12:00:00.000Z",
      }),
    ).toThrow(/specializedPackTrustState.trustLevel/i);
  });
});
