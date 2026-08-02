import { resolve } from "node:path";
import {
  nodeProviderCacheStore,
  purgeProviderCache,
  type ProviderCacheStore,
  type ProviderName,
} from "@intentloom/evidence-provider";

export const PROVIDER_CACHE_RELATIVE_PATH = ".aif/cache/providers";

export interface CleanCacheRequest {
  readonly projectRoot: string;
  readonly provider?: ProviderName;
  readonly projectKey?: string;
  readonly store?: ProviderCacheStore;
}

export interface CleanCacheResult {
  readonly status: "purged";
  readonly cachePath: string;
  readonly provider: ProviderName | null;
  readonly projectKey: string | null;
}

export async function cleanProviderCache(
  request: CleanCacheRequest,
): Promise<CleanCacheResult> {
  await purgeProviderCache({
    rootDirectory: resolve(request.projectRoot, PROVIDER_CACHE_RELATIVE_PATH),
    ...(request.provider ? { provider: request.provider } : {}),
    ...(request.projectKey ? { projectKey: request.projectKey } : {}),
    store: request.store ?? nodeProviderCacheStore,
  });
  return {
    status: "purged",
    cachePath: PROVIDER_CACHE_RELATIVE_PATH,
    provider: request.provider ?? null,
    projectKey: request.projectKey ?? null,
  };
}
