import type { NeutronMutationApproveAndApplyResult } from "../../../../protocol/src/neutron-mutation-approve-apply-result.js";
import { validateNeutronMutationApprovalIntent } from "../../../../validator/src/neutron-mutation-approval-intent.js";
import type { FileSystem } from "../../index.js";
import { approveAndApplyNeutronGraphMutation } from "../mutation/approval/neutron-mutation-approve-apply.js";
import { rejectedApproveAndApplyResult } from "../mutation/approval/neutron-mutation-approve-apply-public.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";
import type {
  NeutronGraphStaleBaseline,
  NeutronGraphStaleSnapshot,
} from "../scheduler/neutron-scheduler-stale.js";
import type { NeutronMutationApprovalIntent } from "../../../../protocol/src/neutron-mutation-approval-intent.js";

/**
 * Production D4 composition. Resolves the host session and durable directory,
 * then runs the combined operation. Does not call a model adapter.
 */
export function bindNeutronSessionApproveApplyOperations(input: {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly now: () => Date;
  readonly fs: FileSystem;
  readonly durableStateDirectory: string | undefined;
}): {
  approveAndApplyNeutronMutation(
    intent: unknown,
  ): Promise<NeutronMutationApproveAndApplyResult>;
} {
  return {
    async approveAndApplyNeutronMutation(intent) {
      if (input.durableStateDirectory === undefined) {
        return rejectedApproveAndApplyResult(
          "durable-state-unavailable",
          proposalIdOf(intent),
        );
      }
      const parsed = parseIntent(intent);
      const stored = scopedSession(input.sessions, parsed);
      const current =
        stored === undefined
          ? ""
          : await input.fingerprint(stored.session.root);
      return approveAndApplyNeutronGraphMutation({
        currentProjectFingerprint: current,
        durableStateDirectory: input.durableStateDirectory,
        fs: input.fs,
        intent: parsed ?? intent,
        now: input.now().getTime(),
        previewProposal: stored?.mutationProposal ?? null,
        previewSource: stored?.mutationProposalSource ?? null,
        session: stored?.session,
        store: stored?.mutationPayloadStore,
        ...(stored === undefined || parsed === undefined
          ? {}
          : graphStaleOption(stored, parsed.graphId, current)),
      });
    },
  };
}

function parseIntent(
  value: unknown,
): NeutronMutationApprovalIntent | undefined {
  try {
    return validateNeutronMutationApprovalIntent(value);
  } catch {
    return undefined;
  }
}

function scopedSession(
  sessions: Map<string, StoredNeutronSession>,
  intent: NeutronMutationApprovalIntent | undefined,
): StoredNeutronSession | undefined {
  if (intent === undefined) return undefined;
  const stored = sessions.get(intent.sessionId);
  if (stored === undefined) return undefined;
  if (
    stored.session.sessionId !== intent.sessionId ||
    stored.session.projectId !== intent.projectId ||
    stored.session.root !== intent.root
  ) {
    return undefined;
  }
  return stored;
}

function graphStaleOption(
  stored: StoredNeutronSession,
  graphId: string,
  currentProjectFingerprint: string,
): {
  readonly graphStale?: {
    readonly baseline: NeutronGraphStaleBaseline;
    readonly current: NeutronGraphStaleSnapshot;
  };
} {
  const record = stored.storedGraph;
  if (record === undefined || record.snapshot.graphId !== graphId) return {};
  return {
    graphStale: {
      baseline: record.baseline,
      current: { projectFingerprint: currentProjectFingerprint },
    },
  };
}

function proposalIdOf(intent: unknown): string | undefined {
  if (typeof intent !== "object" || intent === null) return undefined;
  const proposalId = (intent as { proposalId?: unknown }).proposalId;
  return typeof proposalId === "string" ? proposalId : undefined;
}
