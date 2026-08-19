import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  applyExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  withCanonicalProjectRootLock,
} from "@intentloom/application";
import {
  preparedApproved,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";

describe("existing-project adoption apply lock", () => {
  it("serializes two Apply calls on the same root", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const holdGate: { release?: () => void } = {};
    const hold = new Promise<void>((resolveHold) => {
      holdGate.release = resolveHold;
    });
    const first = applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        onBeforeMutation: () => hold,
      },
      fs,
    );
    const second = applyExistingProjectAdoptionPreparedPlan(
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
    holdGate.release?.();
    const [one, two] = await Promise.all([first, second]);
    const applied = [one, two].filter((result) => result.status === "applied");
    const replay = [one, two].filter(
      (result) => result.status === "already-applied",
    );
    expect(applied).toHaveLength(1);
    expect(replay).toHaveLength(1);
  });

  it("allows different roots to proceed independently", async () => {
    const left = createMemoryFileSystem({
      ...viiLikeTree(),
      "/other/nx.json": "{}",
      "/other/package.json": JSON.stringify({
        devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
      }),
      "/other/tsconfig.json": "{}",
      "/other/README.md": "other\n",
      "/other/AGENTS.md": "other agents\n",
    });
    const rightFiles: Record<string, string> = {};
    for (const [path, content] of left.files) {
      rightFiles[path] = content;
    }
    const right = createMemoryFileSystem(rightFiles);
    const first = await preparedApproved(left);
    let order = "";
    const gate = new Promise<void>((resolveGate) => {
      void withCanonicalProjectRootLock("/project", async () => {
        order += "a";
        await withCanonicalProjectRootLock("/other", async () => {
          order += "b";
        });
        order += "c";
        resolveGate();
      });
    });
    await gate;
    expect(order).toBe("abc");
    expect(first.plan.root).toBe(resolve("/project"));
    expect(right.files.size).toBeGreaterThan(0);
  });

  it("releases the lock after a rejected precondition", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const denied = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => plan.expiresAt + 1,
      },
      fs,
    );
    expect(denied.status).toBe("denied");
    const next = await applyExistingProjectAdoptionPreparedPlan(
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
    expect(next.status).toBe("applied");
  });
});
