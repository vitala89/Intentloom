import type { ProviderEvidenceEvent } from "./index.js";
import {
  commitIds,
  gitlabNextUrl,
  MAX_PROVIDER_PAGES,
  sourceId,
  stringValue,
  timestamp,
} from "./live-helpers.js";
import {
  fetchProviderPages,
  type ProviderPageFetchResult,
} from "./live-pages.js";
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

function gitlabEvent(
  params: GitLabFetchParams,
  eventType: ProviderEvidenceEvent["eventType"],
  record: Record<string, unknown>,
  index: number,
): ProviderEvidenceEvent {
  const id = sourceId(record, index, params.maxStringLength);
  const state = stringValue(
    record.state ?? record.status,
    params.maxStringLength,
  );
  const commits = commitIds(record, params.maxStringLength);
  return {
    id: `provider:gitlab:${eventType}:${id}`,
    eventType,
    timestamp: timestamp(
      record.created_at ?? record.released_at ?? record.updated_at,
    ),
    sourceId: id,
    provider: "gitlab",
    projectKey: params.projectKey,
    trust: params.trust,
    ...(state ? { state } : {}),
    ...(commits.length > 0 ? { commitIds: commits } : {}),
    finding: "record-untrusted",
  };
}

export async function fetchGitLabLiveEvents(
  params: GitLabFetchParams,
): Promise<ProviderFetchResult> {
  const events: ProviderEvidenceEvent[] = [];
  const diagnostics: string[] = [];
  let bounded = false;
  let pagesUsed = 0;
  let halted = false;
  const endpoints = [
    [
      "pull-request",
      `/projects/${params.encodedKey}/merge_requests?per_page=50`,
    ],
    [
      "commit-provenance",
      `/projects/${params.encodedKey}/repository/commits?per_page=50`,
    ],
    ["release", `/projects/${params.encodedKey}/releases?per_page=50`],
    ["pipeline", `/projects/${params.encodedKey}/pipelines?per_page=50`],
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
      nextUrl: (currentUrl, response) => gitlabNextUrl(currentUrl, response),
      recordsFromData: (data) => (Array.isArray(data) ? data : []),
      toEvent: (record, index) => gitlabEvent(params, eventType, record, index),
    });
    events.push(...result.events);
    diagnostics.push(...result.diagnostics);
    pagesUsed += result.pagesUsed;
    bounded ||= result.bounded;
    halted = result.halted;
  }

  return { events, diagnostics, bounded };
}
