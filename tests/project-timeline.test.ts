import { mkdir, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { timelineProject } from "../packages/application/src/index.js";

describe("project timeline", () => {
  it("builds a deterministic root-bound timeline without writing", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-timeline-"));
    const root = join(parent, "project");
    await mkdir(root);
    const before = await readdir(root);
    const result = await timelineProject({
      root,
      caseId: "release:test",
      run: async () => ({
        stdout: [
          `${"a".repeat(40)}\u0000\u00001`,
          "README.md",
          `${"b".repeat(40)}\u0000${"a".repeat(40)}\u00002`,
          "src/index.ts",
        ].join("\n"),
        stderr: "",
      }),
    });

    expect(result.root).toBe(root);
    expect(result.caseId).toBe("release:test");
    expect(result.events.map((event) => event.commitId)).toEqual([
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ]);
    expect(result.events[0]?.changedPaths).toEqual(["README.md"]);
    expect(result.events[1]?.changedPaths).toEqual(["src/index.ts"]);
    expect(result.diagnostics).toEqual([]);
    expect(await readdir(root)).toEqual(before);
  });
});
