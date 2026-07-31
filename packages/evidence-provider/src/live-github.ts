import type { ProviderEvidenceEvent } from "./index.js";
import { commitIds, sourceId, stringValue, timestamp } from "./live-helpers.js";

export interface GitHubFetchParams {
  readonly cleanBase: string;
  readonly owner: string;
  readonly repo: string;
  readonly projectKey: string;
  readonly trust: "provider-supplied-unverified";
  readonly headers: Record<string, string>;
  readonly customFetch: typeof fetch;
  readonly maxRecords: number;
  readonly maxStringLength: number;
}

export interface ProviderFetchResult {
  readonly events: ProviderEvidenceEvent[];
  readonly diagnostics: string[];
  readonly bounded: boolean;
}

export async function fetchGitHubLiveEvents(
  params: GitHubFetchParams,
): Promise<ProviderFetchResult> {
  const events: ProviderEvidenceEvent[] = [];
  const diagnostics: string[] = [];
  let bounded = false;

  const endpoints = [
    {
      type: "pull-request" as const,
      path: `/repos/${params.owner}/${params.repo}/pulls?state=all&per_page=50`,
    },
    {
      type: "commit-provenance" as const,
      path: `/repos/${params.owner}/${params.repo}/commits?per_page=50`,
    },
    {
      type: "release" as const,
      path: `/repos/${params.owner}/${params.repo}/releases?per_page=50`,
    },
    {
      type: "pipeline" as const,
      path: `/repos/${params.owner}/${params.repo}/actions/runs?per_page=50`,
    },
  ];

  for (const ep of endpoints) {
    if (events.length >= params.maxRecords) {
      bounded = true;
      break;
    }
    try {
      const response = await params.customFetch(
        `${params.cleanBase}${ep.path}`,
        { headers: params.headers },
      );
      if (
        response.status === 429 ||
        response.headers.get("x-ratelimit-remaining") === "0"
      ) {
        diagnostics.push("rate-limit-exceeded");
        bounded = true;
        break;
      }
      if (!response.ok) {
        diagnostics.push(`http-error-${ep.type}-${response.status}`);
        continue;
      }
      const data: unknown = await response.json();
      let records: unknown[] = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (
        data &&
        typeof data === "object" &&
        "workflow_runs" in data &&
        Array.isArray((data as Record<string, unknown>).workflow_runs)
      ) {
        records = (data as Record<string, unknown>).workflow_runs as unknown[];
      }

      for (let idx = 0; idx < records.length; idx += 1) {
        if (events.length >= params.maxRecords) {
          bounded = true;
          break;
        }
        const item = records[idx];
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const rec = item as Record<string, unknown>;
        const id = sourceId(rec, idx, params.maxStringLength);
        const state = stringValue(
          rec.state ?? rec.status ?? rec.conclusion,
          params.maxStringLength,
        );
        const commits = commitIds(rec, params.maxStringLength);
        events.push({
          id: `provider:github:${ep.type}:${id}`,
          eventType: ep.type,
          timestamp: timestamp(
            rec.created_at ?? rec.published_at ?? rec.updated_at,
          ),
          sourceId: id,
          provider: "github",
          projectKey: params.projectKey,
          trust: params.trust,
          ...(state ? { state } : {}),
          ...(commits.length > 0 ? { commitIds: commits } : {}),
          finding: "record-untrusted",
        });
      }
    } catch {
      diagnostics.push(`fetch-failed-${ep.type}`);
    }
  }

  return { events, diagnostics, bounded };
}
