import { checksum, normalizeStoredPath } from "@intentloom/core";
import type {
  ContextSource,
  ContextSourceType,
  SkillCatalogMetadata,
  SkillDiscoveryDecision,
  SkillExecutionContract,
  SkillProcedure,
  TrustClass,
} from "@intentloom/protocol";
import type {
  AssembleNeutronContextRequest,
  NeutronContextSource,
  NeutronSkillLoadingLevel,
} from "../../protocol/src/neutron-runtime.js";
import {
  discoverSkills,
  getBoundedProjectContext,
  type FileSystem,
} from "./index.js";
import {
  N3_COLLECTOR_MAX_ITEMS,
  N3_COLLECTOR_MAX_TOKENS,
  N3_DEFAULT_SKILL_LEVEL,
  N3_PRIORITY,
  type AssemblyCandidate,
} from "./neutron-context-budget.js";

export const N3_PROVENANCE_BOUNDED = "intentloom.context.bounded.v1";
export const N3_PROVENANCE_SKILL = "intentloom.skill.discovery.v1";
export const N3_PROVENANCE_DEFERRED = "intentloom.n3.deferred.v1";

export const N3_WARNING_SEMANTIC =
  "semantic ranking deferred; using deterministic local order";
export const N3_WARNING_EMPTY_SKILLS = "no skills selected";
export const N3_WARNING_EMPTY_CONTEXT = "no included context sources";
export const N3_WARNING_BUDGET = "context budget exhausted";
export const N3_WARNING_SECRETS = "secret-like paths excluded";

const POLICY_TYPES = new Set<ContextSourceType>(["intent", "adr"]);
const OWNERSHIP_TYPES = new Set<ContextSourceType>(["ownership"]);

export interface CollectionResult {
  readonly candidates: readonly AssemblyCandidate[];
  readonly excludedSecretCount: number;
  readonly warnings: readonly string[];
}

export function memoryRequested(
  request: AssembleNeutronContextRequest,
): boolean {
  if (request.includeMemory === false) return false;
  if (request.includeMemory === true) return true;
  return request.query !== undefined || request.taskId !== undefined;
}

export async function collectSlice2Candidates(
  request: AssembleNeutronContextRequest,
  fs: FileSystem,
): Promise<CollectionResult> {
  const skillLevel = request.skillLevel ?? N3_DEFAULT_SKILL_LEVEL;
  const warnings: string[] = [];
  const bounded = await getBoundedProjectContext(
    {
      schemaVersion: "1",
      ...(request.query !== undefined ? { query: request.query } : {}),
      ...(request.sourceTypes !== undefined
        ? { sourceTypes: [...request.sourceTypes] }
        : {}),
      maxTokens: N3_COLLECTOR_MAX_TOKENS,
      maxItems: N3_COLLECTOR_MAX_ITEMS,
    },
    { root: request.root },
    fs,
  );
  const skills = await discoverSkills(
    {
      root: request.root,
      level: skillLevel,
      ...(request.query !== undefined ? { query: request.query } : {}),
      ...(request.role !== undefined ? { role: request.role } : {}),
    },
    fs,
  );

  const candidates: AssemblyCandidate[] = [
    ...bounded.items.map((item) => mapBoundedItem(item)),
    ...skills.skills.map((skill) => mapSkill(skill, skillLevel)),
    ...skills.decisions
      .filter((decision) => decision.status !== "selected")
      .map((decision) => mapSkillDecision(decision, skillLevel)),
    ...deferredSemantic(request),
  ];

  if (request.semanticRanking === true) warnings.push(N3_WARNING_SEMANTIC);
  if (skills.skills.length === 0) warnings.push(N3_WARNING_EMPTY_SKILLS);
  if (bounded.excludedPathsCount > 0) warnings.push(N3_WARNING_SECRETS);

  return {
    candidates,
    excludedSecretCount: bounded.excludedPathsCount,
    warnings,
  };
}

