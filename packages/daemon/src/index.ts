import { lstat, realpath } from "node:fs/promises";
import {
  createConnection,
  createServer,
  type Server,
  type Socket,
} from "node:net";
import { isAbsolute } from "node:path";
import {
  DAEMON_INFO_METHOD,
  ProtocolValidationError,
  DOCTOR_METHOD,
  INSPECT_METHOD,
  PROJECT_DIFF_METHOD,
  PROJECT_TIMELINE_METHOD,
  SECURITY_AUDIT_METHOD,
  MEMORY_SEARCH_METHOD,
  MEMORY_EVALUATIONS_LIST_METHOD,
  ENGINEERING_CONFORMANCE_METHOD,
  WORKFLOW_VARIANT_SUMMARY_METHOD,
  WORKFLOW_DURATION_SUMMARY_METHOD,
  CONFORMANCE_TREND_SUMMARY_METHOD,
  WORKFLOW_REPETITION_SUMMARY_METHOD,
  WORKFLOW_TRANSITION_INTERVALS_METHOD,
  SESSION_GET_METHOD,
  PROTOCOL_VERSION,
  createDaemonInfoRequest,
  createDaemonInfoResponse,
  createProjectDiffRequest,
  createProjectTimelineRequest,
  createInspectRequest,
  createDoctorResponse,
  createProjectDiffResponse,
  createProjectTimelineResponse,
  createInspectResponse,
  createSecurityAuditResponse,
  createMemorySearchResponse,
  createMemoryEvaluationsListResponse,
  createEngineeringConformanceResponse,
  createWorkflowVariantSummaryResponse,
  createWorkflowDurationSummaryResponse,
  createConformanceTrendSummaryResponse,
  createWorkflowRepetitionSummaryResponse,
  createWorkflowTransitionIntervalsResponse,
  createSessionGetResponse,
  parseDaemonRequest,
  parseDaemonInfoResponse,
  parseDoctorResponse,
  parseProjectDiffResponse,
  parseProjectTimelineResponse,
  parseInspectResponse,
  type ClientErrorCode,
  type DaemonCapability,
  type DaemonInfoResult,
  type ProjectDiffRequest,
  type ProjectDiffResult,
  type ProjectTimelineRequest,
  type ProjectTimelineResult,
  type DoctorRequest,
  type DoctorResult,
  type InspectRequest,
  type InspectResult,
  type SecurityAuditRequest,
  type SecurityAuditResult,
  type MemorySearchRequest,
  type MemorySearchResultPayload,
  type MemoryEvaluationsListRequest,
  type MemoryEvaluationsListResultPayload,
  type EngineeringConformanceRequest,
  type EngineeringConformanceResultPayload,
  type WorkflowVariantSummaryRequest,
  type WorkflowVariantSummaryResultPayload,
  type WorkflowDurationSummaryRequest,
  type WorkflowDurationSummaryResultPayload,
  type ConformanceTrendSummaryRequest,
  type ConformanceTrendSummaryResultPayload,
  type WorkflowRepetitionSummaryRequest,
  type WorkflowRepetitionSummaryResultPayload,
  type WorkflowTransitionIntervalsRequest,
  type WorkflowTransitionIntervalsResultPayload,
  type SessionGetRequest,
  type SessionGetResultPayload,
} from "../../protocol/src/index.js";

const maxMessageBytes = 1024 * 1024;
const defaultMaxConnections = 16;
const defaultRequestTimeoutMs = 30_000;

