import type { NeutronErrorCode, NeutronTaskState } from "./neutron-runtime.js";

export const NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-graph-snapshot:1" as const;

export const NEUTRON_GRAPH_STATUSES = [
  "completed",
  "failed",
  "cancelled",
  "timed-out",
  "incomplete",
  "stale",
] as const;
export type NeutronGraphStatus = (typeof NEUTRON_GRAPH_STATUSES)[number];

export const NEUTRON_GRAPH_STATUS_PRECEDENCE = [
  "stale",
  "incomplete",
  "cancelled",
  "timed-out",
  "failed",
  "completed",
] as const;

export const NEUTRON_GRAPH_STALE_KINDS = [
  "project",
  "checkpoint",
  "profile",
] as const;
export type NeutronGraphStaleKind = (typeof NEUTRON_GRAPH_STALE_KINDS)[number];

export const NEUTRON_GRAPH_ATTEMPT_STATES = [
  "completed",
  "failed",
  "cancelled",
  "timed-out",
  "stale",
] as const;
export type NeutronGraphAttemptState =
  (typeof NEUTRON_GRAPH_ATTEMPT_STATES)[number];

export const NEUTRON_GRAPH_RETRY_REASONS = [
  "operation-failed",
  "timeout",
  "lease-expired",
  "lease-lost",
  "cancelled",
  "budget-exceeded",
  "non-retryable",
  "retry-exhausted",
] as const;
export type NeutronGraphRetryReason =
  (typeof NEUTRON_GRAPH_RETRY_REASONS)[number];

export const NEUTRON_GRAPH_DEFAULT_CONCURRENCY = 1 as const;
export const NEUTRON_GRAPH_HARD_MAX_CONCURRENCY = 4 as const;
export const NEUTRON_GRAPH_MAX_ATTEMPTS = 2 as const;
export const NEUTRON_GRAPH_MAX_WARNINGS = 32 as const;
export const NEUTRON_GRAPH_MAX_NODE_CONTEXT_SOURCE_IDS = 16 as const;
export const NEUTRON_GRAPH_MAX_NODE_TOOL_INVOCATIONS = 8 as const;

export interface NeutronGraphUsageSnapshot {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly contextTokens: number;
  readonly tokenBudget: number;
  readonly limitExceeded: boolean;
}

export interface NeutronGraphToolInvocationSnapshot {
  readonly invocationId: string;
  readonly toolName: string;
  readonly payloadDigestPresent: boolean;
}

export interface NeutronGraphStaleMismatch {
  readonly kind: NeutronGraphStaleKind;
  readonly expected: string;
  readonly current: string;
}

export interface NeutronGraphStaleSnapshot {
  readonly accepted: boolean;
  readonly rerunAttempted: false;
  readonly kinds: readonly NeutronGraphStaleKind[];
  readonly mismatches: readonly NeutronGraphStaleMismatch[];
}

export interface NeutronGraphAttemptSnapshot {
  readonly attempt: number;
  readonly leaseId: string;
  readonly state: NeutronGraphAttemptState;
  readonly retryReason: NeutronGraphRetryReason | null;
  readonly errorCode: string | null;
}

export interface NeutronGraphCapabilitySummary {
  readonly readOnly: true;
  readonly allowNetwork: false;
  readonly allowedTools: readonly string[];
  readonly maxBudget: number;
}

export interface NeutronGraphNodeCounts {
  readonly total: number;
  readonly pending: number;
  readonly ready: number;
  readonly running: number;
  readonly blocked: number;
  readonly cancelled: number;
  readonly timedOut: number;
  readonly failed: number;
  readonly completed: number;
}

export interface NeutronGraphConcurrency {
  readonly defaultConcurrency: typeof NEUTRON_GRAPH_DEFAULT_CONCURRENCY;
  readonly maxConcurrency: number;
  readonly hardMaximum: typeof NEUTRON_GRAPH_HARD_MAX_CONCURRENCY;
  readonly runningCount: number;
  readonly availableCapacity: number;
}

export interface NeutronGraphNodeSnapshot {
  readonly taskId: string;
  readonly parentId: string | null;
  readonly role: string;
  readonly state: NeutronTaskState;
  readonly dependencies: readonly string[];
  readonly blockingDependencyIds: readonly string[];
  readonly requestedCapabilities: readonly string[];
  readonly effectiveCapabilities: NeutronGraphCapabilitySummary | null;
  readonly allowedTools: readonly string[];
  readonly attemptCount: number;
  readonly authoritativeAttempt: number | null;
  readonly attempts: readonly NeutronGraphAttemptSnapshot[];
  readonly resultStatus: NeutronTaskState;
  readonly outputDigestPresent: boolean;
  readonly toolCount: number;
  readonly contextAvailable: boolean;
  readonly providerKind: string | null;
  readonly modelId: string | null;
  readonly mutationAttempted: false;
  readonly errorCode: NeutronErrorCode | string | null;
  readonly contextSourceIds: readonly string[];
  readonly toolInvocations: readonly NeutronGraphToolInvocationSnapshot[];
}

export interface NeutronGraphSnapshot {
  readonly schemaVersion: typeof NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN;
  readonly graphId: string;
  readonly sessionId: string;
  readonly root: string;
  readonly projectId: string;
  readonly status: NeutronGraphStatus;
  readonly partial: boolean;
  readonly accepted: boolean;
  readonly mutationAttempted: false;
  readonly rerunAttempted: false;
  readonly cancellationAcknowledged: boolean;
  readonly budgetExceeded: boolean;
  readonly digestPresent: boolean;
  readonly outputDigest: string | null;
  readonly usage: NeutronGraphUsageSnapshot | null;
  readonly concurrency: NeutronGraphConcurrency;
  readonly nodeCounts: NeutronGraphNodeCounts;
  readonly nodes: readonly NeutronGraphNodeSnapshot[];
  readonly stale: NeutronGraphStaleSnapshot | null;
  readonly warnings: readonly string[];
}
