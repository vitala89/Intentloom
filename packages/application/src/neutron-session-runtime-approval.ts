import type { IssueNeutronMutationApprovalResult } from "./neutron-mutation-approval-issue.js";
import { issueNeutronMutationApprovalFromIntent } from "./neutron-mutation-approval-issue.js";
import type { NeutronMutationApprovalIntent } from "../../protocol/src/neutron-mutation-approval-intent.js";
import { validateNeutronMutationApprovalIntent } from "../../validator/src/neutron-mutation-approval-intent.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";
import type {
  NeutronGraphStaleBaseline,
  NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";

/**
 * Production composition for D3. Resolves the session payload store and
 * calls the host issuer. Does not call a model adapter and does not expose
 * an Approve RPC.
 */
export function bindNeutronSessionApprovalOperations(input: {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly now: () => Date;
}): {
  issueMutationApproval(
    intent: unknown,
  ): Promise<IssueNeutronMutationApprovalResult>;
} {
  return {
    async issueMutationApproval(intent) {
      const parsed = parseIntent(intent);
      if (parsed === undefined) return denied("intent-rejected");
      const stored = input.sessions.get(parsed.sessionId);
      if (!scopeMatches(stored, parsed)) {
        return issueUnscoped(input.now, parsed, stored);
      }
      const current = await input.fingerprint(stored.session.root);
      return issueNeutronMutationApprovalFromIntent({
        currentProjectFingerprint: current,
        intent: parsed,
        now: input.now().getTime(),
        previewProposal: stored.mutationProposal,
        previewSource: stored.mutationProposalSource ?? null,
        session: stored.session,
        store: stored.mutationPayloadStore,
        ...graphStaleOption(stored, parsed.graphId, current),
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

function scopeMatches(
  stored: StoredNeutronSession | undefined,
  intent: NeutronMutationApprovalIntent,
): stored is StoredNeutronSession {
  if (stored === undefined) return false;
  return (
    stored.session.sessionId === intent.sessionId &&
    stored.session.projectId === intent.projectId &&
    stored.session.root === intent.root
  );
}

function issueUnscoped(
  now: () => Date,
  intent: NeutronMutationApprovalIntent,
  stored: StoredNeutronSession | undefined,
): IssueNeutronMutationApprovalResult {
  return issueNeutronMutationApprovalFromIntent({
    currentProjectFingerprint: "",
    intent,
    now: now().getTime(),
    session: stored?.session,
    store: undefined,
  });
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

function denied(
  outcome: "intent-rejected",
): IssueNeutronMutationApprovalResult {
  return { issued: false, outcome };
}
