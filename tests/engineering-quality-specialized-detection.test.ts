import { describe, expect, it } from "vitest";
import {
  detectSpecializedPacks,
  evaluateSpecializedPackTrustState,
  registerSpecializedPackDetectionRule,
  registerSpecializedPackManifest,
  resolveSpecializedPackDetection,
} from "@intentloom/application";
import {
  QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackDetectionResolution,
  validateQualitySpecializedPackDetectionResult,
  validateQualitySpecializedPackDetectionRule,
} from "@intentloom/validator";

describe("Specialized Engineering Packs Phase S4: Read-Only Detection and Compatibility Resolution", () => {
  const desktopPaths = [
    "apps/desktop/src-tauri/Cargo.toml",
    "apps/desktop/src-tauri/src/main.rs",
    "apps/desktop/src/App.tsx",
    "packages/core/src/index.ts",
  ];

  const desktopRule = registerSpecializedPackDetectionRule({
    packId: "pack-tauri-desktop",
    signals: [
      {
        pathPattern: "src-tauri/Cargo.toml",
        matchKind: "contains",
        label: "tauri-cargo-manifest",
      },
      {
        pathPattern: "apps/desktop/",
        matchKind: "contains",
        label: "desktop-app-root",
      },
    ],
    securityImpact: "review-required",
  });

  const embeddedRule = registerSpecializedPackDetectionRule({
    packId: "pack-embedded-firmware",
    signals: [
      {
        pathPattern: "Cargo.toml",
        matchKind: "suffix",
        label: "cargo-root",
      },
      {
        pathPattern: "linker/",
        matchKind: "contains",
        label: "linker-script",
      },
    ],
    minimumSignalMatches: 2,
  });

  it("registers detection rules and matches caller-supplied project paths read-only", () => {
    expect(desktopRule.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    );

    const detection = detectSpecializedPacks({
      projectPaths: desktopPaths,
      rules: [desktopRule, embeddedRule],
    });

    expect(detection.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
    );
    expect(detection.scannedPathCount).toBe(4);
    expect(detection.scanLimitReached).toBe(false);
    expect(detection.candidates).toHaveLength(1);
    expect(detection.candidates[0]?.packId).toBe("pack-tauri-desktop");
    expect(detection.candidates[0]?.evidencePaths).toContain(
      "apps/desktop/src-tauri/Cargo.toml",
    );
    expect(detection.candidates[0]?.confidence).toBe("high");
    expect(detection.candidates[0]?.requiresConfirmation).toBe(true);
    expect(detection.candidates[0]?.securityImpact).toBe("review-required");

    const validated = validateQualitySpecializedPackDetectionResult(detection);
    expect(validated.candidates[0]?.packId).toBe("pack-tauri-desktop");
  });

  it("enforces scan limits, ambiguity, and confirmation without enabling packs", () => {
    const overlappingRule = registerSpecializedPackDetectionRule({
      packId: "pack-desktop-alt",
      signals: [
        {
          pathPattern: "apps/desktop/",
          matchKind: "contains",
          label: "desktop-root-overlap",
        },
      ],
    });

    const limitedDetection = detectSpecializedPacks({
      projectPaths: desktopPaths,
      rules: [desktopRule, overlappingRule],
      maxPaths: 2,
    });

    expect(limitedDetection.scanLimitReached).toBe(true);
    expect(limitedDetection.excludedPathCount).toBe(2);

    const ambiguousDetection = detectSpecializedPacks({
      projectPaths: desktopPaths,
      rules: [desktopRule, overlappingRule],
    });

    expect(
      ambiguousDetection.candidates.some((candidate) => candidate.ambiguity),
    ).toBe(true);
    expect(
      ambiguousDetection.candidates.every(
        (candidate) => candidate.requiresConfirmation === true,
      ),
    ).toBe(true);
  });

  it("resolves detected packs through compatibility and trust-state boundaries", () => {
    const compatibleManifest = registerSpecializedPackManifest({
      id: "pack-tauri-desktop",
      version: "1.0.0",
      name: "Tauri Desktop Pack",
      publisher: "intentloom-first-party",
      targetDisciplineIds: ["discipline-desktop"],
    });

    const conflictingManifest = registerSpecializedPackManifest({
      id: "pack-desktop-alt",
      version: "1.0.0",
      name: "Alternate Desktop Pack",
      publisher: "intentloom-first-party",
      conflicts: ["pack-tauri-desktop"],
    });

    const quarantinedManifest = registerSpecializedPackManifest({
      id: "pack-quarantined",
      version: "1.0.0",
      name: "Quarantined Pack",
      publisher: "external",
    });

    const altRule = registerSpecializedPackDetectionRule({
      packId: "pack-desktop-alt",
      signals: [
        {
          pathPattern: "apps/desktop/",
          matchKind: "contains",
        },
      ],
    });

    const quarantinedRule = registerSpecializedPackDetectionRule({
      packId: "pack-quarantined",
      signals: [
        {
          pathPattern: "packages/core/",
          matchKind: "contains",
        },
      ],
    });

    const resolution = resolveSpecializedPackDetection({
      projectPaths: desktopPaths,
      rules: [desktopRule, altRule, quarantinedRule],
      manifests: [compatibleManifest, conflictingManifest, quarantinedManifest],
      trustStates: [
        evaluateSpecializedPackTrustState({
          packId: "pack-tauri-desktop",
          trustLevel: "verified-first-party",
        }),
        evaluateSpecializedPackTrustState({
          packId: "pack-desktop-alt",
          trustLevel: "verified-first-party",
        }),
        evaluateSpecializedPackTrustState({
          packId: "pack-quarantined",
          trustLevel: "quarantined",
          revocationReason: "integrity-check-failed",
        }),
      ],
    });

    expect(resolution.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
    );
    expect(resolution.compatiblePackIds).toEqual(["pack-tauri-desktop"]);
    expect(
      resolution.rejectedPacks.some(
        (entry) =>
          entry.packId === "pack-desktop-alt" &&
          entry.reason.includes("Conflicting pack"),
      ),
    ).toBe(true);
    expect(
      resolution.rejectedPacks.some(
        (entry) =>
          entry.packId === "pack-quarantined" &&
          entry.reason.includes("quarantined"),
      ),
    ).toBe(true);

    const validated =
      validateQualitySpecializedPackDetectionResolution(resolution);
    expect(validated.compatiblePackIds).toEqual(["pack-tauri-desktop"]);
  });

  it("validates detection rule and result schema boundaries", () => {
    expect(() =>
      validateQualitySpecializedPackDetectionRule({
        schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
        packId: "pack-invalid",
        signals: [],
      }),
    ).toThrow(/detectionRule.signals/i);

    expect(() =>
      validateQualitySpecializedPackDetectionResult({
        schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
        scannedPathCount: 1,
        excludedPathCount: 0,
        scanLimitReached: false,
        candidates: [
          {
            packId: "pack-tauri-desktop",
            evidencePaths: ["apps/desktop/src/App.tsx"],
            matchedSignalLabels: ["desktop-app-root"],
            confidence: "high",
            ambiguity: false,
            securityImpact: "none",
            requiresConfirmation: false,
          },
        ],
      }),
    ).toThrow(/requiresConfirmation must be true/i);
  });
});