export interface DaemonOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly maxConnections?: number;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly daemonVersion?: string;
  readonly enforceCanonicalRoots?: boolean;
  readonly doctor?: (
    request: DoctorRequest,
  ) => Promise<Omit<DoctorResult, "protocolVersion">>;
  readonly inspect?: (
    request: InspectRequest,
  ) => Promise<Omit<InspectResult, "protocolVersion">>;
  readonly diff?: (
    request: ProjectDiffRequest,
  ) => Promise<Omit<ProjectDiffResult, "protocolVersion">>;
  readonly timeline?: (
    request: ProjectTimelineRequest,
  ) => Promise<Omit<ProjectTimelineResult, "protocolVersion">>;
  readonly securityAudit?: (
    request: SecurityAuditRequest,
  ) => Promise<Omit<SecurityAuditResult, "protocolVersion">>;
  readonly memorySearch?: (
    request: MemorySearchRequest,
  ) => Promise<Omit<MemorySearchResultPayload, "protocolVersion">>;
  readonly memoryEvaluationsList?: (
    request: MemoryEvaluationsListRequest,
  ) => Promise<Omit<MemoryEvaluationsListResultPayload, "protocolVersion">>;
  readonly engineeringConformance?: (
    request: EngineeringConformanceRequest,
  ) => Promise<Omit<EngineeringConformanceResultPayload, "protocolVersion">>;
  readonly workflowVariantSummary?: (
    request: WorkflowVariantSummaryRequest,
  ) => Promise<Omit<WorkflowVariantSummaryResultPayload, "protocolVersion">>;
  readonly workflowDurationSummary?: (
    request: WorkflowDurationSummaryRequest,
  ) => Promise<Omit<WorkflowDurationSummaryResultPayload, "protocolVersion">>;
  readonly conformanceTrendSummary?: (
    request: ConformanceTrendSummaryRequest,
  ) => Promise<Omit<ConformanceTrendSummaryResultPayload, "protocolVersion">>;
  readonly workflowRepetitionSummary?: (
    request: WorkflowRepetitionSummaryRequest,
  ) => Promise<Omit<WorkflowRepetitionSummaryResultPayload, "protocolVersion">>;
  readonly workflowTransitionIntervals?: (
    request: WorkflowTransitionIntervalsRequest,
  ) => Promise<
    Omit<WorkflowTransitionIntervalsResultPayload, "protocolVersion">
  >;
  readonly sessionGet?: (
    request: SessionGetRequest,
  ) => Promise<Omit<SessionGetResultPayload, "protocolVersion">>;
}

export interface LocalDaemon {
  readonly endpoint: string;
  close(): Promise<void>;
}

export interface DaemonClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly request: DoctorRequest;
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface DaemonInfoClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly clientProtocolVersion?: number;
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface ProjectInspectClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly root: string;
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface ProjectDiffClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly string[];
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface ProjectTimelineClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly root: string;
  readonly caseId: string;
  readonly limit?: number;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export class DaemonClientError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "DaemonClientError";
  }
}

function localEndpoint(endpoint: string): boolean {
  return (
    endpoint.length > 0 &&
    (process.platform === "win32"
      ? endpoint.startsWith("\\\\.\\pipe\\")
      : isAbsolute(endpoint))
  );
}

class DaemonRootError extends Error {
  constructor(
    readonly clientErrorCode: "invalid_root" | "stale_root",
    message: string,
  ) {
    super(message);
    this.name = "DaemonRootError";
  }
}

async function canonicalProjectRoot(root: string): Promise<string> {
  if (!isAbsolute(root))
    throw new DaemonRootError(
      "invalid_root",
      "project root must be an absolute path",
    );
  let metadata;
  try {
    metadata = await lstat(root);
  } catch {
    throw new DaemonRootError("invalid_root", "project root does not exist");
  }
  if (metadata.isSymbolicLink())
    throw new DaemonRootError(
      "stale_root",
      "project root is a symbolic link and is not stable",
    );
  if (!metadata.isDirectory())
    throw new DaemonRootError(
      "invalid_root",
      "project root is not a directory",
    );
  try {
    return await realpath(root);
  } catch {
    throw new DaemonRootError(
      "stale_root",
      "project root could not be resolved",
    );
  }
}

