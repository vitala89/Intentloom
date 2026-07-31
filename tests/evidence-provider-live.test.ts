import { describe, expect, it, vi } from "vitest";
import {
  fetchLiveProviderEvidence,
  type LiveProviderFetchOptions,
} from "../packages/evidence-provider/src/index.js";

describe("Live Provider Connections (ADR-0022)", () => {
  it("returns invalid status for invalid provider or empty projectKey", async () => {
    const invalidProvider = await fetchLiveProviderEvidence({
      provider: "invalid" as any,
      projectKey: "owner/repo",
    });
    expect(invalidProvider.status).toBe("invalid");
    expect(invalidProvider.diagnostics).toContain("invalid-options");

    const emptyKey = await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "",
    });
    expect(emptyKey.status).toBe("invalid");
    expect(emptyKey.diagnostics).toContain("invalid-options");
  });

  it("returns invalid status for malformed GitHub projectKey", async () => {
    const res = await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "invalid-single-string",
      fetchFn: vi.fn() as any,
    });
    expect(res.status).toBe("invalid");
    expect(res.diagnostics).toContain("invalid-project-key-format");
  });

  it("fetches GitHub live evidence using mock fetchFn and Authorization header", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/pulls")) {
        return new Response(
          JSON.stringify([
            { id: 101, state: "open", created_at: "2026-07-31T12:00:00Z" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/commits")) {
        return new Response(
          JSON.stringify([
            {
              sha: "abc123def",
              commit: { message: "initial commit" },
              created_at: "2026-07-31T10:00:00Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/releases")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/actions/runs")) {
        return new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 999,
                status: "completed",
                conclusion: "success",
                created_at: "2026-07-31T13:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const result = await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "vitala89/Intentloom",
      token: "dummy_github_token",
      fetchFn: mockFetch as any,
    });

    expect(result.status).toBe("available");
    expect(result.source).toBe("provider-live");
    expect(result.provider).toBe("github");
    expect(result.projectKey).toBe("vitala89/Intentloom");
    expect(result.events.length).toBe(3);

    // Verify token was passed in Authorization header
    expect(mockFetch).toHaveBeenCalled();
    const firstCallHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(firstCallHeaders?.["Authorization"]).toBe(
      "Bearer dummy_github_token",
    );
  });

  it("fetches GitLab live evidence using PRIVATE-TOKEN header", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/merge_requests")) {
        return new Response(
          JSON.stringify([
            { iid: 1, state: "merged", created_at: "2026-07-31T14:00:00Z" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const result = await fetchLiveProviderEvidence({
      provider: "gitlab",
      projectKey: "group/my-project",
      token: "dummy_gitlab_token",
      fetchFn: mockFetch as any,
    });

    expect(result.status).toBe("available");
    expect(result.source).toBe("provider-live");
    expect(result.provider).toBe("gitlab");
    expect(result.events.length).toBe(1);

    const firstCallHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(firstCallHeaders?.["PRIVATE-TOKEN"]).toBe("dummy_gitlab_token");
  });

  it("trims custom provider base URL slashes without a backtracking regex", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response("[]", { status: 200 }));

    await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "vitala89/Intentloom",
      baseUrl: "https://example.test////",
      fetchFn: mockFetch as any,
    });

    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      "https://example.test/repos/vitala89/Intentloom/pulls?state=all&per_page=50",
    );
  });

  it("detects rate-limit-exceeded from HTTP 429 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
        status: 429,
        headers: { "x-ratelimit-remaining": "0" },
      }),
    );

    const result = await fetchLiveProviderEvidence({
      provider: "github",
      projectKey: "vitala89/Intentloom",
      fetchFn: mockFetch as any,
    });

    expect(result.status).toBe("bounded");
    expect(result.diagnostics).toContain("rate-limit-exceeded");
  });
});
