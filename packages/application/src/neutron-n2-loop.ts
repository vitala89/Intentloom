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
import { neutronToolAdapterDescriptors } from "./neutron-tool-registry.js";
import {
  NEUTRON_N2_MAX_BODY_BYTES,
  NeutronN2Error,
  validateNeutronN2AdapterCapability,
} from "../../validator/src/neutron-runtime-n2.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { AssembleNeutronContextResult } from "./neutron-context-assembly.js";
import {
  prepareNeutronN2ModelPrompt,
  type NeutronN2ContextAssemblyOptions,
} from "./neutron-n2-context-hook.js";

const inFlightSessions = new Set<string>();

function neutronN2InFlightKey(sessionId: string, taskId?: string): string {
  return taskId === undefined || taskId.length === 0
    ? sessionId
    : `${sessionId}\u001f${taskId}`;
}

export interface NeutronN2ToolRunner {
  (
    toolName: NeutronReadOnlyTool,
    args: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface RunNeutronN2ReadOnlyLoopInput extends NeutronN2ContextAssemblyOptions {
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
  readonly modelPrompt: string;
  readonly contextAssembly?: AssembleNeutronContextResult;
  readonly contextFramingTokens: number;
  readonly modelInputTokensEstimate: number;
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
  const inFlightKey = neutronN2InFlightKey(input.sessionId, input.taskId);
  if (inFlightSessions.has(inFlightKey)) {
    throw new NeutronN2Error(
      "validation-failed",
      "N2 allows one in-flight turn per session task",
    );
  }
  inFlightSessions.add(inFlightKey);
  try {
    return await executeLoop(input);
  } finally {
    inFlightSessions.delete(inFlightKey);
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
  const prepared = await prepareNeutronN2ModelPrompt({
    root: input.root,
    sessionId: input.sessionId,
    projectId: input.projectId,
    prompt: input.prompt,
    ...(input.contextQuery !== undefined
      ? { contextQuery: input.contextQuery }
      : {}),
    ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
    ...(input.profileName !== undefined
      ? { profileName: input.profileName }
      : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.skillLevel !== undefined ? { skillLevel: input.skillLevel } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
    ...(input.sourceTypes !== undefined
      ? { sourceTypes: input.sourceTypes }
      : {}),
    ...(input.includeMemory !== undefined
      ? { includeMemory: input.includeMemory }
      : {}),
    ...(input.semanticRanking !== undefined
      ? { semanticRanking: input.semanticRanking }
      : {}),
    ...(input.fs !== undefined ? { fs: input.fs } : {}),
    ...(input.disableContextAssembly !== undefined
      ? { disableContextAssembly: input.disableContextAssembly }
      : {}),
  });
  const modelPrompt = prepared.modelPrompt;
  const turnOptions =
    input.signal === undefined ? {} : { signal: input.signal };
  const first = await input.adapter.executeTurn(
    {
      schemaVersion: 1,
      sessionId: input.sessionId,
      messages: [{ role: "user", content: modelPrompt }],
      tools: [...neutronToolAdapterDescriptors()],
    },
    turnOptions,
  );
  const call = first.toolCalls[0];
  if (call === undefined) {
    throw new NeutronN2Error(
      "validation-failed",
      "N2 loop requires a registered read-only tool call",
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
        { role: "user", content: modelPrompt },
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
    modelPrompt,
    ...(prepared.assembly !== undefined
      ? { contextAssembly: prepared.assembly }
      : {}),
    contextFramingTokens: prepared.framingTokens,
    modelInputTokensEstimate: prepared.modelInputTokensEstimate,
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
