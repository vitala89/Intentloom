import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  type ArtifactType,
  type ArtifactValidator,
} from "@intentloom/validator";

let validator: ArtifactValidator;
beforeAll(async () => {
  validator = await createArtifactValidator(resolve("catalog/schemas"));
});

function result(artifactType: ArtifactType, document: unknown) {
  return validator.validate({
    artifactType,
    documentPath: `artifacts/${artifactType}.json`,
    format: "json",
    source: JSON.stringify(document),
  });
}

const checksum = "a".repeat(64);
const metadata = {
  schemaVersion: "1",
  metadataFormatVersion: "1",
  frameworkVersion: "0.1.0-alpha.0",
  adapterOutputVersion: "0.1.0",
  adapterId: "aif:generated-files",
  canonicalSourceId: "b".repeat(64),
};

describe("config schema cases", () => {
  const minimal = {
    schemaVersion: "1",
    profile: "generic",
    adapters: ["codex"],
  };
  const full = {
    ...minimal,
    frameworkCompatibility: {
      minimum: "0.1.0-alpha.0",
      maximumExclusive: "0.2.0",
    },
    workflows: ["feature-delivery"],
    generatedOutputPolicy: { mode: "confirm", backup: true },
    projectOwnedMappings: [
      { source: "docs/source.md", destination: "README.md" },
    ],
    documentationMappings: [{ source: "docs/a.md", destination: "docs/b.md" }],
    localOverrides: [".aif/local.yaml"],
  };
  it.each([
    ["minimal valid config", minimal, "valid"],
    ["full valid config", full, "valid"],
    [
      "missing schema version",
      { ...minimal, schemaVersion: undefined },
      "invalid",
    ],
    [
      "unsupported schema version",
      { ...minimal, schemaVersion: "2" },
      "invalid",
    ],
    ["wrong profile type", { ...minimal, profile: 3 }, "invalid"],
    ["invalid adapter enum", { ...minimal, adapters: ["unknown"] }, "invalid"],
    [
      "duplicate adapter",
      { ...minimal, adapters: ["codex", "codex"] },
      "invalid",
    ],
    ["unknown security property", { ...minimal, hook: "run-me" }, "invalid"],
    [
      "secret-like unsupported field",
      { ...minimal, apiToken: "private" },
      "invalid",
    ],
    [
      "invalid output destination",
      {
        ...minimal,
        projectOwnedMappings: [{ source: "docs/a", destination: "../escape" }],
      },
      "invalid",
    ],
    [
      "invalid local override",
      { ...minimal, localOverrides: ["/tmp/local.yaml"] },
      "invalid",
    ],
  ] as const)("%s", (_name, document, status) => {
    expect(result("aif-config", document).status).toBe(status);
  });
});

describe("manifest schema cases", () => {
  const minimal = {
    ...metadata,
    lockVersion: "1",
    ownershipPolicy: "aif-owned-generated",
    profile: "generic",
    schemaVersions: {
      config: "1",
      manifestLock: "1",
      sourceMap: "1",
      planning: "1",
      agentSkillPolicy: "1",
    },
    adapters: [{ id: "codex", version: "0.1.0" }],
    sourceHashes: [{ id: "policies/core.md", checksum }],
    generated: [],
  };
  const entry = { path: "AGENTS.md", checksum };
  it.each([
    ["minimal valid manifest", minimal, "valid"],
    [
      "multiple valid entries",
      { ...minimal, generated: [entry, { path: "docs/a.md", checksum }] },
      "valid",
    ],
    [
      "missing framework version",
      { ...minimal, frameworkVersion: undefined },
      "invalid",
    ],
    [
      "missing adapter output version",
      { ...minimal, adapterOutputVersion: undefined },
      "invalid",
    ],
    [
      "invalid checksum",
      { ...minimal, generated: [{ ...entry, checksum: "bad" }] },
      "invalid",
    ],
    [
      "invalid ownership",
      { ...minimal, ownershipPolicy: "claimed" },
      "invalid",
    ],
    [
      "absolute path",
      { ...minimal, generated: [{ ...entry, path: "/tmp/x" }] },
      "invalid",
    ],
    [
      "malformed destination",
      { ...minimal, generated: [{ ...entry, path: "a/../x" }] },
      "invalid",
    ],
    ["unknown property", { ...minimal, timestamp: "identity" }, "invalid"],
    ["unsupported schema", { ...minimal, schemaVersion: "2" }, "invalid"],
  ] as const)("%s", (_name, document, status) => {
    expect(result("manifest-lock", document).status).toBe(status);
  });
  it("duplicate destination is a semantic error", () => {
    expect(
      result("manifest-lock", { ...minimal, generated: [entry, entry] })
        .semanticErrors[0]?.code,
    ).toBe("metadata-duplicate-destination");
  });
  it.each([
    [
      "adapter",
      {
        ...minimal,
        adapters: [minimal.adapters[0], { id: "codex", version: "9.0.0" }],
      },
      "manifest-duplicate-adapter",
    ],
    [
      "source",
      {
        ...minimal,
        sourceHashes: [
          minimal.sourceHashes[0],
          { id: "policies/core.md", checksum: "d".repeat(64) },
        ],
      },
      "manifest-duplicate-source",
    ],
  ])("rejects a duplicate %s pin", (_name, document, code) => {
    expect(result("manifest-lock", document).semanticErrors[0]?.code).toBe(
      code,
    );
  });
});

