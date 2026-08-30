import { createServer, type IncomingMessage, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "@intentloom/application";
import { runNeutronN2ReadOnlyLoop } from "../packages/application/src/neutron-n2-loop.js";
import {
  N3_PROJECTION_PREAMBLE,
  formatNeutronContextPrompt,
} from "../packages/application/src/neutron-n3-prompt-context.js";
import { OllamaModelAdapter } from "../packages/application/src/ollama-model-adapter.js";
import {
  profileNotFoundError,
  roleNotAllowedError,
} from "../packages/application/src/neutron-context-assembly.js";

const SKILL = `---
name: sample-code-review
version: 1.2.0
description: Perform automated code review on bounded diffs
packs:
  - frontend
roles:
  - reviewer
trustClass: canonical-policy
capabilities:
  - code-analysis
---

# sample-code-review
`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function baseFiles(
  extras: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/docs/specs/SPEC.md": "# Intent\nCanonical policy for assembly.\n",
    "/project/docs/decisions/ADR-0001.md": "# ADR-0001\nArchitecture.\n",
    "/project/PROJECT_STATE.md": "# Project state\nOwnership record.\n",
    "/project/DUTY_WATCH.md": "# Duty watch\nCurrent watch status.\n",
    "/project/docs/guide.md": "# Guide\nBounded documentation.\n",
    "/project/catalog/skills/sample-code-review/SKILL.md": SKILL,
    "/project/.env": "SECRET_KEY=supersecret12345\n",
    ...extras,
  };
}

