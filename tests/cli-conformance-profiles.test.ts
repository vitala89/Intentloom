import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  detectProjectProfiles,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("conformance and profile detection (intentloom conformance)", () => {
  it("detects Nx monorepo profile from nx.json evidence", async () => {
    const fs = createMemoryFileSystem({
      "/project/nx.json": JSON.stringify({ targetDefaults: {} }),
      "/project/package.json": JSON.stringify({
        devDependencies: { nx: "18.0.0" },
      }),
    });

    const result = await detectProjectProfiles("/project", fs);

    expect(result.selectedProfile).toBe("generic");
    expect(result.workspaceTopology).toBe("nx");
    expect(result.candidates.some((c) => c.profile === "nx")).toBe(true);
  });

  it("detects SQLite profile from prisma database evidence", async () => {
    const fs = createMemoryFileSystem({
      "/project/prisma/schema.prisma": 'datasource db { provider = "sqlite" }',
    });

    const result = await detectProjectProfiles("/project", fs);

    expect(result.selectedProfile).toBe("generic");
    expect(result.candidates.some((c) => c.profile === "sqlite")).toBe(true);
  });

  it("detects security-sensitive profile when stealth/credential paths are present", async () => {
    const fs = createMemoryFileSystem({
      "/project/src-tauri/src/stealth": "stealth process obfuscation",
      "/project/secrets": "private key storage",
    });

    const result = await detectProjectProfiles("/project", fs);

    expect(result.selectedProfile).toBe("generic");
    expect(
      result.candidates.some((c) => c.profile === "security-sensitive"),
    ).toBe(true);
  });

  it("executes intentloom conformance via CLI returning evidence-linked report", async () => {
    const fs = createMemoryFileSystem({
      "/project/DUTY_WATCH.md": "duty watch log",
      "/project/policy.json": JSON.stringify({
        schemaVersion: "1",
        policyId: "policy:profile-test",
        description: "Profile Test Policy",
        rules: [
          {
            ruleId: "rule:code-review",
            caseType: "pull-request",
            severity: "error",
            title: "Code Review Required",
            condition: {
              type: "required-activity",
              activity: "code-review",
            },
          },
        ],
      }),
      "/project/timeline.json": JSON.stringify({
        caseType: "pull-request",
        caseId: "pr-100",
        events: [
          {
            activity: "code-review",
            source: "github",
            sourceId: "review-1",
            timestamp: "2026-07-24T00:00:00Z",
          },
        ],
      }),
    });
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "conformance",
        "/project",
        "--policy",
        "policy.json",
        "--timeline",
        "timeline.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const report = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(report).toHaveProperty("policyId", "policy:profile-test");
    expect(report).toHaveProperty("findings");
  });
});
