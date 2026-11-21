import { dirname } from "node:path";
import {
  validateSemanticRankingConfig,
  validateSemanticRankResult,
  type SemanticRankingConfig,
  type SemanticRankingProvider,
  type SemanticRankItem,
  type SemanticRankResult,
  type SkillEvaluationResult,
  type SkillProposal,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { listSkillEvaluations } from "../skills/skill-evaluation.js";
import { listSkillProposals } from "../skills/skill-proposal-store.js";

export async function getSemanticRankingConfig(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankingConfig> {
  const path = inside(options.root, ".aif/memory/semantic_config.json");
  if (!(await fs.exists(path))) {
    return {
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    };
  }
  try {
    const content = await fs.read(path);
    return validateSemanticRankingConfig(JSON.parse(content));
  } catch {
    return {
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    };
  }
}

export async function updateSemanticRankingConfig(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankingConfig> {
  const rankingConfig = validateSemanticRankingConfig(input);
  const path = inside(options.root, ".aif/memory/semantic_config.json");
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(rankingConfig, null, 2)}\n`);
  return rankingConfig;
}

function normalizeSemanticQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/u)
    .filter((term) => term.length > 0);
}

function scoreSemanticProposalItems(
  proposals: readonly SkillProposal[],
  queryTerms: string[],
): SemanticRankItem[] {
  const items: SemanticRankItem[] = [];
  for (const proposal of proposals) {
    let score = 0;
    const text =
      `${proposal.name} ${proposal.observedPattern} ${proposal.content}`.toLowerCase();
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 0.5;
      }
    }
    if (score > 0) {
      items.push({
        id: proposal.id,
        type: "proposal",
        score: Math.min(score, 1.0),
        relevanceReason: `Matched terms in proposal ${proposal.name}`,
        record: {
          id: proposal.id,
          name: proposal.name,
          state: proposal.state,
          confidence: proposal.confidence,
        },
      });
    }
  }
  return items;
}

function scoreSemanticEvaluationItems(
  evaluations: readonly SkillEvaluationResult[],
  queryTerms: string[],
): SemanticRankItem[] {
  const items: SemanticRankItem[] = [];
  for (const evaluation of evaluations) {
    let score = 0;
    const text =
      `${evaluation.skillId} ${evaluation.outcome} ${evaluation.details.join(" ")}`.toLowerCase();
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 0.4;
      }
    }
    if (score > 0) {
      items.push({
        id: evaluation.id,
        type: "evidence",
        score: Math.min(score, 1.0),
        relevanceReason: `Matched evaluation outcome ${evaluation.outcome} for ${evaluation.skillId}`,
        record: {
          id: evaluation.id,
          skillId: evaluation.skillId,
          outcome: evaluation.outcome,
          passed: evaluation.passed,
        },
      });
    }
  }
  return items;
}

export async function rankProceduralMemory(
  query: string,
  options: {
    root: string;
    provider?: SemanticRankingProvider;
    enabled?: boolean;
    maxResults?: number;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankResult> {
  const startTime = Date.now();
  const currentConfig = await getSemanticRankingConfig(options, fs);
  const enabled = options.enabled ?? currentConfig.enabled ?? true;
  const provider = options.provider ?? currentConfig.provider ?? "local-tf-idf";

  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);
  const queryTerms = normalizeSemanticQueryTerms(query);

  const items: SemanticRankItem[] = [
    ...scoreSemanticProposalItems(proposals, queryTerms),
    ...scoreSemanticEvaluationItems(evaluations, queryTerms),
  ];

  items.sort((left, right) => right.score - left.score);
  const maxResults = options.maxResults ?? 10;
  const slicedItems = items.slice(0, maxResults);

  return validateSemanticRankResult({
    schemaVersion: "1",
    query,
    items: slicedItems,
    rankingLatencyMs: Date.now() - startTime,
    provider,
    enabled,
  });
}
