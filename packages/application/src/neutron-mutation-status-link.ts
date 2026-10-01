import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  NeutronMutationStatusIndexError,
  rememberNeutronMutationStatus,
} from "./neutron-mutation-status-index.js";

export async function linkNeutronMutationStatus(input: {
  readonly directory: string | undefined;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly session: NeutronRuntimeSession | undefined;
  readonly approvalId: string;
  readonly transactionId: string;
}): Promise<void> {
  const identity = statusIdentity(input.request, input.session);
  const directory = input.directory?.trim() ?? "";
  if (identity === undefined || directory === "") return;
  await rememberNeutronMutationStatus({
    directory,
    identity,
    approvalId: input.approvalId,
    transactionId: input.transactionId,
  });
}

export async function linkNeutronMutationStatusQuietly(input: {
  readonly directory: string | undefined;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly session: NeutronRuntimeSession | undefined;
  readonly approvalId: string;
  readonly transactionId: string;
}): Promise<void> {
  try {
    await linkNeutronMutationStatus(input);
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError) return;
    throw error;
  }
}

function statusIdentity(
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
):
  | {
      readonly root: string;
      readonly sessionId: string;
      readonly projectId: string;
      readonly graphId: string;
      readonly proposalId: string;
    }
  | undefined {
  const graphId = request.proposal.graphId;
  if (graphId === undefined || graphId.length === 0) return undefined;
  const root = session?.root ?? request.proposal.root;
  const sessionId = session?.sessionId ?? request.proposal.sessionId;
  const projectId = session?.projectId ?? request.proposal.projectId;
  if (
    root !== request.proposal.root ||
    sessionId !== request.proposal.sessionId ||
    projectId !== request.proposal.projectId
  ) {
    return undefined;
  }
  return {
    root,
    sessionId,
    projectId,
    graphId,
    proposalId: request.proposal.proposalId,
  };
}
