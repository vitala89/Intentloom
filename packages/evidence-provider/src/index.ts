import { createHash } from "node:crypto";

export type ProviderName = "github" | "gitlab";
export type ProviderEventType =
  | "pull-request"
  | "review"
  | "check"
  | "pipeline"
  | "release"
  | "commit-provenance";

export interface ProviderExportOptions {
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly payload: unknown;
  readonly maxRecords?: number;
  readonly maxStringLength?: number;
}

export interface ProviderEvidenceEvent {
  readonly id: string;
  readonly eventType: ProviderEventType;
  readonly timestamp: number | null;
  readonly sourceId: string;
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly trust: "provider-supplied-unverified";
  readonly state?: string;
  readonly commitIds?: readonly string[];
  readonly finding?: "record-untrusted";
}

export interface ProviderEvidenceResult {
  readonly operationVersion: 1;
  readonly source: "provider-export";
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly trust: "provider-supplied-unverified";
  readonly status: "available" | "bounded" | "invalid";
  readonly events: readonly ProviderEvidenceEvent[];
  readonly diagnostics: readonly string[];
}

const eventKinds: readonly [ProviderEventType, string][] = [
  ["pull-request", "pullRequests"],
  ["review", "reviews"],
  ["check", "checks"],
  ["pipeline", "pipelines"],
  ["release", "releases"],
  ["commit-provenance", "commits"],
];

function stringValue(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, max)
    : undefined;
}

function identifier(value: unknown, max: number): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value))
    return String(value);
  return stringValue(value, max);
}

function timestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.trunc(parsed / 1000);
}

function sourceId(record: Record<string, unknown>, index: number, max: number) {
  const explicit = identifier(record.id ?? record.iid ?? record.number, max);
  if (explicit) return explicit;
  return (
    createHash("sha256")
      .update(JSON.stringify(record).slice(0, max * 4))
      .digest("hex")
      .slice(0, 16) + `-${index}`
  );
}

function commitIds(record: Record<string, unknown>, max: number) {
  const candidates = [record.commitId, record.sha, record.mergeCommitSha];
  return candidates
    .map((value) => stringValue(value, max))
    .filter((value): value is string => Boolean(value));
}

export function importProviderExport(
  options: ProviderExportOptions,
): ProviderEvidenceResult {
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
    source: "provider-export" as const,
    provider: options.provider,
    projectKey: options.projectKey.slice(0, maxStringLength),
    trust: "provider-supplied-unverified" as const,
  };
  if (!base.projectKey || !["github", "gitlab"].includes(options.provider))
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["invalid-options"],
    };
  if (!options.payload || typeof options.payload !== "object")
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["invalid-payload"],
    };

  const root = options.payload as Record<string, unknown>;
  const events: ProviderEvidenceEvent[] = [];
  let bounded = false;
  for (const [eventType, key] of eventKinds) {
    const records = root[key];
    if (!Array.isArray(records)) continue;
    for (let index = 0; index < records.length; index += 1) {
      if (events.length >= maxRecords) {
        bounded = true;
        break;
      }
      const record = records[index];
      if (!record || typeof record !== "object" || Array.isArray(record))
        continue;
      const item = record as Record<string, unknown>;
      const id = sourceId(item, index, maxStringLength);
      const state = stringValue(
        item.state ?? item.status ?? item.conclusion,
        maxStringLength,
      );
      const commits = commitIds(item, maxStringLength);
      events.push({
        id: `provider:${options.provider}:${eventType}:${id}`,
        eventType,
        timestamp: timestamp(
          item.createdAt ??
            item.created_at ??
            item.updatedAt ??
            item.updated_at,
        ),
        sourceId: id,
        provider: options.provider,
        projectKey: base.projectKey,
        trust: base.trust,
        ...(state ? { state } : {}),
        ...(commits.length > 0 ? { commitIds: commits } : {}),
        finding: "record-untrusted",
      });
    }
    if (bounded) break;
  }
  events.sort(
    (left, right) =>
      (left.timestamp ?? Number.MAX_SAFE_INTEGER) -
        (right.timestamp ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
  return {
    ...base,
    status: bounded ? "bounded" : "available",
    events,
    diagnostics: bounded ? ["record-limit-reached"] : [],
  };
}
