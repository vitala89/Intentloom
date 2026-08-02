import type { ProviderEvidenceEvent } from "./index.js";
import { isRateLimited } from "./live-helpers.js";

export interface ProviderPageFetchOptions {
  readonly initialUrl: string;
  readonly headers: Record<string, string>;
  readonly customFetch: typeof fetch;
  readonly maxPages: number;
  readonly maxRecords: number;
  readonly fetchFailureDiagnostic: string;
  readonly nextUrl: (
    currentUrl: string,
    response: Response,
  ) => string | undefined;
  readonly recordsFromData: (data: unknown) => unknown[];
  readonly toEvent: (
    record: Record<string, unknown>,
    index: number,
  ) => ProviderEvidenceEvent;
}

export interface ProviderPageFetchResult {
  readonly events: ProviderEvidenceEvent[];
  readonly diagnostics: string[];
  readonly bounded: boolean;
  readonly halted: boolean;
  readonly pagesUsed: number;
}

export async function fetchProviderPages(
  options: ProviderPageFetchOptions,
): Promise<ProviderPageFetchResult> {
  const events: ProviderEvidenceEvent[] = [];
  const diagnostics: string[] = [];
  let nextUrl: string | undefined = options.initialUrl;
  let pagesUsed = 0;
  let bounded = false;
  let halted = false;

  try {
    while (nextUrl && pagesUsed < options.maxPages) {
      if (events.length >= options.maxRecords) {
        bounded = true;
        break;
      }
      pagesUsed += 1;
      const response = await options.customFetch(nextUrl, {
        headers: options.headers,
      });
      if (isRateLimited(response)) {
        diagnostics.push("rate-limit-exceeded", "E_PROVIDER_RATE_LIMITED");
        bounded = true;
        halted = true;
        break;
      }
      if (!response.ok) {
        diagnostics.push(
          `http-error-${options.fetchFailureDiagnostic}-${response.status}`,
        );
        break;
      }
      const records = options.recordsFromData(await response.json());
      for (let index = 0; index < records.length; index += 1) {
        if (events.length >= options.maxRecords) {
          bounded = true;
          break;
        }
        const record = records[index];
        if (!record || typeof record !== "object" || Array.isArray(record))
          continue;
        events.push(options.toEvent(record as Record<string, unknown>, index));
      }
      if (events.length >= options.maxRecords) {
        bounded = true;
        break;
      }
      nextUrl = options.nextUrl(nextUrl, response);
    }
  } catch {
    diagnostics.push(`fetch-failed-${options.fetchFailureDiagnostic}`);
  }

  if (nextUrl && pagesUsed >= options.maxPages) {
    diagnostics.push("page-limit-reached");
    bounded = true;
    halted = true;
  }

  return { events, diagnostics, bounded, halted, pagesUsed };
}
