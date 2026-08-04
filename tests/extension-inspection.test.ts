import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditExtensionLicense,
  computeExtensionCapabilityDelta,
  createArtifactValidator,
  evaluateExtensionCompatibility,
  inspectExtensionManifestDocument,
} from "@intentloom/validator";
import { inspectExtensionManifest } from "@intentloom/application";

const schemaRoot = resolve("catalog/schemas");

describe("Managed Extension Pre-Adoption Inspection & Capability Delta Engine (Phase E2)", () => {
  it("computes capability deltas between candidate manifest and existing lock entry", () => {
    const existingLockCapabilities = {
      filesystem: {
        read: ["./"],
        write: [".aif/cache/"],
      },
      process: {
        exec: ["python3"],
      },
      network: {
        connect: [],
      },
    };

    const requestedCapabilities = {
      filesystem: {
        read: ["./", "/var/log/"],
        write: [".aif/cache/", "./src/generated/"],
      },
      process: {
        exec: ["python3", "bash"],
      },
      network: {
        connect: ["api.example.com"],
      },
    };

    const delta = computeExtensionCapabilityDelta(
      requestedCapabilities,
      existingLockCapabilities,
    );

    expect(delta.hasExpansions).toBe(true);
    expect(delta.filesystemReadAdded).toEqual(["/var/log/"]);
    expect(delta.filesystemWriteAdded).toEqual(["./src/generated/"]);
    expect(delta.processExecAdded).toEqual(["bash"]);
    expect(delta.networkConnectAdded).toEqual(["api.example.com"]);
  });

  it("reports zero capability delta when requested capabilities match existing lock entry", () => {
    const existing = {
      filesystem: { read: ["./"] },
      process: { exec: ["node"] },
    };

    const delta = computeExtensionCapabilityDelta(existing, existing);

    expect(delta.hasExpansions).toBe(false);
    expect(delta.filesystemReadAdded).toEqual([]);
    expect(delta.filesystemWriteAdded).toEqual([]);
    expect(delta.processExecAdded).toEqual([]);
    expect(delta.networkConnectAdded).toEqual([]);
  });

  it("evaluates runtime compatibility semver ranges for Node, OS, Arch, and Core API", () => {
    const manifestCompat = {
      intentloomCore: "^1.0.0",
      node: ">=18.0.0",
      os: ["darwin", "linux"],
      arch: ["arm64", "x64"],
    };

    const validEnv = {
      nodeVersion: "v22.5.0",
      os: "darwin",
      arch: "arm64",
      coreVersion: "1.0.2",
    };

    const validReport = evaluateExtensionCompatibility(
      manifestCompat,
      validEnv,
    );
    expect(validReport.isCompatible).toBe(true);
    expect(validReport.diagnostics).toHaveLength(0);

    const invalidEnv = {
      nodeVersion: "v16.20.0",
      os: "win32",
      arch: "ia32",
      coreVersion: "0.1.0",
    };

    const invalidReport = evaluateExtensionCompatibility(
      manifestCompat,
      invalidEnv,
    );
    expect(invalidReport.isCompatible).toBe(false);
    expect(invalidReport.nodeCompatible).toBe(false);
    expect(invalidReport.osCompatible).toBe(false);
    expect(invalidReport.archCompatible).toBe(false);
    expect(invalidReport.coreApiCompatible).toBe(false);
    expect(invalidReport.diagnostics.length).toBe(4);
  });

  it("audits permissive vs restrictive SPDX licenses and publisher changes", () => {
    const permissive = auditExtensionLicense(
      { spdxId: "MIT", noticeRequired: true },
      { name: "Intentloom Ecosystem" },
      "Intentloom Ecosystem",
    );
    expect(permissive.isPermissive).toBe(true);
    expect(permissive.hasRestrictiveTerms).toBe(false);
    expect(permissive.publisherChanged).toBe(false);

    const restrictive = auditExtensionLicense(
      { spdxId: "GPL-3.0-only", noticeRequired: true },
      { name: "Unknown Org" },
      "Intentloom Ecosystem",
    );
    expect(restrictive.isPermissive).toBe(false);
    expect(restrictive.hasRestrictiveTerms).toBe(true);
    expect(restrictive.publisherChanged).toBe(true);
    expect(restrictive.diagnostics).toContain(
      'Restrictive or copyleft SPDX license detected: "GPL-3.0-only"',
    );
    expect(restrictive.diagnostics).toContain(
      'Extension publisher changed from "Intentloom Ecosystem" to "Unknown Org"',
    );
  });

  it("inspects extension manifest document and generates structured inspection report", async () => {
    const validator = await createArtifactValidator(schemaRoot);

    const manifestContent = JSON.stringify({
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
        intentloomCore: "^1.0.0",
        node: ">=20.0.0",
      },
      license: {
        spdxId: "MIT",
        noticeRequired: true,
      },
      capabilities: {
        filesystem: { read: ["./"], write: [".aif/cache/"] },
        process: { exec: ["python3", "graphify"] },
        network: { connect: [] },
      },
      entrypoint: {
        type: "command",
        command: "graphify",
        args: ["query"],
      },
    });

    const report = inspectExtensionManifestDocument(
      validator,
      manifestContent,
      undefined,
      {
        nodeVersion: "v22.0.0",
        os: "darwin",
        arch: "arm64",
        coreVersion: "1.0.2",
      },
    );

    expect(report.status).toBe("warning");
    expect(report.extensionId).toBe("ext:org/graphify-provider");
    expect(report.category).toBe("knowledge-provider");
    expect(report.compatibility.isCompatible).toBe(true);
    expect(report.licenseAudit.isPermissive).toBe(true);
    expect(report.capabilityDelta.hasExpansions).toBe(true);
  });

  it("runs inspectExtensionManifest application operation asynchronously", async () => {
    const manifestContent = JSON.stringify({
      $schema: "urn:aif:schema:extension-manifest:1",
      extensionId: "ext:org/demo-skill",
      name: "Demo Skill Extension",
      category: "skill",
      version: "1.0.0",
      publisher: { name: "Demo Publisher" },
      compatibility: { intentloomCore: "^1.0.0", node: ">=18.0.0" },
      license: { spdxId: "Apache-2.0" },
      capabilities: {},
      entrypoint: { type: "command", command: "demo" },
    });

    const report = await inspectExtensionManifest({
      manifestContent,
      schemaRoot,
      environment: {
        nodeVersion: "v20.0.0",
        coreVersion: "1.0.2",
      },
    });

    expect(report.status).toBe("approved");
    expect(report.extensionId).toBe("ext:org/demo-skill");
    expect(report.capabilityDelta.hasExpansions).toBe(false);
  });
});
