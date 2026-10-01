import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
  createNeutronMutationApproveAndApplyRequest,
  parseNeutronMutationApproveAndApplyResponse,
  PROTOCOL_VERSION,
  type NeutronMutationApproveAndApplyResult,
} from "@intentloom/protocol";
import { invoke } from "@tauri-apps/api/core";
import { DesktopBridgeError } from "./desktop-client.js";

const APPROVE_APPLY_COMMAND = "approve_and_apply_neutron_mutation" as const;

export type NeutronApproveApplyBridge = (
  command: typeof APPROVE_APPLY_COMMAND,
  request: object,
  signal?: AbortSignal,
) => Promise<unknown>;

async function defaultApproveApplyBridge(
  command: typeof APPROVE_APPLY_COMMAND,
  request: object,
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) {
    throw new DesktopBridgeError("Operation cancelled", "cancelled");
  }
  let abortReject!: (error: DesktopBridgeError) => void;
  const abortPromise = new Promise<never>((_, reject) => {
    abortReject = reject;
  });
  const onAbort = () =>
    abortReject(new DesktopBridgeError("Operation cancelled", "cancelled"));
  if (signal) signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([
      invoke(command, { request }).catch((error: unknown) => {
        throw approveApplyBridgeError(error);
      }),
      abortPromise,
    ]);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function approveApplyBridgeError(error: unknown): DesktopBridgeError {
  if (typeof error === "object" && error !== null) {
    const record = error as { code?: unknown; message?: unknown };
    if (typeof record.message === "string") {
      return new DesktopBridgeError(
        record.message,
        typeof record.code === "string"
          ? record.code
          : "native_bridge_unavailable",
      );
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return new DesktopBridgeError(message);
}

export function neutronApproveApplyDesktopMethods(
  bridge: NeutronApproveApplyBridge = defaultApproveApplyBridge,
) {
  return {
    async approveAndApplyNeutronMutation(
      root: string,
      sessionId: string,
      projectId: string,
      graphId: string,
      proposalId: string,
      signal?: AbortSignal,
    ): Promise<NeutronMutationApproveAndApplyResult> {
      return parseNeutronMutationApproveAndApplyResponse(
        await bridge(
          APPROVE_APPLY_COMMAND,
          createNeutronMutationApproveAndApplyRequest(
            "desktop-neutron-mutation-host",
            {
              action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
              graphId,
              projectId,
              proposalId,
              protocolVersion: PROTOCOL_VERSION,
              root,
              schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
              sessionId,
            },
          ),
          signal,
        ),
      );
    },
  };
}