function mapBoundedItem(item: ContextSource): AssemblyCandidate {
  const sourceClass = POLICY_TYPES.has(item.type)
    ? "policy"
    : OWNERSHIP_TYPES.has(item.type)
      ? "ownership"
      : "bounded";
  const path = safePath(item.path);
  return {
    sourceId: item.id,
    kind: boundedKind(item.type),
    trustClass: mapBoundedTrust(item.type, item.trustClass),
    provenance: N3_PROVENANCE_BOUNDED,
    tokenCost: item.tokenCount,
    priority:
      sourceClass === "policy"
        ? N3_PRIORITY.policy
        : sourceClass === "ownership"
          ? N3_PRIORITY.ownership
          : N3_PRIORITY.bounded,
    sourceClass,
    excerpt: item.summary,
    ...(path !== undefined ? { path } : {}),
    contentDigest: digestBytes(item.summary),
  };
}

function mapSkill(
  skill: SkillCatalogMetadata | SkillExecutionContract | SkillProcedure,
  loadingLevel: NeutronSkillLoadingLevel,
): AssemblyCandidate {
  const tokenCost =
    loadingLevel === "catalog"
      ? skill.contextCost.catalogCost
      : loadingLevel === "contract"
        ? skill.contextCost.contractCost
        : skill.contextCost.procedureCost;
  const excerpt = `${skill.id}\n${skill.description}`;
  return {
    sourceId: `skill:${skill.id}`,
    kind: "skill",
    trustClass: mapSkillTrust(skill.trustClass),
    provenance: N3_PROVENANCE_SKILL,
    tokenCost,
    priority: N3_PRIORITY.skill,
    sourceClass: "skill",
    excerpt,
    contentDigest: digestBytes(excerpt),
    loadingLevel,
  };
}

function mapSkillDecision(
  decision: SkillDiscoveryDecision,
  loadingLevel: NeutronSkillLoadingLevel,
): AssemblyCandidate {
  return {
    sourceId: `skill:${decision.skillId}`,
    kind: "skill",
    trustClass: "catalog",
    provenance: N3_PROVENANCE_SKILL,
    tokenCost: 0,
    priority: N3_PRIORITY.skill,
    sourceClass: "skill",
    loadingLevel,
    exclusionReason:
      decision.status === "unavailable" ? "skill-unavailable" : "skill-filter",
  };
}

function deferredSemantic(
  request: AssembleNeutronContextRequest,
): AssemblyCandidate[] {
  if (request.semanticRanking !== true) return [];
  return [
    {
      sourceId: "deferred:semantic",
      kind: "inspect",
      trustClass: "derived",
      provenance: N3_PROVENANCE_DEFERRED,
      tokenCost: 0,
      priority: N3_PRIORITY.semantic,
      sourceClass: "deferred",
      exclusionReason: "deferred",
    },
  ];
}

function boundedKind(type: ContextSourceType): NeutronContextSource["kind"] {
  if (type === "intent" || type === "adr" || type === "ownership") {
    return "policy";
  }
  if (type === "evidence") return "evidence";
  return "inspect";
}

function mapBoundedTrust(
  type: ContextSourceType,
  trust: TrustClass,
): NeutronContextSource["trustClass"] {
  if (trust === "user-supplied") return "user";
  if (trust === "agent-generated") return "derived";
  if (type === "intent" || type === "adr" || type === "ownership") {
    return "project";
  }
  return "project";
}

function mapSkillTrust(trust: TrustClass): NeutronContextSource["trustClass"] {
  if (trust === "user-supplied") return "user";
  if (trust === "agent-generated") return "derived";
  return "catalog";
}

function safePath(path: string): string | undefined {
  try {
    return normalizeStoredPath(path);
  } catch {
    return undefined;
  }
}

function digestBytes(excerpt: string): string {
  return `sha256:${checksum(excerpt)}`;
}
