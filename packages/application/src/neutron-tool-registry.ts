import {
  NEUTRON_READ_ONLY_TOOLS,
  type NeutronReadOnlyTool,
  type NeutronToolInvocation,
} from "../../protocol/src/neutron-runtime.js";
import { NeutronToolRouterError, auditFields } from "./neutron-tool-errors.js";
import { GOVERNANCE_TOOL_DEFINITIONS } from "./neutron-tool-definitions-governance.js";
import { PROJECT_TOOL_DEFINITIONS } from "./neutron-tool-definitions-project.js";
import {
  NEUTRON_TOOL_MAX_RESULT_BYTES,
  type NeutronToolDefinition,
} from "./neutron-tool-input.js";

export {
  NEUTRON_TOOL_DEFINITION_VERSION,
  NEUTRON_TOOL_DEFAULT_TIMEOUT_MS,
  NEUTRON_TOOL_MAX_RESULT_BYTES,
  type NeutronToolDefinition,
} from "./neutron-tool-input.js";

const REGISTERED_TOOLS = new Map<NeutronReadOnlyTool, NeutronToolDefinition>(
  [...PROJECT_TOOL_DEFINITIONS, ...GOVERNANCE_TOOL_DEFINITIONS].map((tool) => [
    tool.toolName,
    tool,
  ]),
);

export function listRegisteredNeutronTools(): readonly NeutronToolDefinition[] {
  return NEUTRON_READ_ONLY_TOOLS.map((name) =>
    REGISTERED_TOOLS.get(name),
  ).filter((tool): tool is NeutronToolDefinition => tool !== undefined);
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

export function neutronToolAdapterDescriptors(): readonly {
  readonly name: NeutronReadOnlyTool;
  readonly description: string;
  readonly parametersSchema: Record<string, unknown>;
}[] {
  return listRegisteredNeutronTools().map((tool) => ({
    name: tool.toolName,
    description: tool.description,
    parametersSchema: {
      type: "object",
      properties: { root: { type: "string" } },
      required: ["root"],
    },
  }));
}
