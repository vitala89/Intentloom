import {
  NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
  NEUTRON_USAGE_BUDGET_SCHEMA_URN,
  type NeutronContextBundle,
  type NeutronContextSource,
  type NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import {
  validateAssembleNeutronContextRequest,
  validateNeutronContextBundle,
  validateNeutronUsageBudget,
} from "../../validator/src/neutron-runtime.js";
import { nodeFileSystem, type FileSystem } from "./index.js";
import {
  allocateContextBudget,
  compareAssemblyCandidates,
  N3_DEFAULT_MAX_ITEMS,
  N3_DEFAULT_MAX_TOKENS,
  type AssemblyCandidate,
} from "./neutron-context-budget.js";
import {
  collectSlice2Candidates,
  N3_WARNING_BUDGET,
  N3_WARNING_EMPTY_CONTEXT,
} from "./neutron-context-collectors.js";
import { collectSlice3StateCandidates } from "./neutron-context-state-collectors.js";

export {
  N3_DEFAULT_MAX_ITEMS,
  N3_DEFAULT_MAX_TOKENS,
  N3_DEFAULT_SKILL_LEVEL,
  N3_OWNERSHIP_RESERVED_RATIO,
  N3_POLICY_RESERVED_RATIO,
} from "./neutron-context-budget.js";
export {
  N3_WARNING_BUDGET,
  N3_WARNING_EMPTY_CONTEXT,
  N3_WARNING_EMPTY_SKILLS,
  N3_WARNING_SECRETS,
  N3_WARNING_SEMANTIC,
} from "./neutron-context-collectors.js";
export {
  N3_PROVENANCE_MEMORY,
  N3_PROVENANCE_PROFILE,
  N3_PROVENANCE_TASK_CHECKPOINT,
  N3_PROVENANCE_TASK_SUMMARY,
  N3_WARNING_MEMORY_EMPTY,
  N3_WARNING_TASK_CHECKPOINT,
  N3_WARNING_TASK_SUMMARY,
  profileNotFoundError,
  roleNotAllowedError,
} from "./neutron-context-state-collectors.js";

export interface AssembleNeutronContextOptions {
  readonly fs?: FileSystem;
}

export interface AssembleNeutronContextResult {
  readonly bundle: NeutronContextBundle;
  readonly usage: NeutronUsageBudget;
  readonly warnings: readonly string[];
}

export async function assembleNeutronContext(
  requestInput: unknown,
  options: AssembleNeutronContextOptions = {},
): Promise<AssembleNeutronContextResult> {
  const request = validateAssembleNeutronContextRequest(requestInput);
  const fs = options.fs ?? nodeFileSystem;
  const maxTokens = request.maxTokens ?? N3_DEFAULT_MAX_TOKENS;
  const maxItems = request.maxItems ?? N3_DEFAULT_MAX_ITEMS;
  const slice2 = await collectSlice2Candidates(request, fs);
  const slice3 = await collectSlice3StateCandidates(request, fs);
  const allocation = allocateContextBudget(
    [...slice2.candidates, ...slice3.candidates],
    maxTokens,
    maxItems,
  );
  const sources = [...allocation.included, ...allocation.excluded]
    .slice()
    .sort(compareAssemblyCandidates)
    .map((candidate) => toSource(candidate));
  const estimatedTokens = allocation.usedTokens;
  const warnings = [...slice3.warnings, ...slice2.warnings];
  if (allocation.included.length === 0) {
    warnings.push(N3_WARNING_EMPTY_CONTEXT);
  }
  if (allocation.limitExceeded) warnings.push(N3_WARNING_BUDGET);

  const bundle = validateNeutronContextBundle({
    schemaVersion: NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
    root: request.root,
    sessionId: request.sessionId,
    estimatedTokens,
    sources,
    excludedSecretLikePaths: [],
  });
  const usage = validateNeutronUsageBudget({
    schemaVersion: NEUTRON_USAGE_BUDGET_SCHEMA_URN,
    sessionId: request.sessionId,
    inputTokens: 0,
    outputTokens: 0,
    contextTokens: estimatedTokens,
    tokenBudget: maxTokens,
    limitExceeded: allocation.limitExceeded,
  });

  return { bundle, usage, warnings: uniqueStable(warnings) };
}

function toSource(candidate: AssemblyCandidate): NeutronContextSource {
  return {
    sourceId: candidate.sourceId,
    kind: candidate.kind,
    trustClass: candidate.trustClass,
    provenance: candidate.provenance,
    included: candidate.exclusionReason === undefined,
    ...(candidate.exclusionReason !== undefined
      ? { exclusionReason: candidate.exclusionReason }
      : {}),
    ...(candidate.path !== undefined ? { path: candidate.path } : {}),
    ...(candidate.contentDigest !== undefined
      ? { contentDigest: candidate.contentDigest }
      : {}),
    ...(candidate.loadingLevel !== undefined
      ? { loadingLevel: candidate.loadingLevel }
      : {}),
  };
}

function uniqueStable(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
