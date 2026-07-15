import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  type ArtifactValidator,
} from "@intentloom/validator";

let validator: ArtifactValidator;
beforeAll(async () => {
  validator = await createArtifactValidator(resolve("catalog/schemas"), {
    knownProfiles: ["generic"],
    knownWorkflows: ["feature-delivery"],
    supportedAdapters: ["codex"],
  });
});

const brief = {
  schemaVersion: "1",
  id: "F-1",
  title: "Feature",
  status: "done",
  priority: "high",
  effort: "m",
  risk: "medium",
  impact: "Safety",
  ownerMode: "team",
  problem: "Gap",
  userValue: "Clarity",
  goal: "Validate",
  scope: [],
  outOfScope: [],
  acceptanceCriteria: ["passes"],
  architectureBoundaries: [],
  reuseCandidates: [],
  contextPack: "plans/F-1-context.json",
  allowedFiles: [],
  forbiddenFiles: [],
  edgeCases: [],
  verification: ["test"],
  liveVerification: false,
  technicalDebtDecision: "none",
  stopCondition: "done",
};
const debt = {
  schemaVersion: "1",
  id: "TD-1",
  status: "active",
  severity: "medium",
  area: "validation",
  description: "Gap",
  reasonAccepted: "Schedule",
  workaround: "Manual",
  doNot: "Bypass",
  risk: "Invalid data",
  resolutionTrigger: "Release",
  relatedFeature: "F-1",
  relatedFiles: ["packages/validator/src/index.ts"],
};

function validate(
  artifactType: "aif-config" | "feature-brief" | "technical-debt",
  document: unknown,
  semanticContext?: Parameters<
    ArtifactValidator["validate"]
  >[0]["semanticContext"],
) {
  return validator.validate({
    artifactType,
    documentPath: `plans/${artifactType}.json`,
    format: "json",
    source: JSON.stringify(document),
    ...(semanticContext ? { semanticContext } : {}),
  });
}

describe("semantic validation boundaries", () => {
  it("rejects an unavailable profile", () =>
    expect(
      validate("aif-config", {
        schemaVersion: "1",
        profile: "missing",
        adapters: ["codex"],
      }).semanticErrors[0]?.code,
    ).toBe("profile-unsupported"));
  it("rejects an unavailable workflow", () =>
    expect(
      validate("aif-config", {
        schemaVersion: "1",
        profile: "generic",
        adapters: ["codex"],
        workflows: ["missing"],
      }).semanticErrors[0]?.code,
    ).toBe("workflow-unsupported"));
  it("rejects an invalid lifecycle transition", () =>
    expect(
      validate("feature-brief", brief, {
        previousDocument: { status: "draft" },
      }).semanticErrors[0]?.code,
    ).toBe("lifecycle-transition-invalid"));
  it("rejects a missing context-pack reference", () =>
    expect(
      validate("feature-brief", brief, { knownDocumentPaths: [] })
        .semanticErrors[0]?.code,
    ).toBe("feature-reference-missing"));
  it("rejects a missing related feature", () =>
    expect(
      validate("technical-debt", debt, { knownFeatureIds: [] })
        .semanticErrors[0]?.code,
    ).toBe("feature-reference-missing"));
  it("rejects a missing related project file", () =>
    expect(
      validate("technical-debt", debt, { knownProjectPaths: [] })
        .semanticErrors[0]?.code,
    ).toBe("related-file-missing"));
});
