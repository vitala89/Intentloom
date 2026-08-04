import { describe, expect, it, vi } from "vitest";
import type { ExtensionLockfile } from "@intentloom/protocol";
import {
  validateKnowledgeProviderQuery,
  validateKnowledgeProviderQueryResult,
  verifyKnowledgeProviderCapability,
} from "@intentloom/validator";
import {
  queryKnowledgeProvider,
  GraphifyKnowledgeAdapter,
} from "@intentloom/application";

describe("KnowledgeProvider Validator", () => {
  it("validates a correct KnowledgeProviderQuery", () => {
    const valid = validateKnowledgeProviderQuery({
      targetPath: "src/index.ts",
      queryKind: "symbols",
      symbolName: "myFunction",
      depth: 2,
    });
    expect(valid.targetPath).toBe("src/index.ts");
    expect(valid.queryKind).toBe("symbols");
    expect(valid.symbolName).toBe("myFunction");
    expect(valid.depth).toBe(2);
  });

  it("throws on invalid KnowledgeProviderQuery", () => {
    expect(() => validateKnowledgeProviderQuery(null)).toThrow(
      "non-null object",
    );
    expect(() =>
      validateKnowledgeProviderQuery({ targetPath: "", queryKind: "symbols" }),
    ).toThrow("non-empty string");
    expect(() =>
      validateKnowledgeProviderQuery({
        targetPath: "src",
        queryKind: "invalid",
      }),
    ).toThrow("one of");
    expect(() =>
      validateKnowledgeProviderQuery({
        targetPath: "src",
        queryKind: "symbols",
        depth: -1,
      }),
    ).toThrow("non-negative integer");
  });

  it("validates a correct KnowledgeProviderQueryResult", () => {
    const valid = validateKnowledgeProviderQueryResult({
      status: "success",
      nodes: [
        {
          id: "node-1",
          name: "foo",
          kind: "function",
          location: {
            path: "src/foo.ts",
            startLine: 1,
            startColumn: 1,
            endLine: 10,
            endColumn: 2,
          },
        },
      ],
      edges: [
        {
          sourceId: "node-1",
          targetId: "node-2",
          relation: "calls",
        },
      ],
    });
    expect(valid.status).toBe("success");
    expect(valid.nodes).toHaveLength(1);
    expect(valid.edges).toHaveLength(1);
  });

  it("verifies filesystem read capabilities", () => {
    const query = validateKnowledgeProviderQuery({
      targetPath: "src/components/Button.tsx",
      queryKind: "symbols",
    });

    expect(
      verifyKnowledgeProviderCapability(query, {
        filesystem: { read: ["./"] },
      }),
    ).toBe(true);
    expect(
      verifyKnowledgeProviderCapability(query, {
        filesystem: { read: ["src/components"] },
      }),
    ).toBe(true);
    expect(
      verifyKnowledgeProviderCapability(query, {
        filesystem: { read: ["docs"] },
      }),
    ).toBe(false);
    expect(verifyKnowledgeProviderCapability(query, undefined)).toBe(false);
  });
});

