import { describe, expect, it } from "vitest";
import {
  createGraphSnapshotFromNxWorkspace,
  createGraphSnapshotFromTypeScriptWorkspace,
  resolveAffectedEngineeringScopes,
  validateArchitectureAgainstGraph,
} from "@intentloom/application";
import type { EngineeringArchitectureRule } from "@intentloom/protocol";

import { QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN } from "@intentloom/protocol";
import {
  validateEngineeringArchitectureRule,
  validateEngineeringGraphSnapshot,
} from "@intentloom/validator";

describe("Phase Q11: Graph-Provider Contracts & Operations", () => {
  it("creates a normalized graph snapshot from a TypeScript workspace", () => {
    const snapshot = createGraphSnapshotFromTypeScriptWorkspace({
      projectRoot: "/workspace/my-ts-monorepo",
      packages: [
        {
          name: "@myorg/core",
          path: "packages/core",
        },
        {
          name: "@myorg/utils",
          path: "packages/utils",
          dependencies: ["@myorg/core"],
        },
        {
          name: "@myorg/cli",
          path: "packages/cli",
          dependencies: ["@myorg/core", "@myorg/utils"],
        },
      ],
    });

    expect(snapshot.schemaUrn).toBe(QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN);
    expect(snapshot.providerKind).toBe("typescript-workspace");
    expect(snapshot.nodes).toHaveLength(3);
    expect(snapshot.edges).toHaveLength(3);
    expect(snapshot.contentDigest).toBeDefined();
    expect(snapshot.contentDigest).toHaveLength(64);
  });

  it("creates a normalized graph snapshot from an Nx workspace", () => {
    const snapshot = createGraphSnapshotFromNxWorkspace({
      projectRoot: "/workspace/my-nx-monorepo",
      projects: {
        "shared-ui": {
          root: "libs/shared/ui",
          tags: ["type:ui", "scope:shared"],
        },
        "feature-checkout": {
          root: "apps/checkout",
          tags: ["type:feature", "scope:checkout"],
          dependencies: ["shared-ui"],
        },
        "feature-admin": {
          root: "apps/admin",
          tags: ["type:feature", "scope:admin"],
          implicitDependencies: ["shared-ui"],
        },
      },
    });

    expect(snapshot.schemaUrn).toBe(QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN);
    expect(snapshot.providerKind).toBe("nx-workspace");
    expect(snapshot.nodes).toHaveLength(3);
    expect(snapshot.edges).toHaveLength(2);
    expect(snapshot.nodes.find((n) => n.id === "shared-ui")?.tags).toEqual([
      "type:ui",
      "scope:shared",
    ]);
  });

  it("evaluates the same architecture rule on normalized TypeScript and Nx graph snapshots (Exit Gate)", () => {
    const rule: EngineeringArchitectureRule = {
      ruleId: "no-shared-to-feature",
      sourceTagOrPath: "packages/core",
      forbiddenTargetTagOrPath: "@myorg/cli",
      reason: "Shared core cannot depend on feature application CLI",
    };

    // 1. TypeScript Workspace Snapshot
    const tsSnapshot = createGraphSnapshotFromTypeScriptWorkspace({
      projectRoot: "/workspace/ts",
      packages: [
        {
          name: "@myorg/cli",
          path: "packages/cli",
        },
        {
          name: "@myorg/core",
          path: "packages/core",
          dependencies: ["@myorg/cli"], // Violation!
        },
      ],
    });

    const tsFindings = validateArchitectureAgainstGraph(tsSnapshot, [rule]);
    expect(tsFindings).toHaveLength(1);
    expect(tsFindings[0]?.sourceNodeId).toBe("@myorg/core");
    expect(tsFindings[0]?.targetNodeId).toBe("@myorg/cli");

    // 2. Nx Workspace Snapshot with Tag Matching
    const nxTagRule: EngineeringArchitectureRule = {
      ruleId: "no-ui-to-feature",
      sourceTagOrPath: "type:ui",
      forbiddenTargetTagOrPath: "type:feature",
      reason: "UI libraries cannot depend on feature apps",
    };

    const nxSnapshot = createGraphSnapshotFromNxWorkspace({
      projectRoot: "/workspace/nx",
      projects: {
        "shared-ui": {
          root: "libs/ui",
          tags: ["type:ui"],
          dependencies: ["app-checkout"], // Violation!
        },
        "app-checkout": {
          root: "apps/checkout",
          tags: ["type:feature"],
        },
      },
    });

    const nxFindings = validateArchitectureAgainstGraph(nxSnapshot, [
      nxTagRule,
    ]);
    expect(nxFindings).toHaveLength(1);
    expect(nxFindings[0]?.sourceNodeId).toBe("shared-ui");
    expect(nxFindings[0]?.targetNodeId).toBe("app-checkout");
  });

  it("resolves transitively affected engineering scopes from changed nodes", () => {
    const snapshot = createGraphSnapshotFromTypeScriptWorkspace({
      projectRoot: "/workspace/ts",
      packages: [
        { name: "leaf", path: "packages/leaf" },
        { name: "mid", path: "packages/mid", dependencies: ["leaf"] },
        { name: "top", path: "packages/top", dependencies: ["mid"] },
        { name: "unrelated", path: "packages/unrelated" },
      ],
    });

    const affected = resolveAffectedEngineeringScopes(snapshot, [
      "packages/leaf",
    ]);
    expect(affected).toEqual(["leaf", "mid", "top"]);
  });

  it("validates graph snapshot schema and rejects invalid inputs", () => {
    const valid = createGraphSnapshotFromTypeScriptWorkspace({
      projectRoot: "/workspace/ts",
      packages: [{ name: "a", path: "packages/a" }],
    });

    expect(() => validateEngineeringGraphSnapshot(valid)).not.toThrow();

    expect(() =>
      validateEngineeringGraphSnapshot({
        ...valid,
        schemaUrn: "urn:invalid",
      }),
    ).toThrow("Invalid schemaUrn");

    expect(() =>
      validateEngineeringGraphSnapshot({
        ...valid,
        edges: [{ source: "a", target: "non-existent", type: "dependency" }],
      }),
    ).toThrow("references unknown target");
  });

  it("validates architecture rules and rejects invalid rule payloads", () => {
    const rule: EngineeringArchitectureRule = {
      ruleId: "arch-1",
      sourceTagOrPath: "scope:a",
      forbiddenTargetTagOrPath: "scope:b",
      reason: "Boundary constraint",
    };

    expect(validateEngineeringArchitectureRule(rule)).toEqual(rule);

    expect(() =>
      validateEngineeringArchitectureRule({
        ...rule,
        ruleId: "",
      }),
    ).toThrow("ruleId must be a non-empty string");
  });
});
