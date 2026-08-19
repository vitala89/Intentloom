import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  adoptProject,
  applyExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  diffProject,
  doctorProject,
  prepareExistingProjectAdoptionPlan,
  revalidateExistingProjectAdoptionPreparedPlan,
  validateExistingProjectAdoptionDecisions,
} from "@intentloom/application";
import { createArtifactValidator } from "@intentloom/validator";
import {
  preparedApproved,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";

const catalogRoot = resolve("catalog");

function generatedDestinations(
  items: readonly { readonly path: string; readonly action: string }[],
): readonly string[] {
  return items
    .filter(
      (item) =>
        item.action === "generated-candidate" || item.action === "create",
    )
    .map((item) => item.path)
    .sort((left, right) => left.localeCompare(right));
}

describe("existing-project adoption post-apply canonical consistency", () => {
  it("matches canonical adopt dry-run generated destinations including Codex skills", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like", catalogRoot },
      fs,
    );
    const proposal = await adoptProject(
      {
        root: "/project",
        profile: preview.profile,
        adapters: [...preview.detectedAdapters],
        dryRun: true,
        catalogRoot,
      },
      fs,
    );
    expect(preview.detectedAdapters).toEqual(["codex", "cursor"]);
    expect(generatedDestinations(preview.items)).toEqual(
      generatedDestinations(proposal.items),
    );
    expect(
      preview.items.some(
        (item) =>
          item.path.startsWith(".agents/skills/") &&
          item.action === "generated-candidate",
      ),
    ).toBe(true);
  });

  it("applies a keep-project-owned Vii-like plan that doctor and diff accept", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const agents = await fs.read("/project/AGENTS.md");
    const workflow = await fs.read("/project/.github/workflows/validate.yml");
    const template = await fs.read("/project/.github/PULL_REQUEST_TEMPLATE.md");
    const cache = await fs.read("/project/.nx/cache/terminalOutputs/run-1.txt");
    const { preview, plan, approval } = await preparedApproved(
      fs,
      1_700_000_000_000,
      { catalogRoot },
    );
    const decided = await validateExistingProjectAdoptionDecisions(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        catalogRoot,
      },
      fs,
    );
    expect(decided.applied).toBe(false);
    const revalidated = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: plan,
        catalogRoot,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(revalidated.status).toBe("valid");
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        catalogRoot,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(result.status).toBe("applied");
    expect(result.ready).toBe(true);
    expect(result.doctor?.errorCount).toBe(0);
    expect(result.doctor?.codes).not.toContain("adapter-output-stale");
    expect(result.doctor?.codes).not.toContain("schema-constraint-failed");
    expect(result.diff?.unmanagedDriftPaths).toEqual([]);
    expect(await fs.read("/project/AGENTS.md")).toBe(agents);
    expect(await fs.read("/project/.github/workflows/validate.yml")).toBe(
      workflow,
    );
    expect(await fs.read("/project/.github/PULL_REQUEST_TEMPLATE.md")).toBe(
      template,
    );
    expect(await fs.read("/project/.nx/cache/terminalOutputs/run-1.txt")).toBe(
      cache,
    );
    const validator = await createArtifactValidator(
      resolve(catalogRoot, "schemas"),
    );
    const lock = await fs.read("/project/.aif/manifest.lock.json");
    const sourceMap = await fs.read("/project/.aif/source-map.json");
    expect(
      validator.validate({
        artifactType: "manifest-lock",
        documentPath: ".aif/manifest.lock.json",
        format: "json",
        source: lock,
      }).status,
    ).toBe("valid");
    expect(
      validator.validate({
        artifactType: "source-map",
        documentPath: ".aif/source-map.json",
        format: "json",
        source: sourceMap,
      }).status,
    ).toBe("valid");
    const parsedLock = JSON.parse(lock) as {
      sourceHashes: readonly unknown[];
    };
    const parsedMap = JSON.parse(sourceMap) as {
      files: readonly { path: string; sources: readonly string[] }[];
    };
    expect(parsedLock.sourceHashes.length).toBeGreaterThan(0);
    const cursorEntries = parsedMap.files.filter((file) =>
      file.path.startsWith(".cursor/rules/"),
    );
    expect(cursorEntries.length).toBeGreaterThan(0);
    expect(cursorEntries.every((file) => file.sources.length > 0)).toBe(true);
    const doctor = await doctorProject(
      {
        root: "/project",
        profile: plan.profile,
        adapters: ["codex", "cursor"],
        dryRun: true,
        catalogRoot,
        projectOwnedMappings: [
          { source: "AGENTS.md", destination: "AGENTS.md" },
        ],
      },
      fs,
    );
    expect(
      doctor.findings.filter((finding) => finding.severity === "error"),
    ).toEqual([]);
    const diff = await diffProject(
      {
        root: "/project",
        profile: plan.profile,
        adapters: ["codex", "cursor"],
        dryRun: true,
        catalogRoot,
        projectOwnedMappings: [
          { source: "AGENTS.md", destination: "AGENTS.md" },
        ],
      },
      fs,
    );
    expect(diff.diagnostics).not.toContain("artifact-validation-failed");
    expect(
      diff.changes.filter((change) =>
        ["conflict", "modified", "stale", "security-error"].includes(
          change.kind,
        ),
      ),
    ).toEqual([]);
    const replay = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        catalogRoot,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(replay.status).toBe("already-applied");
    expect(replay.changesApplied).toBe(0);
    expect(replay.ready).toBe(true);
    const doctorReplay = await doctorProject(
      {
        root: "/project",
        profile: plan.profile,
        adapters: ["codex", "cursor"],
        dryRun: true,
        catalogRoot,
        projectOwnedMappings: [
          { source: "AGENTS.md", destination: "AGENTS.md" },
        ],
      },
      fs,
    );
    expect(
      doctorReplay.findings.filter((finding) => finding.severity === "error"),
    ).toEqual([]);
  });
});
