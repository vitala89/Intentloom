import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createArtifactValidator } from "@aif/validator";

const schemaRoot = resolve("catalog/schemas");

describe("schema-driven artifact validation", () => {
  it("validates config through the versioned schema and rejects unknown fields", async () => {
    const validator = await createArtifactValidator(schemaRoot);
    const valid = validator.validate({
      artifactType: "aif-config",
      documentPath: ".aif/config.yaml",
      format: "yaml",
      source: "schemaVersion: '1'\nprofile: generic\nadapters: [codex]\n",
    });
    expect(valid).toMatchObject({
      status: "valid",
      artifactType: "aif-config",
      schemaVersion: "1",
      documentPath: ".aif/config.yaml",
      structuralErrors: [],
    });

    const invalid = validator.validate({
      artifactType: "aif-config",
      documentPath: ".aif/config.yaml",
      format: "yaml",
      source:
        "schemaVersion: '1'\nprofile: generic\nadapters: [codex]\napiToken: private-value\n",
    });
    expect(invalid.status).toBe("invalid");
    expect(invalid.structuralErrors).toEqual([
      expect.objectContaining({
        code: "schema-unknown-property",
        fieldPath: "/apiToken",
      }),
    ]);
    expect(JSON.stringify(invalid)).not.toContain("private-value");
  });

  it("validates manifest structure before checksum semantics", async () => {
    const validator = await createArtifactValidator(schemaRoot);
    const manifest = {
      schemaVersion: "1",
      lockVersion: "1",
      metadataFormatVersion: "1",
      frameworkVersion: "0.1.0-alpha.0",
      adapterOutputVersion: "0.1.0",
      adapterId: "aif:generated-files",
      canonicalSourceId: "a".repeat(64),
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
      sourceHashes: [{ id: "policies/core.md", checksum: "c".repeat(64) }],
      generated: [{ path: "AGENTS.md", checksum: "b".repeat(64) }],
    };
    expect(
      validator.validate({
        artifactType: "manifest-lock",
        documentPath: ".aif/manifest.lock.json",
        format: "json",
        source: JSON.stringify(manifest),
      }).status,
    ).toBe("valid");
    manifest.generated[0]!.checksum = "not-a-checksum";
    expect(
      validator.validate({
        artifactType: "manifest-lock",
        documentPath: ".aif/manifest.lock.json",
        format: "json",
        source: JSON.stringify(manifest),
      }).structuralErrors[0]?.fieldPath,
    ).toBe("/generated/0/checksum");
  });
});
