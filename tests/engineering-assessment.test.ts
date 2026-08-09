import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_ENVELOPE_SCHEMA_URN,
  ASSESSMENT_REPORT_SCHEMA_URN,
  type ArchitectureAssessmentResult,
  type AssessmentEnvelope,
  type AssessmentEvidenceReference,
  type AssessmentFindingProjection,
  type AssessmentReportModel,
  type TechnicalDebtMap,
} from "../packages/protocol/src/engineering-assessment.js";
import {
  validateArchitectureAssessmentResult,
  validateAssessmentEnvelope,
  validateAssessmentEvidenceReference,
  validateAssessmentFindingProjection,
  validateAssessmentReportModel,
  validateTechnicalDebtMap,
} from "../packages/validator/src/engineering-assessment.js";

describe("Engineering Assessment Envelope Protocol & Validator", () => {
  const validEvidenceRef: AssessmentEvidenceReference = {
    id: "ev-001",
    kind: "deterministic-tool",
    status: "valid",
    quality: "complete",
    sourceId: "tsc-check",
    toolName: "tsc",
    toolVersion: "5.8.2",
    configDigest: "sha256:111222",
    description: "TypeScript compilation diagnostics",
    path: "packages/core/src/index.ts",
    lineRange: { start: 1, end: 120 },
  };

  const validFindingProjection: AssessmentFindingProjection = {
    id: "fp-001",
    sourceFindingRef: "doctor-001",
    category: "architecture",
    scope: "packages/application",
    evidenceReferences: ["ev-001"],
    ruleReference: "rule-arch-001",
    severity: "error",
    confidence: "high",
    evidenceQuality: "complete",
    impactSummary: "Unapproved dependency direction from Core to Application",
    recommendationReferences: ["rec-001"],
    provenanceClassification: "deterministic-rule",
  };

  const validArchitectureResult: ArchitectureAssessmentResult = {
    packages: ["packages/core", "packages/application", "packages/protocol"],
    dependencyEdges: [
      {
        from: "packages/application",
        to: "packages/protocol",
        isBoundaryViolation: false,
      },
      {
        from: "packages/core",
        to: "packages/application",
        isBoundaryViolation: true,
      },
    ],
    dependencyCycles: [["packages/core", "packages/application"]],
    driftDiagnostics: [
      "Dependency cycle detected between core and application",
    ],
  };

  const validTechnicalDebtMap: TechnicalDebtMap = {
    items: [
      {
        id: "td-001",
        findingProjectionId: "fp-001",
        category: "architecture",
        affectedScopes: ["packages/core"],
        estimatedRemediationComplexity: "medium",
        prerequisites: [],
        recommendedOrder: 1,
      },
    ],
  };

  const validEnvelope: AssessmentEnvelope = {
    identity: {
      id: "assess-001",
      schemaVersion: ASSESSMENT_ENVELOPE_SCHEMA_URN,
    },
    scope: {
      root: "/projects/intentloom",
      projectId: "intentloom-core",
      projectDigest: "sha256:abc123def456",
    },
    status: "completed",
    timestamp: 1770000000000,
    modules: ["architecture", "quality", "conformance", "technical-debt"],
    findingReferences: ["find-01", "find-02"],
    insufficientEvidenceAreas: ["remote-ci-metrics"],
    evidenceReferences: [validEvidenceRef],
    findingProjections: [validFindingProjection],
    architectureResult: validArchitectureResult,
    technicalDebtMap: validTechnicalDebtMap,
    provenance: {
      toolName: "intentloom",
      toolVersion: "1.0.2",
      executionTimeMs: 145,
    },
  };

  const validReportModel: AssessmentReportModel = {
    schemaVersion: ASSESSMENT_REPORT_SCHEMA_URN,
    envelope: validEnvelope,
    technicalDebtMap: validTechnicalDebtMap,
    summary: "Project shows architectural boundary violation in Core.",
    unsupportedAreas: ["remote-ci-metrics"],
  };

  it("validates a complete AssessmentReportModel", () => {
    const validated = validateAssessmentReportModel(validReportModel);
    expect(validated).toEqual(validReportModel);
  });

  it("validates individual TechnicalDebtMap objects", () => {
    const validated = validateTechnicalDebtMap(validTechnicalDebtMap);
    expect(validated).toEqual(validTechnicalDebtMap);
  });

  it("rejects invalid category or complexity in technical debt items", () => {
    expect(() =>
      validateTechnicalDebtMap({
        items: [
          {
            id: "td-001",
            findingProjectionId: "fp-001",
            category: "unknown-category",
            affectedScopes: [],
            estimatedRemediationComplexity: "medium",
            prerequisites: [],
            recommendedOrder: 1,
          },
        ],
      }),
    ).toThrow(
      "technicalDebtItem.category must be a valid TechnicalDebtCategory",
    );

    expect(() =>
      validateTechnicalDebtMap({
        items: [
          {
            id: "td-001",
            findingProjectionId: "fp-001",
            category: "architecture",
            affectedScopes: [],
            estimatedRemediationComplexity: "extreme",
            prerequisites: [],
            recommendedOrder: 1,
          },
        ],
      }),
    ).toThrow(
      "technicalDebtItem.estimatedRemediationComplexity must be low, medium, or high",
    );
  });

  it("rejects invalid report schemaVersion", () => {
    expect(() =>
      validateAssessmentReportModel({
        ...validReportModel,
        schemaVersion: "urn:intentloom:schema:assessment-report:999",
      }),
    ).toThrow(`schemaVersion must equal ${ASSESSMENT_REPORT_SCHEMA_URN}`);
  });

  it("validates a complete AssessmentEnvelope with finding projections and architecture result", () => {
    const validated = validateAssessmentEnvelope(validEnvelope);
    expect(validated).toEqual(validEnvelope);
  });

  it("validates individual AssessmentFindingProjection objects", () => {
    const validated = validateAssessmentFindingProjection(
      validFindingProjection,
    );
    expect(validated).toEqual(validFindingProjection);
  });

  it("validates individual ArchitectureAssessmentResult objects", () => {
    const validated = validateArchitectureAssessmentResult(
      validArchitectureResult,
    );
    expect(validated).toEqual(validArchitectureResult);
  });

  it("rejects invalid severity/confidence/category in finding projections", () => {
    expect(() =>
      validateAssessmentFindingProjection({
        ...validFindingProjection,
        severity: "critical",
      }),
    ).toThrow(
      "findingProjection.severity must be a valid AssessmentFindingSeverity",
    );

    expect(() =>
      validateAssessmentFindingProjection({
        ...validFindingProjection,
        confidence: "unknown",
      }),
    ).toThrow(
      "findingProjection.confidence must be a valid AssessmentFindingConfidence",
    );

    expect(() =>
      validateAssessmentFindingProjection({
        ...validFindingProjection,
        category: "unknown",
      }),
    ).toThrow(
      "findingProjection.category must be a valid AssessmentFindingCategory",
    );
  });

  it("rejects invalid edge properties in architecture results", () => {
    expect(() =>
      validateArchitectureAssessmentResult({
        ...validArchitectureResult,
        dependencyEdges: [
          { from: "a", to: "b", isBoundaryViolation: "invalid" },
        ],
      }),
    ).toThrow("edge.isBoundaryViolation must be a boolean");
  });

  it("validates individual AssessmentEvidenceReference objects", () => {
    const validated = validateAssessmentEvidenceReference(validEvidenceRef);
    expect(validated).toEqual(validEvidenceRef);
  });

  it("accepts all valid AssessmentEvidenceKind values", () => {
    const kinds = [
      "deterministic-tool",
      "derived",
      "ai-assisted",
      "review-required",
      "insufficient",
    ] as const;
    for (const kind of kinds) {
      const ref = { ...validEvidenceRef, kind };
      expect(validateAssessmentEvidenceReference(ref).kind).toBe(kind);
    }
  });

  it("accepts all valid AssessmentEvidenceStatus values", () => {
    const statuses = [
      "valid",
      "stale",
      "partial",
      "conflicting",
      "malformed",
      "unsupported",
      "denied",
    ] as const;
    for (const status of statuses) {
      const ref = { ...validEvidenceRef, status };
      expect(validateAssessmentEvidenceReference(ref).status).toBe(status);
    }
  });

  it("accepts all valid AssessmentEvidenceQuality values", () => {
    const qualities = ["complete", "bounded", "unavailable"] as const;
    for (const quality of qualities) {
      const ref = { ...validEvidenceRef, quality };
      expect(validateAssessmentEvidenceReference(ref).quality).toBe(quality);
    }
  });

  it("rejects invalid evidence reference kind/status/quality", () => {
    expect(() =>
      validateAssessmentEvidenceReference({
        ...validEvidenceRef,
        kind: "unknown",
      }),
    ).toThrow("evidenceReference.kind must be a valid AssessmentEvidenceKind");

    expect(() =>
      validateAssessmentEvidenceReference({
        ...validEvidenceRef,
        status: "unknown",
      }),
    ).toThrow(
      "evidenceReference.status must be a valid AssessmentEvidenceStatus",
    );

    expect(() =>
      validateAssessmentEvidenceReference({
        ...validEvidenceRef,
        quality: "unknown",
      }),
    ).toThrow(
      "evidenceReference.quality must be a valid AssessmentEvidenceQuality",
    );
  });

  it("rejects invalid lineRange bounds in evidence reference", () => {
    expect(() =>
      validateAssessmentEvidenceReference({
        ...validEvidenceRef,
        lineRange: { start: 10, end: 5 },
      }),
    ).toThrow(
      "evidenceReference.lineRange must contain positive integer line numbers with start <= end",
    );
  });

  it("accepts valid status values (completed, partial, insufficient-evidence, failed)", () => {
    const statuses = [
      "completed",
      "partial",
      "insufficient-evidence",
      "failed",
    ] as const;
    for (const status of statuses) {
      const envelope = { ...validEnvelope, status };
      expect(validateAssessmentEnvelope(envelope).status).toBe(status);
    }
  });

  it("rejects non-object input", () => {
    expect(() => validateAssessmentEnvelope(null)).toThrow(
      "assessment envelope must be an object",
    );
    expect(() => validateAssessmentEnvelope("invalid")).toThrow(
      "assessment envelope must be an object",
    );
  });

  it("rejects invalid schema version in identity", () => {
    const invalid = {
      ...validEnvelope,
      identity: {
        id: "assess-001",
        schemaVersion: "urn:intentloom:schema:assessment-envelope:999",
      },
    };
    expect(() => validateAssessmentEnvelope(invalid)).toThrow(
      `identity.schemaVersion must equal ${ASSESSMENT_ENVELOPE_SCHEMA_URN}`,
    );
  });

  it("rejects empty identity id", () => {
    const invalid = {
      ...validEnvelope,
      identity: {
        id: "  ",
        schemaVersion: ASSESSMENT_ENVELOPE_SCHEMA_URN,
      },
    };
    expect(() => validateAssessmentEnvelope(invalid)).toThrow(
      "identity.id must be a non-empty string",
    );
  });

  it("rejects empty scope root or projectId", () => {
    const invalidRoot = {
      ...validEnvelope,
      scope: { ...validEnvelope.scope, root: "" },
    };
    expect(() => validateAssessmentEnvelope(invalidRoot)).toThrow(
      "scope.root must be a non-empty string",
    );

    const invalidProjectId = {
      ...validEnvelope,
      scope: { ...validEnvelope.scope, projectId: " " },
    };
    expect(() => validateAssessmentEnvelope(invalidProjectId)).toThrow(
      "scope.projectId must be a non-empty string",
    );
  });

  it("rejects invalid module names", () => {
    const invalidModule = {
      ...validEnvelope,
      modules: ["architecture", "unknown-module"],
    };
    expect(() => validateAssessmentEnvelope(invalidModule)).toThrow(
      "modules contains invalid assessment module: unknown-module",
    );
  });

  it("rejects invalid status strings", () => {
    const invalidStatus = {
      ...validEnvelope,
      status: "unknown-status",
    };
    expect(() => validateAssessmentEnvelope(invalidStatus)).toThrow(
      "status must be a valid AssessmentStatus",
    );
  });

  it("rejects non-positive timestamp", () => {
    const invalidTimestamp = {
      ...validEnvelope,
      timestamp: -100,
    };
    expect(() => validateAssessmentEnvelope(invalidTimestamp)).toThrow(
      "timestamp must be a positive timestamp number",
    );
  });

  it("rejects invalid provenance properties", () => {
    const invalidProvenance = {
      ...validEnvelope,
      provenance: {
        toolName: "",
        toolVersion: "1.0.0",
        executionTimeMs: 10,
      },
    };
    expect(() => validateAssessmentEnvelope(invalidProvenance)).toThrow(
      "provenance.toolName must be a non-empty string",
    );
  });
});