describe("source-map schema cases", () => {
  const record = {
    path: "AGENTS.md",
    checksum,
    sources: ["policies/core.md"],
    ownership: "aif-owned-generated",
  };
  const minimal = { ...metadata, files: [] };
  it.each([
    ["minimal valid source map", minimal, "valid"],
    [
      "multiple valid records",
      { ...minimal, files: [record, { ...record, path: "README.md" }] },
      "valid",
    ],
    [
      "missing canonical source",
      { ...minimal, canonicalSourceId: undefined },
      "invalid",
    ],
    ["missing adapter", { ...minimal, adapterId: undefined }, "invalid"],
    [
      "missing checksum",
      { ...minimal, files: [{ ...record, checksum: undefined }] },
      "invalid",
    ],
    [
      "invalid ownership",
      { ...minimal, files: [{ ...record, ownership: "claimed" }] },
      "invalid",
    ],
    [
      "malformed path",
      { ...minimal, files: [{ ...record, path: "../x" }] },
      "invalid",
    ],
    [
      "unknown property",
      { ...minimal, files: [{ ...record, extra: true }] },
      "invalid",
    ],
    ["unsupported schema", { ...minimal, schemaVersion: "9" }, "invalid"],
  ] as const)("%s", (_name, document, status) => {
    expect(result("source-map", document).status).toBe(status);
  });
  it("duplicate destination is a semantic error", () => {
    expect(
      result("source-map", { ...minimal, files: [record, record] })
        .semanticErrors[0]?.code,
    ).toBe("metadata-duplicate-destination");
  });
});

const brief = {
  schemaVersion: "1",
  id: "F-1",
  title: "Feature",
  status: "draft",
  priority: "high",
  effort: "m",
  risk: "medium",
  impact: "Improves safety",
  ownerMode: "team",
  problem: "Invalid documents pass",
  userValue: "Clear failures",
  goal: "Validate",
  scope: ["schemas"],
  outOfScope: ["network"],
  acceptanceCriteria: ["invalid input fails"],
  architectureBoundaries: ["local only"],
  reuseCandidates: ["validator"],
  contextPack: "plans/F-1-context.json",
  allowedFiles: ["packages/validator/src/index.ts"],
  forbiddenFiles: [".env"],
  edgeCases: ["malformed input"],
  verification: ["pnpm test"],
  liveVerification: false,
  technicalDebtDecision: "none",
  stopCondition: "All checks pass",
};

describe("feature brief schema cases", () => {
  it.each([
    ["minimal valid brief", brief, "valid"],
    [
      "full valid extension",
      { ...brief, extensions: { team: "core" } },
      "valid",
    ],
    ["missing id", { ...brief, id: undefined }, "invalid"],
    ["invalid status", { ...brief, status: "maybe" }, "invalid"],
    ["invalid priority", { ...brief, priority: "urgent" }, "invalid"],
    ["invalid effort", { ...brief, effort: 4 }, "invalid"],
    ["invalid risk", { ...brief, risk: "unknown" }, "invalid"],
    [
      "empty acceptance criteria",
      { ...brief, acceptanceCriteria: [] },
      "invalid",
    ],
    [
      "malformed allowed path",
      { ...brief, allowedFiles: ["../outside"] },
      "invalid",
    ],
    [
      "missing stop condition",
      { ...brief, stopCondition: undefined },
      "invalid",
    ],
    ["misspelled core field", { ...brief, priorty: "high" }, "invalid"],
  ] as const)("%s", (_name, document, status) =>
    expect(result("feature-brief", document).status).toBe(status),
  );
});

