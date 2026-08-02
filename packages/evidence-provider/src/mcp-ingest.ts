import { createHash } from "node:crypto";
import type {
  ProviderEvidenceEvent,
  ProviderEvidenceResult,
  ProviderEventType,
} from "./index.js";
import { redactProviderString } from "./redaction.js";

export interface ExternalMcpIngestOptions {
  readonly serverName: string;
  readonly toolName: string;
  readonly projectKey: string;
  readonly allowlist: {
    readonly allowedServers: readonly string[];
    readonly allowedTools: readonly string[];
  };
  readonly payload: unknown;
  readonly maxRecords?: number | undefined;
  readonly maxStringLength?: number | undefined;
}

function stringValue(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0
    ? redactProviderString(value, max)
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

function sourceId(
  record: Record<string, unknown>,
  index: number,
  max: number,
): string {
  const explicit = identifier(
    record.id ?? record.iid ?? record.key ?? record.number,
    max,
  );
  if (explicit) return explicit;
  return (
    createHash("sha256")
      .update(JSON.stringify(record).slice(0, max * 4))
      .digest("hex")
      .slice(0, 16) + `-${index}`
  );
}

function commitIds(record: Record<string, unknown>, max: number): string[] {
  const candidates = [
    record.commitId,
    record.sha,
    record.mergeCommitSha,
    record.id,
  ];
  return candidates
    .map((value) => stringValue(value, max))
    .filter((value): value is string => Boolean(value));
}

export function ingestExternalMcpEvidence(
  options: ExternalMcpIngestOptions,
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
    source: "external-mcp" as const,
    provider: "github" as const, // normalized provider field
    projectKey: options.projectKey.slice(0, maxStringLength),
    trust: "untrusted-external" as const,
  };

  const diagnostics: string[] = [];

  if (!base.projectKey || !options.serverName || !options.toolName) {
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["invalid-options"],
    };
  }

  const isServerAllowed = options.allowlist.allowedServers.includes(
    options.serverName,
  );
  const isToolAllowed = options.allowlist.allowedTools.includes(
    options.toolName,
  );

  if (!isServerAllowed) {
    diagnostics.push("mcp-server-unapproved");
  }
  if (!isToolAllowed) {
    diagnostics.push("mcp-tool-unapproved");
  }

  if (!isServerAllowed || !isToolAllowed) {
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics,
    };
  }

  if (!options.payload || typeof options.payload !== "object") {
    return {
      ...base,
      status: "invalid",
      events: [],
      diagnostics: ["invalid-payload"],
    };
  }

  const root = options.payload as Record<string, unknown>;
  const rawRecords = Array.isArray(root)
    ? root
    : Array.isArray(root.events)
      ? root.events
      : Array.isArray(root.records)
        ? root.records
        : [root];

  const events: ProviderEvidenceEvent[] = [];
  let bounded = false;

  for (let idx = 0; idx < rawRecords.length; idx += 1) {
    if (events.length >= maxRecords) {
      bounded = true;
      break;
    }
    const item = rawRecords[idx];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const id = sourceId(rec, idx, maxStringLength);
    const eventType: ProviderEventType =
      rec.eventType === "pull-request" ||
      rec.eventType === "review" ||
      rec.eventType === "check" ||
      rec.eventType === "pipeline" ||
      rec.eventType === "release" ||
      rec.eventType === "commit-provenance"
        ? rec.eventType
        : "check";

    const state = stringValue(
      rec.state ?? rec.status ?? rec.result,
      maxStringLength,
    );
    const commits = commitIds(rec, maxStringLength);

    events.push({
      id: `mcp:${options.serverName}:${options.toolName}:${id}`,
      eventType,
      timestamp: timestamp(rec.timestamp ?? rec.createdAt ?? rec.created_at),
      sourceId: id,
      provider: "github",
      projectKey: base.projectKey,
      trust: "untrusted-external",
      ...(state ? { state } : {}),
      ...(commits.length > 0 ? { commitIds: commits } : {}),
      finding: "record-untrusted",
    });
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