function response(socket: Socket, value: object): void {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > maxMessageBytes) {
    socket.end(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "response too large",
          data: { clientErrorCode: "bounded_validation_failed" },
        },
      })}\n`,
    );
    return;
  }
  socket.end(`${serialized}\n`);
}

function failure(
  socket: Socket,
  code: -32600 | -32601 | -32602,
  message: string,
  clientErrorCode?: ClientErrorCode,
): void {
  response(socket, {
    jsonrpc: "2.0",
    id: null,
    error: {
      code,
      message,
      ...(clientErrorCode ? { data: { clientErrorCode } } : {}),
    },
  });
}

function capability(
  method: string,
  operation: string,
  enabled: boolean,
  classification: DaemonCapability["classification"] = "read-only",
): DaemonCapability | undefined {
  return enabled ? { method, operation, classification } : undefined;
}

function daemonCapabilities(
  options: DaemonOptions,
): readonly DaemonCapability[] {
  return [
    {
      method: DAEMON_INFO_METHOD,
      operation: "daemon.info",
      classification: "read-only",
    },
    capability(DOCTOR_METHOD, "project.doctor", options.doctor !== undefined),
    capability(
      INSPECT_METHOD,
      "project.inspect",
      options.inspect !== undefined,
    ),
    capability(PROJECT_DIFF_METHOD, "project.diff", options.diff !== undefined),
    capability(
      PROJECT_TIMELINE_METHOD,
      "project.timeline",
      options.timeline !== undefined,
    ),
    capability(
      SECURITY_AUDIT_METHOD,
      "security.audit",
      options.securityAudit !== undefined,
    ),
    capability(
      MEMORY_SEARCH_METHOD,
      "memory.search",
      options.memorySearch !== undefined,
    ),
    capability(
      MEMORY_EVALUATIONS_LIST_METHOD,
      "memory.evaluations.list",
      options.memoryEvaluationsList !== undefined,
    ),
    capability(
      ENGINEERING_CONFORMANCE_METHOD,
      "engineering.conformance",
      options.engineeringConformance !== undefined,
    ),
    capability(
      WORKFLOW_VARIANT_SUMMARY_METHOD,
      "workflow.variants.summary",
      options.workflowVariantSummary !== undefined,
    ),
    capability(
      WORKFLOW_DURATION_SUMMARY_METHOD,
      "workflow.durations.summary",
      options.workflowDurationSummary !== undefined,
    ),
    capability(
      CONFORMANCE_TREND_SUMMARY_METHOD,
      "conformance.trend.summary",
      options.conformanceTrendSummary !== undefined,
    ),
    capability(
      WORKFLOW_REPETITION_SUMMARY_METHOD,
      "workflow.repetitions.summary",
      options.workflowRepetitionSummary !== undefined,
    ),
    capability(
      WORKFLOW_TRANSITION_INTERVALS_METHOD,
      "workflow.transitions.intervals",
      options.workflowTransitionIntervals !== undefined,
    ),
    capability(
      SESSION_GET_METHOD,
      "session.get",
      options.sessionGet !== undefined,
    ),
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

function protocolClientError(
  code: -32600 | -32601 | -32602,
  message: string,
): ClientErrorCode {
  if (code === -32601 || message.includes("unsupported protocol method"))
    return "unsupported_capability";
  if (message.includes("unsupported protocol version"))
    return "protocol_incompatible";
  return "bounded_validation_failed";
}

export async function startLocalDaemon(
  options: DaemonOptions,
): Promise<LocalDaemon> {
  if (options.sessionToken.length < 32)
    throw new Error("session token is too short");
  if (!localEndpoint(options.endpoint))
    throw new Error("endpoint must be an absolute local IPC path");
  const sockets = new Set<Socket>();
  let closePromise: Promise<void> | undefined;
  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.setTimeout(options.requestTimeoutMs ?? 30_000, () =>
      socket.destroy(),
    );
    let input = "";
    socket.on("data", async (chunk: Buffer) => {
      input += chunk.toString("utf8");
      if (Buffer.byteLength(input) > maxMessageBytes)
        return failure(
          socket,
          -32600,
          "message too large",
          "bounded_validation_failed",
        );
      const line = input.indexOf("\n");
      if (line < 0) return;
      socket.pause();
      try {
        const envelope = JSON.parse(input.slice(0, line)) as {
          token?: unknown;
          request?: unknown;
        };
        if (envelope.token !== options.sessionToken)
          return failure(
            socket,
            -32600,
            "authentication failed",
            "authentication_failed",
          );
        const request = parseDaemonRequest(envelope.request);

        if (request.method === DAEMON_INFO_METHOD) {
          const compatibility =
            request.params.clientProtocolVersion === PROTOCOL_VERSION
              ? {
                  status: "compatible" as const,
                  clientProtocolVersion: request.params.clientProtocolVersion,
                  daemonProtocolVersion: PROTOCOL_VERSION,
                }
              : {
                  status: "incompatible" as const,
                  clientProtocolVersion: request.params.clientProtocolVersion,
                  daemonProtocolVersion: PROTOCOL_VERSION,
                  reason: "client protocol version is not supported",
                };
          response(
            socket,
            createDaemonInfoResponse(request.id, {
              daemonVersion: options.daemonVersion ?? "development",
              capabilities: daemonCapabilities(options),
              limits: {
                maxMessageBytes,
                maxResponseBytes: maxMessageBytes,
                maxConnections: options.maxConnections ?? defaultMaxConnections,
                requestTimeoutMs:
                  options.requestTimeoutMs ?? defaultRequestTimeoutMs,
              },
              compatibility,
            }),
          );
        } else if (request.method === DOCTOR_METHOD) {
          if (!options.doctor)
            return failure(
              socket,
              -32601,
              "unsupported method doctor",
              "unsupported_capability",
            );
          const root = options.enforceCanonicalRoots
            ? await canonicalProjectRoot(request.params.root)
            : request.params.root;
          response(
            socket,
            createDoctorResponse(
              request.id,
              await options.doctor({
                ...request,
                params: { ...request.params, root },
              }),
            ),
          );
        } else if (request.method === INSPECT_METHOD) {
          if (!options.inspect)
            return failure(
              socket,
              -32601,
              "unsupported method inspect",
              "unsupported_capability",
            );
          const root = options.enforceCanonicalRoots
            ? await canonicalProjectRoot(request.params.root)
            : request.params.root;
          response(
            socket,
            createInspectResponse(
              request.id,
              await options.inspect({
                ...request,
                params: { ...request.params, root },
              }),
            ),
          );
        } else if (request.method === PROJECT_DIFF_METHOD) {
          if (!options.diff)
            return failure(
              socket,
              -32601,
              "unsupported method diff",
              "unsupported_capability",
            );
          const root = options.enforceCanonicalRoots
            ? await canonicalProjectRoot(request.params.root)
            : request.params.root;
          response(
            socket,
            createProjectDiffResponse(
              request.id,
              await options.diff({
                ...request,
                params: { ...request.params, root },
              }),
            ),
          );
        } else if (request.method === PROJECT_TIMELINE_METHOD) {
          if (!options.timeline)
            return failure(
              socket,
              -32601,
              "unsupported method timeline",
              "unsupported_capability",
            );
          const root = options.enforceCanonicalRoots
            ? await canonicalProjectRoot(request.params.root)
            : request.params.root;
          response(
            socket,
            createProjectTimelineResponse(
              request.id,
              await options.timeline({
                ...request,
                params: { ...request.params, root },
              }),
            ),
          );
        } else if (request.method === SECURITY_AUDIT_METHOD) {
          if (!options.securityAudit)
            return failure(
              socket,
              -32601,
              "unsupported method securityAudit",
              "unsupported_capability",
            );
          response(
            socket,
            createSecurityAuditResponse(
              request.id,
              await options.securityAudit(request),
            ),
          );
        } else if (request.method === MEMORY_SEARCH_METHOD) {
          if (!options.memorySearch)
            return failure(
              socket,
              -32601,
              "unsupported method memorySearch",
              "unsupported_capability",
            );
          response(
            socket,
            createMemorySearchResponse(
              request.id,
              await options.memorySearch(request),
            ),
          );
        } else if (request.method === MEMORY_EVALUATIONS_LIST_METHOD) {
          if (!options.memoryEvaluationsList)
            return failure(
              socket,
              -32601,
              "unsupported method memoryEvaluationsList",
              "unsupported_capability",
            );
          response(
            socket,
            createMemoryEvaluationsListResponse(
              request.id,
              await options.memoryEvaluationsList(request),
            ),
          );
        } else if (request.method === ENGINEERING_CONFORMANCE_METHOD) {
          if (!options.engineeringConformance)
            return failure(
              socket,
              -32601,
              "unsupported method engineeringConformance",
              "unsupported_capability",
            );
          response(
            socket,
            createEngineeringConformanceResponse(
              request.id,
              await options.engineeringConformance(request),
            ),
          );
        } else if (request.method === WORKFLOW_VARIANT_SUMMARY_METHOD) {
          if (!options.workflowVariantSummary)
            return failure(
              socket,
              -32601,
              "unsupported method workflowVariantSummary",
              "unsupported_capability",
            );
          response(
            socket,
            createWorkflowVariantSummaryResponse(
              request.id,
              await options.workflowVariantSummary(request),
            ),
          );
        } else if (request.method === WORKFLOW_DURATION_SUMMARY_METHOD) {
          if (!options.workflowDurationSummary)
            return failure(
              socket,
              -32601,
              "unsupported method workflowDurationSummary",
              "unsupported_capability",
            );
          response(
            socket,
            createWorkflowDurationSummaryResponse(
              request.id,
              await options.workflowDurationSummary(request),
            ),
          );
        } else if (request.method === CONFORMANCE_TREND_SUMMARY_METHOD) {
          if (!options.conformanceTrendSummary)
            return failure(
              socket,
              -32601,
              "unsupported method conformanceTrendSummary",
              "unsupported_capability",
            );
          response(
            socket,
            createConformanceTrendSummaryResponse(
              request.id,
              await options.conformanceTrendSummary(request),
            ),
          );
        } else if (request.method === WORKFLOW_REPETITION_SUMMARY_METHOD) {
          if (!options.workflowRepetitionSummary)
            return failure(
              socket,
              -32601,
              "unsupported method workflowRepetitionSummary",
              "unsupported_capability",
            );
          response(
            socket,
            createWorkflowRepetitionSummaryResponse(
              request.id,
              await options.workflowRepetitionSummary(request),
            ),
          );
        } else if (request.method === WORKFLOW_TRANSITION_INTERVALS_METHOD) {
          if (!options.workflowTransitionIntervals)
            return failure(
              socket,
              -32601,
              "unsupported method workflowTransitionIntervals",
              "unsupported_capability",
            );
          response(
            socket,
            createWorkflowTransitionIntervalsResponse(
              request.id,
              await options.workflowTransitionIntervals(request),
            ),
          );
        } else if (request.method === SESSION_GET_METHOD) {
          if (!options.sessionGet)
            return failure(
              socket,
              -32601,
              "unsupported method sessionGet",
              "unsupported_capability",
            );
          response(
            socket,
            createSessionGetResponse(
              request.id,
              await options.sessionGet(request),
            ),
          );
        }
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "clientErrorCode" in error &&
          typeof (error as Record<string, unknown>).clientErrorCode === "string"
        ) {
          return failure(
            socket,
            -32602,
            error instanceof Error ? error.message : "project root is invalid",
            (error as { clientErrorCode: ClientErrorCode }).clientErrorCode,
          );
        }
        if (
          error instanceof ProtocolValidationError ||
          (error &&
            typeof error === "object" &&
            "code" in error &&
            typeof (error as Record<string, unknown>).code === "number")
        ) {
          const err = error as {
            code: -32600 | -32601 | -32602;
            message?: string;
          };
          return failure(
            socket,
            err.code,
            err.message ?? "invalid request",
            protocolClientError(err.code, err.message ?? "invalid request"),
          );
        }
        return failure(socket, -32600, "invalid request", "internal_failure");
      }
    });
    socket.on("close", () => sockets.delete(socket));
  });
  server.maxConnections = options.maxConnections ?? defaultMaxConnections;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.endpoint, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return {
    endpoint: options.endpoint,
    async close(): Promise<void> {
      if (closePromise !== undefined) return closePromise;
      closePromise = new Promise<void>((resolve, reject) => {
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          for (const socket of sockets) socket.destroy();
        }, options.shutdownTimeoutMs ?? 5_000);
        server.close((error) => {
          clearTimeout(timeout);
          if (error && !timedOut) reject(error);
          else resolve();
        });
      });
      return closePromise;
    },
  };
}

export async function requestDaemonDoctor(
  options: DaemonClientOptions,
): Promise<DoctorResult> {
  return requestDaemonOperation(
    options,
    options.request,
    (value) => parseDoctorResponse(value).result,
  );
}

const clientErrorCodes: readonly ClientErrorCode[] = [
  "authentication_failed",
  "protocol_incompatible",
  "unsupported_capability",
  "invalid_root",
  "stale_root",
  "bounded_validation_failed",
  "timed_out",
  "cancelled",
  "disconnected",
  "internal_failure",
];

function isClientErrorCode(value: unknown): value is ClientErrorCode {
  return (
    typeof value === "string" &&
    clientErrorCodes.includes(value as ClientErrorCode)
  );
}

function responseError(value: unknown): DaemonClientError {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "error" in value
  ) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "object" && error !== null && !Array.isArray(error)) {
      const record = error as Record<string, unknown>;
      const data = record.data;
      const clientErrorCode =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? (data as Record<string, unknown>).clientErrorCode
          : undefined;
      const code = isClientErrorCode(clientErrorCode)
        ? clientErrorCode
        : record.code === -32601
          ? "unsupported_capability"
          : record.code === -32602
            ? "bounded_validation_failed"
            : "internal_failure";
      return new DaemonClientError(
        code,
        typeof record.message === "string"
          ? record.message
          : "daemon returned an error",
        code === "disconnected" || code === "timed_out",
      );
    }
  }
  return new DaemonClientError(
    "bounded_validation_failed",
    "daemon returned an invalid response",
  );
}

interface DaemonRequestTransportOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly requestTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

function requestDaemonOperation<Result>(
  options: DaemonRequestTransportOptions,
  request: object,
  parse: (value: unknown) => Result,
): Promise<Result> {
  if (!localEndpoint(options.endpoint))
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        "endpoint must be an absolute local IPC path",
      ),
    );
  if (options.sessionToken.length < 32)
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        "session token is too short",
      ),
    );

  return new Promise<Result>((resolve, reject) => {
    const socket = createConnection(options.endpoint);
    let output = "";
    let settled = false;
    const cleanup = () => {
      options.signal?.removeEventListener("abort", onAbort);
    };
    const complete = (error?: Error, result?: Result) => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      if (error) reject(error);
      else resolve(result!);
    };
    const onAbort = () =>
      complete(new DaemonClientError("cancelled", "daemon request cancelled"));
    if (options.signal?.aborted) return onAbort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    socket.setTimeout(options.requestTimeoutMs ?? defaultRequestTimeoutMs, () =>
      complete(
        new DaemonClientError("timed_out", "daemon request timed out", true),
      ),
    );
    socket.once("connect", () =>
      socket.write(
        `${JSON.stringify({ token: options.sessionToken, request })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output) > maxMessageBytes)
        complete(
          new DaemonClientError(
            "bounded_validation_failed",
            "daemon response too large",
          ),
        );
    });
    socket.once("error", () =>
      complete(
        new DaemonClientError("disconnected", "daemon connection failed", true),
      ),
    );
    socket.once("end", () => {
      try {
        const line = output.indexOf("\n");
        if (line < 0) throw new Error("incomplete response");
        const parsed = JSON.parse(output.slice(0, line)) as unknown;
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed) &&
          "error" in parsed
        )
          return complete(responseError(parsed));
        complete(undefined, parse(parsed));
      } catch (error) {
        complete(
          error instanceof DaemonClientError
            ? error
            : new DaemonClientError(
                error instanceof ProtocolValidationError &&
                  error.message.includes("unsupported") &&
                  error.message.includes("version")
                  ? "protocol_incompatible"
                  : "bounded_validation_failed",
                "daemon returned an invalid response",
              ),
        );
      }
    });
  });
}

