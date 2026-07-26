import {
  createConnection,
  createServer,
  type Server,
  type Socket,
} from "node:net";
import { isAbsolute } from "node:path";
import {
  ProtocolValidationError,
  DOCTOR_METHOD,
  INSPECT_METHOD,
  SECURITY_AUDIT_METHOD,
  MEMORY_SEARCH_METHOD,
  MEMORY_EVALUATIONS_LIST_METHOD,
  ENGINEERING_CONFORMANCE_METHOD,
  WORKFLOW_VARIANT_SUMMARY_METHOD,
  WORKFLOW_DURATION_SUMMARY_METHOD,
  CONFORMANCE_TREND_SUMMARY_METHOD,
  SESSION_GET_METHOD,
  createDoctorResponse,
  createInspectResponse,
  createSecurityAuditResponse,
  createMemorySearchResponse,
  createMemoryEvaluationsListResponse,
  createEngineeringConformanceResponse,
  createWorkflowVariantSummaryResponse,
  createWorkflowDurationSummaryResponse,
  createConformanceTrendSummaryResponse,
  createSessionGetResponse,
  parseDaemonRequest,
  parseDoctorResponse,
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
  type SessionGetRequest,
  type SessionGetResultPayload,
} from "../../protocol/src/index.js";

const maxMessageBytes = 1024 * 1024;

export interface DaemonOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly maxConnections?: number;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly doctor?: (
    request: DoctorRequest,
  ) => Promise<Omit<DoctorResult, "protocolVersion">>;
  readonly inspect?: (
    request: InspectRequest,
  ) => Promise<Omit<InspectResult, "protocolVersion">>;
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
}

function localEndpoint(endpoint: string): boolean {
  return (
    endpoint.length > 0 &&
    (process.platform === "win32"
      ? endpoint.startsWith("\\\\.\\pipe\\")
      : isAbsolute(endpoint))
  );
}

function response(socket: Socket, value: object): void {
  socket.end(`${JSON.stringify(value)}\n`);
}

function failure(
  socket: Socket,
  code: -32600 | -32601 | -32602,
  message: string,
): void {
  response(socket, { jsonrpc: "2.0", id: null, error: { code, message } });
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
        return failure(socket, -32600, "message too large");
      const line = input.indexOf("\n");
      if (line < 0) return;
      socket.pause();
      try {
        const envelope = JSON.parse(input.slice(0, line)) as {
          token?: unknown;
          request?: unknown;
        };
        if (envelope.token !== options.sessionToken)
          return failure(socket, -32600, "authentication failed");
        const request = parseDaemonRequest(envelope.request);

        if (request.method === DOCTOR_METHOD) {
          if (!options.doctor)
            return failure(socket, -32601, "unsupported method doctor");
          response(
            socket,
            createDoctorResponse(request.id, await options.doctor(request)),
          );
        } else if (request.method === INSPECT_METHOD) {
          if (!options.inspect)
            return failure(socket, -32601, "unsupported method inspect");
          response(
            socket,
            createInspectResponse(request.id, await options.inspect(request)),
          );
        } else if (request.method === SECURITY_AUDIT_METHOD) {
          if (!options.securityAudit)
            return failure(socket, -32601, "unsupported method securityAudit");
          response(
            socket,
            createSecurityAuditResponse(
              request.id,
              await options.securityAudit(request),
            ),
          );
        } else if (request.method === MEMORY_SEARCH_METHOD) {
          if (!options.memorySearch)
            return failure(socket, -32601, "unsupported method memorySearch");
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
            );
          response(
            socket,
            createConformanceTrendSummaryResponse(
              request.id,
              await options.conformanceTrendSummary(request),
            ),
          );
        } else if (request.method === SESSION_GET_METHOD) {
          if (!options.sessionGet)
            return failure(socket, -32601, "unsupported method sessionGet");
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
          return failure(socket, err.code, err.message ?? "invalid request");
        }
        return failure(socket, -32600, "invalid request");
      }
    });
    socket.on("close", () => sockets.delete(socket));
  });
  server.maxConnections = options.maxConnections ?? 16;
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
  if (!localEndpoint(options.endpoint))
    throw new Error("endpoint must be an absolute local IPC path");
  if (options.sessionToken.length < 32)
    throw new Error("session token is too short");
  return new Promise<DoctorResult>((resolve, reject) => {
    const socket = createConnection(options.endpoint);
    let output = "";
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(options.requestTimeoutMs ?? 30_000, () =>
      fail(new Error("daemon request timed out")),
    );
    socket.once("connect", () =>
      socket.write(
        `${JSON.stringify({ token: options.sessionToken, request: options.request })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output) > maxMessageBytes)
        fail(new Error("daemon response too large"));
    });
    socket.once("error", (error) => reject(error));
    socket.once("end", () => {
      try {
        const line = output.indexOf("\n");
        if (line < 0) throw new Error("daemon returned an incomplete response");
        resolve(parseDoctorResponse(JSON.parse(output.slice(0, line))).result);
      } catch {
        reject(new Error("daemon returned an invalid response"));
      }
    });
  });
}
