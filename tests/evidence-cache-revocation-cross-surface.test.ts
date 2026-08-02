import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../packages/cli/src/command.js";
import {
  fetchLiveProviderEvidence,
  purgeProviderCache,
  resolveProviderCredential,
  type ProviderCacheStore,
} from "../packages/evidence-provider/src/index.js";
import {
  handleMcpRequest,
  RELEASE_ANALYSIS_TOOL,
} from "../packages/mcp-server/src/index.js";

class MemoryProviderCacheStore implements ProviderCacheStore {
  readonly files = new Map<string, string>();

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error("cache-miss");
    return content;
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async remove(path: string): Promise<void> {
    for (const key of this.files.keys()) {
      if (key === path || key.startsWith(`${path}${sep}`)) {
        this.files.delete(key);
      }
    }
  }
}

describe("cross-surface cache retention and revocation contracts", () => {
  it("enforces local credential revocation precedence and header clearing across surfaces", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-revocation-"));
    const originalGithubToken = process.env.GITHUB_TOKEN;
    const originalGhToken = process.env.GH_TOKEN;
    try {
      // 1. Explicit empty token immediately revokes/bypasses environment credentials
      process.env.GITHUB_TOKEN = "env_secret_token";
      const revokedResolution = resolveProviderCredential("github", "");
      expect(revokedResolution.source).toBe("none");
      expect(revokedResolution.token).toBeUndefined();

      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      // Fetch with explicit empty token -> no Authorization header attached
      await fetchLiveProviderEvidence({
        provider: "github",
        projectKey: "vitala89/Intentloom",
        token: "",
        fetchFn: mockFetch as any,
      });

      expect(mockFetch).toHaveBeenCalled();
      const headers = mockFetch.mock.calls[0]?.[1]?.headers;
      expect(headers).not.toHaveProperty("Authorization");

      // 2. Unsetting environment variables clears header entirely
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;

      const unauthenticatedResolution = resolveProviderCredential(
        "github",
        undefined,
      );
      expect(unauthenticatedResolution.source).toBe("none");
      expect(unauthenticatedResolution.token).toBeUndefined();
    } finally {
      if (originalGithubToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = originalGithubToken;
      if (originalGhToken === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = originalGhToken;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("maintains cache hit within TTL and purges cleanly via CLI and library", async () => {
    let now = 10_000;
    const store = new MemoryProviderCacheStore();
    const cache = {
      rootDirectory: "/project/.aif/cache/providers",
      store,
      now: () => now,
      ttlMs: 900_000, // 15 minutes
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/pulls")) {
        return new Response(
          JSON.stringify([{ id: "dev@example.com", state: "ghp_secrettoken" }]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const options = {
      provider: "github" as const,
      projectKey: "vitala89/Intentloom",
      token: "ghp_testtoken",
      fetchFn: mockFetch as any,
      cache,
    };

    // First fetch -> populates cache
    const first = await fetchLiveProviderEvidence(options);
    expect(first.status).toBe("available");
    expect(mockFetch).toHaveBeenCalledTimes(4);

    // Second fetch within 15 min TTL -> cache hit
    now += 60_000; // +1 min
    const second = await fetchLiveProviderEvidence(options);
    expect(second.diagnostics).toContain("cache-hit");
    expect(mockFetch).toHaveBeenCalledTimes(4);

    // Purge cache for github/vitala89/Intentloom
    await purgeProviderCache({
      ...cache,
      provider: "github",
      projectKey: "vitala89/Intentloom",
    });

    // Third fetch after purge -> cache miss, re-fetches
    const third = await fetchLiveProviderEvidence(options);
    expect(third.diagnostics).not.toContain("cache-hit");
    expect(mockFetch).toHaveBeenCalledTimes(8);

    // Fourth fetch after 15 min TTL -> cache expired, re-fetches
    now += 900_001; // > 15 min
    const fourth = await fetchLiveProviderEvidence(options);
    expect(fourth.diagnostics).not.toContain("cache-hit");
    expect(mockFetch).toHaveBeenCalledTimes(12);
  });

  it("verifies CLI/MCP release analysis structured equivalence under offline fallback", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-cross-fallback-"));
    try {
      await writeFile(
        join(root, "github.json"),
        JSON.stringify({
          pullRequests: [{ number: 42, createdAt: "2026-08-01T00:00:00Z" }],
        }),
      );

      const cliOutput: string[] = [];
      const cliExit = await runCli(
        [
          "evidence",
          "analyze",
          "--provider",
          "github",
          "--file",
          join(root, "github.json"),
          "--project-key",
          "vitala89/Intentloom",
          "--root",
          root,
          "--json",
        ],
        { catalogRoot: resolve("catalog") },
        { stdout: (msg) => cliOutput.push(msg), stderr: () => undefined },
      );

      const mcpResponse = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "cross-surface-1",
          method: "tools/call",
          params: {
            name: RELEASE_ANALYSIS_TOOL,
            arguments: {
              provider: "github",
              file: "github.json",
              projectKey: "vitala89/Intentloom",
            },
          },
        },
        { root },
      );

      expect(cliExit).toBe(3);
      expect(mcpResponse.error).toBeUndefined();
      expect(JSON.parse(cliOutput.join("\n"))).toEqual(
        mcpResponse.result?.structuredContent,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