export function requestDaemonInfo(
  options: DaemonInfoClientOptions,
): Promise<DaemonInfoResult> {
  try {
    const request = createDaemonInfoRequest(
      "daemon-info",
      options.clientProtocolVersion ?? PROTOCOL_VERSION,
    );
    return requestDaemonOperation(
      options,
      request,
      (value) => parseDaemonInfoResponse(value).result,
    );
  } catch (error) {
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        error instanceof Error ? error.message : "invalid daemon info request",
      ),
    );
  }
}

export function requestDaemonInspect(
  options: ProjectInspectClientOptions,
): Promise<InspectResult> {
  try {
    const request = createInspectRequest("project-inspect", {
      root: options.root,
    });
    return requestDaemonOperation(
      options,
      request,
      (value) => parseInspectResponse(value).result,
    );
  } catch (error) {
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        error instanceof Error
          ? error.message
          : "invalid project inspect request",
      ),
    );
  }
}

export function requestDaemonDiff(
  options: ProjectDiffClientOptions,
): Promise<ProjectDiffResult> {
  try {
    const request = createProjectDiffRequest("project-diff", {
      root: options.root,
      profile: options.profile,
      adapters: options.adapters,
    });
    return requestDaemonOperation(
      options,
      request,
      (value) => parseProjectDiffResponse(value).result,
    );
  } catch (error) {
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        error instanceof Error ? error.message : "invalid project diff request",
      ),
    );
  }
}

export function requestDaemonTimeline(
  options: ProjectTimelineClientOptions,
): Promise<ProjectTimelineResult> {
  try {
    const timelineParams = {
      root: options.root,
      caseId: options.caseId,
      ...(options.limit === undefined ? {} : { limit: options.limit }),
      ...(options.timeoutMs === undefined
        ? {}
        : { timeoutMs: options.timeoutMs }),
      ...(options.maxOutputBytes === undefined
        ? {}
        : { maxOutputBytes: options.maxOutputBytes }),
    };
    const request = createProjectTimelineRequest(
      "project-timeline",
      timelineParams,
    );
    return requestDaemonOperation(
      options,
      request,
      (value) => parseProjectTimelineResponse(value).result,
    );
  } catch (error) {
    return Promise.reject(
      new DaemonClientError(
        "bounded_validation_failed",
        error instanceof Error
          ? error.message
          : "invalid project timeline request",
      ),
    );
  }
}
