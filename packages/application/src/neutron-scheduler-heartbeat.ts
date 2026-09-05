export interface NeutronLeaseHeartbeatHandle {
  stop(): void;
  readonly active: boolean;
}

export interface NeutronLeaseHeartbeatScheduler {
  (intervalMs: number, onTick: () => void): { stop(): void };
}

export function defaultNeutronLeaseHeartbeatScheduler(
  intervalMs: number,
  onTick: () => void,
): { stop(): void } {
  const id = setInterval(onTick, intervalMs);
  return {
    stop() {
      clearInterval(id);
    },
  };
}

export function startNeutronLeaseHeartbeat(input: {
  readonly intervalMs: number;
  readonly renew: () => void | Promise<void>;
  readonly schedule?: NeutronLeaseHeartbeatScheduler;
}): NeutronLeaseHeartbeatHandle {
  let active = true;
  const schedule = input.schedule ?? defaultNeutronLeaseHeartbeatScheduler;
  const handle = schedule(input.intervalMs, () => {
    if (!active) return;
    void Promise.resolve(input.renew()).catch(() => undefined);
  });
  return {
    get active() {
      return active;
    },
    stop() {
      if (!active) return;
      active = false;
      handle.stop();
    },
  };
}
