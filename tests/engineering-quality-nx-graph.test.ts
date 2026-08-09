import { describe, expect, it } from "vitest";
import {
  acquireNxGraphSnapshot,
  detectNxWorkspace,
  resolveNxAffectedProjects,
  validateNxModuleBoundaries,
} from "@intentloom/application";
import type { NxBoundaryRule, NxWorkspaceMetadata } from "@intentloom/protocol";
import {
  QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN,
  QUALITY_NX_GRAPH_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateNxBoundaryRule,
  validateNxWorkspaceMetadata,
} from "@intentloom/validator";

describe("Phase Q12: Nx Graph and Boundary Integration", () => {
  it("detects Nx workspace features and acquisition mode read-only", () => {
    const cached = detectNxWorkspace({
      workspaceRoot: "/workspace/my-nx-app",
      files: [
        "nx.json",
        "node_modules/.cache/nx/nxdeps.json",
        "apps/app-a/project.json",
      ],
    });
    expect(cached.detected).toBe(true);
    expect(cached.acquisitionMode).toBe("cached-graph");

    const metadataOnly = detectNxWorkspace({
      workspaceRoot: "/workspace/my-nx-app",
      files: ["nx.json", "apps/app-a/project.json"],
    });
    expect(metadataOnly.detected).toBe(true);
    expect(metadataOnly.acquisitionMode).toBe("project-metadata");

    const unsupported = detectNxWorkspace({
      workspaceRoot: "/workspace/plain-js",
      files: ["package.json", "index.js"],
    });
    expect(unsupported.detected).toBe(false);
    expect(unsupported.acquisitionMode).toBe("unsupported");
  });

  it("acquires a normalized graph snapshot from Nx workspace metadata", () => {
    const metadata: NxWorkspaceMetadata = {
      schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
      workspaceRoot: "/workspace/nx-app",
      acquisitionMode: "project-metadata",
      projects: {
        "shared-ui": {
          name: "shared-ui",
          root: "libs/shared/ui",
          projectType: "library",
          tags: ["type:ui", "scope:shared"],
        },
        "feature-checkout": {
          name: "feature-checkout",
          root: "apps/checkout",
          projectType: "application",
          tags: ["type:feature", "scope:checkout"],
          dependencies: ["shared-ui"],
        },
      },
    };

    const snapshot = acquireNxGraphSnapshot(metadata);
    expect(snapshot.providerKind).toBe("nx-workspace");
    expect(snapshot.nodes).toHaveLength(2);
    expect(snapshot.edges).toHaveLength(1);
    expect(snapshot.edges[0]?.source).toBe("feature-checkout");
    expect(snapshot.edges[0]?.target).toBe("shared-ui");
  });

  it("enforces Nx module boundary rules with exact dependency cause tracking", () => {
    const metadata: NxWorkspaceMetadata = {
      schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
      workspaceRoot: "/workspace/nx-app",
      acquisitionMode: "project-metadata",
      projects: {
        "shared-ui": {
          name: "shared-ui",
          root: "libs/shared/ui",
          tags: ["type:ui"],
          dependencies: ["feature-checkout"], // Violation!
        },
        "feature-checkout": {
          name: "feature-checkout",
          root: "apps/checkout",
          tags: ["type:feature"],
        },
        "app-admin": {
          name: "app-admin",
          root: "apps/admin",
          tags: ["type:app"],
          implicitDependencies: ["feature-checkout"], // Implicit violation
        },
      },
    };

    const rule: NxBoundaryRule = {
      schemaUrn: QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN,
      ruleId: "nx-enforce-module-boundaries",
      constraints: [
        {
          sourceTag: "type:ui",
          onlyDependOnLibsWithTags: ["type:ui", "type:util"],
        },
      ],
    };

    const findings = validateNxModuleBoundaries(metadata, rule);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.sourceProject).toBe("shared-ui");
    expect(findings[0]?.targetProject).toBe("feature-checkout");
    expect(findings[0]?.cause.causeType).toBe("explicit-import");
    expect(findings[0]?.severity).toBe("error");
  });

  it("resolves affected Nx projects transitively", () => {
    const metadata: NxWorkspaceMetadata = {
      schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
      workspaceRoot: "/workspace/nx-app",
      acquisitionMode: "project-metadata",
      projects: {
        "shared-util": {
          name: "shared-util",
          root: "libs/util",
        },
        "shared-ui": {
          name: "shared-ui",
          root: "libs/ui",
          dependencies: ["shared-util"],
        },
        "app-checkout": {
          name: "app-checkout",
          root: "apps/checkout",
          dependencies: ["shared-ui"],
        },
      },
    };

    const affected = resolveNxAffectedProjects(metadata, ["libs/util"]);
    expect(affected).toEqual(["app-checkout", "shared-ui", "shared-util"]);
  });

  it("validates schema boundaries and rejects invalid Nx workspace metadata", () => {
    const validMetadata: NxWorkspaceMetadata = {
      schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
      workspaceRoot: "/workspace/nx-app",
      acquisitionMode: "project-metadata",
      projects: {
        "shared-ui": {
          name: "shared-ui",
          root: "libs/ui",
        },
      },
    };

    expect(() => validateNxWorkspaceMetadata(validMetadata)).not.toThrow();

    expect(() =>
      validateNxWorkspaceMetadata({
        ...validMetadata,
        schemaUrn: "urn:invalid",
      }),
    ).toThrow("Invalid schemaUrn");

    expect(() =>
      validateNxWorkspaceMetadata({
        ...validMetadata,
        acquisitionMode: "invalid-mode",
      }),
    ).toThrow("Invalid acquisitionMode");
  });

  it("validates schema boundaries and rejects invalid Nx boundary rules", () => {
    const validRule: NxBoundaryRule = {
      schemaUrn: QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN,
      ruleId: "nx-rule-1",
      constraints: [
        {
          sourceTag: "type:ui",
          onlyDependOnLibsWithTags: ["type:ui"],
        },
      ],
    };

    expect(validateNxBoundaryRule(validRule)).toEqual(validRule);

    expect(() =>
      validateNxBoundaryRule({
        ...validRule,
        ruleId: "",
      }),
    ).toThrow("ruleId must be a non-empty string");
  });
});
