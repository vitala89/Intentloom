import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "../packages/application/src/index.js";
import {
  acquireNeutronTaskLease,
  classifyNeutronTaskLease,
  createNeutronSchedulerClock,
  isNeutronSchedulerStatePath,
  NEUTRON_LEASE_DEFAULT_TTL_MS,
  neutronLeaseHeartbeatIntervalMs,
  neutronTaskLeaseId,
  neutronTaskLeasePath,
  readNeutronTaskLease,
  releaseNeutronTaskLease,
  renewNeutronTaskLease,
  resolveNeutronLeaseTtlMs,
  startNeutronLeaseHeartbeat,
} from "../packages/application/src/neutron-scheduler.js";
import { NeutronSchedulerError } from "../packages/application/src/neutron-scheduler-errors.js";

const ROOT = "/project";
const SESSION = "session-n5-3";
const OTHER_SESSION = "session-n5-3-b";

function sourceFingerprint(files: Map<string, string>): string {
  return [...files.entries()]
    .filter(([path]) => !isNeutronSchedulerStatePath(path))
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

function store(
  overrides: {
    readonly sessionId?: string;
    readonly taskId?: string;
    readonly ownerId?: string;
    readonly attempt?: number;
    readonly nodeTimeoutMs?: number;
  } = {},
) {
  const fs = createMemoryFileSystem({
    "/project/package.json": '{"name":"n5-slice3"}',
    "/project/src/main.ts": "export const ok = true;\n",
  });
  const clock = createNeutronSchedulerClock(1_000);
  return {
    fs,
    clock,
    input: {
      root: ROOT,
      fs,
      clock,
      sessionId: overrides.sessionId ?? SESSION,
      taskId: overrides.taskId ?? "task-a",
      ownerId: overrides.ownerId ?? "owner-1",
      ...(overrides.attempt === undefined
        ? {}
        : { attempt: overrides.attempt }),
      ...(overrides.nodeTimeoutMs === undefined
        ? {}
        : { nodeTimeoutMs: overrides.nodeTimeoutMs }),
    },
  };
}

describe("Neutron N5 Slice 3 — lease contract", () => {
  it("uses session:task:attempt identity and default TTL 120s", () => {
    expect(neutronTaskLeaseId(SESSION, "task-a", 1)).toBe(
      `${SESSION}:task-a:1`,
    );
    expect(resolveNeutronLeaseTtlMs()).toBe(NEUTRON_LEASE_DEFAULT_TTL_MS);
    expect(resolveNeutronLeaseTtlMs(30_000)).toBe(30_000);
    expect(resolveNeutronLeaseTtlMs(240_000)).toBe(
      NEUTRON_LEASE_DEFAULT_TTL_MS,
    );
    expect(neutronLeaseHeartbeatIntervalMs(120_000)).toBe(40_000);
  });

  it("acquires a persisted active lease", async () => {
    const { fs, input } = store();
    const before = sourceFingerprint(fs.files);
    const lease = await acquireNeutronTaskLease(input);
    expect(lease.leaseId).toBe(`${SESSION}:task-a:1`);
    expect(lease.attempt).toBe(1);
    expect(lease.ownerId).toBe("owner-1");
    expect(lease.status).toBe("active");
    expect(lease.acquiredAt).toBe(1_000);
    expect(lease.expiresAt).toBe(1_000 + NEUTRON_LEASE_DEFAULT_TTL_MS);
    const stored = await readNeutronTaskLease(input);
    expect(stored).toEqual(lease);
    expect(fs.files.has(neutronTaskLeasePath(ROOT, SESSION, "task-a", 1))).toBe(
      true,
    );
    expect(sourceFingerprint(fs.files)).toBe(before);
  });

  it("denies a duplicate acquire for the same session/task/attempt", async () => {
    const first = store();
    await acquireNeutronTaskLease(first.input);
    await expect(
      acquireNeutronTaskLease({ ...first.input, ownerId: "owner-2" }),
    ).rejects.toMatchObject({
      name: "NeutronSchedulerError",
      code: "lease-held",
    });
  });

  it("rejects renewal by the wrong owner", async () => {
    const { input } = store();
    await acquireNeutronTaskLease(input);
    await expect(
      renewNeutronTaskLease({ ...input, ownerId: "owner-2" }),
    ).rejects.toMatchObject({
      name: "NeutronSchedulerError",
      code: "invalid-owner",
    });
  });

  it("extends expiry on a valid owner renewal", async () => {
    const { clock, input } = store();
    const acquired = await acquireNeutronTaskLease(input);
    clock.advance(10_000);
    const renewed = await renewNeutronTaskLease(input);
    expect(renewed.ownerId).toBe(acquired.ownerId);
    expect(renewed.leaseId).toBe(acquired.leaseId);
    expect(renewed.renewedAt).toBe(11_000);
    expect(renewed.expiresAt).toBe(11_000 + NEUTRON_LEASE_DEFAULT_TTL_MS);
    expect(renewed.expiresAt).toBeGreaterThan(acquired.expiresAt);
  });

  it("detects expiry without sleeping and blocks silent re-acquire", async () => {
    const { clock, input } = store({ nodeTimeoutMs: 90 });
    const lease = await acquireNeutronTaskLease(input);
    clock.advance(90);
    expect(classifyNeutronTaskLease(lease, clock.nowMs())).toBe("expired");
    await expect(acquireNeutronTaskLease(input)).rejects.toMatchObject({
      name: "NeutronSchedulerError",
      code: "lease-expired",
    });
    await expect(renewNeutronTaskLease(input)).rejects.toMatchObject({
      name: "NeutronSchedulerError",
      code: "lease-expired",
    });
  });

  it("releases on owner request and keeps an auditable record", async () => {
    const { clock, input } = store();
    await acquireNeutronTaskLease(input);
    clock.advance(5);
    const released = await releaseNeutronTaskLease(input);
    expect(released.status).toBe("released");
    expect(released.releasedAt).toBe(1_005);
    const stored = await readNeutronTaskLease(input);
    expect(stored?.status).toBe("released");
    await expect(acquireNeutronTaskLease(input)).rejects.toMatchObject({
      code: "lease-held",
    });
  });

  it("scopes leases by session, task, and attempt", async () => {
    const base = store();
    await acquireNeutronTaskLease(base.input);
    const otherSession = await acquireNeutronTaskLease({
      ...base.input,
      sessionId: OTHER_SESSION,
    });
    const otherTask = await acquireNeutronTaskLease({
      ...base.input,
      taskId: "task-b",
    });
    const otherAttempt = await acquireNeutronTaskLease({
      ...base.input,
      attempt: 2,
    });
    expect(otherSession.sessionId).toBe(OTHER_SESSION);
    expect(otherTask.taskId).toBe("task-b");
    expect(otherAttempt.attempt).toBe(2);
    expect(otherAttempt.leaseId).toBe(`${SESSION}:task-a:2`);
  });

  it("writes deterministic JSON and does not mutate project sources", async () => {
    const { fs, input } = store();
    const beforeSource = fs.files.get("/project/src/main.ts");
    await acquireNeutronTaskLease(input);
    const path = neutronTaskLeasePath(ROOT, SESSION, "task-a", 1);
    expect(fs.files.get(path)).toBe(
      `${JSON.stringify(
        {
          leaseId: `${SESSION}:task-a:1`,
          sessionId: SESSION,
          taskId: "task-a",
          attempt: 1,
          ownerId: "owner-1",
          acquiredAt: 1_000,
          expiresAt: 1_000 + NEUTRON_LEASE_DEFAULT_TTL_MS,
          renewedAt: 1_000,
          status: "active",
        },
        null,
        2,
      )}\n`,
    );
    expect(fs.files.get("/project/src/main.ts")).toBe(beforeSource);
    expect(fs.files.get("/project/package.json")).toBe('{"name":"n5-slice3"}');
  });

  it("stops heartbeat timers without wall-clock waits", () => {
    let stopped = false;
    let ticks = 0;
    const handle = startNeutronLeaseHeartbeat({
      intervalMs: 40_000,
      renew: () => {
        ticks += 1;
      },
      schedule: (_interval, onTick) => {
        onTick();
        return {
          stop() {
            stopped = true;
          },
        };
      },
    });
    expect(handle.active).toBe(true);
    expect(ticks).toBe(1);
    handle.stop();
    expect(handle.active).toBe(false);
    expect(stopped).toBe(true);
    handle.stop();
    expect(ticks).toBe(1);
  });

  it("rejects invalid concurrency-unrelated lease identity parts", async () => {
    const { input } = store();
    await expect(
      acquireNeutronTaskLease({ ...input, ownerId: "bad/owner" }),
    ).rejects.toBeInstanceOf(NeutronSchedulerError);
  });
});
