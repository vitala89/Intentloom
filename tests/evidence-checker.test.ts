import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  executeProjectPinnedEslint,
  prepareProjectPinnedEslint,
} from "../packages/application/src/engineering-quality/checker-execution.js";

describe("project-pinned checker process adapter", () => {
  it("runs a local entry with bounded argv and no inherited secret environment", async () => {
    const root = join(tmpdir(), `intentloom-q8-${Date.now()}`);
    const entry = join(root, "node_modules/eslint/bin");
    await mkdir(entry, { recursive: true });
    await writeFile(
      join(entry, "eslint.js"),
      'process.stdout.write(process.env.API_TOKEN ? "invalid" : "[]");',
      "utf8",
    );
    try {
      const request = prepareProjectPinnedEslint({
        projectRoot: root,
        candidate: {
          relativeEntryPath: "node_modules/eslint/bin/eslint.js",
          version: "fixture",
        },
      });
      const result = await executeProjectPinnedEslint(request);

      expect(result.execution.status).toBe("completed");
      expect(result.execution.failure).toBe("none");
      expect(result.execution.preview.arguments).toEqual([
        "--format",
        "json",
        "--no-cache",
        ".",
      ]);
      expect(result.report?.findings).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns a truthful timeout and cancellation instead of success", async () => {
    const root = join(tmpdir(), `intentloom-q8-timeout-${Date.now()}`);
    const entry = join(root, "node_modules/eslint/bin");
    await mkdir(entry, { recursive: true });
    await writeFile(
      join(entry, "eslint.js"),
      "setTimeout(() => {}, 5000);",
      "utf8",
    );
    try {
      const request = prepareProjectPinnedEslint({
        projectRoot: root,
        candidate: {
          relativeEntryPath: "node_modules/eslint/bin/eslint.js",
          version: "fixture",
        },
        timeoutMs: 50,
      });
      const timedOut = await executeProjectPinnedEslint(request);
      expect(timedOut.execution.status).toBe("timed-out");
      expect(timedOut.execution.failure).toBe("timed-out");

      const controller = new AbortController();
      const cancelledPromise = executeProjectPinnedEslint(request, {
        signal: controller.signal,
      });
      controller.abort();
      const cancelled = await cancelledPromise;
      expect(cancelled.execution.status).toBe("cancelled");
      expect(cancelled.execution.failure).toBe("cancelled");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stops a checker that exceeds the combined output bound", async () => {
    const root = join(tmpdir(), `intentloom-q8-output-${Date.now()}`);
    const entry = join(root, "node_modules/eslint/bin");
    await mkdir(entry, { recursive: true });
    await writeFile(
      join(entry, "eslint.js"),
      'process.stdout.write("x".repeat(10000));',
      "utf8",
    );
    try {
      const request = prepareProjectPinnedEslint({
        projectRoot: root,
        candidate: {
          relativeEntryPath: "node_modules/eslint/bin/eslint.js",
          version: "fixture",
        },
        maxOutputBytes: 64,
      });
      const result = await executeProjectPinnedEslint(request);

      expect(result.execution.status).toBe("output-limit-exceeded");
      expect(result.execution.outputTruncated).toBe(true);
      expect(result.execution.stdout.length).toBeLessThanOrEqual(64);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
