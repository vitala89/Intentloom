import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";

export const NEUTRON_LEASE_DEFAULT_TTL_MS = 120_000;
export const NEUTRON_SCHEDULER_LEASE_DIR = ".aif/neutron/scheduler/leases";

export const NEUTRON_TASK_LEASE_STATUSES = [
  "active",
  "released",
  "expired",
] as const;

export type NeutronTaskLeaseStatus =
  (typeof NEUTRON_TASK_LEASE_STATUSES)[number];

export interface NeutronTaskLease {
  readonly leaseId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly ownerId: string;
  readonly acquiredAt: number;
  readonly expiresAt: number;
  readonly renewedAt: number;
  readonly status: NeutronTaskLeaseStatus;
  readonly releasedAt?: number;
}

export function neutronTaskLeaseId(
  sessionId: string,
  taskId: string,
  attempt: number,
): string {
  return `${sessionId}:${taskId}:${attempt}`;
}

export function resolveNeutronLeaseAttempt(
  attempt: number | undefined,
): number {
  const resolved = attempt ?? 1;
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "lease attempt must be an integer >= 1",
      { attempt: resolved },
    );
  }
  return resolved;
}

export function resolveNeutronLeaseTtlMs(nodeTimeoutMs?: number): number {
  if (nodeTimeoutMs === undefined) return NEUTRON_LEASE_DEFAULT_TTL_MS;
  if (!Number.isInteger(nodeTimeoutMs) || nodeTimeoutMs < 1) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "nodeTimeoutMs must be an integer >= 1",
    );
  }
  return Math.min(nodeTimeoutMs, NEUTRON_LEASE_DEFAULT_TTL_MS);
}

export function neutronLeaseHeartbeatIntervalMs(ttlMs: number): number {
  return Math.max(1, Math.floor(ttlMs / 3));
}

export function assertNeutronLeaseIdentityPart(
  value: string,
  field: "sessionId" | "taskId" | "ownerId",
): string {
  if (value.length === 0 || value.includes("/") || value.includes("\\")) {
    throw new NeutronSchedulerError(
      "validation-failed",
      `${field} must be a non-empty path-safe identifier`,
    );
  }
  return value;
}

export function classifyNeutronTaskLease(
  lease: NeutronTaskLease,
  nowMs: number,
): NeutronTaskLeaseStatus {
  if (lease.status === "released") return "released";
  if (lease.status === "expired" || nowMs >= lease.expiresAt) return "expired";
  return "active";
}

export function isNeutronSchedulerStatePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return (
    normalized.includes("/.aif/neutron/scheduler/") ||
    normalized.startsWith(".aif/neutron/scheduler/")
  );
}

export function neutronTaskLeaseFileName(leaseId: string): string {
  return `${encodeURIComponent(leaseId)}.json`;
}

export function serializeNeutronTaskLease(lease: NeutronTaskLease): string {
  return `${JSON.stringify(
    {
      leaseId: lease.leaseId,
      sessionId: lease.sessionId,
      taskId: lease.taskId,
      attempt: lease.attempt,
      ownerId: lease.ownerId,
      acquiredAt: lease.acquiredAt,
      expiresAt: lease.expiresAt,
      renewedAt: lease.renewedAt,
      status: lease.status,
      ...(lease.releasedAt === undefined
        ? {}
        : { releasedAt: lease.releasedAt }),
    },
    null,
    2,
  )}\n`;
}

export function parseNeutronTaskLease(raw: string): NeutronTaskLease {
  const value = JSON.parse(raw) as Partial<NeutronTaskLease>;
  if (
    typeof value.leaseId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.taskId !== "string" ||
    typeof value.ownerId !== "string" ||
    typeof value.attempt !== "number" ||
    typeof value.acquiredAt !== "number" ||
    typeof value.expiresAt !== "number" ||
    typeof value.renewedAt !== "number" ||
    (value.status !== "active" &&
      value.status !== "released" &&
      value.status !== "expired")
  ) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "persisted lease record is invalid",
    );
  }
  return {
    leaseId: value.leaseId,
    sessionId: value.sessionId,
    taskId: value.taskId,
    attempt: value.attempt,
    ownerId: value.ownerId,
    acquiredAt: value.acquiredAt,
    expiresAt: value.expiresAt,
    renewedAt: value.renewedAt,
    status: value.status,
    ...(typeof value.releasedAt === "number"
      ? { releasedAt: value.releasedAt }
      : {}),
  };
}
