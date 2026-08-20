import type {
  PROTOCOL_VERSION,
  PROJECT_DIFF_METHOD,
  JsonRpcRequest,
  JsonRpcSuccess,
} from "./jsonrpc.js";

export interface ProjectDiffParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly profile?: string;
  readonly adapters?: readonly string[];
}

export interface ProjectDiffChange {
  readonly path: string;
  readonly kind:
    | "create"
    | "update"
    | "conflict"
    | "modified"
    | "missing"
    | "stale"
    | "security-error";
  readonly reason: string;
  readonly content?: string;
}

export interface ProjectDiffResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly operationVersion: 1;
  readonly root: string;
  readonly changes: readonly ProjectDiffChange[];
  readonly diagnostics: readonly string[];
}

export type ProjectDiffRequest = JsonRpcRequest<
  typeof PROJECT_DIFF_METHOD,
  ProjectDiffParams
>;

export type ProjectDiffResponse = JsonRpcSuccess<ProjectDiffResult>;
