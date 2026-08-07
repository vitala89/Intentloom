import { describe, expect, it } from "vitest";
import type {
  ExtensionManifest,
  ExtensionSandboxPolicy,
} from "../packages/protocol/src/index.js";
import {
  validateExtensionSandboxEvaluation,
  validateExtensionSandboxPolicy,
} from "../packages/validator/src/index.js";
import { evaluateExtensionSandboxPolicy } from "../packages/application/src/index.js";

const baseManifest: ExtensionManifest = {
  $schema: "urn:aif:schema:extension-manifest:1",
  extensionId: "org.example.test-extension",
  name: "test-extension",
  category: "mcp-server",
  version: "1.0.0",
  publisher: { name: "Example Corp" },
  compatibility: { intentloomCore: "^1.0.0" },
  license: { spdxId: "MIT" },
  capabilities: {},
  entrypoint: { type: "stdio", command: "node" },
};

describe("Phase E8: Extension Sandboxing & Contextual Security Policies", () => {
  it("validates valid and invalid sandbox policies", () => {
    const validPolicy: ExtensionSandboxPolicy = {
      maxIsolationProfile: "workspace-read",
      allowedReadPaths: ["src/"],
      requireExplicitApprovalForExpansions: true,
    };

    const validated = validateExtensionSandboxPolicy(validPolicy);
    expect(validated.maxIsolationProfile).toBe("workspace-read");
    expect(validated.allowedReadPaths).toEqual(["src/"]);
    expect(validated.requireExplicitApprovalForExpansions).toBe(true);

    expect(() =>
      validateExtensionSandboxPolicy({
        maxIsolationProfile: "invalid-profile",
      }),
    ).toThrow("invalid maxIsolationProfile in sandbox policy");
  });

  it("evaluates strict profile extension as approved when policy permits", () => {
    const policy: ExtensionSandboxPolicy = {
      maxIsolationProfile: "workspace-read",
    };

    const result = evaluateExtensionSandboxPolicy(baseManifest, policy);
    expect(result.status).toBe("approved");
    expect(result.requestedProfile).toBe("strict");
    expect(result.profileSatisfied).toBe(true);
    expect(result.diagnostics).toEqual([]);

    const validatedEval = validateExtensionSandboxEvaluation(result);
    expect(validatedEval.extensionId).toBe("org.example.test-extension");
  });

  it("rejects extension when requested isolation profile exceeds maximum policy profile", () => {
    const networkManifest: ExtensionManifest = {
      ...baseManifest,
      capabilities: {
        network: { connect: ["https://api.example.com"] },
      },
    };

    const policy: ExtensionSandboxPolicy = {
      maxIsolationProfile: "workspace-read",
    };

    const result = evaluateExtensionSandboxPolicy(networkManifest, policy);
    expect(result.status).toBe("rejected");
    expect(result.requestedProfile).toBe("network-read");
    expect(result.profileSatisfied).toBe(false);
    expect(result.diagnostics[0]).toContain("isolation-profile-exceeded");
  });

  it("requires approval when unapproved read paths or exec commands are requested", () => {
    const capManifest: ExtensionManifest = {
      ...baseManifest,
      capabilities: {
        filesystem: { read: ["src/", "secrets/"] },
        process: { exec: ["npm"] },
      },
    };

    const policy: ExtensionSandboxPolicy = {
      maxIsolationProfile: "workspace-write",
      allowedReadPaths: ["src/"],
      allowedExecCommands: ["npm"],
    };

    const result = evaluateExtensionSandboxPolicy(capManifest, policy);
    expect(result.status).toBe("requires-approval");
    expect(result.filesystemReadAllowed).toBe(false);
    expect(result.unapprovedReadPaths).toEqual(["secrets/"]);
    expect(result.unapprovedExecCommands).toEqual([]);
    expect(result.diagnostics).toContain("unapproved-read-paths: secrets/");
  });

  it("requires approval when policy sets requireExplicitApprovalForExpansions even if capabilities match", () => {
    const capManifest: ExtensionManifest = {
      ...baseManifest,
      capabilities: {
        filesystem: { read: ["src/"] },
      },
    };

    const policy: ExtensionSandboxPolicy = {
      maxIsolationProfile: "workspace-read",
      allowedReadPaths: ["src/"],
      requireExplicitApprovalForExpansions: true,
    };

    const result = evaluateExtensionSandboxPolicy(capManifest, policy);
    expect(result.status).toBe("requires-approval");
    expect(result.diagnostics).toContain(
      "explicit-approval-required-by-policy",
    );
  });
});
