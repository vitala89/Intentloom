import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  recordInceptionAnswer,
  proposeProjectBlueprints,
  computeBlueprintDigest,
  compareProjectBlueprints,
} from "@intentloom/application";
import { validateProjectBlueprint } from "@intentloom/validator";

describe("Project Inception Blueprint Resolver & Digest (Phase I3)", () => {
  it("proposes a deterministic blueprint from session state answers", () => {
    let session = createInceptionSession({
      root: "/tmp/blueprint-test",
      idea: "Cross-platform CLI tool for AST transformations",
    });

    session = recordInceptionAnswer(session, {
      questionId: "q2_architecture_style",
      value: "cli-tool",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const result = proposeProjectBlueprints(session);
    expect(result.recommended.topology).toBe("cli-tool");
    expect(result.recommended.recommendedPacks).toContain("cli-runtime");
    expect(result.recommended.recommendedPacks).toContain("typescript-strict");
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("computes identical sha256 digest for identical blueprint properties", () => {
    const blueprint1 = {
      id: "bp_1",
      name: "Blueprint Test",
      topology: "pnpm-workspace" as const,
      recommendedPacks: ["typescript-strict", "vitest", "pnpm-workspaces"],
      qualityProfile: "strict-engineering",
      frameworkNeutral: true,
      alternatives: [],
      createdAt: 1000,
    };

    const blueprint2 = {
      id: "bp_2", // ID differs, but core content is identical
      name: "Blueprint Test",
      topology: "pnpm-workspace" as const,
      recommendedPacks: ["vitest", "pnpm-workspaces", "typescript-strict"], // Different order
      qualityProfile: "strict-engineering",
      frameworkNeutral: true,
      alternatives: [],
      createdAt: 2000, // Timestamps differ
    };

    const digest1 = computeBlueprintDigest(blueprint1);
    const digest2 = computeBlueprintDigest(blueprint2);
    expect(digest1).toBe(digest2);
  });

  it("compares project blueprints and reports topology match & pack differences", () => {
    const sessionA = createInceptionSession({
      root: "/tmp/a",
      idea: "App A",
    });

    let sessionB = createInceptionSession({
      root: "/tmp/b",
      idea: "App B",
    });

    sessionB = recordInceptionAnswer(sessionB, {
      questionId: "q2_architecture_style",
      value: "web-product",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const blueprintA = proposeProjectBlueprints(sessionA).recommended;
    const blueprintB = proposeProjectBlueprints(sessionB).recommended;

    const diff = compareProjectBlueprints(blueprintA, blueprintB);
    expect(diff.topologyMatch).toBe(false);
    expect(diff.packDifferences).toContain("vite-react");
  });

  it("validates project blueprint structure strictly", () => {
    expect(() => validateProjectBlueprint(null)).toThrow("expected object");
    expect(() =>
      validateProjectBlueprint({
        id: "bp_1",
        name: "Test",
        topology: "invalid_topology",
        recommendedPacks: [],
        qualityProfile: "strict",
        frameworkNeutral: true,
        digest: "abc",
        alternatives: [],
        createdAt: 1000,
      }),
    ).toThrow("Invalid blueprint topology");
  });
});
