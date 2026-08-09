import { describe, expect, it } from "vitest";
import {
  runCheckersCliCommand,
  runGraphCliCommand,
  runPacksCliCommand,
  runQualityCliCommand,
} from "@intentloom/application";
import type { NxWorkspaceMetadata } from "@intentloom/protocol";
import { QUALITY_NX_GRAPH_SCHEMA_URN } from "@intentloom/protocol";

describe("Phase Q13: CLI and JSON Surface Commands", () => {
  describe("Quality / Standards Commands", () => {
    it("executes 'quality show --json' returning structured policy", () => {
      const res = runQualityCliCommand("show", { json: true });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.policyId).toBe("balanced");
      expect(parsed.profileName).toBe("balanced");
    });

    it("executes 'quality explain' for a rule ID", () => {
      const res = runQualityCliCommand("explain", {
        ruleId: "max-file-lines",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.ruleId).toBe("max-file-lines");
    });

    it("executes 'quality baseline-preview' returning baseline payload", () => {
      const res = runQualityCliCommand("baseline-preview", { json: true });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.candidateItems).toHaveLength(0);
    });

    it("executes 'quality decomposition-plan' for an oversized file", () => {
      const res = runQualityCliCommand("decomposition-plan", {
        filePath: "packages/core/src/heavy.ts",
        fileContent: "function a() {}\nfunction b() {}\n".repeat(20),
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.evidence.artifactPath).toBe("packages/core/src/heavy.ts");
    });
  });

  describe("Packs Commands", () => {
    it("executes 'packs list' returning catalog entries", () => {
      const res = runPacksCliCommand("list", { json: true });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("executes 'packs search' with a query", () => {
      const res = runPacksCliCommand("search", {
        query: "Intentloom",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    it("executes 'packs inspect' for a pack ID", () => {
      const res = runPacksCliCommand("inspect", {
        entryId: "intentloom/base",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.id).toBe("intentloom/base");
    });

    it("executes 'packs diff' between two versions", () => {
      const res = runPacksCliCommand("diff", {
        entryId: "intentloom/base",
        oldVersion: "1.0.0",
        newVersion: "1.0.0",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.packId).toBe("intentloom/base");
    });
  });

  describe("Checkers Commands", () => {
    it("executes 'checkers list' returning built-in adapters", () => {
      const res = runCheckersCliCommand("list", { json: true });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it("executes 'checkers inspect' for a checker adapter ID", () => {
      const res = runCheckersCliCommand("inspect", {
        adapterId: "eslint-json",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.adapterId).toBe("eslint-json");
    });

    it("executes 'checkers run' dry-run preview", () => {
      const res = runCheckersCliCommand("run", {
        adapterId: "eslint-json",
        projectRoot: "/workspace/my-app",
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.candidate.relativeEntryPath).toBeDefined();
    });
  });

  describe("Graph Commands", () => {
    it("executes 'graph detect' read-only", () => {
      const res = runGraphCliCommand("detect", {
        workspaceRoot: "/workspace/app",
        files: ["nx.json", "apps/app/project.json"],
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.detected).toBe(true);
      expect(parsed.acquisitionMode).toBe("project-metadata");
    });

    it("executes 'graph inspect' for Nx graph provider", () => {
      const nxMetadata: NxWorkspaceMetadata = {
        schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
        workspaceRoot: "/workspace/app",
        acquisitionMode: "project-metadata",
        projects: {
          "lib-a": { name: "lib-a", root: "libs/a" },
        },
      };

      const res = runGraphCliCommand("inspect", {
        providerKind: "nx-workspace",
        nxMetadata,
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed.providerKind).toBe("nx-workspace");
      expect(parsed.nodes).toHaveLength(1);
    });

    it("executes 'graph affected' resolving affected projects", () => {
      const nxMetadata: NxWorkspaceMetadata = {
        schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
        workspaceRoot: "/workspace/app",
        acquisitionMode: "project-metadata",
        projects: {
          "lib-a": { name: "lib-a", root: "libs/a" },
          "app-a": { name: "app-a", root: "apps/a", dependencies: ["lib-a"] },
        },
      };

      const res = runGraphCliCommand("affected", {
        nxMetadata,
        changedPaths: ["libs/a"],
        json: true,
      });
      expect(res.exitCode).toBe(0);
      const parsed = JSON.parse(res.stdout);
      expect(parsed).toEqual(["app-a", "lib-a"]);
    });
  });
});
