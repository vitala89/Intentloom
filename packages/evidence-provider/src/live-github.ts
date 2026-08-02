import type { ProviderEvidenceEvent } from "./index.js";
import {
  commitIds,
  githubNextUrl,
  MAX_PROVIDER_PAGES,
  sourceId,
  stringValue,
  timestamp,
} from "./live-helpers.js";
import {
  fetchProviderPages,
  type ProviderPageFetchResult,
} from "./live-pages.js";

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

function githubRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    "workflow_runs" in data &&
    Array.isArray((data as Record<string, unknown>).workflow_runs)
  ) {
    return (data as Record<string, unknown>).workflow_runs as unknown[];
  }
  return [];
}

function githubEvent(
  params: GitHubFetchParams,
  eventType: ProviderEventType,
  record: Record<string, unknown>,
  index: number,
): ProviderEvidenceEvent {
  const id = sourceId(record, index, params.maxStringLength);
  const state = stringValue(
    record.state ?? record.status ?? record.conclusion,
    params.maxStringLength,
  );
  const commits = commitIds(record, params.maxStringLength);
  return {
    id: `provider:github:${eventType}:${id}`,
    eventType,
    timestamp: timestamp(
      record.created_at ?? record.published_at ?? record.updated_at,
    ),
    sourceId: id,
    provider: "github",
    projectKey: params.projectKey,
    trust: params.trust,
    ...(state ? { state } : {}),
    ...(commits.length > 0 ? { commitIds: commits } : {}),
    finding: "record-untrusted",
  };
}

type ProviderEventType = ProviderEvidenceEvent["eventType"];

export async function fetchGitHubLiveEvents(
  params: GitHubFetchParams,
): Promise<ProviderFetchResult> {
  const events: ProviderEvidenceEvent[] = [];
  const diagnostics: string[] = [];
  let bounded = false;
  let pagesUsed = 0;
  let halted = false;
  const endpoints = [
    [
      "pull-request",
      `/repos/${params.owner}/${params.repo}/pulls?state=all&per_page=50`,
    ],
    [
      "commit-provenance",
      `/repos/${params.owner}/${params.repo}/commits?per_page=50`,
    ],
    ["release", `/repos/${params.owner}/${params.repo}/releases?per_page=50`],
    [
      "pipeline",
      `/repos/${params.owner}/${params.repo}/actions/runs?per_page=50`,
    ],
  ] as const;

  for (const [eventType, path] of endpoints) {
    if (events.length >= params.maxRecords || halted) {
      bounded = true;
      break;
    }
    const result: ProviderPageFetchResult = await fetchProviderPages({
      initialUrl: `${params.cleanBase}${path}`,
      headers: params.headers,
      customFetch: params.customFetch,
      maxPages: MAX_PROVIDER_PAGES - pagesUsed,
      maxRecords: params.maxRecords - events.length,
      fetchFailureDiagnostic: eventType,
      nextUrl: (_currentUrl, response) => githubNextUrl(response),
      recordsFromData: githubRecords,
      toEvent: (record, index) => githubEvent(params, eventType, record, index),
    });
    events.push(...result.events);
    diagnostics.push(...result.diagnostics);
    pagesUsed += result.pagesUsed;
    bounded ||= result.bounded;
    halted = result.halted;
  }

  return { events, diagnostics, bounded };
}
