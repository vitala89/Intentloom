import type { ProviderEvidenceResult, ProviderName } from "./index.js";
import {
  readCachedProviderResult,
  type ProviderCacheOptions,
  writeCachedProviderResult,
} from "./cache.js";
import { fetchGitHubLiveEvents } from "./live-github.js";
import { fetchGitLabLiveEvents } from "./live-gitlab.js";
import { trimTrailingSlashes } from "./live-helpers.js";
import { resolveProviderCredential } from "./credentials.js";

export interface LiveProviderFetchOptions {
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly token?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly cache?: ProviderCacheOptions | undefined;
  readonly maxRecords?: number | undefined;
  readonly maxStringLength?: number | undefined;
}

export async function fetchLiveProviderEvidence(
  options: LiveProviderFetchOptions,
): Promise<ProviderEvidenceResult> {
  const maxRecords = Math.min(
    500,
    Math.max(1, Math.trunc(options.maxRecords ?? 100)),
  );
  const maxStringLength = Math.min(
    512,
    Math.max(16, Math.trunc(options.maxStringLength ?? 128)),
  );
  const base = {
    operationVersion: 1 as const,
    source: "provider-live" as const,
    provider: options.provider,
    projectKey: options.projectKey.slice(0, maxStringLength),
    trust: "provider-supplied-unverified" as const,
  };

  if (!base.projectKey || !["github", "gitlab"].includes(options.provider)) {
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["invalid-options"],
    };
  }

  const customFetch = options.fetchFn ?? globalThis.fetch;
  if (!customFetch) {
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["fetch-unavailable"],
    };
  }

  if (options.provider === "github") {
    const [owner, repo] = options.projectKey.split("/");
    if (!owner || !repo) {
      return {
        ...base,
        status: "invalid",
        events: [],
        diagnostics: ["invalid-project-key-format"],
      };
    }
  }

  if (options.cache) {
    const cached = await readCachedProviderResult(
      options.provider,
      base.projectKey,
      options.cache,
    );
    if (cached)
      return { ...cached, diagnostics: [...cached.diagnostics, "cache-hit"] };
  }

  const token = resolveProviderCredential(
    options.provider,
    options.token,
  ).token;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    if (options.provider === "github") {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["PRIVATE-TOKEN"] = token;
    }
  }

  let result;
  if (options.provider === "github") {
    const defaultBase = options.baseUrl ?? "https://api.github.com";
    const cleanBase = trimTrailingSlashes(defaultBase);
    const [owner, repo] = options.projectKey.split("/") as [string, string];
    result = await fetchGitHubLiveEvents({
      cleanBase,
      owner,
      repo,
      projectKey: base.projectKey,
      trust: base.trust,
      headers,
      customFetch,
      maxRecords,
      maxStringLength,
    });
  } else {
    const defaultBase = options.baseUrl ?? "https://gitlab.com/api/v4";
    const cleanBase = trimTrailingSlashes(defaultBase);
    const encodedKey = encodeURIComponent(options.projectKey);
    result = await fetchGitLabLiveEvents({
      cleanBase,
      encodedKey,
      projectKey: base.projectKey,
      trust: base.trust,
      headers,
      customFetch,
      maxRecords,
      maxStringLength,
    });
  }

  const { events, diagnostics, bounded } = result;
  const reachedRecordLimit = bounded && events.length >= maxRecords;

  events.sort(
    (left, right) =>
      (left.timestamp ?? Number.MAX_SAFE_INTEGER) -
        (right.timestamp ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );

  const response: ProviderEvidenceResult = {
    ...base,
    status: bounded ? "bounded" : "available",
    events,
    diagnostics: reachedRecordLimit
      ? [...diagnostics, "record-limit-reached"]
      : diagnostics,
  };
  if (options.cache && response.status === "available") {
    try {
      await writeCachedProviderResult(response, options.cache);
    } catch {
      return {
        ...response,
        diagnostics: [...response.diagnostics, "cache-write-failed"],
      };
    }
  }
  return response;
}
