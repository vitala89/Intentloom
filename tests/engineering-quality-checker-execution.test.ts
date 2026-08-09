import { describe, expect, it } from "vitest";
import {
  executeProjectPinnedEslint,
  prepareProjectPinnedEslint,
} from "../packages/application/src/engineering-quality/checker-execution.js";
import { validateCheckerExecutionRequest } from "../packages/validator/src/engineering-quality/checker-execution.js";

describe("Engineering Quality Phase Q8 bounded checker execution", () => {
  it("previews and executes a project-pinned ESLint report through Q7 ingestion", async () => {
    const request = prepareProjectPinnedEslint({
      projectRoot: "/workspace/project",
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "9.0.0",
      },
    });
    const execution = await executeProjectPinnedEslint(request, {
      run: async (options) => ({
        status: "completed",
        exitCode: 0,
        stdout: JSON.stringify([
          {
            filePath: "/workspace/project/src/app.ts",
            messages: [
              {
                ruleId: "no-alert",
                severity: 2,
                message: "Unexpected alert.",
                line: 3,
                column: 1,
              },
            ],
          },
        ]),
        stderr: "",
        durationMs: 12,
        outputTruncated: false,
        preview: options.preview,
      }),
    });

    expect(request.preview).toMatchObject({
      relativeEntryPath: "node_modules/eslint/bin/eslint.js",
      arguments: ["--format", "json", "--no-cache", "."],
      networkPolicy: "deny",
      filesystemPolicy: "read-only",
    });
    expect(execution.report?.findings).toHaveLength(1);
    expect(execution.report?.findings[0]?.location?.path).toBe("src/app.ts");
    expect(execution.execution.status).toBe("completed");
  });

  it("rejects path escape and secret environment inheritance before execution", () => {
    expect(() =>
      prepareProjectPinnedEslint({
        projectRoot: "/workspace/project",
        candidate: {
          relativeEntryPath: "node_modules/eslint/../../secret.js",
          version: "9.0.0",
        },
      }),
    ).toThrow("local ESLint entry");
    expect(() =>
      prepareProjectPinnedEslint({
        projectRoot: "/workspace/project",
        candidate: {
          relativeEntryPath: "node_modules/eslint/bin/eslint.js",
          version: "9.0.0",
        },
        environment: { API_TOKEN: "must-not-cross-the-seam" },
      }),
    ).toThrow("not allowed");
  });

  it("revalidates untrusted request arguments at the validator seam", () => {
    const request = prepareProjectPinnedEslint({
      projectRoot: "/workspace/project",
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "9.0.0",
      },
    });
    expect(() =>
      validateCheckerExecutionRequest({ ...request, arguments: ["--fix"] }),
    ).toThrow("fixed read-only ESLint argument set");
  });

  it.each([
    ["timed-out", "timed-out"],
    ["cancelled", "cancelled"],
    ["output-limit-exceeded", "output-limit-exceeded"],
  ] as const)("preserves a %s process outcome", async (status, expected) => {
    const request = prepareProjectPinnedEslint({
      projectRoot: "/workspace/project",
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "9.0.0",
      },
    });
    const execution = await executeProjectPinnedEslint(request, {
      run: async (options) => ({
        status,
        stdout: "",
        stderr: "bounded failure",
        durationMs: 10,
        outputTruncated: status === "output-limit-exceeded",
        preview: options.preview,
      }),
    });

    expect(execution.execution.status).toBe(expected);
    expect(execution.report).toBeUndefined();
  });

  it("turns malformed checker JSON into an explicit invalid-output failure", async () => {
    const request = prepareProjectPinnedEslint({
      projectRoot: "/workspace/project",
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "9.0.0",
      },
    });
    const execution = await executeProjectPinnedEslint(request, {
      run: async (options) => ({
        status: "completed",
        exitCode: 0,
        stdout: "not-json",
        stderr: "",
        durationMs: 1,
        outputTruncated: false,
        preview: options.preview,
      }),
    });

    expect(execution.execution.failure).toBe("invalid-output");
    expect(execution.execution.status).toBe("failed");
  });

  it("retains a normalized report when ESLint exits non-zero with findings", async () => {
    const request = prepareProjectPinnedEslint({
      projectRoot: "/workspace/project",
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "9.0.0",
      },
    });
    const execution = await executeProjectPinnedEslint(request, {
      run: async (options) => ({
        status: "failed",
        exitCode: 1,
        stdout: JSON.stringify([
          {
            filePath: "/workspace/project/src/app.ts",
            messages: [{ ruleId: "no-alert", severity: 2, message: "found" }],
          },
        ]),
        stderr: "ESLint found problems",
        durationMs: 4,
        outputTruncated: false,
        preview: options.preview,
      }),
    });

    expect(execution.execution.failure).toBe("non-zero-exit");
    expect(execution.report?.findings).toHaveLength(1);
  });
});
