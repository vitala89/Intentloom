import { describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
  prepareExistingProjectAdoptionPlan,
} from "@intentloom/application";
import {
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createExistingProjectAdoptionPlanRequest,
  parseDaemonRequest,
  parseExistingProjectAdoptionPlanRequest,
  parseExistingProjectAdoptionPlanViewModel,
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

describe("existing-project adoption plan application contract", () => {
  it("returns a read-only preview matching adoptProject dry-run items", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const adapters =
      preview.detectedAdapters.length > 0
        ? preview.detectedAdapters
        : (["codex"] as const);
    const proposal = await adoptProject(
      {
        root: "/project",
        profile: preview.profile,
        adapters: [...adapters],
        dryRun: true,
      },
      fs,
    );

    expect(preview.readOnly).toBe(true);
    expect(preview.classification).toBe("read-only");
    expect(preview.applied).toBe(false);
    expect(preview.previewIdentity).toMatch(/^[a-f0-9]{64}$/u);
    expect(preview.profile).toBe("typescript");
    expect(preview.workspaceTopology).toBe("nx");
    expect(preview.items).toEqual(proposal.items);
    expect(preview.items.some((item) => item.action === "create")).toBe(true);
    expect(
      preview.items.some(
        (item) =>
          item.path === "AGENTS.md" &&
          item.action === "map-existing-project-owned" &&
          item.manualDecisionRequired,
      ),
    ).toBe(true);
    expect(
      preview.items.some((item) => item.path.startsWith(".nx/cache")),
    ).toBe(false);
    expect(
      preview.instructionPaths.some((path) => path.startsWith(".github/")),
    ).toBe(false);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects malformed protocol requests", () => {
    expect(() =>
      parseExistingProjectAdoptionPlanRequest(
        "intentloom.existing-project.adoption.plan.v1",
        { protocolVersion: PROTOCOL_VERSION, root: "" },
        1,
      ),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseExistingProjectAdoptionPlanViewModel({
        readOnly: true,
        classification: "mutating",
      }),
    ).toThrow(ProtocolValidationError);
    const request = createExistingProjectAdoptionPlanRequest(7, "/project");
    expect(parseDaemonRequest(request).method).toBe(
      "intentloom.existing-project.adoption.plan.v1",
    );
  });
});
