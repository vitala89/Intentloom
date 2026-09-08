import type {
  NeutronContextBundle,
  NeutronContextSource,
  NeutronErrorCode,
  NeutronToolEnvelope,
  NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import {
  NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS,
  type NeutronToolActivityStatus,
  type NeutronTurnContextSourceRow,
  type NeutronTurnContextSummary,
  type NeutronTurnToolActivity,
} from "../../protocol/src/neutron-session-activity.js";
import type { AssembleNeutronContextResult } from "./neutron-context-assembly.js";
import { resolveNeutronToolDefinition } from "./neutron-tool-registry.js";

const DENIED_CODES = new Set<NeutronErrorCode>([
  "capability-denied",
  "permission-denied",
  "network-forbidden",
]);

const SECRET_KEY_PATTERN =
  /(?:secret|password|token|api[_-]?key|private[_-]?key|credential)/iu;

export function projectNeutronContextSummary(
  assembly: AssembleNeutronContextResult,
): NeutronTurnContextSummary {
  return projectContextBundle(assembly.bundle, assembly.usage);
}

export function projectContextBundle(
  bundle: NeutronContextBundle,
  usage: NeutronUsageBudget,
): NeutronTurnContextSummary {
  const includedCount = bundle.sources.filter(
    (source) => source.included,
  ).length;
  return {
    sessionId: bundle.sessionId,
    root: bundle.root,
    itemCount: bundle.sources.length,
    includedCount,
    excludedCount: bundle.sources.length - includedCount,
    estimatedTokens: bundle.estimatedTokens,
    tokenBudget: usage.tokenBudget,
    contextTokens: usage.contextTokens,
    limitExceeded: usage.limitExceeded,
    excludedSecretLikePaths: [...bundle.excludedSecretLikePaths],
    sources: bundle.sources.map(projectContextSource),
  };
}

export function projectNeutronToolActivity(
  envelopes: readonly NeutronToolEnvelope[],
): readonly NeutronTurnToolActivity[] {
  return envelopes.map(projectToolEnvelope);
}

export function projectionContainsSecretBody(
  value: unknown,
  secretBodies: readonly string[],
): boolean {
  const serialized = JSON.stringify(value);
  return secretBodies.some(
    (body) => body.length > 0 && serialized.includes(body),
  );
}

function projectContextSource(
  source: NeutronContextSource,
): NeutronTurnContextSourceRow {
  return {
    sourceId: source.sourceId,
    kind: source.kind,
    trustClass: source.trustClass,
    provenance: source.provenance,
    included: source.included,
    ...(source.exclusionReason !== undefined
      ? { exclusionReason: source.exclusionReason }
      : {}),
    ...(source.path !== undefined ? { path: source.path } : {}),
    ...(source.loadingLevel !== undefined
      ? { loadingLevel: source.loadingLevel }
      : {}),
  };
}

function projectToolEnvelope(
  envelope: NeutronToolEnvelope,
): NeutronTurnToolActivity {
  const status = activityStatus(envelope);
  const definition = resolveNeutronToolDefinition(envelope.invocation.toolName);
  return {
    invocationId: envelope.invocation.invocationId,
    toolName: envelope.invocation.toolName,
    status,
    allowed: status !== "denied",
    ok: envelope.result.ok,
    errorCode: envelope.result.errorCode,
    capability: definition?.requiredCapability ?? envelope.invocation.toolName,
    inputSummary: boundSummary(
      summarizeArguments(envelope.invocation.argumentsJson),
    ),
    resultSummary: boundSummary(summarizeResult(envelope)),
  };
}

function activityStatus(
  envelope: NeutronToolEnvelope,
): NeutronToolActivityStatus {
  const code = envelope.result.errorCode;
  if (code !== null && DENIED_CODES.has(code)) return "denied";
  if (!envelope.result.ok) return "failed";
  return "completed";
}

function summarizeArguments(argumentsJson: string): string {
  const parsed = parseJsonObject(argumentsJson);
  if (parsed === null) return "invalid input";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (SECRET_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      parts.push(`${key}=${String(value)}`);
    } else if (typeof value === "boolean") {
      parts.push(`${key}=${String(value)}`);
    }
  }
  return parts.length === 0 ? "no primitive inputs" : parts.join(", ");
}

function summarizeResult(envelope: NeutronToolEnvelope): string {
  if (envelope.result.errorCode !== null) {
    const audit = parseJsonObject(envelope.result.payloadJson);
    const denialClass =
      typeof audit?.denialClass === "string" ? audit.denialClass : null;
    const reason = typeof audit?.reason === "string" ? audit.reason : null;
    const suffix = [denialClass, reason].filter(
      (part): part is string => part !== null && !SECRET_KEY_PATTERN.test(part),
    );
    return suffix.length === 0
      ? envelope.result.errorCode
      : `${envelope.result.errorCode}: ${suffix.join(" — ")}`;
  }
  const payload = parseJsonObject(envelope.result.payloadJson);
  if (payload === null) return envelope.result.ok ? "completed" : "failed";
  const parts = resultParts(payload);
  return parts.length === 0 ? "completed" : parts.join(", ");
}

function resultParts(payload: Record<string, unknown>): string[] {
  const parts: string[] = [];
  pushCount(parts, "findings", payload.findings);
  pushCount(parts, "changes", payload.changes);
  pushCount(parts, "events", payload.events);
  pushCount(parts, "items", payload.items);
  if (typeof payload.readiness === "string") {
    parts.push(`readiness=${payload.readiness}`);
  }
  if (typeof payload.exitCode === "number") {
    parts.push(`exitCode=${payload.exitCode}`);
  }
  const profile = nestedString(payload.profileDetection, "profile");
  if (profile !== null) parts.push(`profile=${profile}`);
  return parts;
}

function pushCount(parts: string[], label: string, value: unknown): void {
  if (Array.isArray(value)) parts.push(`${label}=${value.length}`);
}

function nestedString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const nested = record[key];
  return typeof nested === "string" && nested.length > 0 ? nested : null;
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function boundSummary(value: string): string {
  if (value.length <= NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS) return value;
  return `${value.slice(0, NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS - 1)}…`;
}
