import {
  NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
  PROTOCOL_VERSION,
  createNeutronMutationVerificationRetryRequest,
  parseNeutronMutationVerificationRetryResponse,
  type NeutronMutationVerificationRetryResult,
} from "@intentloom/protocol";
import { invoke } from "@tauri-apps/api/core";
import { DesktopBridgeError } from "./desktop-client.js";

const RETRY_COMMAND = "retry_neutron_mutation_verification" as const;

export type NeutronMutationVerificationRetryBridge = (
  command: typeof RETRY_COMMAND,
  request: object,
  signal?: AbortSignal,
) => Promise<unknown>;

async function defaultRetryBridge(
  command: typeof RETRY_COMMAND,
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
        throw retryBridgeError(error);
      }),
      abortPromise,
    ]);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function retryBridgeError(error: unknown): DesktopBridgeError {
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

export function neutronMutationVerificationRetryDesktopMethods(
  bridge: NeutronMutationVerificationRetryBridge = defaultRetryBridge,
) {
  return {
    async retryNeutronMutationVerification(
      root: string,
      sessionId: string,
      projectId: string,
      graphId: string,
      proposalId: string,
      transactionId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronMutationVerificationRetryResult> {
      return parseNeutronMutationVerificationRetryResponse(
        await bridge(
          RETRY_COMMAND,
          createNeutronMutationVerificationRetryRequest(
            "desktop-neutron-verification-retry",
            {
              schemaVersion: NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
              protocolVersion: PROTOCOL_VERSION,
              root,
              sessionId,
              projectId,
              graphId,
              proposalId,
              ...(transactionId === undefined ? {} : { transactionId }),
            },
          ),
          signal,
        ),
      );
    },
  };
}
