import { describe, expect, it } from "vitest";
import { applyExistingProjectAdoptionPreparedPlan } from "@intentloom/application";
import {
  preparedApproved,
  snapshot,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";
import { createMemoryFileSystem } from "@intentloom/application";

describe("existing-project adoption apply rollback", () => {
  it("rolls back a handled write failure and restores previous bytes", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const before = snapshot(fs.files);
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        transactionOptions: { failAt: "generated-commit" },
      },
      fs,
    );
    expect(result.status).toBe("rolled-back");
    expect(result.applied).toBe(false);
    expect(result.rollbackAttempted).toBe(true);
    expect(result.rollbackCompleted).toBe(true);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("returns failed-incomplete when rollback cannot finish", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        transactionOptions: {
          failAt: "post-write-consistency",
          rollbackFailPaths: [".aif/config.yaml"],
        },
      },
      fs,
    );
    expect(result.status).toBe("failed-incomplete");
    expect(result.reasons).toContain("incomplete-rollback");
    expect(result.recoveryGuidance).toMatch(/repair/i);
    expect(result.applied).toBe(false);
  });

  it("keeps a committed transaction when post-apply health needs attention", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const result = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        onAfterCommit: async () => {
          await fs.write("/project/.aif/config.yaml", "broken: [");
        },
      },
      fs,
    );
    expect(result.status).toBe("applied-needs-attention");
    expect(result.applied).toBe(true);
    expect(result.ready).toBe(false);
    expect(await fs.read("/project/.aif/config.yaml")).toBe("broken: [");
  });

  it("cancels before mutation with zero writes and defers cancel after commit starts", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const { plan, approval } = await preparedApproved(fs);
    const before = snapshot(fs.files);
    const early = new AbortController();
    early.abort();
    const cancelled = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        signal: early.signal,
      },
      fs,
    );
    expect(cancelled.status).toBe("denied");
    expect(cancelled.reasons).toContain("cancelled");
    expect(snapshot(fs.files)).toBe(before);
    const during = new AbortController();
    const committed = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        signal: during.signal,
        onBeforeMutation: async () => {
          during.abort();
        },
      },
      fs,
    );
    expect(committed.status).toBe("denied");
    expect(snapshot(fs.files)).toBe(before);
    const deferred = new AbortController();
    const originalWrite = fs.write.bind(fs);
    fs.write = async (path, content) => {
      deferred.abort();
      return originalWrite(path, content);
    };
    const finished = await applyExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        approval,
        now: () => 1_700_000_000_200,
        signal: deferred.signal,
      },
      fs,
    );
    expect(finished.applied).toBe(true);
    expect(finished.cancelledAfterCommit).toBe(true);
  });
});
