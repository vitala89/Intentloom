import type { FileSystem } from "./index.js";
import type { NeutronSchedulerClock } from "./neutron-scheduler-clock.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import {
  assertNeutronLeaseIdentityPart,
  classifyNeutronTaskLease,
  NEUTRON_SCHEDULER_LEASE_DIR,
  neutronTaskLeaseFileName,
  neutronTaskLeaseId,
  parseNeutronTaskLease,
  resolveNeutronLeaseAttempt,
  resolveNeutronLeaseTtlMs,
  serializeNeutronTaskLease,
  type NeutronTaskLease,
} from "./neutron-scheduler-lease.js";

const leaseLocks = new Map<string, Promise<unknown>>();

export interface NeutronTaskLeaseStoreInput {
  readonly root: string;
  readonly fs: FileSystem;
  readonly clock: NeutronSchedulerClock;
  readonly sessionId: string;
  readonly taskId: string;
  readonly ownerId: string;
  readonly attempt?: number;
  readonly ttlMs?: number;
  readonly nodeTimeoutMs?: number;
}

export function neutronTaskLeasePath(
  root: string,
  sessionId: string,
  taskId: string,
  attempt: number,
): string {
  const leaseId = neutronTaskLeaseId(sessionId, taskId, attempt);
  return `${normalizeLeaseRoot(root)}/${NEUTRON_SCHEDULER_LEASE_DIR}/${neutronTaskLeaseFileName(leaseId)}`;
}

function normalizeLeaseRoot(root: string): string {
  let end = root.length;
  while (end > 0) {
    const last = root[end - 1];
    if (last !== "/" && last !== "\\") break;
    end -= 1;
  }
  return root.slice(0, end).replaceAll("\\", "/");
}

export async function readNeutronTaskLease(input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly sessionId: string;
  readonly taskId: string;
  readonly attempt?: number;
}): Promise<NeutronTaskLease | null> {
  const attempt = resolveNeutronLeaseAttempt(input.attempt);
  const path = neutronTaskLeasePath(
    input.root,
    input.sessionId,
    input.taskId,
    attempt,
  );
  if (!(await input.fs.exists(path))) return null;
  return parseNeutronTaskLease(await input.fs.read(path));
}

export async function acquireNeutronTaskLease(
  input: NeutronTaskLeaseStoreInput,
): Promise<NeutronTaskLease> {
  const identity = resolveIdentity(input);
  return withLeaseLock(identity.path, async () => {
    const existing = await readExisting(input.fs, identity.path);
    if (existing !== null) {
      throwExistingLease(existing, input.clock.nowMs());
    }
    const nowMs = input.clock.nowMs();
    const ttlMs = resolveNeutronLeaseTtlMs(input.nodeTimeoutMs ?? input.ttlMs);
    const lease: NeutronTaskLease = {
      leaseId: identity.leaseId,
      sessionId: identity.sessionId,
      taskId: identity.taskId,
      attempt: identity.attempt,
      ownerId: identity.ownerId,
      acquiredAt: nowMs,
      expiresAt: nowMs + ttlMs,
      renewedAt: nowMs,
      status: "active",
    };
    await persistLease(input.fs, identity.path, lease);
    return lease;
  });
}

export async function renewNeutronTaskLease(
  input: NeutronTaskLeaseStoreInput,
): Promise<NeutronTaskLease> {
  const identity = resolveIdentity(input);
  return withLeaseLock(identity.path, async () => {
    const existing = await requireExisting(input.fs, identity.path, identity);
    const nowMs = input.clock.nowMs();
    if (classifyNeutronTaskLease(existing, nowMs) === "expired") {
      throw new NeutronSchedulerError(
        "lease-expired",
        "expired lease cannot be renewed",
        leaseDetails(existing),
      );
    }
    if (existing.ownerId !== identity.ownerId) {
      throw new NeutronSchedulerError(
        "invalid-owner",
        "lease renewal requires the current owner",
        leaseDetails(existing),
      );
    }
    if (existing.status !== "active") {
      throw new NeutronSchedulerError(
        "lease-held",
        "released lease cannot be renewed",
        leaseDetails(existing),
      );
    }
    const ttlMs = existing.expiresAt - existing.renewedAt;
    const renewed: NeutronTaskLease = {
      ...existing,
      renewedAt: nowMs,
      expiresAt: nowMs + Math.max(1, ttlMs),
    };
    await persistLease(input.fs, identity.path, renewed);
    return renewed;
  });
}

