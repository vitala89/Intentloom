import type {
  AssembleNeutronContextRequest,
  NeutronContextSourceType,
  NeutronDelegatedAgentRole,
  NeutronSkillLoadingLevel,
} from "../../protocol/src/neutron-runtime.js";
import { NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN } from "../../protocol/src/neutron-runtime.js";
import { nodeFileSystem, type FileSystem } from "./index.js";
import {
  assembleNeutronContext,
  type AssembleNeutronContextResult,
} from "./neutron-context-assembly.js";
import {
  estimatePromptTokens,
  formatNeutronContextPrompt,
} from "./neutron-n3-prompt-context.js";

export interface NeutronN2ContextAssemblyOptions {
  readonly contextQuery?: string;
  readonly taskId?: string;
  readonly profileName?: string;
  readonly role?: NeutronDelegatedAgentRole;
  readonly skillLevel?: NeutronSkillLoadingLevel;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly sourceTypes?: readonly NeutronContextSourceType[];
  readonly includeMemory?: boolean;
  readonly semanticRanking?: boolean;
  readonly fs?: FileSystem;
  readonly disableContextAssembly?: boolean;
}

export interface NeutronN2ContextHookResult {
  readonly modelPrompt: string;
  readonly assembly?: AssembleNeutronContextResult;
  readonly framingTokens: number;
  readonly modelInputTokensEstimate: number;
}

export async function prepareNeutronN2ModelPrompt(
  input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly prompt: string;
  } & NeutronN2ContextAssemblyOptions,
): Promise<NeutronN2ContextHookResult> {
  if (input.disableContextAssembly === true) {
    return {
      modelPrompt: input.prompt,
      framingTokens: 0,
      modelInputTokensEstimate: estimatePromptTokens(input.prompt),
    };
  }

  const assembly = await assembleNeutronContext(buildAssemblyRequest(input), {
    fs: input.fs ?? nodeFileSystem,
  });
  const modelPrompt = formatNeutronContextPrompt(
    input.prompt,
    assembly.projectionEntries,
  );
  const framingTokens = Math.max(
    0,
    estimatePromptTokens(modelPrompt) - assembly.usage.contextTokens,
  );
  return {
    modelPrompt,
    assembly,
    framingTokens,
    modelInputTokensEstimate: estimatePromptTokens(modelPrompt),
  };
}

function buildAssemblyRequest(
  input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly prompt: string;
  } & NeutronN2ContextAssemblyOptions,
): AssembleNeutronContextRequest {
  return {
    schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
    root: input.root,
    sessionId: input.sessionId,
    projectId: input.projectId,
    ...(input.contextQuery !== undefined ? { query: input.contextQuery } : {}),
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
  };
}
