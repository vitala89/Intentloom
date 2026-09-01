import {
  NEUTRON_READ_ONLY_TOOLS,
  type NeutronReadOnlyTool,
} from "../../protocol/src/neutron-runtime.js";
import { NeutronToolRouterError, auditFields } from "./neutron-tool-errors.js";
import type { NeutronToolInvocation } from "../../protocol/src/neutron-runtime.js";

export const NEUTRON_TOOL_DEFINITION_VERSION = 1 as const;
export const NEUTRON_TOOL_DEFAULT_TIMEOUT_MS = 15_000;
export const NEUTRON_TOOL_MAX_RESULT_BYTES = 262_144;

export interface NeutronInspectToolInput {
  readonly root: string;
}

export interface NeutronToolDefinition {
  readonly toolName: NeutronReadOnlyTool;
  readonly version: typeof NEUTRON_TOOL_DEFINITION_VERSION;
  readonly description: string;
  readonly readOnly: true;
  readonly requiredCapability: string;
  readonly requiresSession: true;
  readonly defaultTimeoutMs: number;
  readonly maxResultBytes: number;
  readonly parseInput: (
    invocation: NeutronToolInvocation,
    sessionRoot: string,
  ) => Record<string, unknown>;
}

function parseInspectInput(
  invocation: NeutronToolInvocation,
  sessionRoot: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(invocation.argumentsJson);
  } catch {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        "inspect",
        "invalid-input",
        "Tool arguments must be valid JSON",
      ),
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        "inspect",
        "invalid-input",
        "Tool arguments must be a JSON object",
      ),
    );
  }
  const args = parsed as Record<string, unknown>;
  if (typeof args.root !== "string" || args.root.length === 0) {
    throw new NeutronToolRouterError(
      "validation-failed",
      auditFields(
        invocation,
        "inspect",
        "invalid-input",
        "inspect requires a non-empty root",
      ),
    );
  }
  if (args.root !== sessionRoot) {
    throw new NeutronToolRouterError(
      "root-mismatch",
      auditFields(
        invocation,
        "inspect",
        "out-of-root",
        "Tool root must match the selected project",
      ),
    );
  }
  if (args.root.includes("..")) {
    throw new NeutronToolRouterError(
      "root-mismatch",
      auditFields(
        invocation,
        "inspect",
        "path-traversal",
        "Tool root must not contain path traversal",
      ),
    );
  }
  return { root: sessionRoot };
}

const INSPECT_TOOL: NeutronToolDefinition = {
  toolName: "inspect",
  version: NEUTRON_TOOL_DEFINITION_VERSION,
  description: "Read-only project inspection",
  readOnly: true,
  requiredCapability: "inspect",
  requiresSession: true,
  defaultTimeoutMs: NEUTRON_TOOL_DEFAULT_TIMEOUT_MS,
  maxResultBytes: NEUTRON_TOOL_MAX_RESULT_BYTES,
  parseInput: parseInspectInput,
};

const REGISTERED_TOOLS = new Map<NeutronReadOnlyTool, NeutronToolDefinition>([
  ["inspect", INSPECT_TOOL],
]);

export function listRegisteredNeutronTools(): readonly NeutronToolDefinition[] {
  return [...REGISTERED_TOOLS.values()];
}

export function resolveNeutronToolDefinition(
  toolName: string,
): NeutronToolDefinition | undefined {
  if (!(NEUTRON_READ_ONLY_TOOLS as readonly string[]).includes(toolName)) {
    return undefined;
  }
  return REGISTERED_TOOLS.get(toolName as NeutronReadOnlyTool);
}

export function requireNeutronToolDefinition(
  invocation: NeutronToolInvocation,
): NeutronToolDefinition {
  const definition = resolveNeutronToolDefinition(invocation.toolName);
  if (definition === undefined) {
    throw new NeutronToolRouterError(
      "unsupported-tool",
      auditFields(
        invocation,
        invocation.toolName,
        "unsupported-tool",
        `Unsupported Neutron tool ${invocation.toolName}`,
      ),
    );
  }
  return definition;
}
