import { describe, it, expect } from "vitest";
import type {
  ExtensionManifest,
  ExtensionLockfile,
} from "@intentloom/protocol";
import {
  resolveExtensionAdoptionProposal,
  applyExtensionAdoptionPlan,
} from "@intentloom/validator";
import {
  proposeExtensionAdoption,
  applyExtensionAdoption,
  createMemoryFileSystem,
} from "@intentloom/application";

describe("Phase E3: Transactional Extension Resolution & Lockfile Management", () => {
  const baseManifest: ExtensionManifest = {
    extensionId: "org.intentloom.vector-search",
    name: "Vector Search Provider",
    category: "knowledge-provider",
    version: "1.2.0",
    publisher: { name: "Intentloom Core Team" },
    source: {
      registry: "npm",
      package: "@intentloom/vector-search",
      resolved: "sha256:abc123def4567890",
    },
    compatibility: { intentloomCore: "^1.0.0", node: ">=18.0.0" },
    license: { spdxId: "MIT" },
    capabilities: {
      filesystem: { read: ["src/**/*.ts"] },
    },
    entrypoint: { type: "module", command: "./dist/index.js" },
  };

  const initialLockfile: ExtensionLockfile = {
    lockVersion: 1,
    updatedAt: "2026-08-01T00:00:00.000Z",
    extensions: {},
  };

  describe("resolveExtensionAdoptionProposal", () => {
    it("rejects unpinned version requests without registry resolution", () => {
      const unpinnedManifest: ExtensionManifest = {
        ...baseManifest,
        version: "latest",
      };

      const plan = resolveExtensionAdoptionProposal(unpinnedManifest, {
        lockfile: initialLockfile,
      });

      expect(plan.status).toBe("rejected");
      expect(plan.diagnostics).toContain(
        'unpinned version specification "latest" requires explicit registry resolution',
      );
    });

    it("accepts registry resolution for unpinned ranges", () => {
      const rangeManifest: ExtensionManifest = {
        ...baseManifest,
        version: "^1.0.0",
      };

      const existingLockfile: ExtensionLockfile = {
        lockVersion: 1,
        updatedAt: "2026-08-01T00:00:00.000Z",
        extensions: {
          [baseManifest.extensionId]: {
            extensionId: baseManifest.extensionId,
            category: baseManifest.category,
            requestedVersion: "1.0.0",
            resolvedVersion: "1.0.0",
            grantedCapabilities: baseManifest.capabilities,
            approvedAt: "2026-08-01T00:00:00.000Z",
            approvedBy: "operator",
          },
        },
      };

      const plan = resolveExtensionAdoptionProposal(rangeManifest, {
        lockfile: existingLockfile,
        registryResolution: {
          version: "1.2.5",
          integrity: "sha256:resolved999",
          resolvedUrl:
            "https://registry.npmjs.org/@intentloom/vector-search/-/vector-search-1.2.5.tgz",
        },
      });

      expect(plan.status).toBe("ready");
      expect(plan.resolvedVersion).toBe("1.2.5");
      expect(plan.integrity).toBe("sha256:resolved999");
      expect(plan.proposedLockEntry.source?.resolved).toBe(
        "https://registry.npmjs.org/@intentloom/vector-search/-/vector-search-1.2.5.tgz",
      );
    });

    it("requires human approval when capability delta has expansions or license requires notice", () => {
      const noticeManifest: ExtensionManifest = {
        ...baseManifest,
        license: { spdxId: "Apache-2.0", noticeRequired: true },
        capabilities: {
          filesystem: { write: ["dist/**"] },
          process: { exec: ["node"] },
        },
      };

      const plan = resolveExtensionAdoptionProposal(noticeManifest, {
        lockfile: initialLockfile,
      });

      expect(plan.status).toBe("requires-approval");
      expect(plan.requiresApproval).toBe(true);
      expect(plan.approvalReasons.length).toBeGreaterThan(0);
    });
  });

  describe("applyExtensionAdoptionPlan", () => {
    it("refuses to apply rejected adoption plans", () => {
      const unpinnedManifest: ExtensionManifest = {
        ...baseManifest,
        version: "latest",
      };
      const rejectedPlan = resolveExtensionAdoptionProposal(unpinnedManifest);

      const result = applyExtensionAdoptionPlan(rejectedPlan, initialLockfile);

      expect(result.updated).toBe(false);
      expect(result.diagnostics[0]).toContain(
        "cannot apply rejected adoption plan",
      );
      expect(
        result.lockfile.extensions[baseManifest.extensionId],
      ).toBeUndefined();
    });

    it("refuses to apply plan requiring approval without forceApproval flag", () => {
      const expansionManifest: ExtensionManifest = {
        ...baseManifest,
        capabilities: { process: { exec: ["bash"] } },
      };
      const approvalPlan = resolveExtensionAdoptionProposal(expansionManifest);

      const result = applyExtensionAdoptionPlan(approvalPlan, initialLockfile);

      expect(result.updated).toBe(false);
      expect(result.diagnostics[0]).toContain(
        "requires explicit human approval",
      );
    });

    it("successfully applies plan requiring approval when forceApproval is set", () => {
      const expansionManifest: ExtensionManifest = {
        ...baseManifest,
        capabilities: { process: { exec: ["bash"] } },
      };
      const approvalPlan = resolveExtensionAdoptionProposal(expansionManifest);

      const result = applyExtensionAdoptionPlan(approvalPlan, initialLockfile, {
        forceApproval: true,
        timestamp: "2026-08-04T12:00:00.000Z",
      });

      expect(result.updated).toBe(true);
      expect(
        result.lockfile.extensions[baseManifest.extensionId],
      ).toBeDefined();
      expect(
        result.lockfile.extensions[baseManifest.extensionId].resolvedVersion,
      ).toBe("1.2.0");
      expect(result.lockfile.updatedAt).toBe("2026-08-04T12:00:00.000Z");
    });
  });

  describe("proposeExtensionAdoption & applyExtensionAdoption application operations", () => {
    it("proposes and applies adoption through memory filesystem", async () => {
      const memoryFs = createMemoryFileSystem();
      const root = "/workspace";
      const manifestPath = `${root}/extension.yaml`;

      await memoryFs.write(manifestPath, JSON.stringify(baseManifest, null, 2));

      const plan = await proposeExtensionAdoption(
        {
          root,
          manifestInput: manifestPath,
          timestamp: "2026-08-04T12:00:00.000Z",
        },
        memoryFs,
      );

      expect(plan.status).toBe("requires-approval");
      expect(plan.targetExtensionId).toBe(baseManifest.extensionId);

      const applyResult = await applyExtensionAdoption(
        {
          root,
          plan,
          forceApproval: true,
          timestamp: "2026-08-04T12:00:00.000Z",
        },
        memoryFs,
      );

      expect(applyResult.updated).toBe(true);

      const lockfileRaw = await memoryFs.read(
        `${root}/.aif/extension-lock.json`,
      );
      const writtenLockfile: ExtensionLockfile = JSON.parse(lockfileRaw);

      expect(
        writtenLockfile.extensions[baseManifest.extensionId],
      ).toBeDefined();
      expect(
        writtenLockfile.extensions[baseManifest.extensionId].resolvedVersion,
      ).toBe("1.2.0");
    });
  });
});
