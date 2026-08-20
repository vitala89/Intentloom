import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyExistingProjectAdoptionPreparedPlan,
  approveExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  evaluateExistingProjectAdoptionApplyGates,
  liveExistingProjectAdoptionPreparedPlanState,
  nodeFileSystem,
  prepareExistingProjectAdoptionPlan,
  prepareExistingProjectAdoptionPreparedPlan,
  revalidateExistingProjectAdoptionPreparedPlan,
  syncProject,
} from "@intentloom/application";
import {
  parseExistingProjectAdoptionApproval,
  parseExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import {
  preparedApproved,
  snapshot,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";

const catalogRoot = resolve("catalog");
const now = 1_700_000_000_000;
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function writeTree(
  baseDirectory: string,
  tree: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(tree)) {
    const absolutePath = join(baseDirectory, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

describe("existing-project apply after immediate approve", () => {
  it("does not deny a catalog-bound memory-fs plan with no mutations", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const { preview, plan, approval } = await preparedApproved(fs, now, {
      catalogRoot,
    });
    const afterApprove = snapshot(fs.files);
    const revalidated = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: plan,
        catalogRoot,
        now: () => now + 200,
      },
      fs,
    );
    const live = await liveExistingProjectAdoptionPreparedPlanState(
      "/project",
      "vii-like",
      plan.decisions,
      fs,
      { catalogRoot },
    );
    const gates = await evaluateExistingProjectAdoptionApplyGates(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        catalogRoot,
        now: () => now + 300,
      },
      fs,
    );
    const dry = await syncProject(
      {
        root: "/project",
        profile: plan.profile,
        adapters: ["codex", "cursor"],
        dryRun: true,
        catalogRoot,
        profileConfirmed: true,
        projectOwnedMappings: [
          { source: "AGENTS.md", destination: "AGENTS.md" },
        ],
      },
      fs,
    );
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        catalogRoot,
        now: () => now + 400,
      },
      fs,
    );
    expect({
      previewIdentity: {
        plan: plan.previewIdentity,
        live: live.preview.previewIdentity,
      },
      fingerprint: {
        plan: plan.projectFingerprint,
        live: live.fingerprint,
        approval: approval.projectFingerprint,
      },
      digest: { plan: plan.planDigest, live: live.preview.previewIdentity },
      revalidate: revalidated.status,
      revalidateReasons: revalidated.reasons,
      gates,
      dryKind: "dryRun" in dry,
      dryConflicts: "dryRun" in dry ? dry.conflictFiles : [],
      dryCreated: "dryRun" in dry ? dry.createdFiles : [],
      applyStatus: result.status,
      applyReasons: result.reasons,
      beforeEqualsAfterApprove: before === afterApprove,
      readiness: preview.readiness,
    }).toMatchObject({
      revalidate: "valid",
      gates: [],
      applyStatus: "applied",
      applyReasons: [],
    });
    expect(before).toBe(afterApprove);
    expect(live.fingerprint).toBe(plan.projectFingerprint);
    expect(live.preview.previewIdentity).toBe(plan.previewIdentity);
  });

  it("does not deny a new approved plan on an already-adopted tree", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const first = await preparedApproved(fs, now, { catalogRoot });
    const applied = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: first.plan.preparedPlanId,
        planDigest: first.plan.planDigest,
        preparedPlan: first.plan,
        approval: first.approval,
        catalogRoot,
        now: () => now + 400,
      },
      fs,
    );
    expect(applied.status).toBe("applied");
    const beforeSecondPrepare = snapshot(fs.files);
    const second = await preparedApproved(fs, now + 1_000, { catalogRoot });
    const afterApprove = snapshot(fs.files);
    const live = await liveExistingProjectAdoptionPreparedPlanState(
      "/project",
      "vii-like",
      second.plan.decisions,
      fs,
      { catalogRoot },
    );
    const gates = await evaluateExistingProjectAdoptionApplyGates(
      {
        root: "/project",
        preparedPlanId: second.plan.preparedPlanId,
        planDigest: second.plan.planDigest,
        preparedPlan: second.plan,
        approval: second.approval,
        catalogRoot,
        now: () => now + 1_400,
      },
      fs,
    );
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: second.plan.preparedPlanId,
        planDigest: second.plan.planDigest,
        preparedPlan: second.plan,
        approval: second.approval,
        catalogRoot,
        now: () => now + 1_500,
      },
      fs,
    );
    expect({
      firstStatus: applied.status,
      secondStatus: result.status,
      secondReasons: result.reasons,
      gates,
      fingerprint: {
        plan: second.plan.projectFingerprint,
        live: live.fingerprint,
      },
      previewIdentity: {
        plan: second.plan.previewIdentity,
        live: live.preview.previewIdentity,
      },
      writesDuringApprove: beforeSecondPrepare === afterApprove,
      alreadyApplied: result.alreadyApplied,
    }).toMatchObject({
      secondReasons: [],
      gates: [],
    });
    expect(beforeSecondPrepare).toBe(afterApprove);
    expect(["already-applied", "applied"]).toContain(result.status);
  });

  it("does not deny after JSON round-trip of plan and approval", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs, now, { catalogRoot });
    const roundPlan = parseExistingProjectAdoptionPreparedPlan(
      JSON.parse(JSON.stringify(plan)) as Record<string, unknown>,
    );
    const roundApproval = parseExistingProjectAdoptionApproval(
      JSON.parse(JSON.stringify(approval)) as Record<string, unknown>,
    );
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: roundPlan.preparedPlanId,
        planDigest: roundPlan.planDigest,
        preparedPlan: roundPlan,
        approval: roundApproval,
        catalogRoot,
        now: () => now + 400,
      },
      fs,
    );
    expect(result.reasons).toEqual([]);
    expect(result.status).toBe("applied");
  });

  it("reports exact Apply reasons on an already-ready tree with differing metadata", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const first = await preparedApproved(fs, now, { catalogRoot });
    expect(
      (
        await applyExistingProjectAdoptionPreparedPlan(
          {
            root: "/project",
            preparedPlanId: first.plan.preparedPlanId,
            planDigest: first.plan.planDigest,
            preparedPlan: first.plan,
            approval: first.approval,
            catalogRoot,
            now: () => now + 400,
          },
          fs,
        )
      ).status,
    ).toBe("applied");
    await fs.write(
      "/project/.aif/config.yaml",
      "schemaVersion: 0\nprofile: generic\n",
    );
    await fs.write(
      "/project/.cursor/rules/intentloom-core.mdc",
      "# drifted core\n",
    );
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like", catalogRoot },
      fs,
    );
    const prepared = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        catalogRoot,
        now: () => now,
      },
      fs,
    );
    expect({
      readiness: preview.readiness,
      prepareStatus: prepared.status,
      prepareReasons: prepared.reasons,
      remainingManual: prepared.plan?.remainingManualDecisionPaths,
      planPresent: prepared.plan !== null,
    }).toEqual({
      readiness: "ready",
      prepareStatus: "prepared",
      prepareReasons: [],
      remainingManual: [],
      planPresent: true,
    });
    const approved = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        catalogRoot,
        now: () => now + 100,
      },
      fs,
    );
    expect({
      approveStatus: approved.status,
      approveReasons: approved.reasons,
      approvalPresent: approved.approval !== null,
    }).toEqual({
      approveStatus: "approved",
      approveReasons: [],
      approvalPresent: true,
    });
    const gates = await evaluateExistingProjectAdoptionApplyGates(
      {
        root: "/project",
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        approval: approved.approval!,
        catalogRoot,
        now: () => now + 300,
      },
      fs,
    );
    const dry = await syncProject(
      {
        root: "/project",
        profile: prepared.plan!.profile,
        adapters: ["codex", "cursor"],
        dryRun: true,
        catalogRoot,
        profileConfirmed: true,
        projectOwnedMappings: [
          { source: "AGENTS.md", destination: "AGENTS.md" },
        ],
      },
      fs,
    );
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        approval: approved.approval!,
        catalogRoot,
        now: () => now + 400,
      },
      fs,
    );
    expect({
      readiness: preview.readiness,
      prepareStatus: prepared.status,
      prepareReasons: prepared.reasons,
      approveStatus: approved.status,
      approveReasons: approved.reasons,
      gates,
      dryConflicts: "dryRun" in dry ? dry.conflictFiles : [],
      applyStatus: result.status,
      applyReasons: result.reasons,
      remainingManual: prepared.plan?.remainingManualDecisionPaths,
    }).toEqual({
      readiness: "ready",
      prepareStatus: "prepared",
      prepareReasons: [],
      approveStatus: "approved",
      approveReasons: [],
      gates: [],
      dryConflicts: [],
      applyStatus: "applied",
      applyReasons: [],
      remainingManual: [],
    });
    expect(await fs.read("/project/.aif/config.yaml")).not.toContain(
      "schemaVersion: 0",
    );
    expect(
      await fs.read("/project/.cursor/rules/intentloom-core.mdc"),
    ).not.toBe("# drifted core\n");
    expect(await fs.read("/project/AGENTS.md")).toBe("project agents\n");
  });

  it("does not deny catalog-bound apply on a real temp directory", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "il-stale-root-"));
    roots.push(projectRoot);
    await writeTree(projectRoot, {
      "nx.json": JSON.stringify({ targetDefaults: {} }),
      "package.json": JSON.stringify({
        devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
      }),
      "tsconfig.json": "{}",
      "README.md": "vii workspace\n",
      "AGENTS.md": "project agents\n",
      ".github/workflows/validate.yml": "name: validate\n",
      ".github/PULL_REQUEST_TEMPLATE.md": "## Summary\n",
    });
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: projectRoot, projectId: "vii-like", catalogRoot },
      nodeFileSystem,
    );
    const prepared = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: projectRoot,
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        catalogRoot,
        now: () => now,
      },
      nodeFileSystem,
    );
    const approved = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: projectRoot,
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        catalogRoot,
        now: () => now + 100,
      },
      nodeFileSystem,
    );
    const agents = await readFile(join(projectRoot, "AGENTS.md"), "utf8");
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: projectRoot,
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        approval: approved.approval!,
        catalogRoot,
        now: () => now + 400,
      },
      nodeFileSystem,
    );
    expect({
      applyStatus: result.status,
      applyReasons: result.reasons,
      gatesWouldShow: result.diagnostics,
    }).toMatchObject({
      applyReasons: [],
    });
    expect(result.status).toBe("applied");
    expect(await readFile(join(projectRoot, "AGENTS.md"), "utf8")).toBe(agents);
  });

  it("still denies expiry and genuine AGENTS.md mutation with zero writes", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs, now, { catalogRoot });
    const expired = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        catalogRoot,
        now: () => plan.expiresAt + 1,
      },
      fs,
    );
    expect(expired.status).toBe("denied");
    expect(expired.reasons).toContain("expired");
    expect(expired.changesApplied).toBe(0);
    expect(await fs.exists("/project/.aif/config.yaml")).toBe(false);
    const fs2 = createMemoryFileSystem(viiLikeTree());
    const next = await preparedApproved(fs2, now, { catalogRoot });
    const before = snapshot(fs2.files);
    await fs2.write("/project/AGENTS.md", "mutated agents\n");
    const stale = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: next.plan.preparedPlanId,
        planDigest: next.plan.planDigest,
        preparedPlan: next.plan,
        approval: next.approval,
        catalogRoot,
        now: () => now + 400,
      },
      fs2,
    );
    expect(stale.status).toBe("denied");
    expect(stale.reasons).toContain("stale-fingerprint");
    expect(stale.changesApplied).toBe(0);
    expect(snapshot(fs2.files)).toBe(
      snapshot(
        createMemoryFileSystem(
          viiLikeTree({ "/project/AGENTS.md": "mutated agents\n" }),
        ).files,
      ),
    );
    expect(before).not.toBe(snapshot(fs2.files));
  });
});
