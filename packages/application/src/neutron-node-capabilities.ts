import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  type NeutronReadOnlyTool,
} from "../../protocol/src/neutron-runtime.js";

export interface ResolveNeutronNodeCapabilitiesInput {
  readonly sessionCapabilities: AgentRoleCapabilities;
  readonly nodeRequiredCapabilities: readonly string[];
  readonly parentRequiredCapabilities?: readonly string[];
  readonly profileAllowedTools?: readonly string[];
}

export interface ResolvedNeutronNodeCapabilities {
  readonly capabilities: AgentRoleCapabilities;
  readonly allowedTools: readonly NeutronReadOnlyTool[];
  readonly denyAllTools: boolean;
}

function catalogTools(): readonly NeutronReadOnlyTool[] {
  return NEUTRON_READ_ONLY_TOOLS;
}

function expandGrant(
  tools: readonly string[] | undefined,
): ReadonlySet<NeutronReadOnlyTool> {
  if (tools === undefined || tools.length === 0) {
    return new Set(catalogTools());
  }
  const granted = new Set<NeutronReadOnlyTool>();
  for (const tool of catalogTools()) {
    if (tools.includes(tool)) granted.add(tool);
  }
  return granted;
}

function intersectGrants(
  grants: ReadonlyArray<readonly string[] | undefined>,
): NeutronReadOnlyTool[] {
  let current = new Set(catalogTools());
  for (const grant of grants) {
    const next = expandGrant(grant);
    current = new Set(
      [...current].filter((tool) => next.has(tool)),
    ) as Set<NeutronReadOnlyTool>;
  }
  return catalogTools().filter((tool) => current.has(tool));
}

export function resolveNeutronNodeCapabilities(
  input: ResolveNeutronNodeCapabilitiesInput,
): ResolvedNeutronNodeCapabilities {
  const allowedTools = intersectGrants([
    input.sessionCapabilities.allowedTools,
    input.profileAllowedTools,
    input.parentRequiredCapabilities,
    input.nodeRequiredCapabilities,
  ]);
  const denyAllTools = allowedTools.length === 0;
  return {
    denyAllTools,
    allowedTools,
    capabilities: {
      readOnly: true,
      allowNetwork: false,
      allowedPaths: input.sessionCapabilities.allowedPaths,
      allowedTools,
      maxBudget: input.sessionCapabilities.maxBudget,
    },
  };
}
