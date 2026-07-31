import type {
  PROTOCOL_VERSION,
  DAEMON_INFO_METHOD,
  JsonRpcRequest,
  JsonRpcSuccess,
} from "./jsonrpc.js";

export type CapabilityClassification = "read-only" | "mutating";

export interface DaemonCapability {
  readonly method: string;
  readonly operation: string;
  readonly classification: CapabilityClassification;
}

export interface DaemonLimits {
  readonly maxMessageBytes: number;
  readonly maxResponseBytes: number;
  readonly maxConnections: number;
  readonly requestTimeoutMs: number;
}

export interface DaemonCompatibility {
  readonly status: "compatible" | "incompatible";
  readonly clientProtocolVersion: number;
  readonly daemonProtocolVersion: typeof PROTOCOL_VERSION;
  readonly reason?: string;
}

export interface DaemonInfoParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly clientProtocolVersion: number;
}

export interface DaemonInfoResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly daemonVersion: string;
  readonly capabilities: readonly DaemonCapability[];
  readonly limits: DaemonLimits;
  readonly compatibility: DaemonCompatibility;
}

export type DaemonInfoRequest = JsonRpcRequest<
  typeof DAEMON_INFO_METHOD,
  DaemonInfoParams
>;

export type DaemonInfoResponse = JsonRpcSuccess<DaemonInfoResult>;