function fingerprint(fs: FileSystem): string {
  return [...fs.files.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

describe("Neutron N3 Slice 4 — N2 pre-turn context hook", () => {
  it("assembles context once before the model and passes enriched prompt", async () => {
    const fs = createMemoryFileSystem(baseFiles());
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
      modelId: "fixture-model",
    });

    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-n3-4",
      projectId: "proj-n3-4",
      prompt: "Inspect this project",
      adapter,
      fs,
      runTool: async (toolName, _args) => {
        expect(toolName).toBe("inspect");
        return inspectProject("/project", fs);
      },
      fingerprintProject: async () => fingerprint(fs),
    });

    expect(result.contextAssembly).toBeDefined();
    expect(result.contextAssembly?.bundle.sources.some((s) => s.included)).toBe(
      true,
    );
    expect(result.modelPrompt).toContain(N3_PROJECTION_PREAMBLE.trim());
    expect(result.modelPrompt).toContain("## User request");
    expect(result.modelPrompt).toContain("Inspect this project");
    expect(result.modelPrompt).not.toContain("SECRET_KEY");
    expect(result.modelPrompt).not.toContain("/project/.env");
    expect(server.prompts).toHaveLength(2);
    expect(server.prompts[0]).toBe(result.modelPrompt);
    expect(server.prompts[1]).toBe(result.modelPrompt);
    expect(result.projectFingerprintAfter).toBe(
      result.projectFingerprintBefore,
    );
    await server.close();
  });

  it("projects identical model input for identical repository state", async () => {
    const fs = createMemoryFileSystem(baseFiles());
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const input = {
      root: "/project",
      sessionId: "session-determinism-a",
      projectId: "proj-n3-4",
      prompt: "Review guide",
      adapter,
      fs,
      runTool: async () => inspectProject("/project", fs),
      fingerprintProject: async () => fingerprint(fs),
    } as const;
    const first = await runNeutronN2ReadOnlyLoop(input);
    await server.close();

    const server2 = await listenCapturingOllama();
    const adapter2 = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server2.port)}`,
    });
    const second = await runNeutronN2ReadOnlyLoop({
      ...input,
      sessionId: "session-determinism-b",
      adapter: adapter2,
    });
    expect(second.modelPrompt).toBe(first.modelPrompt);
    await server2.close();
  });

  it("visibly separates policy, profile, task, skills, bounded, and memory sections", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/profiles/reviewer.json": json({
          schemaVersion: "1",
          name: "reviewer",
          description: "Review constraints",
          allowedCapabilities: {
            readOnly: true,
            allowedPaths: ["docs"],
            allowedTools: ["inspect"],
            maxBudget: 10,
            allowNetwork: false,
          },
          activeRoles: ["reviewer"],
          createdAt: "2026-08-01T00:00:00.000Z",
        }),
        "/project/.aif/memory/tasks/task-1.json": json({
          schemaVersion: "1",
          id: "task-1",
          root: "/project",
          intent: "Finish review",
          affectedPaths: ["docs/guide.md"],
          validationOutcome: "partial",
          evidenceReferences: [],
          usedSkills: ["sample-code-review"],
          unresolvedWork: ["finish"],
          provenance: "intentloom.task.summary.v1",
          trustClass: "user-supplied",
          retentionState: "active",
          createdAt: "2026-08-01T00:00:00.000Z",
        }),
        "/project/.aif/memory/checkpoints/cp-1.json": json({
          schemaVersion: "1",
          id: "cp-1",
          taskId: "task-1",
          state: "active",
          completedSteps: ["collect"],
          unresolvedWork: ["finish"],
          createdSnapshotChecksum: "abc",
          invalidatedPlans: [],
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
        }),
        "/project/.aif/memory/items/mem-1.json": json({
          schemaVersion: "1",
          id: "mem-1",
          projectId: "proj-n3-4",
          classification: "accepted-decision",
          lifecycleState: "accepted",
          trustClass: "user-supplied",
          content: "task-1 prior review noted guide gaps.",
          provenance: "intentloom.memory.persistent.v1",
          retentionState: "active",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
          approval: {
            approvedBy: "maintainer",
            evidence: "review",
            approvedAt: "2026-08-01T00:00:00.000Z",
          },
          audit: ["proposed", "accepted"],
        }),
      }),
    );
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-sections",
      projectId: "proj-n3-4",
      prompt: "guide review",
      profileName: "reviewer",
      role: "reviewer",
      taskId: "task-1",
      includeMemory: true,
      maxItems: 30,
      adapter,
      fs,
      runTool: async () => inspectProject("/project", fs),
      fingerprintProject: async () => fingerprint(fs),
    });

    expect(result.modelPrompt).toContain("## Canonical policy");
    expect(result.modelPrompt).toContain("## Project ownership");
    expect(result.modelPrompt).toContain("## Profile constraints");
    expect(result.modelPrompt).toContain("## Task state");
    expect(result.modelPrompt).toContain("## Selected skills");
    expect(result.modelPrompt).toContain("## Bounded project context");
    expect(result.modelPrompt).toContain("## Persistent memory");
    expect(result.modelPrompt).toContain("sample-code-review");
    await server.close();
  });

  it("does not invoke the model adapter when profile assembly blocks", async () => {
    const fs = createMemoryFileSystem(baseFiles());
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const before = fingerprint(fs);
    await expect(
      runNeutronN2ReadOnlyLoop({
        root: "/project",
        sessionId: "session-block-profile",
        projectId: "proj-n3-4",
        prompt: "inspect",
        profileName: "missing",
        adapter,
        fs,
        runTool: async () => {
          throw new Error("must not run tool");
        },
        fingerprintProject: async () => fingerprint(fs),
      }),
    ).rejects.toThrow(profileNotFoundError("missing"));
    expect(server.prompts).toHaveLength(0);
    expect(fingerprint(fs)).toBe(before);
    await server.close();
  });

  it("does not invoke the model adapter when role/profile mismatch blocks", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/profiles/reviewer.json": json({
          schemaVersion: "1",
          name: "reviewer",
          allowedCapabilities: {
            readOnly: true,
            allowedPaths: [],
            allowedTools: [],
            maxBudget: 1,
            allowNetwork: false,
          },
          activeRoles: ["reviewer"],
          createdAt: "2026-08-01T00:00:00.000Z",
        }),
      }),
    );
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    await expect(
      runNeutronN2ReadOnlyLoop({
        root: "/project",
        sessionId: "session-block-role",
        projectId: "proj-n3-4",
        prompt: "inspect",
        profileName: "reviewer",
        role: "context-scout",
        adapter,
        fs,
        runTool: async () => {
          throw new Error("must not run tool");
        },
        fingerprintProject: async () => fingerprint(fs),
      }),
    ).rejects.toThrow(roleNotAllowedError("context-scout", "reviewer"));
    expect(server.prompts).toHaveLength(0);
    await server.close();
  });

  it("still calls the model when task and memory are degraded", async () => {
    const fs = createMemoryFileSystem(baseFiles());
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-degraded",
      projectId: "proj-n3-4",
      prompt: "missing-task-query",
      contextQuery: "missing-task-query",
      taskId: "missing-task",
      includeMemory: true,
      adapter,
      fs,
      runTool: async () => inspectProject("/project", fs),
      fingerprintProject: async () => fingerprint(fs),
    });
    expect(server.prompts.length).toBeGreaterThan(0);
    expect(result.contextAssembly?.warnings).toEqual(
      expect.arrayContaining([
        "task summary unavailable",
        "task checkpoint unavailable",
        "persistent memory search returned no accepted items",
      ]),
    );
    await server.close();
  });

  it("preserves legacy N2 behavior when context assembly is disabled", async () => {
    const fs = createMemoryFileSystem({
      "/project/package.json": "{}",
      "/project/README.md": "safe",
    });
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-legacy",
      projectId: "project-n2",
      prompt: "Inspect this project",
      disableContextAssembly: true,
      adapter,
      fs,
      runTool: async () => inspectProject("/project", fs),
      fingerprintProject: async () => fingerprint(fs),
    });
    expect(result.modelPrompt).toBe("Inspect this project");
    expect(result.contextAssembly).toBeUndefined();
    expect(server.prompts[0]).toBe("Inspect this project");
    await server.close();
  });

  it("tracks N3 context usage and framing overhead separately", async () => {
    const fs = createMemoryFileSystem(baseFiles());
    const server = await listenCapturingOllama();
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-budget",
      projectId: "proj-n3-4",
      prompt: "budget check",
      maxTokens: 4000,
      adapter,
      fs,
      runTool: async () => inspectProject("/project", fs),
      fingerprintProject: async () => fingerprint(fs),
    });
    expect(result.contextAssembly?.usage.contextTokens).toBeGreaterThan(0);
    expect(result.contextFramingTokens).toBeGreaterThan(0);
    expect(result.modelInputTokensEstimate).toBeGreaterThanOrEqual(
      result.contextAssembly!.usage.contextTokens,
    );
    await server.close();
  });

  it("keeps formatNeutronContextPrompt byte-stable for fixed entries", () => {
    const prompt = formatNeutronContextPrompt("do work", [
      {
        sourceId: "policy:spec",
        section: "policy",
        trustClass: "project",
        kind: "policy",
        excerpt: "Canonical policy text",
        path: "docs/specs/SPEC.md",
      },
      {
        sourceId: "skill:sample-code-review",
        section: "skill",
        trustClass: "catalog",
        kind: "skill",
        excerpt: "sample-code-review\nReview skill",
      },
    ]);
    expect(prompt).toMatchSnapshot();
    expect(prompt).not.toContain("/project/");
  });
});

async function listenCapturingOllama(): Promise<{
  port: number;
  prompts: string[];
  close: () => Promise<void>;
}> {
  const prompts: string[] = [];
  const server: Server = createServer((req, res) => {
    void readBody(req).then((body) => {
      const payload = JSON.parse(body) as {
        messages?: readonly { role?: string; content?: string }[];
      };
      const user = payload.messages?.find((message) => message.role === "user");
      if (user?.content !== undefined) prompts.push(user.content);
      const hasTool = payload.messages?.some(
        (message) => message.role === "tool",
      );
      const message = hasTool
        ? { role: "assistant", content: "Inspection complete", tool_calls: [] }
        : {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call-inspect",
                function: {
                  name: "inspect",
                  arguments: { root: "/project" },
                },
              },
            ],
          };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message }));
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected TCP address");
  }
  return {
    port: address.port,
    prompts,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
