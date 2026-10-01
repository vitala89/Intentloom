import {
  NEUTRON_MUTATION_STATUS_SCHEMA_URN,
  PROTOCOL_VERSION,
  createNeutronMutationStatusGetRequest,
  parseNeutronMutationStatusGetResponse,
  type NeutronMutationStatusResult,
} from "@intentloom/protocol";
import { invoke } from "@tauri-apps/api/core";
import { DesktopBridgeError } from "./desktop-client.js";

const STATUS_COMMAND = "get_neutron_mutation_status" as const;

export type NeutronMutationStatusBridge = (
  command: typeof STATUS_COMMAND,
  request: object,
  signal?: AbortSignal,
) => Promise<unknown>;

async function defaultStatusBridge(
  command: typeof STATUS_COMMAND,
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
        throw statusBridgeError(error);
      }),
      abortPromise,
    ]);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function statusBridgeError(error: unknown): DesktopBridgeError {
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

export function neutronMutationStatusDesktopMethods(
  bridge: NeutronMutationStatusBridge = defaultStatusBridge,
) {
  return {
    async getNeutronMutationStatus(
      root: string,
      sessionId: string,
      projectId: string,
      graphId: string,
      proposalId: string,
      transactionId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronMutationStatusResult> {
      return parseNeutronMutationStatusGetResponse(
        await bridge(
          STATUS_COMMAND,
          createNeutronMutationStatusGetRequest(
            "desktop-neutron-mutation-status",
            {
              schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
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
