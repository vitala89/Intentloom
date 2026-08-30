import type {
  NeutronContextSource,
  NeutronSkillLoadingLevel,
} from "../../protocol/src/neutron-runtime.js";

export const N3_DEFAULT_MAX_TOKENS = 4000;
export const N3_DEFAULT_MAX_ITEMS = 20;
export const N3_DEFAULT_SKILL_LEVEL = "catalog" as const;
export const N3_POLICY_RESERVED_RATIO = 0.25;
export const N3_OWNERSHIP_RESERVED_RATIO = 0.1;
export const N3_COLLECTOR_MAX_TOKENS = 1_000_000;
export const N3_COLLECTOR_MAX_ITEMS = 10_000;

export const N3_PRIORITY = {
  policy: 1,
  ownership: 2,
  profile: 3,
  task: 4,
  skill: 5,
  bounded: 6,
  memory: 7,
  semantic: 8,
} as const;

export type AssemblyClass =
  "policy" | "ownership" | "skill" | "bounded" | "deferred";

export interface AssemblyCandidate {
  readonly sourceId: string;
  readonly kind: NeutronContextSource["kind"];
  readonly trustClass: NeutronContextSource["trustClass"];
  readonly provenance: string;
  readonly tokenCost: number;
  readonly priority: number;
  readonly sourceClass: AssemblyClass;
  readonly path?: string;
  readonly contentDigest?: string;
  readonly loadingLevel?: NeutronSkillLoadingLevel;
  readonly exclusionReason?: string;
}

export interface BudgetAllocation {
  readonly included: readonly AssemblyCandidate[];
  readonly excluded: readonly AssemblyCandidate[];
  readonly usedTokens: number;
  readonly limitExceeded: boolean;
}

export function compareAssemblyCandidates(
  left: AssemblyCandidate,
  right: AssemblyCandidate,
): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  const leftKey = left.path ?? left.sourceId;
  const rightKey = right.path ?? right.sourceId;
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  if (left.sourceId < right.sourceId) return -1;
  if (left.sourceId > right.sourceId) return 1;
  return 0;
}

export function allocateContextBudget(
  candidates: readonly AssemblyCandidate[],
  maxTokens: number,
  maxItems: number,
): BudgetAllocation {
  const preExcluded = candidates.filter((item) => item.exclusionReason);
  const open = candidates
    .filter((item) => item.exclusionReason === undefined)
    .slice()
    .sort(compareAssemblyCandidates);
  const included: AssemblyCandidate[] = [];
  const excluded: AssemblyCandidate[] = [...preExcluded];
  let usedTokens = 0;

  for (const candidate of open) {
    if (included.length >= maxItems) {
      excluded.push({ ...candidate, exclusionReason: "item-budget" });
      continue;
    }
    if (usedTokens + candidate.tokenCost > maxTokens) {
      excluded.push({ ...candidate, exclusionReason: "token-budget" });
      continue;
    }
    included.push(candidate);
    usedTokens += candidate.tokenCost;
  }

  return {
    included,
    excluded: excluded.slice().sort(compareAssemblyCandidates),
    usedTokens,
    limitExceeded: excluded.some(
      (item) =>
        item.exclusionReason === "token-budget" ||
        item.exclusionReason === "item-budget",
    ),
  };
}
