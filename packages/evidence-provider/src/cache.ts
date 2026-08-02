import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProviderEvidenceResult, ProviderName } from "./index.js";

export const PROVIDER_CACHE_TTL_MS = 15 * 60 * 1000;

export interface ProviderCacheStore {
  readonly read: (path: string) => Promise<string>;
  readonly write: (path: string, content: string) => Promise<void>;
  readonly remove: (path: string) => Promise<void>;
}

export interface ProviderCacheOptions {
  readonly rootDirectory: string;
  readonly store?: ProviderCacheStore;
  readonly now?: () => number;
  readonly ttlMs?: number;
}

export interface ProviderCachePurgeOptions extends ProviderCacheOptions {
  readonly provider?: ProviderName;
  readonly projectKey?: string;
}

interface ProviderCacheRecord {
  readonly operationVersion: 1;
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly fetchedAt: number;
  readonly expiresAt: number;
  readonly result: ProviderEvidenceResult;
}

export const nodeProviderCacheStore: ProviderCacheStore = {
  read: (path) => readFile(path, "utf8"),
  async write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, path);
  },
  remove: (path) => rm(path, { force: true, recursive: true }),
};

function storeFor(options: ProviderCacheOptions): ProviderCacheStore {
  if (!options.rootDirectory) throw new Error("cache root is required");
  return options.store ?? nodeProviderCacheStore;
}

function clockFor(options: ProviderCacheOptions): () => number {
  return options.now ?? Date.now;
}

function ttlFor(options: ProviderCacheOptions): number {
  return Math.min(
    PROVIDER_CACHE_TTL_MS,
    Math.max(1, Math.trunc(options.ttlMs ?? PROVIDER_CACHE_TTL_MS)),
  );
}

function projectHash(provider: ProviderName, projectKey: string): string {
  return createHash("sha256")
    .update(`${provider}\0${projectKey}`)
    .digest("hex")
    .slice(0, 24);
}

function cacheDirectory(
  rootDirectory: string,
  provider: ProviderName,
  projectKey: string,
): string {
  return join(rootDirectory, provider, projectHash(provider, projectKey));
}

function cacheFilePath(
  rootDirectory: string,
  provider: ProviderName,
  projectKey: string,
): string {
  return join(
    cacheDirectory(rootDirectory, provider, projectKey),
    "evidence.json",
  );
}

function isCacheRecord(value: unknown): value is ProviderCacheRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const result = record.result;
  return (
    record.operationVersion === 1 &&
    (record.provider === "github" || record.provider === "gitlab") &&
    typeof record.projectKey === "string" &&
    typeof record.fetchedAt === "number" &&
    typeof record.expiresAt === "number" &&
    result !== null &&
    typeof result === "object" &&
    (result as Record<string, unknown>).status === "available" &&
    Array.isArray((result as Record<string, unknown>).events) &&
    Array.isArray((result as Record<string, unknown>).diagnostics)
  );
}

export async function readCachedProviderResult(
  provider: ProviderName,
  projectKey: string,
  options: ProviderCacheOptions,
): Promise<ProviderEvidenceResult | undefined> {
  const store = storeFor(options);
  const path = cacheFilePath(options.rootDirectory, provider, projectKey);
  try {
    const record: unknown = JSON.parse(await store.read(path));
    if (
      !isCacheRecord(record) ||
      record.provider !== provider ||
      record.projectKey !== projectKey ||
      record.result.provider !== provider ||
      record.result.projectKey !== projectKey ||
      record.result.source !== "provider-live" ||
      record.expiresAt <= record.fetchedAt
    ) {
      await store.remove(path);
      return undefined;
    }
    if (record.expiresAt <= clockFor(options)()) {
      await store.remove(path);
      return undefined;
    }
    return record.result;
  } catch {
    return undefined;
  }
}

export async function writeCachedProviderResult(
  result: ProviderEvidenceResult,
  options: ProviderCacheOptions,
): Promise<void> {
  if (result.status !== "available") return;
  const fetchedAt = clockFor(options)();
  const record: ProviderCacheRecord = {
    operationVersion: 1,
    provider: result.provider,
    projectKey: result.projectKey,
    fetchedAt,
    expiresAt: fetchedAt + ttlFor(options),
    result,
  };
  await storeFor(options).write(
    cacheFilePath(options.rootDirectory, result.provider, result.projectKey),
    JSON.stringify(record),
  );
}

export async function purgeProviderCache(
  options: ProviderCachePurgeOptions,
): Promise<void> {
  const store = storeFor(options);
  if (options.projectKey && !options.provider)
    throw new Error("provider is required for project cache purge");
  const target = options.projectKey
    ? cacheDirectory(
        options.rootDirectory,
        options.provider!,
        options.projectKey,
      )
    : options.provider
      ? join(options.rootDirectory, options.provider)
      : options.rootDirectory;
  await store.remove(target);
}
