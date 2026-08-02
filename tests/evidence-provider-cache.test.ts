import { sep } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  fetchLiveProviderEvidence,
  purgeProviderCache,
  type ProviderCacheStore,
} from "../packages/evidence-provider/src/index.js";

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
      if (key === path || key.startsWith(`${path}${sep}`))
        this.files.delete(key);
    }
  }
}

describe("bounded provider evidence cache", () => {
  it("reuses an available redacted result within the bounded cache TTL", async () => {
    let now = 1_000;
    const store = new MemoryProviderCacheStore();
    const cache = {
      rootDirectory: "/project/.aif/cache/providers",
      store,
      now: () => now,
      ttlMs: 1_000,
    };
    const token = `glpat-${"s".repeat(20)}`;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/pulls"))
        return new Response(
          JSON.stringify([{ id: "owner@example.com", state: token }]),
          { status: 200 },
        );
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const options = {
      provider: "github" as const,
      projectKey: "vitala89/Intentloom",
      fetchFn: mockFetch as any,
      cache,
    };
    const first = await fetchLiveProviderEvidence(options);
    const second = await fetchLiveProviderEvidence(options);

    expect(first.status).toBe("available");
    expect(second.diagnostics).toContain("cache-hit");
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect([...store.files.values()].join("\n")).not.toContain(token);
    expect([...store.files.values()].join("\n")).not.toContain(
      "owner@example.com",
    );

    now += 1_001;
    const third = await fetchLiveProviderEvidence(options);
    expect(third.diagnostics).not.toContain("cache-hit");
    expect(mockFetch).toHaveBeenCalledTimes(8);
  });

  it("purges a project cache target without touching another provider", async () => {
    const store = new MemoryProviderCacheStore();
    const cache = {
      rootDirectory: "/project/.aif/cache/providers",
      store,
    };
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "vitala89/Intentloom",
      fetchFn: mockFetch as any,
      cache,
    });
    await fetchLiveProviderEvidence({
      provider: "gitlab",
      projectKey: "group/project",
      fetchFn: mockFetch as any,
      cache,
    });
    await purgeProviderCache({
      ...cache,
      provider: "github",
      projectKey: "vitala89/Intentloom",
    });

    expect(store.files.size).toBe(1);
    expect([...store.files.keys()][0]).toContain("/gitlab/");
  });
});
