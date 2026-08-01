export interface ViewInitMessage {
  readonly type: "intentloom:view:init";
  readonly payload: {
    readonly root: string | null;
    readonly theme: "dark" | "light";
    readonly capabilities: readonly string[];
  };
}

export interface ViewRequestMessage {
  readonly type: "intentloom:view:request";
  readonly id: string;
  readonly operation: string;
  readonly params: Record<string, unknown>;
}

export interface ViewResponseMessage {
  readonly type: "intentloom:view:response";
  readonly id: string;
  readonly result?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

export type ViewSandboxMessage =
  ViewInitMessage | ViewRequestMessage | ViewResponseMessage;

export function isViewSandboxMessage(
  data: unknown,
): data is ViewSandboxMessage {
  if (!data || typeof data !== "object") return false;
  const type = (data as Record<string, unknown>).type;
  return (
    type === "intentloom:view:init" ||
    type === "intentloom:view:request" ||
    type === "intentloom:view:response"
  );
}

export function createInitMessage(
  root: string | null,
  theme: "dark" | "light",
  capabilities: readonly string[],
): ViewInitMessage {
  return {
    type: "intentloom:view:init",
    payload: { root, theme, capabilities },
  };
}
