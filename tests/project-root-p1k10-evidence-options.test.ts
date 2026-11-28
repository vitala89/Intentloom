import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const evidenceGitSource = fileURLToPath(
  new URL("../packages/evidence-git/src/index.ts", import.meta.url),
);

const evidenceCalls = vi.hoisted(() => [] as Record<string, unknown>[]);
const evidenceDiagnostics = vi.hoisted(() => ["marker"]);

const scratch: string[] = [];

afterEach(async () => {
  evidenceCalls.splice(0);
  vi.resetModules();
  vi.doUnmock("@intentloom/evidence-git");
  vi.doUnmock(evidenceGitSource);
  await Promise.all(
    scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function loadTimelineProject() {
  vi.resetModules();
  const factory = async () => {
    const actual =
      await vi.importActual<typeof import("@intentloom/evidence-git")>(
        evidenceGitSource,
      );
    return {
      ...actual,
      collectGitEvidence: async (options: Record<string, unknown>) => {
        evidenceCalls.push(options);
        return {
          operationVersion: 1 as const,
          source: "local-git" as const,
          trust: "local-observed-unverified" as const,
          root: "." as const,
          status: "available" as const,
          commitLimit: 50,
          commits: [],
          diagnostics: evidenceDiagnostics,
        };
      },
    };
  };
  vi.doMock("@intentloom/evidence-git", factory);
  vi.doMock(evidenceGitSource, factory);
  const application = await import("@intentloom/application");
  return application.timelineProject;
}

describe("P1K.10 timeline evidence option omission", () => {
  it("omits undefined evidence options and copies diagnostics", async () => {
    const timelineProject = await loadTimelineProject();
    const parent = await mkdtemp(join(tmpdir(), "intentloom-p1k10-omit-"));
    scratch.push(parent);
    const result = await timelineProject({
      root: parent,
      caseId: "release:omit",
    });
    expect(Object.keys(evidenceCalls[0] ?? {})).toEqual(["root"]);
    expect(evidenceCalls[0]?.root).toBe(resolve(parent));
    expect(result.diagnostics).toEqual(["marker"]);
    expect(result.diagnostics).not.toBe(evidenceDiagnostics);

    evidenceCalls.splice(0);
    await timelineProject({
      root: parent,
      caseId: "release:limit",
      limit: 3,
    });
    expect(Object.keys(evidenceCalls[0] ?? {}).sort()).toEqual([
      "limit",
      "root",
    ]);
  });

  it("does not collect evidence when the root is missing", async () => {
    const timelineProject = await loadTimelineProject();
    const missing = join(tmpdir(), "intentloom-p1k10-omit-missing");
    await expect(
      timelineProject({ root: missing, caseId: "release:missing" }),
    ).rejects.toMatchObject({ clientErrorCode: "invalid_root" });
    expect(evidenceCalls).toEqual([]);
  });
});
