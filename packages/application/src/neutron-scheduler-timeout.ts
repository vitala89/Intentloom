import { NeutronNodeExecutionError } from "./neutron-node-errors.js";
import type { NeutronLeaseHeartbeatScheduler } from "./neutron-scheduler-heartbeat.js";

export const NEUTRON_NODE_EXECUTION_TIMEOUT_MS = 120_000;

export interface NeutronNodeTimeoutHandle {
  stop(): void;
  readonly signal: AbortSignal;
  readonly timedOut: boolean;
}

export function startNeutronNodeTimeout(input: {
  readonly timeoutMs: number;
  readonly schedule?: NeutronLeaseHeartbeatScheduler;
}): NeutronNodeTimeoutHandle {
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "timeout",
      "nodeTimeoutMs must be an integer >= 1",
    );
  }
  const controller = new AbortController();
  let timedOut = false;
  const schedule = input.schedule ?? defaultTimeoutScheduler;
  const handle = schedule(input.timeoutMs, () => {
    if (timedOut || controller.signal.aborted) return;
    timedOut = true;
    controller.abort("timeout");
  });
  return {
    get timedOut() {
      return timedOut;
    },
    signal: controller.signal,
    stop() {
      handle.stop();
    },
  };
}

function defaultTimeoutScheduler(
  timeoutMs: number,
  onTimeout: () => void,
): { stop(): void } {
  const id = setTimeout(onTimeout, timeoutMs);
  return {
    stop() {
      clearTimeout(id);
    },
  };
}
