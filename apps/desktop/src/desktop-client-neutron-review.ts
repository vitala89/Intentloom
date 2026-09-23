import {
  createNeutronMutationReviewGetRequest,
  createNeutronMutationReviewListRequest,
  parseNeutronMutationReviewGetResponse,
  parseNeutronMutationReviewListResponse,
  type NeutronMutationReviewGetResult,
  type NeutronMutationReviewListResult,
} from "@intentloom/protocol";
import { invoke } from "@tauri-apps/api/core";
import { DesktopBridgeError } from "./desktop-client.js";

type ReviewCommand =
  "list_neutron_mutation_reviews" | "get_neutron_mutation_review";

export type NeutronMutationReviewBridge = (
  command: ReviewCommand,
  request: object,
  signal?: AbortSignal,
) => Promise<unknown>;

async function defaultReviewBridge(
  command: ReviewCommand,
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
        throw reviewBridgeError(error);
      }),
      abortPromise,
    ]);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function reviewBridgeError(error: unknown): DesktopBridgeError {
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

export function neutronMutationReviewDesktopMethods(
  bridge: NeutronMutationReviewBridge = defaultReviewBridge,
) {
  return {
    async listNeutronMutationReviews(
      root: string,
      sessionId: string,
      projectId: string,
      graphId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronMutationReviewListResult> {
      return parseNeutronMutationReviewListResponse(
        await bridge(
          "list_neutron_mutation_reviews",
          createNeutronMutationReviewListRequest(
            "desktop-neutron-mutation-review-list",
            root,
            sessionId,
            projectId,
            graphId,
          ),
          signal,
        ),
      );
    },

    async getNeutronMutationReview(
      root: string,
      sessionId: string,
      projectId: string,
      proposalId: string,
      graphId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronMutationReviewGetResult> {
      return parseNeutronMutationReviewGetResponse(
        await bridge(
          "get_neutron_mutation_review",
          createNeutronMutationReviewGetRequest(
            "desktop-neutron-mutation-review-get",
            root,
            sessionId,
            projectId,
            proposalId,
            graphId,
          ),
          signal,
        ),
      );
    },
  };
}
