import { invoke } from "@tauri-apps/api/core";
import {
  createDaemonInfoRequest,
  createDoctorRequest,
  createFoundationConflictsIdentifyRequest,
  createFoundationDiscoveryQuestionsRequest,
  createFoundationDiscoveryTurnRequest,
  createFoundationWorkshopCreateRequest,
  createFoundationWorkshopDeleteRequest,
  createFoundationWorkshopGetRequest,
  createInceptionSessionCreateRequest,
  createInceptionSessionDeleteRequest,
  createInceptionSessionGetRequest,
  createInspectRequest,
  createProjectDiffRequest,
  createProjectTimelineRequest,
  parseDaemonInfoResponse,
  parseDoctorResponse,
  parseInspectResponse,
  parseProjectDiffResponse,
  parseProjectTimelineResponse,
  type DaemonInfoResult,
  type DoctorResult,
  type FoundationViewmodelPayload,
  type InceptionViewmodelPayload,
  type InspectResult,
  type ProjectDiffParams,
  type ProjectDiffResult,
  type ProjectTimelineParams,
  type ProjectTimelineResult,
} from "@intentloom/protocol";

export class DesktopBridgeError extends Error {
  readonly code: string;

  constructor(message: string, code = "native_bridge_unavailable") {
    super(message);
    this.code = code;
    this.name = "DesktopBridgeError";
  }
}

/**
 * Invoke a Tauri command with optional AbortSignal support.
 *
 * Tauri's `invoke` does not natively support AbortSignal, so we simulate
 * transport-level cancellation:
 * - Reject immediately if the signal is already aborted before the call.
 * - Race the invoke against an abort-triggered rejection so the caller's
 *   Promise resolves as `cancelled` as soon as the signal fires, even if
 *   the Rust handler is still running (its result is discarded).
 *
 * This matches the cancellation boundary documented in PHASE1_CONTRACTS.md:
 * the daemon-side read-only operation may still complete; its result is
 * simply discarded on the client side.
 */
async function call<T>(
  command: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
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
    const result = await Promise.race([
      invoke<T>(command, args).catch((error: unknown) => {
        if (typeof error === "object" && error !== null) {
          const record = error as { code?: unknown; message?: unknown };
          if (typeof record.message === "string") {
            throw new DesktopBridgeError(
              record.message,
              typeof record.code === "string"
                ? record.code
                : "native_bridge_unavailable",
            );
          }
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new DesktopBridgeError(message);
      }),
      abortPromise,
    ]);
    return result;
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export const desktopClient = {
  async selectProjectRoot(): Promise<string | null> {
    return call<string | null>("select_project_root", {});
  },

  async daemonInfo(signal?: AbortSignal): Promise<DaemonInfoResult> {
    const request = createDaemonInfoRequest("desktop-info", 1);
    return parseDaemonInfoResponse(
      await call("get_daemon_info", { request }, signal),
    ).result;
  },

  async inspectProject(
    root: string,
    signal?: AbortSignal,
  ): Promise<InspectResult> {
    const request = createInspectRequest("desktop-inspect", { root });
    return parseInspectResponse(
      await call("inspect_project", { root, request }, signal),
    ).result;
  },

  async doctorProject(
    root: string,
    signal?: AbortSignal,
  ): Promise<DoctorResult> {
    const request = createDoctorRequest("desktop-doctor", {
      root,
      profile: "generic",
      adapters: [],
    });
    return parseDoctorResponse(
      await call("run_doctor", { root, request }, signal),
    ).result;
  },

  async projectDiff(
    params: Omit<ProjectDiffParams, "protocolVersion">,
    signal?: AbortSignal,
  ) {
    const request = createProjectDiffRequest("desktop-diff", params);
    return parseProjectDiffResponse(
      await call("preview_project_diff", { request }, signal),
    ).result as ProjectDiffResult;
  },

  async projectTimeline(
    params: Omit<ProjectTimelineParams, "protocolVersion">,
    signal?: AbortSignal,
  ): Promise<ProjectTimelineResult> {
    const request = createProjectTimelineRequest("desktop-timeline", params);
    return parseProjectTimelineResponse(
      await call("load_project_timeline", { request }, signal),
    ).result;
  },

  async inceptionRequest(
    request: object,
    signal?: AbortSignal,
  ): Promise<InceptionViewmodelPayload> {
    const response = await call<{ result?: { viewmodel?: unknown } }>(
      "invoke_inception_request",
      { request },
      signal,
    );
    const viewmodel = response.result?.viewmodel;
    if (typeof viewmodel !== "object" || viewmodel === null) {
      throw new DesktopBridgeError(
        "Inception response did not include a viewmodel",
        "bounded_validation_failed",
      );
    }
    return viewmodel as InceptionViewmodelPayload;
  },

  async inceptionSessionCreate(
    root: string,
    idea: string,
    signal?: AbortSignal,
  ): Promise<InceptionViewmodelPayload> {
    const request = createInceptionSessionCreateRequest(
      "desktop-inception-create",
      root,
      idea,
    );
    return this.inceptionRequest(request, signal);
  },

  async inceptionSessionGet(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<InceptionViewmodelPayload> {
    const request = createInceptionSessionGetRequest(
      "desktop-inception-get",
      sessionId,
    );
    return this.inceptionRequest(request, signal);
  },

  async inceptionSessionDelete(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<InceptionViewmodelPayload> {
    const request = createInceptionSessionDeleteRequest(
      "desktop-inception-delete",
      sessionId,
    );
    return this.inceptionRequest(request, signal);
  },

  async foundationRequest(
    request: object,
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const response = await call<{ result?: { viewmodel?: unknown } }>(
      "invoke_foundation_request",
      { request },
      signal,
    );
    const viewmodel = response.result?.viewmodel;
    if (typeof viewmodel !== "object" || viewmodel === null) {
      throw new DesktopBridgeError(
        "Foundation response did not include a viewmodel",
        "bounded_validation_failed",
      );
    }
    return viewmodel as FoundationViewmodelPayload;
  },

  async foundationWorkshopCreate(
    root: string,
    idea: string,
    inceptionSessionId?: string,
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationWorkshopCreateRequest(
      "desktop-foundation-create",
      root,
      idea,
      inceptionSessionId,
    );
    return this.foundationRequest(request, signal);
  },

  async foundationWorkshopGet(
    workshopId: string,
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationWorkshopGetRequest(
      "desktop-foundation-get",
      workshopId,
    );
    return this.foundationRequest(request, signal);
  },

  async foundationWorkshopDelete(
    workshopId: string,
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationWorkshopDeleteRequest(
      "desktop-foundation-delete",
      workshopId,
    );
    return this.foundationRequest(request, signal);
  },

  async foundationConflictsIdentify(
    workshopId: string,
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationConflictsIdentifyRequest(
      "desktop-foundation-conflicts",
      workshopId,
    );
    return this.foundationRequest(request, signal);
  },

  async foundationDiscoveryQuestions(
    workshopId: string,
    effort?: "low" | "medium" | "high",
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationDiscoveryQuestionsRequest(
      "desktop-foundation-discovery-questions",
      workshopId,
      effort,
    );
    return this.foundationRequest(request, signal);
  },

  async foundationDiscoveryTurn(
    workshopId: string,
    options?: {
      readonly effort?: "low" | "medium" | "high";
      readonly turnIndex?: number;
    },
    signal?: AbortSignal,
  ): Promise<FoundationViewmodelPayload> {
    const request = createFoundationDiscoveryTurnRequest(
      "desktop-foundation-discovery-turn",
      workshopId,
      options ?? {},
    );
    return this.foundationRequest(request, signal);
  },
};
