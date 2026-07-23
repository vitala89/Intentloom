import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/command.js";

describe("release evidence analysis CLI", () => {
  it("combines local timeline evidence with an explicit provider export", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-analysis-cli-"));
    try {
      const file = join(root, "github.json");
      await writeFile(
        file,
        JSON.stringify({
          pullRequests: [{ number: 7 }],
        }),
      );
      const output: string[] = [];
      const exitCode = await runCli(
        [
          "evidence",
          "analyze",
          "--provider",
          "github",
          "--file",
          file,
          "--project-key",
          "org/repo",
          "--root",
          resolve("."),
          "--case-id",
          "intentloom-release",
          "--json",
        ],
        { catalogRoot: resolve("catalog") },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toMatchObject({
        operationVersion: 1,
        caseType: "release",
        caseId: "intentloom-release",
        projectKey: "org/repo",
        quality: expect.stringMatching(/^(?:complete|bounded)$/u),
        findings: expect.arrayContaining([
          expect.objectContaining({
            code: "provider-commit-ambiguous",
            status: "ambiguous",
          }),
        ]),
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
