import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/command.js";

describe("provider evidence CLI", () => {
  it("imports an explicit export without credentials or network", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-provider-cli-"));
    try {
      const file = join(root, "github.json");
      await writeFile(
        file,
        JSON.stringify({
          pullRequests: [{ number: 7, createdAt: "2026-01-01T00:00:00Z" }],
        }),
      );
      const output: string[] = [];
      const exitCode = await runCli(
        [
          "evidence",
          "import",
          "--provider",
          "github",
          "--file",
          file,
          "--project-key",
          "org/repo",
          "--json",
        ],
        { catalogRoot: resolve("catalog") },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toMatchObject({
        source: "provider-export",
        provider: "github",
        projectKey: "org/repo",
        status: "available",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
