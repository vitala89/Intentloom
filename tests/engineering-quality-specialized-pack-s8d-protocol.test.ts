import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  ProtocolValidationError,
  SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
  SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
  createSpecializedPacksExternalActivateRequest,
  createSpecializedPacksExternalPreviewRequest,
  parseDaemonRequest,
} from "@intentloom/protocol";
import { computeExternalSpecializedPackDigest } from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";

function manifest(): QualitySpecializedPackManifest {
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-reviewed-org-mlops",
    version: "1.0.0",
    name: "Reviewed Org MLOps Pack",
    publisher: "Example Org",
    targetDisciplineIds: ["discipline-ml-ai"],
    providedArchitectureStrategies: ["batch-inference"],
    providedRuleIds: ["MLOPS-001-dataset-pin"],
    requiredTooling: [],
    permissionsRequired: ["project.files.read"],
    conflicts: [],
    dependencies: [],
  };
}

function sourceFor(item: QualitySpecializedPackManifest) {
  return {
    kind: "local" as const,
    locator: "./packs/mlops.json",
    pin: "local-v1",
    digest: computeExternalSpecializedPackDigest(item),
  };
}

describe("specialized pack external daemon protocol", () => {
  it("parses preview and activate requests with strict fields", () => {
    const item = manifest();
    const source = sourceFor(item);
    const preview = createSpecializedPacksExternalPreviewRequest(
      1,
      "/workspace/project",
      {
        payload: JSON.stringify(item),
        source,
        declaredPublisher: item.publisher,
        declaredLicense: "MIT",
      },
    );
    expect(preview.method).toBe(SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD);
    const parsedPreview = parseDaemonRequest(
      JSON.parse(JSON.stringify(preview)),
    );
    expect(parsedPreview.method).toBe(
      SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
    );

    const activate = createSpecializedPacksExternalActivateRequest(
      2,
      "/workspace/project",
      {
        payload: JSON.stringify(item),
        source,
        declaredPublisher: item.publisher,
        declaredLicense: "MIT",
        approval: {
          schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
          decision: "approve",
          reviewerId: "reviewer-ada",
          source,
        },
      },
    );
    expect(activate.method).toBe(SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD);
    const parsedActivate = parseDaemonRequest(
      JSON.parse(JSON.stringify(activate)),
    );
    expect(parsedActivate.method).toBe(
      SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
    );
  });

  it("rejects unknown fields and missing approval", () => {
    const item = manifest();
    const source = sourceFor(item);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
        params: {
          protocolVersion: PROTOCOL_VERSION,
          root: "/workspace/project",
          payload: JSON.stringify(item),
          source,
          declaredPublisher: item.publisher,
          declaredLicense: "MIT",
          unexpected: true,
        },
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
        params: {
          protocolVersion: PROTOCOL_VERSION,
          root: "/workspace/project",
          payload: JSON.stringify(item),
          source,
          declaredPublisher: item.publisher,
          declaredLicense: "MIT",
        },
      }),
    ).toThrow(ProtocolValidationError);
  });
});