describe("queryKnowledgeProvider Application Operation", () => {
  it("returns provider_unavailable when no adapter is configured", async () => {
    const res = await queryKnowledgeProvider({
      query: { targetPath: "src/main.ts", queryKind: "symbols" },
    });
    expect(res.status).toBe("provider_unavailable");
    expect(res.nodes).toEqual([]);
  });

  it("returns provider_unavailable if extensionId is not in lockfile", async () => {
    const mockLock: ExtensionLockfile = {
      lockVersion: 1,
      updatedAt: "2026-08-05T00:00:00Z",
      extensions: {},
    };
    const mockAdapter = {
      id: "ext:org/test",
      name: "Test",
      capabilities: { read: ["./"] },
      query: vi.fn(),
    };

    const res = await queryKnowledgeProvider({
      query: { targetPath: "src/main.ts", queryKind: "symbols" },
      adapter: mockAdapter,
      extensionLock: mockLock,
      extensionId: "ext:org/unknown",
    });
    expect(res.status).toBe("provider_unavailable");
    expect(mockAdapter.query).not.toHaveBeenCalled();
  });

  it("returns capability_denied when target path exceeds granted capabilities", async () => {
    const mockLock: ExtensionLockfile = {
      lockVersion: 1,
      updatedAt: "2026-08-05T00:00:00Z",
      extensions: {
        "ext:org/test": {
          extensionId: "ext:org/test",
          category: "knowledge-provider",
          requestedVersion: "1.0.0",
          resolvedVersion: "1.0.0",
          source: { registry: "npm", package: "test" },
          grantedCapabilities: { filesystem: { read: ["docs"] } },
          approvedAt: "2026-08-05T00:00:00Z",
          approvedBy: "human",
          lastHealthCheck: "2026-08-05T00:00:00Z",
          pendingMigration: false,
          installationType: "referenced",
        },
      },
    };
    const mockAdapter = {
      id: "ext:org/test",
      name: "Test",
      capabilities: { read: ["docs"] },
      query: vi.fn(),
    };

    const res = await queryKnowledgeProvider({
      query: { targetPath: "src/secret.ts", queryKind: "symbols" },
      adapter: mockAdapter,
      extensionLock: mockLock,
      extensionId: "ext:org/test",
    });
    expect(res.status).toBe("capability_denied");
    expect(mockAdapter.query).not.toHaveBeenCalled();
  });

  it("executes query and returns success when capability is granted", async () => {
    const mockAdapter = {
      id: "ext:org/test",
      name: "Test",
      capabilities: { read: ["./"] },
      query: vi.fn().mockResolvedValue({
        status: "success",
        nodes: [
          {
            id: "s1",
            name: "main",
            kind: "function",
            location: {
              path: "src/main.ts",
              startLine: 1,
              startColumn: 1,
              endLine: 5,
              endColumn: 1,
            },
          },
        ],
        edges: [],
      }),
    };

    const res = await queryKnowledgeProvider({
      query: { targetPath: "src/main.ts", queryKind: "symbols" },
      adapter: mockAdapter,
    });

    expect(res.status).toBe("success");
    expect(res.nodes).toHaveLength(1);
    expect(res.nodes[0].name).toBe("main");
  });
});

describe("GraphifyKnowledgeAdapter", () => {
  it("returns provider_unavailable if execRunner is not set", async () => {
    const adapter = new GraphifyKnowledgeAdapter();
    const res = await adapter.query({
      targetPath: "src",
      queryKind: "symbols",
    });
    expect(res.status).toBe("provider_unavailable");
  });

  it("normalizes Graphify stdout into KnowledgeProviderQueryResult", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        nodes: [
          {
            id: "g1",
            name: "GraphifyClass",
            type: "class",
            path: "src/Graphify.ts",
          },
        ],
        edges: [{ source: "g1", target: "g2", relation: "calls" }],
      }),
    });

    const adapter = new GraphifyKnowledgeAdapter({ execRunner: mockRunner });
    const res = await adapter.query({ targetPath: "src", queryKind: "graph" });

    expect(res.status).toBe("success");
    expect(res.nodes).toHaveLength(1);
    expect(res.nodes[0].name).toBe("GraphifyClass");
    expect(res.edges[0].relation).toBe("calls");
    expect(mockRunner).toHaveBeenCalledWith("graphify", [
      "query",
      "--kind",
      "graph",
      "--path",
      "src",
    ]);
  });

  it("handles non-zero exit code from Graphify process", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: "",
      stderr: "Graphify failed to index project",
    });

    const adapter = new GraphifyKnowledgeAdapter({ execRunner: mockRunner });
    const res = await adapter.query({ targetPath: "src", queryKind: "graph" });

    expect(res.status).toBe("query_failed");
    expect(res.diagnostics).toContain("Graphify failed to index project");
  });
});
