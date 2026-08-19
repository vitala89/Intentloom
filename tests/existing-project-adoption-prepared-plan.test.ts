import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  prepareExistingProjectAdoptionPlan,
  prepareExistingProjectAdoptionPreparedPlan,
  revalidateExistingProjectAdoptionPreparedPlan,
} from "@intentloom/application";
import {
  EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createExistingProjectAdoptionPrepareRequest,
  parseDaemonRequest,
  parseExistingProjectAdoptionPreparedPlan,
  parseExistingProjectAdoptionPrepareViewModel,
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

describe("existing-project adoption prepared plan", () => {
  it("prepares a deterministic envelope for keep-project-owned without writes", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const first = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    const second = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    expect(first.status).toBe("prepared");
    expect(first.plan?.approved).toBe(false);
    expect(first.plan?.applied).toBe(false);
    expect(first.plan?.changesApplied).toBe(0);
    expect(first.plan?.planDigest).toBe(second.plan?.planDigest);
    expect(first.plan?.preparedPlanId).toBe(second.plan?.preparedPlanId);
    expect(first.plan?.projectFingerprint).toBe(
      second.plan?.projectFingerprint,
    );
    expect(snapshot(fs.files)).toBe(before);

    const changedDecision = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    expect(changedDecision.plan?.planDigest).not.toBe(first.plan?.planDigest);
  });

  it("changes fingerprint after a relevant file edit and ignores .nx/cache", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const prepared = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    await fs.write(
      "/project/.nx/cache/terminalOutputs/run-1.txt",
      "new cache\n",
    );
    const afterCache = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: prepared.plan!,
        now: () => 1_700_000_000_100,
      },
      fs,
    );
    expect(afterCache.status).toBe("valid");
    await fs.write("/project/AGENTS.md", "changed agents\n");
    const afterEdit = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: prepared.plan!,
        now: () => 1_700_000_000_200,
      },
      fs,
    );
    expect(afterEdit.status).toBe("stale");
    expect(afterEdit.reasons).toContain("stale-fingerprint");
  });

  it("revalidates expiry, tamper, root, and unsupported decisions fail-closed", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = snapshot(fs.files);
    const preview = await prepareExistingProjectAdoptionPlan(
      { root: "/project", projectId: "vii-like" },
      fs,
    );
    const prepared = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    const valid = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: prepared.plan!,
        now: () => 1_700_000_000_100,
      },
      fs,
    );
    expect(valid.status).toBe("valid");
    const expired = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: prepared.plan!,
        now: () => prepared.plan!.expiresAt + 1,
      },
      fs,
    );
    expect(expired.status).toBe("expired");
    const tamperedDigest = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        preparedPlan: { ...prepared.plan!, planDigest: "b".repeat(64) },
        now: () => 1_700_000_000_100,
      },
      fs,
    );
    expect(tamperedDigest.status).toBe("invalid");
    expect(tamperedDigest.reasons).toContain("tampered-digest");
    const otherRoot = createMemoryFileSystem(
      Object.fromEntries(
        Object.entries(viiLikeTree()).map(([path, content]) => [
          path.replace("/project", "/other"),
          content,
        ]),
      ),
    );
    const wrongRoot = await revalidateExistingProjectAdoptionPreparedPlan(
      {
        root: "/other",
        preparedPlan: prepared.plan!,
        now: () => 1_700_000_000_100,
      },
      otherRoot,
    );
    expect(wrongRoot.reasons).toContain("root-mismatch");
    const invalid = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "map-existing-compatible-document" },
        ],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    expect(invalid.status).toBe("invalid");
    expect(invalid.plan).toBeNull();
    const duplicate = await prepareExistingProjectAdoptionPreparedPlan(
      {
        root: "/project",
        projectId: "vii-like",
        previewIdentity: preview.previewIdentity,
        decisions: [
          { path: "AGENTS.md", kind: "keep-project-owned" },
          { path: "AGENTS.md", kind: "keep-project-owned" },
        ],
        now: () => 1_700_000_000_000,
      },
      fs,
    );
    expect(duplicate.status).toBe("invalid");
    expect(snapshot(fs.files)).toBe(before);
  });

  it("parses prepare protocol and rejects malformed envelopes", () => {
    const request = createExistingProjectAdoptionPrepareRequest(
      1,
      "/project",
      "a".repeat(64),
      [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      "vii-like",
    );
    expect(request.method).toBe(EXISTING_PROJECT_ADOPTION_PREPARE_METHOD);
    expect(parseDaemonRequest(request).method).toBe(
      EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
    );
    expect(() =>
      parseExistingProjectAdoptionPrepareViewModel({
        readOnly: true,
        classification: "read-only",
        applied: false,
        changesApplied: 0,
        approved: false,
        status: "prepared",
        reasons: [],
        plan: null,
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseExistingProjectAdoptionPreparedPlan({
        schemaVersion: 2,
      }),
    ).toThrow(ProtocolValidationError);
    expect(EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD).toContain("revalidate");
    expect(PROTOCOL_VERSION).toBeTruthy();
  });
});
