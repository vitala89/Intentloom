export const PROTOCOL_VERSION = 1 as const;
export const DOCTOR_METHOD = "intentloom.project.doctor.v1" as const;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type RequestId = number | string;
export interface JsonRpcRequest<
  Method extends string = string,
  Params extends object = JsonObject,
> {
  readonly jsonrpc: "2.0";
  readonly id: RequestId;
  readonly method: Method;
  readonly params: Params;
}
export interface JsonRpcSuccess<Result extends object = JsonObject> {
  readonly jsonrpc: "2.0";
  readonly id: RequestId;
  readonly result: Result;
}
export interface JsonRpcFailure {
  readonly jsonrpc: "2.0";
  readonly id: RequestId | null;
  readonly error: {
    readonly code: -32600 | -32601 | -32602;
    readonly message: string;
  };
}

export interface DoctorParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly string[];
}
export interface DoctorFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly category: string;
  readonly path: string;
  readonly message: string;
}
export interface DoctorResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly findings: readonly DoctorFinding[];
  readonly diagnostics: readonly string[];
  readonly exitCode: 0 | 3;
}
export type DoctorRequest = JsonRpcRequest<typeof DOCTOR_METHOD, DoctorParams>;
export type DoctorResponse = JsonRpcSuccess<DoctorResult>;

export class ProtocolValidationError extends Error {
  constructor(
    readonly code: -32600 | -32601 | -32602,
    message: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestId(value: unknown): RequestId {
  if (typeof value === "string" || typeof value === "number") return value;
  throw new ProtocolValidationError(
    -32600,
    "request id must be a string or number",
  );
}

function stringValue(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be a non-empty string`,
  );
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be an array of strings`,
  );
}

export function createDoctorRequest(
  id: RequestId,
  params: Omit<DoctorParams, "protocolVersion">,
): DoctorRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: DOCTOR_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      profile: params.profile,
      adapters: [...params.adapters],
    },
  };
}

export function parseDoctorRequest(value: unknown): DoctorRequest {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (value.method !== DOCTOR_METHOD)
    throw new ProtocolValidationError(-32601, "unsupported protocol method");
  if (!isObject(value.params))
    throw new ProtocolValidationError(-32602, "params must be an object");
  if (value.params.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  return createDoctorRequest(id, {
    root: stringValue(value.params.root, "root"),
    profile: stringValue(value.params.profile, "profile"),
    adapters: stringArray(value.params.adapters, "adapters"),
  });
}

export function serializeRequest(request: DoctorRequest): string {
  return JSON.stringify(request);
}

export function parseSerializedRequest(serialized: string): DoctorRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new ProtocolValidationError(-32600, "request is not valid JSON");
  }
  return parseDoctorRequest(parsed);
}

export function createDoctorResponse(
  id: RequestId,
  result: Omit<DoctorResult, "protocolVersion">,
): DoctorResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      findings: result.findings.map((finding) => ({ ...finding })),
      diagnostics: [...result.diagnostics],
      exitCode: result.exitCode,
    },
  };
}
