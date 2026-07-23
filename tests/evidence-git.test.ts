import { describe, expect, it } from "vitest";
import {
  collectGitEvidence,
  createReleaseTimeline,
} from "../packages/evidence-git/src/index.js";

describe("local Git evidence", () => {
  it("parses bounded, redacted, deterministic commit evidence", async () => {
    const stdout = [
      "abc1234\0def5678\0" + "1234567890",
      "src/index.ts",
      "../outside.txt",
      "",
      "def5678\0\0" + "1234567800",
      "README.md",
    ].join("\n");
    const run = async () => ({ stdout, stderr: "" });
    const first = await collectGitEvidence({ root: "/project", limit: 2, run });
    const second = await collectGitEvidence({
      root: "/project",
      limit: 2,
      run,
    });
    expect(second).toEqual(first);
    expect(first.commits).toEqual([
      {
        id: "abc1234",
        parents: ["def5678"],
        timestamp: 1234567890,
        changedPaths: ["src/index.ts"],
      },
      {
        id: "def5678",
        parents: [],
        timestamp: 1234567800,
        changedPaths: ["README.md"],
      },
    ]);
    expect(JSON.stringify(first)).not.toContain("outside");
    expect(JSON.stringify(first)).not.toContain("stderr");
  });

  it("returns a safe unavailable result when Git cannot run", async () => {
    const result = await collectGitEvidence({
      root: "/missing",
      run: async () => {
        throw new Error("fail");
      },
    });
    expect(result.status).toBe("unavailable");
    expect(result.commits).toEqual([]);
    expect(result.diagnostics).toEqual(["git-unavailable"]);
  });

  it("normalizes a deterministic release timeline without adding claims", async () => {
    const evidence = await collectGitEvidence({
      root: "/project",
      run: async () => ({
        stdout: "abc1234\0\0" + "100\nREADME.md\n",
        stderr: "",
      }),
    });
    const timeline = createReleaseTimeline("release-beta-1", evidence);

    expect(timeline).toEqual({
      operationVersion: 1,
      caseType: "release",
      caseId: "release-beta-1",
      quality: "complete",
      events: [
        {
          id: "commit:abc1234",
          eventType: "commit",
          timestamp: 100,
          commitId: "abc1234",
          parents: [],
          changedPaths: ["README.md"],
          source: "local-git",
          trust: "local-observed-unverified",
        },
      ],
      findings: [],
    });
  });
});
