import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  applyExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
} from "@intentloom/application";
import {
  preparedApproved,
  snapshot,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";

describe("existing-project adoption apply", () => {
  it("applies a valid approval, preserves project-owned files, and is ready", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const agents = await fs.read("/project/AGENTS.md");
    const workflow = await fs.read("/project/.github/workflows/validate.yml");
    const { plan, approval } = await preparedApproved(fs);
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(result.status).toBe("applied");
    expect(result.applied).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.changesApplied).toBeGreaterThan(0);
    expect(result.appliedPaths.some((path) => path.startsWith(".aif/"))).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toContain("project agents");
    expect(JSON.stringify(result)).not.toContain("SECRET=1");
    expect(await fs.read("/project/AGENTS.md")).toBe(agents);
    expect(await fs.read("/project/.github/workflows/validate.yml")).toBe(
      workflow,
    );
    expect(await fs.exists("/project/.aif/config.yaml")).toBe(true);
    expect(result.doctor?.errorCount).toBe(0);
    expect(result.diff?.unmanagedDriftPaths).toEqual([]);
    expect(result.inspectionReadiness).toBe("ready");
    const replay = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(replay.status).toBe("already-applied");
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.changesApplied).toBe(0);
    expect(replay.ready).toBe(true);
  });

  it("rejects stale, expired, tampered, root, and symlink cases with zero writes", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    await fs.write("/project/README.md", "changed readme\n");
    const stale = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(stale.status).toBe("denied");
    expect(stale.reasons).toContain("stale-fingerprint");
    expect(stale.applied).toBe(false);
    expect(await fs.exists("/project/.aif/config.yaml")).toBe(false);
    const fs2 = createMemoryFileSystem(viiLikeTree());
    const next = await preparedApproved(fs2);
    const expiredPlan = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: next.plan.preparedPlanId,
        planDigest: next.plan.planDigest,
        preparedPlan: next.plan,
        approval: next.approval,
        now: () => next.plan.expiresAt + 1,
      },
      fs2,
    );
    expect(expiredPlan.reasons).toContain("expired");
    expect(snapshot(fs2.files)).toBe(
      snapshot(createMemoryFileSystem(viiLikeTree()).files),
    );
    const tampered = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: next.plan.preparedPlanId,
        planDigest: "d".repeat(64),
        preparedPlan: next.plan,
        approval: next.approval,
        now: () => 1_700_000_000_200,
      },
      fs2,
    );
    expect(tampered.reasons).toContain("tampered-digest");
    const badApproval = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: next.plan.preparedPlanId,
        planDigest: next.plan.planDigest,
        preparedPlan: next.plan,
        approval: { ...next.approval, approvalDigest: "e".repeat(64) },
        now: () => 1_700_000_000_200,
      },
      fs2,
    );
    expect(badApproval.reasons).toContain("tampered-approval");
    const rootMismatch = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/other",
        preparedPlanId: next.plan.preparedPlanId,
        planDigest: next.plan.planDigest,
        preparedPlan: next.plan,
        approval: next.approval,
        now: () => 1_700_000_000_200,
      },
      createMemoryFileSystem({ "/other/package.json": "{}" }),
    );
    expect(rootMismatch.reasons).toContain("root-mismatch");
    const linked = createMemoryFileSystem(viiLikeTree());
    linked.isSymbolicLink = async (path) =>
      path === "/project" || path === resolve("/project");
    const symlinkRoot = await preparedApproved(
      createMemoryFileSystem(viiLikeTree()),
    );
    const symlink = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: symlinkRoot.plan.preparedPlanId,
        planDigest: symlinkRoot.plan.planDigest,
        preparedPlan: symlinkRoot.plan,
        approval: symlinkRoot.approval,
        now: () => 1_700_000_000_200,
      },
      linked,
    );
    expect(symlink.reasons).toContain("symlink-root");
  });
});