const contextPack = {
  schemaVersion: "1",
  taskId: "F-1",
  mustRead: ["docs/spec.md"],
  readIfNeeded: [],
  excluded: [],
  forbiddenToChange: [".env"],
  relevantSourceAreas: ["packages/validator"],
  contextMode: "minimal",
  expansionReasons: [],
  fileBudget: 12,
};
describe("context pack schema cases", () => {
  it.each([
    ["minimal valid context pack", contextPack, "valid"],
    [
      "full valid context pack",
      {
        ...contextPack,
        contextMode: "expanded",
        expansionReasons: ["cross-package contract"],
        extensions: { note: true },
      },
      "valid",
    ],
    ["missing task id", { ...contextPack, taskId: undefined }, "invalid"],
    ["invalid mode", { ...contextPack, contextMode: "all" }, "invalid"],
    [
      "must-read wrong type",
      { ...contextPack, mustRead: "docs/spec.md" },
      "invalid",
    ],
    [
      "missing forbidden list",
      { ...contextPack, forbiddenToChange: undefined },
      "invalid",
    ],
    [
      "invalid expansion reason",
      { ...contextPack, expansionReasons: [""] },
      "invalid",
    ],
    ["invalid file budget", { ...contextPack, fileBudget: 0 }, "invalid"],
  ] as const)("%s", (_name, document, status) =>
    expect(result("context-pack", document).status).toBe(status),
  );
  it("same file in must-read and excluded is semantic", () =>
    expect(
      result("context-pack", { ...contextPack, excluded: ["docs/spec.md"] })
        .semanticErrors[0]?.code,
    ).toBe("context-path-set-overlap"));
});

const changeRequest = {
  schemaVersion: "1",
  changeId: "C-1",
  relatedFeature: "F-1",
  originalSpecification: "plans/F-1.json",
  requestedChange: "Add field",
  reason: "Needed",
  scopeImpact: "Small",
  architectureImpact: "None",
  dataMigrationImpact: "None",
  testImpact: "Add cases",
  acceptanceCriteriaChanges: [],
  decision: "pending",
};
describe("change request schema cases", () => {
  it.each([
    ["minimal valid request", changeRequest, "valid"],
    [
      "accepted request",
      { ...changeRequest, decision: "accepted", decisionDate: "2026-07-13" },
      "valid",
    ],
    [
      "deferred request",
      { ...changeRequest, decision: "deferred", decisionDate: "2026-07-13" },
      "valid",
    ],
    [
      "rejected request",
      { ...changeRequest, decision: "rejected", decisionDate: "2026-07-13" },
      "valid",
    ],
    [
      "missing original specification",
      { ...changeRequest, originalSpecification: undefined },
      "invalid",
    ],
    ["invalid decision", { ...changeRequest, decision: "maybe" }, "invalid"],
    ["malformed impact", { ...changeRequest, scopeImpact: [] }, "invalid"],
    [
      "invalid related feature",
      { ...changeRequest, relatedFeature: "bad id space" },
      "invalid",
    ],
  ] as const)("%s", (_name, document, status) =>
    expect(result("change-request", document).status).toBe(status),
  );
});

const debt = {
  schemaVersion: "1",
  id: "TD-1",
  status: "active",
  severity: "medium",
  area: "validation",
  description: "Gap",
  reasonAccepted: "Schedule",
  workaround: "Manual check",
  doNot: "Do not bypass",
  risk: "Invalid data",
  resolutionTrigger: "Before release",
  relatedFeature: "F-1",
  relatedFiles: ["packages/validator/src/index.ts"],
};
describe("technical debt schema cases", () => {
  it.each([
    ["minimal valid entry", debt, "valid"],
    ["full valid entry", { ...debt, extensions: { owner: "core" } }, "valid"],
    ["invalid severity", { ...debt, severity: "urgent" }, "invalid"],
    ["invalid status", { ...debt, status: "ignored" }, "invalid"],
    ["missing workaround", { ...debt, workaround: undefined }, "invalid"],
    [
      "missing resolution trigger",
      { ...debt, resolutionTrigger: undefined },
      "invalid",
    ],
    [
      "invalid related path",
      { ...debt, relatedFiles: ["/tmp/file"] },
      "invalid",
    ],
    ["unknown core field", { ...debt, workaroundz: "x" }, "invalid"],
  ] as const)("%s", (_name, document, status) =>
    expect(result("technical-debt", document).status).toBe(status),
  );
});
