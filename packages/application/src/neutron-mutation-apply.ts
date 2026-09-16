import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { createPersistentNeutronMutationApprovalStore } from "./neutron-mutation-apply-durable-store.js";
import {
  parseNeutronMutationApplyEnvelope,
  type ParsedNeutronMutationApplyRequest,
} from "./neutron-mutation-apply-parse.js";
import {
  readApprovalId,
  readApprovalToken,
  readDigest,
  rejectBeforeClaim,
} from "./neutron-mutation-apply-persist.js";
import {
  buildNeutronMutationApplyResult,
  redactApprovalToken,
} from "./neutron-mutation-apply-result.js";
import { runLockedApply } from "./neutron-mutation-apply-run.js";
import type { NeutronMutationApprovalStore } from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { canonicalizeNeutronMutationRoot } from "./neutron-mutation-containment.js";

export type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";

export async function applyApprovedNeutronMutation(
  input: NeutronMutationApplyInput,
): Promise<NeutronMutationApplyResult> {
  const token = readApprovalToken(input.approval);
  try {
    return await runApprovedNeutronMutation(input);
  } catch (error) {
    return unknownApplyResult(input, token, error);
  }
}

async function runApprovedNeutronMutation(
  input: NeutronMutationApplyInput,
): Promise<NeutronMutationApplyResult> {
  if (input.signal?.aborted === true) {
    return rejectBeforeClaim({
      ...input,
      failureCode: "cancelled-before-write",
    });
  }
  const parsed = parseNeutronMutationApplyEnvelope(input);
  if (parsed.request === undefined) {
    return rejectBeforeClaim({
      ...input,
      failureCode: parsed.reason ?? "approval-invalid",
    });
  }
  const session = parseSession(input.session);
  if (session.error !== undefined) {
    return rejectBeforeClaim({ ...input, failureCode: "approval-invalid" });
  }
  return acquireAndApply(input, parsed.request, session.value);
}

async function acquireAndApply(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
): Promise<NeutronMutationApplyResult> {
  const actualRoot = input.actualRoot ?? request.proposal.root;
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    actualRoot,
    input.fs,
  );
  if (canonicalRoot === undefined) {
    return rejectBeforeClaim({ ...input, failureCode: "containment-failed" });
  }
  const store = resolveNeutronMutationApprovalStore(input);
  if (store === undefined) {
    return rejectBeforeClaim({
      ...input,
      failureCode: "mutation-state-unknown",
    });
  }
  return runLockedApply(
    input,
    request,
    session,
    actualRoot,
    canonicalRoot,
    store,
  );
}

function resolveNeutronMutationApprovalStore(
  input: NeutronMutationApplyInput,
): NeutronMutationApprovalStore | undefined {
  if (input.store !== undefined) return input.store;
  if (input.durableStateDirectory === undefined) return undefined;
  return createPersistentNeutronMutationApprovalStore({
    directory: input.durableStateDirectory,
  });
}

function parseSession(session: NeutronRuntimeSession | undefined): {
  readonly value?: NeutronRuntimeSession;
  readonly error?: true;
} {
  if (session === undefined) return {};
  try {
    return { value: validateNeutronRuntimeSession(session) };
  } catch {
    return { error: true };
  }
}

function unknownApplyResult(
  input: NeutronMutationApplyInput,
  token: string,
  error: unknown,
): NeutronMutationApplyResult {
  return buildNeutronMutationApplyResult({
    transactionId: input.transactionId,
    approvalId: readApprovalId(input.approval),
    reviewArtifactDigest: readDigest(input.artifact, "artifactDigest"),
    planDigest: `sha256:${"0".repeat(64)}`,
    status: "mutation-state-unknown",
    applied: false,
    changedPaths: [],
    rollbackCompleted: false,
    reconciliationRequired: true,
    failureCode: "mutation-state-unknown",
    diagnostics: [
      redactApprovalToken(
        error instanceof Error ? error.message : "mutation-state-unknown",
        token,
      ),
    ],
  });
}
