import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIRST_PARTY_CATALOG_ENTRIES,
  buildQualityCatalogViewModel,
  buildQualityCheckersViewModel,
  buildQualityGraphViewModel,
  buildQualityStandardsViewModel,
  buildSpecializedPackCatalogViewModel,
  buildSpecializedPackDetectionViewModel,
  getEffectiveEngineeringQualityPolicy,
  getFirstPartySpecializedPackEntries,
  nodeFileSystem,
  renderApprovalPreviewText,
  renderQualityCatalogTreeText,
  renderQualityGraphAccessibleText,
  renderQualityStandardsSummaryText,
  resolveFirstPartySpecializedPackDetection,
  runGraphCliCommand,
  runPacksCliCommand,
  runQualityCliCommand,
  runSpecializedPacksCliCommand,
  validateFirstPartySpecializedPackCatalog,
} from "@intentloom/application";
import type { EngineeringGraphSnapshot } from "@intentloom/protocol";
import {
  QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
  QUALITY_NX_GRAPH_SCHEMA_URN,
} from "@intentloom/protocol";

describe("Phase Q14: Desktop and TUI Viewmodels & Renderers", () => {
  describe("Standards Viewmodel & Renderers", () => {
    it("builds standards viewmodel and renders summary text", () => {
      const policy = getEffectiveEngineeringQualityPolicy();
      const vm = buildQualityStandardsViewModel({ policy });
      expect(vm.policyId).toBe("balanced");
      expect(vm.profileName).toBe("balanced");

      const text = renderQualityStandardsSummaryText(vm);
      expect(text).toContain("Policy ID: balanced");
      expect(text).toContain("Profile: balanced");
    });

    it("ensures state equivalence between CLI 'quality show' and Desktop viewmodel", () => {
      const cliRes = runQualityCliCommand("show", { json: true });
      const cliParsed = JSON.parse(cliRes.stdout);

      const policy = getEffectiveEngineeringQualityPolicy();
      const vm = buildQualityStandardsViewModel({ policy });

      expect(vm.policyId).toBe(cliParsed.policyId);
      expect(vm.profileName).toBe(cliParsed.profileName);
      expect(vm.rulesCount).toBe(cliParsed.defaultRules.length);
    });
  });

  describe("Catalog Viewmodel & Renderers", () => {
    it("builds catalog viewmodel and renders tree text", () => {
      const vm = buildQualityCatalogViewModel(FIRST_PARTY_CATALOG_ENTRIES);
      expect(vm.totalEntries).toBeGreaterThan(0);
      expect(vm.entries[0]?.id).toBe("intentloom/base");

      const text = renderQualityCatalogTreeText(vm);
      expect(text).toContain("Catalog Entries");
      expect(text).toContain("intentloom/base");
    });

    it("ensures equivalence between CLI 'packs list' and Catalog viewmodel", () => {
      const cliRes = runPacksCliCommand("list", { json: true });
      const cliParsed = JSON.parse(cliRes.stdout);

      const vm = buildQualityCatalogViewModel(FIRST_PARTY_CATALOG_ENTRIES);
      expect(vm.totalEntries).toBe(cliParsed.length);
      expect(vm.entries[0]?.id).toBe(cliParsed[0].id);
    });
  });

  describe("Checkers Viewmodel", () => {
    it("builds checkers viewmodel from built-in adapters", () => {
      const adapters = [
        {
          adapterId: "eslint-json",
          adapterName: "ESLint JSON Reporter Ingestion",
          supportedReportFormats: ["eslint-json"],
        },
      ];
      const vm = buildQualityCheckersViewModel({ adapters });
      expect(vm.adapters).toHaveLength(1);
      expect(vm.defaultAdapterId).toBe("eslint-json");
    });
  });

  describe("Graph Viewmodel & Accessible Renderers", () => {
    it("builds graph viewmodel with accessible tree and table, and renders text", () => {
      const snapshot: EngineeringGraphSnapshot = {
        schemaUrn: QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
        providerKind: "nx-workspace",
        providerName: "Nx Graph",
        snapshotId: "snap-1",
        projectRoot: "/workspace/app",
        contentDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        createdAt: "2026-08-10T00:00:00Z",
        nodes: [
          { id: "app-a", name: "app-a", type: "project", path: "apps/a" },
          { id: "lib-a", name: "lib-a", type: "project", path: "libs/a" },
        ],
        edges: [{ source: "app-a", target: "lib-a", type: "dependency" }],
      };

      const vm = buildQualityGraphViewModel({
        snapshot,
        affectedProjects: ["app-a", "lib-a"],
      });
      expect(vm.nodeCount).toBe(2);
      expect(vm.edgeCount).toBe(1);
      expect(vm.accessibleTable).toHaveLength(2);
      expect(vm.accessibleTree).toHaveLength(2);

      const text = renderQualityGraphAccessibleText(vm);
      expect(text).toContain("Graph Topology (nx-workspace): 2 nodes, 1 edges");
      expect(text).toContain("Affected Projects (2): app-a, lib-a");
    });

    it("ensures equivalence between CLI 'graph affected' and Graph viewmodel affected list", () => {
      const snapshot: EngineeringGraphSnapshot = {
        schemaUrn: QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
        providerKind: "nx-workspace",
        providerName: "Nx Graph",
        snapshotId: "snap-1",
        projectRoot: "/workspace/app",
        contentDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        createdAt: "2026-08-10T00:00:00Z",
        nodes: [
          { id: "lib-a", name: "lib-a", type: "project", path: "libs/a" },
          { id: "app-a", name: "app-a", type: "project", path: "apps/a" },
        ],
        edges: [{ source: "app-a", target: "lib-a", type: "dependency" }],
      };

      const nxMetadata = {
        schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
        workspaceRoot: "/workspace/app",
        acquisitionMode: "project-metadata" as const,
        projects: {
          "lib-a": { name: "lib-a", root: "libs/a" },
          "app-a": { name: "app-a", root: "apps/a", dependencies: ["lib-a"] },
        },
      };

      const cliRes = runGraphCliCommand("affected", {
        nxMetadata,
        changedPaths: ["libs/a"],
        json: true,
      });
      const cliAffected = JSON.parse(cliRes.stdout);

      const vm = buildQualityGraphViewModel({
        snapshot,
        affectedProjects: cliAffected,
      });
      expect(vm.affectedProjects).toEqual(cliAffected);
    });
  });

  describe("Approval Previews Renderer", () => {
    it("renders approval previews for baseline, activation, and decomposition", () => {
      const baselineText = renderApprovalPreviewText("baseline", {
        id: "baseline-1",
        summary: "Legacy exception baseline",
        requiresApproval: true,
      });
      expect(baselineText).toContain(
        "Approval Preview [BASELINE] [APPROVAL REQUIRED]",
      );
      expect(baselineText).toContain("ID: baseline-1");

      const activationText = renderApprovalPreviewText("activation", {
        id: "pack-1",
        summary: "External pack activation",
        requiresApproval: false,
      });
      expect(activationText).toContain(
        "Approval Preview [ACTIVATION] [AUTO-APPROVED]",
      );

      const decompositionText = renderApprovalPreviewText("decomposition", {
        id: "decomp-1",
        summary: "Refactoring plan option",
        requiresApproval: true,
      });
      expect(decompositionText).toContain(
        "Approval Preview [DECOMPOSITION] [APPROVAL REQUIRED]",
      );
    });
  });

  describe("Specialized Packs Viewmodels", () => {
    it("ensures equivalence between CLI specialized-packs list and catalog viewmodel", async () => {
      const cliRes = await runSpecializedPacksCliCommand("list", {
        json: true,
      });
      const cliParsed = JSON.parse(cliRes.stdout) as { totalEntries: number };

      const vm = buildSpecializedPackCatalogViewModel(
        validateFirstPartySpecializedPackCatalog(
          getFirstPartySpecializedPackEntries(),
        ).entries,
      );
      expect(vm.totalEntries).toBe(cliParsed.totalEntries);
      expect(vm.totalEntries).toBe(4);
    });

    it("builds detection viewmodel aligned with CLI specialized-packs detect output", async () => {
      const root = await mkdtemp(join(tmpdir(), "intentloom-specialized-tui-"));
      await mkdir(join(root, "apps", "desktop", "src-tauri"), {
        recursive: true,
      });
      await writeFile(
        join(root, "apps", "desktop", "src-tauri", "Cargo.toml"),
        "",
      );
      try {
        const cliRes = await runSpecializedPacksCliCommand("detect", {
          root,
          json: true,
        });
        const cliParsed = JSON.parse(cliRes.stdout) as {
          compatiblePackIds: string[];
        };

        const vm = buildSpecializedPackDetectionViewModel(
          resolveFirstPartySpecializedPackDetection({
            projectPaths: await nodeFileSystem.list(root),
            entries: getFirstPartySpecializedPackEntries(),
          }),
        );
        expect(vm.compatiblePackIds).toEqual(cliParsed.compatiblePackIds);
        expect(vm.compatiblePackIds).toContain("pack-tauri-desktop");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });
});
