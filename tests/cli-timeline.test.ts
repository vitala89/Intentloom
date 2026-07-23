import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/command.js";

describe("timeline CLI", () => {
  it("renders a deterministic local release timeline as JSON", async () => {
    const output: string[] = [];
    const exitCode = await runCli(
      [
        "timeline",
        "--root",
        resolve("."),
        "--case-id",
        "intentloom-main",
        "--json",
      ],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      operationVersion: 1,
      caseType: "release",
      caseId: "intentloom-main",
      quality: expect.stringMatching(/^(?:complete|bounded)$/u),
    });
  });
});
