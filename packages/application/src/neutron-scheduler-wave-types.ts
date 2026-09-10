import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronRuntimeSession,
  NeutronTaskGraph,
} from "../../protocol/src/neutron-runtime.js";
import type { FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import type {
  ExecuteNeutronTaskNodeInput,
  ExecuteNeutronTaskNodeResult,
} from "./neutron-node-execution.js";
import type { NeutronAttemptEvidence } from "./neutron-scheduler-attempt.js";
import type { NeutronSchedulerClock } from "./neutron-scheduler-clock.js";
import type { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import type { startNeutronLeaseHeartbeat } from "./neutron-scheduler-heartbeat.js";
import type { NeutronTaskLease } from "./neutron-scheduler-lease.js";
import type { NeutronRetryReason } from "./neutron-scheduler-retry.js";
import type { NeutronSchedulingPlan } from "./neutron-scheduler-select.js";

export interface ExecuteReadyNeutronTaskNodesInput {
  readonly graph: NeutronTaskGraph;
  readonly session: NeutronRuntimeSession;
  readonly projectId: string;
  readonly adapter: ModelAdapter;
  readonly fs: FileSystem;
  readonly sessionCapabilities: AgentRoleCapabilities;
  readonly fingerprintProject: () => Promise<string>;
  readonly inspect?: ExecuteNeutronTaskNodeInput["inspect"];
  readonly profileName?: string;
  readonly profileAllowedTools?: readonly string[];
  readonly signal?: AbortSignal;
  readonly nodeSignals?: Readonly<Record<string, AbortSignal>>;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly maxConcurrency?: number;
  readonly maxAttempts?: number;
  readonly ownerId?: string;
  readonly attempt?: number;
  readonly clock?: NeutronSchedulerClock;
  readonly nodeTimeoutMs?: number;
  readonly heartbeatSchedule?: Parameters<
    typeof startNeutronLeaseHeartbeat
  >[0]["schedule"];
  readonly timeoutSchedule?: Parameters<
    typeof startNeutronLeaseHeartbeat
  >[0]["schedule"];
}

export interface NeutronReadyNodeLeaseFailure {
  readonly taskId: string;
  readonly admitted: true;
  readonly executed: false;
  readonly lease: null;
  readonly execution: null;
  readonly error: NeutronSchedulerError;
  readonly attempts: readonly NeutronAttemptEvidence[];
}

export interface NeutronReadyNodeExecutionOutcome {
  readonly taskId: string;
  readonly admitted: true;
  readonly executed: boolean;
  readonly lease: NeutronTaskLease;
  readonly execution: ExecuteNeutronTaskNodeResult;
  readonly error: null;
  readonly attempts: readonly NeutronAttemptEvidence[];
  readonly retryExhausted?: boolean;
  readonly retryReason?: NeutronRetryReason;
}

export type NeutronReadyNodeOutcome =
  NeutronReadyNodeLeaseFailure | NeutronReadyNodeExecutionOutcome;

export interface ExecuteReadyNeutronTaskNodesResult {
  readonly graph: NeutronTaskGraph;
  readonly plan: NeutronSchedulingPlan;
  readonly admittedTaskIds: readonly string[];
  readonly outcomes: readonly NeutronReadyNodeOutcome[];
  readonly attempt: number;
  readonly ownerId: string;
}
