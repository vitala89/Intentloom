export const PROTOCOL_VERSION = 1 as const;

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
    readonly data?: JsonObject;
  };
}
