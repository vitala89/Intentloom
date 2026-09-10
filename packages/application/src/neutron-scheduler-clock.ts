export interface NeutronSchedulerClock {
  nowMs(): number;
}

export interface ControllableNeutronSchedulerClock extends NeutronSchedulerClock {
  advance(ms: number): number;
  set(ms: number): number;
}

export function systemNeutronSchedulerClock(): NeutronSchedulerClock {
  return {
    nowMs() {
      return Date.now();
    },
  };
}

export function createNeutronSchedulerClock(
  startMs = 0,
): ControllableNeutronSchedulerClock {
  let now = startMs;
  return {
    nowMs() {
      return now;
    },
    advance(ms: number) {
      now += ms;
      return now;
    },
    set(ms: number) {
      now = ms;
      return now;
    },
  };
}
