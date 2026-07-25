import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getBoundedProjectContext,
} from "@intentloom/application";
import {
  validateContextRetrievalRequest,
  validateContextRetrievalResult,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Memory & Security Candidate M1: Bounded Project Context", () => {
  it("validates context retrieval request and result schemas", () => {
    const validRequest = validateContextRetrievalRequest({
      schemaVersion: "1",
      query: "auth",
      sourceTypes: ["intent", "adr"],
      maxTokens: 2000,
      maxItems: 10,
    });
    expect(validRequest.query).toBe("auth");
    expect(validRequest.sourceTypes).toEqual(["intent", "adr"]);
    expect(validRequest.maxTokens).toBe(2000);
    expect(validRequest.maxItems).toBe(10);

    const validResult = validateContextRetrievalResult({
      schemaVersion: "1",
      root: "/workspace/project",
      totalTokens: 150,
      items: [
        {
          id: "ctx-intent-docs-specs-spec.md",
          type: "intent",
          path: "docs/specs/spec.md",
          summary: "Core system spec",
          trustClass: "canonical-policy",
          tokenCount: 150,
        },
      ],
      excludedPathsCount: 3,
      retrievedAt: new Date().toISOString(),
    });
    expect(validResult.totalTokens).toBe(150);
    expect(validResult.items).toHaveLength(1);
    expect(validResult.excludedPathsCount).toBe(3);
  });

  it("retrieves bounded project context across intent, ADRs, docs, and evidence", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await fs.mkdir("/project/docs/specs");
    await fs.mkdir("/project/docs/decisions");
    await fs.mkdir("/project/.aif/memory");

    await fs.write(
      "/project/docs/specs/AIF_V0_1_SPEC.md",
      "# Canonical System Intent Specification\nThis document defines core framework goals.\n",
    );
    await fs.write(
      "/project/docs/decisions/ADR-0001.md",
      "# ADR-0001: Architecture Decision\nCanonical core and generated adapters.\n",
    );
    await fs.write(
      "/project/PROJECT_STATE.md",
      "## Current phase\nMemory & Security Candidate M1\n",
    );
    await fs.write(
      "/project/.aif/memory/summary.json",
      '{"schemaVersion":"1","id":"task-100"}\n',
    );

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );

    expect(result.root).toBe(root);
    expect(result.items.length).toBeGreaterThanOrEqual(3);

    const types = result.items.map((item) => item.type);
    expect(types).toContain("intent");
    expect(types).toContain("adr");
    expect(types).toContain("ownership");
  });

  it("never includes secret paths or excluded files in returned context", async () => {
    const fs = createMemoryFileSystem();
    const root = "/secure-project";

    await fs.mkdir("/secure-project/docs/specs");
    await fs.mkdir("/secure-project/.git");

    await fs.write(
      "/secure-project/docs/specs/spec.md",
      "# Public Architecture Intent\nSystem security boundary.\n",
    );
    await fs.write(
      "/secure-project/.env",
      "SECRET_KEY=supersecret12345\nDATABASE_URL=postgres://root:pass@localhost/db\n",
    );
    await fs.write(
      "/secure-project/credentials.json",
      '{"api_key": "secret_api_key_abc"}\n',
    );
    await fs.write(
      "/secure-project/id_rsa",
      "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n",
    );
    await fs.write("/secure-project/.git/HEAD", "ref: refs/heads/main\n");

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );

    const paths = result.items.map((item) => item.path);
    expect(paths).not.toContain(".env");
    expect(paths).not.toContain("credentials.json");
    expect(paths).not.toContain("id_rsa");
    expect(paths).not.toContain(".git/HEAD");

    const fullContent = JSON.stringify(result);
    expect(fullContent).not.toContain("supersecret12345");
    expect(fullContent).not.toContain("secret_api_key_abc");

    expect(result.excludedPathsCount).toBeGreaterThanOrEqual(4);
  });

  it("clamps returned context by token budget and item count limit", async () => {
    const fs = createMemoryFileSystem();
    const root = "/budget-project";

    await fs.mkdir("/budget-project/docs");
    for (let i = 1; i <= 10; i++) {
      await fs.write(
        `/budget-project/docs/doc${i}.md`,
        `# Documentation Item ${i}\n` + "long content ".repeat(100) + "\n",
      );
    }

    const clampedResult = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 100, maxItems: 2 },
      { root },
      fs,
    );

    expect(clampedResult.items.length).toBeLessThanOrEqual(2);
    expect(clampedResult.totalTokens).toBeLessThanOrEqual(500);
  });

  it("executes CLI intentloom context get command returning structured JSON", async () => {
    const fs = createMemoryFileSystem();
    const root = "/cli-project";

    await fs.mkdir("/cli-project/docs/specs");
    await fs.write(
      "/cli-project/docs/specs/spec.md",
      "# Project Specification\nSystem context retrieval test.\n",
    );

    const output: string[] = [];
    const exitCode = await runCli(
      ["context", "get", "--root", root, "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => output.push(msg), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.root).toBe(root);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].type).toBe("intent");
  });
});
