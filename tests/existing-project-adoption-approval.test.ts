import { describe, expect, it } from "vitest";
import {
  approveExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  prepareExistingProjectAdoptionPlan,
  prepareExistingProjectAdoptionPreparedPlan,
} from "@intentloom/application";
import {
  EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
  EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createExistingProjectAdoptionApproveRequest,
  parseDaemonRequest,
  parseExistingProjectAdoptionApproveViewModel,
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

async function preparedPlan(
  fs: ReturnType<typeof createMemoryFileSystem>,
  now = 1_700_000_000_000,
) {
  const preview = await prepareExistingProjectAdoptionPlan(
    { root: "/project", projectId: "vii-like" },
    fs,
  );
  return prepareExistingProjectAdoptionPreparedPlan(
    {
      root: "/project",
      projectId: "vii-like",
      previewIdentity: preview.previewIdentity,
      decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      now: () => now,
    },
    fs,
  );
}

describe("existing-project adoption approval", () => {
  it("approves a valid prepared plan without writes", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const prepared = await preparedPlan(fs);
    const approvedAt = 1_700_000_000_100;
    const result = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: prepared.plan!.preparedPlanId,
        planDigest: prepared.plan!.planDigest,
        preparedPlan: prepared.plan!,
        now: () => approvedAt,
      },
      fs,
    );
    expect(result.status).toBe("approved");
    expect(result.approved).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.changesApplied).toBe(0);
    expect(result.approval?.planDigest).toBe(prepared.plan!.planDigest);
    expect(result.approval?.preparedPlanId).toBe(prepared.plan!.preparedPlanId);
    expect(result.approval?.projectFingerprint).toBe(
      prepared.plan!.projectFingerprint,
    );
    expect(result.approval?.approvedAt).toBe(approvedAt);
    expect(result.approval?.approvalValidUntil).toBe(prepared.plan!.expiresAt);
    expect(result.approval?.approvalValidUntil).toBeLessThanOrEqual(
      prepared.plan!.expiresAt,
    );
    expect(result.approval?.approvalSource).toBe(
      EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
    );
    expect(result.approval?.approvalToken).toBe(
      `approved:${prepared.plan!.planDigest}`,
    );
    expect(snapshot(fs.files)).toBe(before);
  });

  it("denies expired, stale, tampered, root, and unresolved plans", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const prepared = await preparedPlan(fs);
    const plan = prepared.plan!;
    const expired = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        now: () => plan.expiresAt + 1,
      },
      fs,
    );
    expect(expired.status).toBe("denied");
    expect(expired.reasons).toContain("expired");
    await fs.write("/project/AGENTS.md", "changed agents\n");
    const stale = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        preparedPlan: plan,
        now: () => 1_700_000_000_100,
      },
      fs,
    );
    expect(stale.status).toBe("denied");
    expect(stale.reasons).toContain("stale-fingerprint");
    const fresh = createMemoryFileSystem(viiLikeTree());
    const freshPlan = (await preparedPlan(fresh)).plan!;
    const tamperedDigest = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: freshPlan.preparedPlanId,
        planDigest: "b".repeat(64),
        preparedPlan: freshPlan,
        now: () => 1_700_000_000_100,
      },
      fresh,
    );
    expect(tamperedDigest.reasons).toContain("tampered-digest");
    const tamperedId = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: "prepared-plan-not-this-plan-id-xx",
        planDigest: freshPlan.planDigest,
        preparedPlan: freshPlan,
        now: () => 1_700_000_000_100,
      },
      fresh,
    );
    expect(tamperedId.reasons).toContain("tampered-plan-id");
    const otherRoot = createMemoryFileSystem(
      Object.fromEntries(
        Object.entries(viiLikeTree()).map(([path, content]) => [
          path.replace("/project", "/other"),
          content,
        ]),
      ),
    );
    const wrongRoot = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/other",
        preparedPlanId: freshPlan.preparedPlanId,
        planDigest: freshPlan.planDigest,
        preparedPlan: freshPlan,
        now: () => 1_700_000_000_100,
      },
      otherRoot,
    );
    expect(wrongRoot.reasons).toContain("root-mismatch");
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fresh,
    );
    const unresolved = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [],
        now: () => 1_700_000_000_000,
      },
      fresh,
    );
    const deniedUnresolved = await approveExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlanId: unresolved.plan!.preparedPlanId,
        planDigest: unresolved.plan!.planDigest,
        preparedPlan: unresolved.plan!,
        now: () => 1_700_000_000_100,
      },
      fresh,
    );
    expect(deniedUnresolved.status).toBe("denied");
    expect(deniedUnresolved.reasons).toContain("invalid-decisions");
    expect(deniedUnresolved.applied).toBe(false);
    expect(deniedUnresolved.changesApplied).toBe(0);
    expect(snapshot(fs.files)).not.toBe(before);
    expect(snapshot(fresh.files)).toBe(
      snapshot(createMemoryFileSystem(viiLikeTree()).files),
    );
  });

  it("round-trips the approve protocol and rejects malformed payloads", () => {
    const request = createExistingProjectAdoptionApproveRequest(
      1,
      "/project",
      "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
      "b".repeat(64),
      {
        schemaVersion: 1,
        readOnly: true,
        classification: "read-only",
        applied: false,
        changesApplied: 0,
        approved: false,
        root: "/project",
        projectId: "vii-like",
        profile: "typescript",
        workspaceTopology: "nx",
        detectedAdapters: ["codex"],
        previewIdentity: "a".repeat(64),
        preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
        planDigest: "b".repeat(64),
        projectFingerprint: "c".repeat(64),
        createdAt: 1_700_000_000_000,
        expiresAt: 1_700_000_900_000,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        affectedPaths: ["AGENTS.md"],
        plannedActions: [
          {
            path: "AGENTS.md",
            action: "map-existing-project-owned",
            currentClassification: "project-owned",
            proposedClassification: "project-owned",
            manualDecisionRequired: false,
          },
        ],
        diagnostics: [],
        remainingManualDecisionPaths: [],
      },
    );
    expect(request.method).toBe(EXISTING_PROJECT_ADOPTION_APPROVE_METHOD);
    expect(parseDaemonRequest(request).method).toBe(
      EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
    );
    expect(JSON.parse(JSON.stringify(request)).method).toBe(
      EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
    );
    expect(() =>
      parseExistingProjectAdoptionApproveViewModel({
        readOnly: true,
        classification: "read-only",
        applied: false,
        changesApplied: 0,
        approved: true,
        status: "approved",
        reasons: [],
        approval: null,
        plan: request.params.preparedPlan,
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        ...request,
        params: { ...request.params, planDigest: "not-a-digest" },
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        ...request,
        params: {
          ...request.params,
          preparedPlan: {
            ...request.params.preparedPlan,
            createdAt: 1.5,
          },
        },
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        ...request,
        params: {
          ...request.params,
          preparedPlan: {
            ...request.params.preparedPlan,
            schemaVersion: 2,
          },
        },
      }),
    ).toThrow(ProtocolValidationError);
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
