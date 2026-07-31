import type { ProviderEvidenceEvent } from "./index.js";
import { commitIds, sourceId, stringValue, timestamp } from "./live-helpers.js";
import type { ProviderFetchResult } from "./live-github.js";

export interface GitLabFetchParams {
  readonly cleanBase: string;
  readonly encodedKey: string;
  readonly projectKey: string;
  readonly trust: "provider-supplied-unverified";
  readonly headers: Record<string, string>;
  readonly customFetch: typeof fetch;
  readonly maxRecords: number;
  readonly maxStringLength: number;
}

export async function fetchGitLabLiveEvents(
  params: GitLabFetchParams,
): Promise<ProviderFetchResult> {
  const events: ProviderEvidenceEvent[] = [];
  const diagnostics: string[] = [];
  let bounded = false;

  const endpoints = [
    {
      type: "pull-request" as const,
      path: `/projects/${params.encodedKey}/merge_requests?per_page=50`,
    },
    {
      type: "commit-provenance" as const,
      path: `/projects/${params.encodedKey}/repository/commits?per_page=50`,
    },
    {
      type: "release" as const,
      path: `/projects/${params.encodedKey}/releases?per_page=50`,
    },
    {
      type: "pipeline" as const,
      path: `/projects/${params.encodedKey}/pipelines?per_page=50`,
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
      if (response.status === 429 || response.status === 403) {
        diagnostics.push("rate-limit-exceeded");
        bounded = true;
        break;
      }
      if (!response.ok) {
        diagnostics.push(`http-error-${ep.type}-${response.status}`);
        continue;
      }
      const data: unknown = await response.json();
      const records = Array.isArray(data) ? data : [];

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
          rec.state ?? rec.status,
          params.maxStringLength,
        );
        const commits = commitIds(rec, params.maxStringLength);
        events.push({
          id: `provider:gitlab:${ep.type}:${id}`,
          eventType: ep.type,
          timestamp: timestamp(
            rec.created_at ?? rec.released_at ?? rec.updated_at,
          ),
          sourceId: id,
          provider: "gitlab",
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
