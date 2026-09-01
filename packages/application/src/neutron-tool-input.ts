import type {
  NeutronReadOnlyTool,
  NeutronRuntimeSession,
  NeutronToolInvocation,
} from "../../protocol/src/neutron-runtime.js";
import { NeutronToolRouterError, auditFields } from "./neutron-tool-errors.js";

export const NEUTRON_TOOL_DEFINITION_VERSION = 1 as const;
export const NEUTRON_TOOL_DEFAULT_TIMEOUT_MS = 15_000;
export const NEUTRON_TOOL_MAX_RESULT_BYTES = 262_144;
export const NEUTRON_TOOL_MAX_MEMORY_ITEMS = 20;
export const NEUTRON_TOOL_MAX_TIMELINE_EVENTS = 100;
export const NEUTRON_TOOL_MAX_DIFF_CHANGES = 100;
export const NEUTRON_TOOL_MAX_FINDINGS = 50;

const MUTATION_FLAGS = [
  "fix",
  "apply",
  "repair",
  "write",
  "remediate",
  "mutate",
  "shell",
] as const;

export type NeutronToolDispatch = (
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
) => Promise<unknown>;

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
    session: NeutronRuntimeSession,
  ) => Record<string, unknown>;
}

export function parseArgumentObject(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(invocation.argumentsJson);
  } catch {
    throw fail(
      invocation,
      toolName,
      "invalid-input",
      "Tool arguments must be valid JSON",
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw fail(
      invocation,
      toolName,
      "invalid-input",
      "Tool arguments must be a JSON object",
    );
  }
  return parsed as Record<string, unknown>;
}

export function rejectMutationFlags(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
): void {
  for (const flag of MUTATION_FLAGS) {
    if (args[flag] === true) {
      throw fail(
        invocation,
        toolName,
        "mutation-forbidden",
        `${toolName} is read-only and rejects ${flag}`,
      );
    }
  }
}

export function trustedRoot(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
  sessionRoot: string,
): string {
  if (typeof args.root !== "string" || args.root.length === 0) {
    throw fail(
      invocation,
      toolName,
      "invalid-input",
      `${toolName} requires a non-empty root`,
    );
  }
  if (args.root !== sessionRoot) {
    throw fail(
      invocation,
      toolName,
      "out-of-root",
      "Tool root must match the selected project",
      "root-mismatch",
    );
  }
  if (args.root.includes("..")) {
    throw fail(
      invocation,
      toolName,
      "path-traversal",
      "Tool root must not contain path traversal",
      "root-mismatch",
    );
  }
  return sessionRoot;
}

export function optionalBoundedInt(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
  field: string,
  max: number,
): number | undefined {
  if (!(field in args) || args[field] === undefined) return undefined;
  const value = args[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw fail(
      invocation,
      toolName,
      "invalid-input",
      `${field} must be a positive integer`,
    );
  }
  return Math.min(value, max);
}

export function requireNonEmptyString(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
  args: Record<string, unknown>,
  field: string,
): string {
  const value = args[field];
  if (typeof value !== "string" || value.length === 0) {
    throw fail(
      invocation,
      toolName,
      "invalid-input",
      `${toolName} requires a non-empty ${field}`,
    );
  }
  return value;
}

export function fail(
  invocation: NeutronToolInvocation,
  toolName: NeutronReadOnlyTool,
  denialClass: string,
  reason: string,
  code: "validation-failed" | "root-mismatch" = "validation-failed",
): NeutronToolRouterError {
  return new NeutronToolRouterError(
    code,
    auditFields(invocation, toolName, denialClass, reason),
  );
}

export function definition(
  toolName: NeutronReadOnlyTool,
  description: string,
  parseInput: NeutronToolDefinition["parseInput"],
): NeutronToolDefinition {
  return {
    toolName,
    version: NEUTRON_TOOL_DEFINITION_VERSION,
    description,
    readOnly: true,
    requiredCapability: toolName,
    requiresSession: true,
    defaultTimeoutMs: NEUTRON_TOOL_DEFAULT_TIMEOUT_MS,
    maxResultBytes: NEUTRON_TOOL_MAX_RESULT_BYTES,
    parseInput,
  };
}
