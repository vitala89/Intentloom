import type { NeutronMutationApproveAndApplyResult } from "@intentloom/protocol";
import type { NeutronMutationStatusResult } from "@intentloom/protocol";
import type { NeutronMutationVerificationRetryResult } from "@intentloom/protocol";
import type { NeutronMutationReviewScope } from "../neutron-mutation-review-state.js";
import { isIntegrityStatusError } from "./neutron-mutation-recovery-copy.js";
import {
  beginPending,
  beginStatusRead,
  idleRecoveryModel,
  isTerminalRecovery,
  isolateRecovery,
  markIntegrity,
  markUncertain,
  recordDirectResult,
  recordStatusResult,
  recoveryIdentity,
  recoveryScopeMatches,
  restoreAfterStatusTransport,
  type NeutronMutationRecoveryIdentity,
  type NeutronMutationRecoveryModel,
} from "./neutron-mutation-recovery-model.js";
import {
  beginVerifying,
  markVerificationIntegrity,
  recordVerificationRetry,
  restoreAfterVerificationRetry,
} from "./neutron-mutation-verification-retry-model.js";

export interface NeutronMutationRecoveryPorts {
  submitMutation(
    identity: NeutronMutationRecoveryIdentity,
  ): Promise<NeutronMutationApproveAndApplyResult>;
  getStatus(
    identity: NeutronMutationRecoveryIdentity,
  ): Promise<NeutronMutationStatusResult>;
  retryVerification(
    identity: NeutronMutationRecoveryIdentity,
    signal?: AbortSignal,
  ): Promise<NeutronMutationVerificationRetryResult>;
}

export interface NeutronMutationSubmitInput {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
}

export interface NeutronMutationRecoveryController {
  readonly model: () => NeutronMutationRecoveryModel;
  readonly setScope: (
    scope: NeutronMutationReviewScope | null,
  ) => NeutronMutationRecoveryModel;
  readonly setDaemonReady: (
    ready: boolean,
  ) => Promise<NeutronMutationRecoveryModel>;
  readonly submit: (
    input: NeutronMutationSubmitInput,
  ) => Promise<NeutronMutationRecoveryModel>;
  readonly refresh: () => Promise<NeutronMutationRecoveryModel>;
  readonly retryVerification: () => Promise<NeutronMutationRecoveryModel>;
  readonly cancelVerification: () => void;
}

interface RecoverySession {
  model: NeutronMutationRecoveryModel;
  scope: NeutronMutationReviewScope | null;
  daemonReady: boolean;
  reconnectWhilePending: boolean;
  ports: NeutronMutationRecoveryPorts;
  retryAbort: AbortController | null;
}

export function createNeutronMutationRecovery(
  ports: NeutronMutationRecoveryPorts,
  options: { readonly daemonReady?: boolean } = {},
): NeutronMutationRecoveryController {
  const session: RecoverySession = {
    model: idleRecoveryModel(),
    scope: null,
    daemonReady: options.daemonReady === true,
    reconnectWhilePending: false,
    ports,
    retryAbort: null,
  };
  let tail: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run.then(() => session.model);
  };
  return {
    model: () => session.model,
    setScope: (next) => applyScope(session, next),
    setDaemonReady: (ready) => enqueue(() => noteDaemonReady(session, ready)),
    submit: (input) => enqueue(() => submitMutation(session, input)),
    refresh: () => enqueue(() => readStatus(session, false)),
    retryVerification: () => enqueue(() => retryVerification(session)),
    cancelVerification: () => {
      session.retryAbort?.abort();
    },
  };
}

function applyScope(
  session: RecoverySession,
  next: NeutronMutationReviewScope | null,
): NeutronMutationRecoveryModel {
  session.scope = next;
  const identity = session.model.identity;
  if (identity !== null && !recoveryScopeMatches(identity, next)) {
    session.model = isolateRecovery(session.model);
  }
  return session.model;
}

async function noteDaemonReady(
  session: RecoverySession,
  ready: boolean,
): Promise<void> {
  const rising = ready && !session.daemonReady;
  session.daemonReady = ready;
  if (!rising) return;
  if (session.model.phase === "pending") {
    session.reconnectWhilePending = true;
    return;
  }
  await readStatus(session, true);
}

async function submitMutation(
  session: RecoverySession,
  input: NeutronMutationSubmitInput,
): Promise<void> {
  if (!canSubmit(session.model, input.proposalId)) return;
  const identity = recoveryIdentity(input);
  session.model = beginPending(session.model, identity);
  const generation = session.model.generation;
  session.reconnectWhilePending = false;
  try {
    const direct = await session.ports.submitMutation(identity);
    session.model = recordDirectResult(session.model, generation, direct);
  } catch {
    session.model = markUncertain(session.model, generation);
    if (session.reconnectWhilePending && session.daemonReady) {
      session.reconnectWhilePending = false;
      await readStatus(session, true);
    }
  }
}

async function readStatus(
  session: RecoverySession,
  automatic: boolean,
): Promise<void> {
  if (automatic && session.model.phase !== "uncertain") return;
  const identity = session.model.identity;
  if (
    identity === null ||
    !session.daemonReady ||
    !recoveryScopeMatches(identity, session.scope)
  ) {
    return;
  }
  const next = beginStatusRead(session.model);
  if (next?.identity == null) return;
  session.model = next;
  const generation = session.model.generation;
  try {
    const status = await session.ports.getStatus(identity);
    session.model = recordStatusResult(session.model, generation, status);
  } catch (error) {
    session.model = isIntegrityStatusError(error)
      ? markIntegrity(session.model, generation)
      : restoreAfterStatusTransport(session.model, generation);
  }
}

async function retryVerification(session: RecoverySession): Promise<void> {
  const identity = session.model.identity;
  if (
    identity === null ||
    !session.daemonReady ||
    !recoveryScopeMatches(identity, session.scope)
  ) {
    return;
  }
  const next = beginVerifying(session.model);
  if (next === null) return;
  session.model = next;
  const generation = session.model.generation;
  const abort = new AbortController();
  session.retryAbort = abort;
  try {
    const result = await session.ports.retryVerification(
      identity,
      abort.signal,
    );
    session.model = recordVerificationRetry(session.model, generation, result);
  } catch (error) {
    session.model = isIntegrityStatusError(error)
      ? markVerificationIntegrity(session.model, generation)
      : restoreAfterVerificationRetry(session.model, generation);
  } finally {
    if (session.retryAbort === abort) session.retryAbort = null;
  }
}

function canSubmit(
  model: NeutronMutationRecoveryModel,
  proposalId: string,
): boolean {
  if (model.phase === "idle" || model.identity === null) return true;
  if (model.identity.proposalId === proposalId) return false;
  return isTerminalRecovery(model);
}
