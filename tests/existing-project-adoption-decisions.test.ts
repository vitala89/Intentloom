import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  prepareExistingProjectAdoptionPlan,
  validateExistingProjectAdoptionDecisions,
} from "@intentloom/application";
import {
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createExistingProjectAdoptionDecisionsRequest,
  parseDaemonRequest,
  parseExistingProjectAdoptionDecisionsRequest,
  supportedAdoptionDecisionKinds,
} from "@intentloom/protocol";

function viiLikeTree(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/nx.json": JSON.stringify({ targetDefaults: {} }),
    "/project/package.json": JSON.stringify({
      devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
    }),
    "/project/tsconfig.json": "{}",
    "/project/README.md": "vii workspace\n",
    "/project/AGENTS.md": "project agents\n",
    "/project/.github/workflows/validate.yml": "name: validate\n",
    "/project/.github/PULL_REQUEST_TEMPLATE.md": "## Summary\n",
    "/project/.nx/cache/terminalOutputs/run-1.txt": "cached output\n",
    "/project/docs/architecture/overview.md": "architecture overview\n",
    ...extra,
  };
}

function snapshot(files: Map<string, string>): string {
  return JSON.stringify(
    [...files.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

describe("existing-project adoption decision validation", () => {
  it("exposes keep-project-owned for AGENTS.md and validates it read-only", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const agents = preview.items.find((item) => item.path === "AGENTS.md");
    expect(agents?.manualDecisionRequired).toBe(true);
    expect(supportedAdoptionDecisionKinds(agents!)).toEqual([
      "keep-project-owned",
    ]);

    const validated = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      },
      fs,
    );

    expect(validated.readOnly).toBe(true);
    expect(validated.applied).toBe(false);
    expect(validated.changesApplied).toBe(0);
    expect(validated.stalePreview).toBe(false);
    expect(validated.decisionsPrepared).toBe(1);
    expect(validated.evaluations).toEqual([
      expect.objectContaining({
        path: "AGENTS.md",
        kind: "keep-project-owned",
        status: "valid",
        reason: null,
      }),
    ]);
    expect(validated.evaluations[0]?.resolvedItem).toEqual(
      expect.objectContaining({
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        proposedClassification: "project-owned",
        manualDecisionRequired: false,
        writeEligible: false,
      }),
    );
    expect(validated.remainingManualDecisionPaths).not.toContain("AGENTS.md");
    expect(snapshot(fs.files)).toBe(before);
  });

  it("fails closed for unsupported, unknown, duplicate, and stale decisions", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );

    const unsupported = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "map-existing-compatible-document" },
        ],
      },
      fs,
    );
    expect(unsupported.evaluations[0]).toEqual(
      expect.objectContaining({
        status: "invalid",
        reason: "unsupported-decision",
      }),
    );
    expect(unsupported.decisionsPrepared).toBe(0);

    const unknown = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "not-a-plan-item.md", kind: "keep-project-owned" }],
      },
      fs,
    );
    expect(unknown.evaluations[0]?.reason).toBe("unknown-item");

    const duplicate = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "keep-project-owned" },
          { path: "AGENTS.md", kind: "keep-project-owned" },
        ],
      },
      fs,
    );
    expect(
      duplicate.evaluations.every(
        (item) => item.reason === "duplicate-decision",
      ),
    ).toBe(true);

    const stale = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: "b".repeat(64),
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      },
      fs,
    );
    expect(stale.stalePreview).toBe(true);
    expect(stale.evaluations[0]?.reason).toBe("stale-preview");
    expect(stale.decisionsPrepared).toBe(0);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("validates multiple manual decisions deterministically without apply", async () => {
    const fs = createMemoryFileSystem(
      viiLikeTree({
        "/project/architecture.md": "root architecture\n",
        "/project/docs/architecture.md": "docs architecture\n",
      }),
    );
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const docs = preview.items.filter((item) => item.manualDecisionRequired);
    expect(docs.map((item) => item.path).sort()).toEqual([
      "AGENTS.md",
      "architecture.md",
      "docs/architecture.md",
    ]);
    const architecture = preview.items.find(
      (item) => item.path === "docs/architecture.md",
    );
    expect(supportedAdoptionDecisionKinds(architecture!)).toEqual([
      "map-existing-compatible-document",
    ]);

    const first = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "keep-project-owned" },
          {
            path: "docs/architecture.md",
            kind: "map-existing-compatible-document",
          },
        ],
      },
      fs,
    );
    const second = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "keep-project-owned" },
          {
            path: "docs/architecture.md",
            kind: "map-existing-compatible-document",
          },
        ],
      },
      fs,
    );
    expect(first).toEqual(second);
    expect(first.decisionsPrepared).toBe(2);
    expect(first.changesApplied).toBe(0);
    expect(first.remainingManualDecisionPaths).toEqual([]);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects malformed protocol decision requests", () => {
    expect(() =>
      parseExistingProjectAdoptionDecisionsRequest(
        "intentloom.existing-project.adoption.decisions.v1",
        {
          protocolVersion: PROTOCOL_VERSION,
          root: "/project",
          previewIdentity: "a".repeat(64),
          decisions: [{ path: "AGENTS.md", kind: "replace" }],
        },
        1,
      ),
    ).toThrow(ProtocolValidationError);
    const request = createExistingProjectAdoptionDecisionsRequest(
      3,
      "/project",
      "a".repeat(64),
      [{ path: "AGENTS.md", kind: "keep-project-owned" }],
    );
    expect(parseDaemonRequest(request).method).toBe(
      "intentloom.existing-project.adoption.decisions.v1",
    );
  });
});
