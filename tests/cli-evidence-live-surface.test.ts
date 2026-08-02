import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  fetchLiveProviderEvidence,
  type ProviderName,
} from "../packages/evidence-provider/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

function createFetch(provider: ProviderName): typeof fetch {
  return vi.fn(async (input: string | URL) => {
    const pathname = new URL(input).pathname;
    const body =
      provider === "github" && pathname.endsWith("/actions/runs")
        ? {
            workflow_runs: [
              {
                id: 7,
                status: "completed",
                created_at: "2026-08-01T00:00:00Z",
              },
            ],
          }
        : pathname.endsWith("/pulls") || pathname.endsWith("/merge_requests")
          ? [{ id: 8, state: "open", created_at: "2026-08-01T01:00:00Z" }]
          : [];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("CLI live evidence surface", () => {
  it.each(["github", "gitlab"] as const)(
    "matches the provider contract for %s JSON fetch output",
    async (provider) => {
      const projectKey = provider === "github" ? "org/repo" : "group/project";
      const fetchFn = createFetch(provider);
      const output: string[] = [];
      vi.stubGlobal("fetch", fetchFn);
      try {
        const exitCode = await runCli(
          [
            "evidence",
            "fetch",
            "--provider",
            provider,
            "--project-key",
            projectKey,
            "--json",
          ],
          { catalogRoot: resolve("catalog") },
          {
            stdout: (message) => output.push(message),
            stderr: () => undefined,
          },
        );
        const direct = await fetchLiveProviderEvidence({
          provider,
          projectKey,
          baseUrl: provider === "github" ? "https://api.github.com" : undefined,
          fetchFn: createFetch(provider),
        });

        expect(exitCode).toBe(0);
        expect(JSON.parse(output.join("\n"))).toEqual(direct);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
