import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  validateExtensionCapabilityGrant,
  validateExtensionManifestDocument,
  validateExtensionLockDocument,
} from "@intentloom/validator";

const schemaRoot = resolve("catalog/schemas");

describe("extension-manifest and extension-lock JSON schemas", () => {
  it("compiles extension-manifest and extension-lock schemas in the catalog", async () => {
    const validator = await createArtifactValidator(schemaRoot);
    expect(validator).toBeDefined();
  });

  it("validates valid extension manifest JSON sample through ArtifactValidator", async () => {
    const validator = await createArtifactValidator(schemaRoot);

    const validSample = {
      $schema: "urn:aif:schema:extension-manifest:1",
      extensionId: "ext:org/graphify-provider",
      name: "Graphify Code-Graph Provider",
      category: "knowledge-provider",
      version: "1.2.0",
      publisher: {
        name: "Intentloom Ecosystem",
        url: "https://github.com/vitala89/Intentloom",
      },
      compatibility: {
        intentloomCore: "^0.2.0 || ^0.3.0",
        node: ">=20.0.0",
      },
      license: {
        spdxId: "MIT",
        noticeRequired: true,
      },
      capabilities: {
        filesystem: {
          read: ["./", ".aif/"],
          write: [".aif/cache/"],
        },
        process: {
          exec: ["python3", "graphify"],
        },
        network: {
          connect: [],
        },
      },
      entrypoint: {
        type: "command",
        command: "graphify",
        args: ["query"],
      },
    };

    const result = validator.validate({
      artifactType: "extension-manifest",
      documentPath: "extension-manifest.json",
      format: "json",
      source: JSON.stringify(validSample),
    });

    expect(result.status).toBe("valid");
    expect(result.structuralErrors).toHaveLength(0);
  });

  it("rejects extension manifest with invalid category or missing required fields", async () => {
    const validator = await createArtifactValidator(schemaRoot);

    const invalidSample = {
      extensionId: "invalid-id-without-prefix",
      category: "unsupported-category",
    };

    const result = validator.validate({
      artifactType: "extension-manifest",
      documentPath: "extension-manifest.json",
      format: "json",
      source: JSON.stringify(invalidSample),
    });

    expect(result.status).toBe("invalid");
    expect(result.structuralErrors.length).toBeGreaterThan(0);
  });

  it("validates valid extension lock JSON sample through ArtifactValidator", async () => {
    const validator = await createArtifactValidator(schemaRoot);

    const validLockSample = {
      lockVersion: 1,
      updatedAt: "2026-07-24T02:49:00Z",
      extensions: {
        "ext:org/graphify-provider": {
          extensionId: "ext:org/graphify-provider",
          category: "knowledge-provider",
          requestedVersion: "^1.2.0",
          resolvedVersion: "1.2.0",
          integrity:
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          grantedCapabilities: {
            filesystem: {
              read: ["./"],
              write: [".aif/cache/"],
            },
            process: {
              exec: ["python3", "graphify"],
            },
            network: {
              connect: [],
            },
          },
          approvedAt: "2026-07-24T02:49:00Z",
          approvedBy: "human-interactive",
        },
      },
    };

    const result = validator.validate({
      artifactType: "extension-lock",
      documentPath: ".aif/extension-lock.json",
      format: "json",
      source: JSON.stringify(validLockSample),
    });

    expect(result.status).toBe("valid");
    expect(result.structuralErrors).toHaveLength(0);
  });

  it("validates capability grants against requested capabilities", () => {
    const requested = {
      filesystem: { read: ["./"], write: [".aif/cache/"] },
      process: { exec: ["python3"] },
      network: { connect: ["api.example.com"] },
    };

    const validGranted = {
      filesystem: { read: ["./"], write: [".aif/cache/"] },
      process: { exec: ["python3"] },
      network: { connect: ["api.example.com"] },
    };

    expect(
      validateExtensionCapabilityGrant(requested, validGranted),
    ).toHaveLength(0);

    const exceededGranted = {
      filesystem: {
        read: ["./", "/etc/passwd"],
        write: [".aif/cache/", "./src/"],
      },
      process: { exec: ["python3", "bash"] },
      network: { connect: ["api.example.com", "malicious.com"] },
    };

    const diagnostics = validateExtensionCapabilityGrant(
      requested,
      exceededGranted,
    );
    expect(diagnostics.length).toBe(4);
    expect(
      diagnostics
        .map((d) => d.code)
        .every((code) => code === "extension-capability-exceeded"),
    ).toBe(true);
  });

  it("uses convenience document helpers validateExtensionManifestDocument and validateExtensionLockDocument", async () => {
    const validator = await createArtifactValidator(schemaRoot);

    const manifestResult = validateExtensionManifestDocument(
      validator,
      "extension-manifest.json",
      JSON.stringify({
        $schema: "urn:aif:schema:extension-manifest:1",
        extensionId: "ext:org/demo",
        name: "Demo Extension",
        category: "knowledge-provider",
        version: "1.0.0",
        publisher: { name: "Demo", url: "https://example.com" },
        compatibility: { intentloomCore: "^1.0.0", node: ">=20.0.0" },
        license: { spdxId: "MIT", noticeRequired: false },
        capabilities: {},
        entrypoint: { type: "command", command: "demo" },
      }),
    );
    expect(manifestResult.status).toBe("valid");

    const lockResult = validateExtensionLockDocument(
      validator,
      ".aif/extension-lock.json",
      JSON.stringify({
        lockVersion: 1,
        updatedAt: "2026-07-31T19:00:00Z",
        extensions: {},
      }),
    );
    expect(lockResult.status).toBe("valid");
  });
});
