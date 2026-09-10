import { type NeutronTaskState } from "../../protocol/src/neutron-runtime.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";

const TERMINAL_STATES = new Set<NeutronTaskState>([
  "completed",
  "failed",
  "cancelled",
  "timed-out",
]);

const ALLOWED_TRANSITIONS: Readonly<
  Record<NeutronTaskState, readonly NeutronTaskState[]>
> = {
  pending: ["ready", "blocked", "cancelled"],
  ready: ["running", "blocked", "cancelled"],
  running: ["completed", "failed", "cancelled", "timed-out", "ready"],
  blocked: ["ready", "cancelled"],
  cancelled: [],
  "timed-out": [],
  failed: [],
  completed: [],
};

export function isNeutronTaskTerminalState(state: NeutronTaskState): boolean {
  return TERMINAL_STATES.has(state);
}

export function validateNeutronTaskStateTransition(
  fromState: NeutronTaskState,
  toState: NeutronTaskState,
): void {
  if (fromState === toState) return;
  const allowed = ALLOWED_TRANSITIONS[fromState];
  if (!allowed.includes(toState)) {
    throw new NeutronSchedulerError(
      "invalid-transition",
      `invalid task state transition: ${fromState} -> ${toState}`,
      { fromState, toState },
    );
  }
}

export function applyNeutronTaskStateTransition(
  fromState: NeutronTaskState,
  toState: NeutronTaskState,
): NeutronTaskState {
  validateNeutronTaskStateTransition(fromState, toState);
  return toState;
}