export async function releaseNeutronTaskLease(
  input: NeutronTaskLeaseStoreInput,
): Promise<NeutronTaskLease> {
  const identity = resolveIdentity(input);
  return withLeaseLock(identity.path, async () => {
    const existing = await requireExisting(input.fs, identity.path, identity);
    if (existing.ownerId !== identity.ownerId) {
      throw new NeutronSchedulerError(
        "invalid-owner",
        "lease release requires the current owner",
        leaseDetails(existing),
      );
    }
    if (existing.status === "released") return existing;
    const released: NeutronTaskLease = {
      ...existing,
      status: "released",
      releasedAt: input.clock.nowMs(),
    };
    await persistLease(input.fs, identity.path, released);
    return released;
  });
}

function resolveIdentity(input: NeutronTaskLeaseStoreInput): {
  readonly leaseId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly ownerId: string;
  readonly attempt: number;
  readonly path: string;
} {
  const sessionId = assertNeutronLeaseIdentityPart(
    input.sessionId,
    "sessionId",
  );
  const taskId = assertNeutronLeaseIdentityPart(input.taskId, "taskId");
  const ownerId = assertNeutronLeaseIdentityPart(input.ownerId, "ownerId");
  const attempt = resolveNeutronLeaseAttempt(input.attempt);
  return {
    leaseId: neutronTaskLeaseId(sessionId, taskId, attempt),
    sessionId,
    taskId,
    ownerId,
    attempt,
    path: neutronTaskLeasePath(input.root, sessionId, taskId, attempt),
  };
}

async function persistLease(
  fs: FileSystem,
  path: string,
  lease: NeutronTaskLease,
): Promise<void> {
  const directory = path.slice(0, path.lastIndexOf("/"));
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, serializeNeutronTaskLease(lease));
}

async function readExisting(
  fs: FileSystem,
  path: string,
): Promise<NeutronTaskLease | null> {
  if (!(await fs.exists(path))) return null;
  return parseNeutronTaskLease(await fs.read(path));
}

async function requireExisting(
  fs: FileSystem,
  path: string,
  identity: { readonly leaseId: string; readonly taskId: string },
): Promise<NeutronTaskLease> {
  const existing = await readExisting(fs, path);
  if (existing === null) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "lease record does not exist",
      { leaseId: identity.leaseId, taskId: identity.taskId },
    );
  }
  return existing;
}

function throwExistingLease(existing: NeutronTaskLease, nowMs: number): never {
  const status = classifyNeutronTaskLease(existing, nowMs);
  if (status === "expired") {
    throw new NeutronSchedulerError(
      "lease-expired",
      "expired lease blocks silent re-acquire; retry is not authorized",
      leaseDetails(existing),
    );
  }
  throw new NeutronSchedulerError(
    "lease-held",
    "active or released lease already exists for this attempt",
    leaseDetails(existing),
  );
}

function leaseDetails(lease: NeutronTaskLease) {
  return {
    leaseId: lease.leaseId,
    taskId: lease.taskId,
    sessionId: lease.sessionId,
    ownerId: lease.ownerId,
    attempt: lease.attempt,
  };
}

async function withLeaseLock<T>(
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = leaseLocks.get(path) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = previous.then(() => gate);
  leaseLocks.set(path, next);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (leaseLocks.get(path) === next) {
      leaseLocks.delete(path);
    }
  }
}
