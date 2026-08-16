import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
  type NeutronAdapterCapability,
  type NeutronReadOnlyTool,
  type NeutronRuntimeSession,
  type NeutronToolEnvelope,
} from "../../protocol/src/neutron-runtime.js";
import {
  NEUTRON_N2_MAX_BODY_BYTES,
  NeutronN2Error,
  validateNeutronN2AdapterCapability,
} from "../../validator/src/neutron-runtime-n2.js";
import type { ModelAdapter } from "./model-adapter.js";

const inFlightSessions = new Set<string>();

export interface NeutronN2ToolRunner {
  (
    toolName: NeutronReadOnlyTool,
    args: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface RunNeutronN2ReadOnlyLoopInput {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly prompt: string;
  readonly adapter: ModelAdapter;
  readonly runTool: NeutronN2ToolRunner;
  readonly fingerprintProject: () => Promise<string>;
  readonly signal?: AbortSignal;
  readonly createdAt?: string;
}

export interface NeutronN2LoopResult {
  readonly session: NeutronRuntimeSession;
  readonly adapter: NeutronAdapterCapability;
  readonly tool: NeutronToolEnvelope;
  readonly responseText: string;
  readonly projectFingerprintBefore: string;
  readonly projectFingerprintAfter: string;
}

export async function runNeutronN2ReadOnlyLoop(
  input: RunNeutronN2ReadOnlyLoopInput,
): Promise<NeutronN2LoopResult> {
  if (input.root.length === 0 || input.sessionId.length === 0) {
    throw new NeutronN2Error(
      "validation-failed",
      "root and sessionId are required",
    );
  }
  if (inFlightSessions.has(input.sessionId)) {
    throw new NeutronN2Error(
      "validation-failed",
      "N2 allows one in-flight turn per session",
    );
  }
  inFlightSessions.add(input.sessionId);
  try {
    return await executeLoop(input);
  } finally {
    inFlightSessions.delete(input.sessionId);
  }
}

async function executeLoop(
  input: RunNeutronN2ReadOnlyLoopInput,
): Promise<NeutronN2LoopResult> {
  assertNotCancelled(input.signal);
  const adapter = validateNeutronN2AdapterCapability({
    schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
    providerKind: "ollama",
    modelId: input.adapter.getCapabilities().modelId,
    supportsStreaming: false,
    supportsToolCalls: true,
    networkMode: "explicit-egress",
    dataHandling: "ephemeral",
    credentialIsolation: "outside-project-metadata",
  });
  const before = await input.fingerprintProject();
  const turnOptions =
    input.signal === undefined ? {} : { signal: input.signal };
  const first = await input.adapter.executeTurn(
    {
      schemaVersion: 1,
      sessionId: input.sessionId,
      messages: [{ role: "user", content: input.prompt }],
      tools: [
        {
          name: "inspect",
          description: "Read-only project inspection",
          parametersSchema: {
            type: "object",
            properties: { root: { type: "string" } },
            required: ["root"],
          },
        },
      ],
    },
    turnOptions,
  );
  const call = first.toolCalls[0];
  if (call === undefined) {
    throw new NeutronN2Error(
      "validation-failed",
      "N2 loop requires an inspect tool call",
    );
  }
  if (!isReadOnlyTool(call.name)) {
    throw new NeutronN2Error(
      "unsupported-tool",
      `Unsupported N2 tool ${call.name}`,
    );
  }
  if (call.argumentsJson.length > NEUTRON_N2_MAX_BODY_BYTES) {
    throw new NeutronN2Error("budget-exceeded", "Tool arguments exceed limit");
  }
  const args = parseArgs(call.argumentsJson);
  if (typeof args.root === "string" && args.root !== input.root) {
    throw new NeutronN2Error(
      "root-mismatch",
      "Tool root must match the selected project",
    );
  }
  const payload = await input.runTool(call.name, { ...args, root: input.root });
  const payloadJson = JSON.stringify(payload);
  if (payloadJson.length > NEUTRON_N2_MAX_BODY_BYTES) {
    throw new NeutronN2Error("budget-exceeded", "Tool result exceeds limit");
  }
  const second = await input.adapter.executeTurn(
    {
      schemaVersion: 1,
      sessionId: input.sessionId,
      messages: [
        { role: "user", content: input.prompt },
        { role: "assistant", content: first.responseText },
        {
          role: "tool",
          content: payloadJson,
          toolCallId: call.id,
          name: call.name,
        },
      ],
    },
    turnOptions,
  );
  const after = await input.fingerprintProject();
  if (after !== before) {
    throw new NeutronN2Error(
      "validation-failed",
      "N2 loop must not mutate project files",
    );
  }
  const session: NeutronRuntimeSession = {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: input.sessionId,
    root: input.root,
    projectId: input.projectId,
    state: "completed",
    mutationAllowed: false,
    createdAt: input.createdAt ?? "2026-08-16T00:00:00.000Z",
  };
  return {
    session,
    adapter,
    tool: {
      schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
      invocation: {
        invocationId: call.id,
        toolName: call.name,
        root: input.root,
        sessionId: input.sessionId,
        argumentsJson: JSON.stringify({ root: input.root }),
        timeoutMs: 15_000,
      },
      result: {
        invocationId: call.id,
        ok: true,
        payloadJson,
        errorCode: null,
      },
    },
    responseText: second.responseText,
    projectFingerprintBefore: before,
    projectFingerprintAfter: after,
  };
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("invalid");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new NeutronN2Error(
      "validation-failed",
      "Tool arguments must be a JSON object",
    );
  }
}

function isReadOnlyTool(name: string): name is NeutronReadOnlyTool {
  return (NEUTRON_READ_ONLY_TOOLS as readonly string[]).includes(name);
}

function assertNotCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new NeutronN2Error("cancelled", "N2 loop was cancelled");
  }
}
