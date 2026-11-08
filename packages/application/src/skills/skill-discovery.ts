import { relative } from "node:path";
import type {
  SkillCatalogMetadata,
  SkillDiscoveryDecision,
  SkillDiscoveryResult,
  SkillExecutionContract,
  SkillLoadingLevel,
  SkillProcedure,
  TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { parseSkillProgressive } from "./skill-progressive-parse.js";

export async function discoverSkills(
  options: {
    root: string;
    catalogRoot?: string;
    level?: SkillLoadingLevel;
    pack?: string;
    role?: string;
    query?: string;
    trustClass?: TrustClass;
    maxBudget?: number;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillDiscoveryResult> {
  const level: SkillLoadingLevel = options.level ?? "catalog";

  const allFiles = await fs.list(options.root);
  const skillMap = new Map<string, string>();

  for (const rawPath of allFiles) {
    const rel = rawPath.startsWith(options.root)
      ? relative(options.root, rawPath)
      : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    const match = /(?:catalog\/)?skills\/([^/]+)\/SKILL\.md$/u.exec(normalized);
    if (match?.[1]) {
      const fullPath = rawPath.startsWith(options.root)
        ? rawPath
        : inside(options.root, normalized);
      skillMap.set(match[1], fullPath);
    }
  }

  const selectedSkills: (
    SkillCatalogMetadata | SkillExecutionContract | SkillProcedure
  )[] = [];
  const decisions: SkillDiscoveryDecision[] = [];

  let accumulatedBudget = 0;
  let eagerBudget = 0;

  const sortedSkillIds = [...skillMap.keys()].sort();

  for (const skillId of sortedSkillIds) {
    const filePath = skillMap.get(skillId)!;
    try {
      const content = await fs.read(filePath);
      const progressive = parseSkillProgressive(skillId, content);
      const meta = progressive.catalog;

      if (
        options.trustClass !== undefined &&
        meta.trustClass !== options.trustClass
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Trust class ${meta.trustClass} does not match ${options.trustClass}`,
        });
        continue;
      }

      if (
        options.pack !== undefined &&
        !meta.packs.includes(options.pack) &&
        !meta.packs.includes("all")
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Skill pack does not match requested pack: ${options.pack}`,
        });
        continue;
      }

      if (
        options.role !== undefined &&
        !meta.roles.includes(options.role) &&
        !meta.roles.includes("engineer")
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Skill role does not match requested role: ${options.role}`,
        });
        continue;
      }

      if (options.query !== undefined) {
        const q = options.query.toLowerCase();
        const matches =
          meta.id.toLowerCase().includes(q) ||
          meta.name.toLowerCase().includes(q) ||
          meta.description.toLowerCase().includes(q) ||
          meta.capabilities.some((c) => c.toLowerCase().includes(q));
        if (!matches) {
          decisions.push({
            skillId,
            status: "rejected",
            reason: `Skill metadata does not match query: ${options.query}`,
          });
          continue;
        }
      }

      const costAtLevel =
        level === "catalog"
          ? meta.contextCost.catalogCost
          : level === "contract"
            ? meta.contextCost.contractCost
            : meta.contextCost.procedureCost;

      if (
        options.maxBudget !== undefined &&
        accumulatedBudget + costAtLevel > options.maxBudget
      ) {
        decisions.push({
          skillId,
          status: "incompatible",
          reason: `Exceeds remaining context budget constraint of ${options.maxBudget}`,
        });
        continue;
      }

      accumulatedBudget += costAtLevel;
      eagerBudget += meta.contextCost.procedureCost;

      const chosenSkill =
        level === "catalog"
          ? progressive.catalog
          : level === "contract"
            ? progressive.contract
            : progressive.procedure;

      selectedSkills.push(chosenSkill);
      decisions.push({
        skillId,
        status: "selected",
        reason: `Selected at level ${level}`,
      });
    } catch (error) {
      decisions.push({
        skillId,
        status: "unavailable",
        reason: `Failed to parse skill: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const budgetSavingsPercentage =
    eagerBudget > 0
      ? Math.round(((eagerBudget - accumulatedBudget) / eagerBudget) * 100)
      : 0;

  return {
    level,
    totalBudgetEstimate: accumulatedBudget,
    eagerBudgetEstimate: eagerBudget,
    budgetSavingsPercentage,
    skills: selectedSkills,
    decisions,
  };
}

export async function getSkillAtLevel(
  id: string,
  level: SkillLoadingLevel,
  options: { root: string; catalogRoot?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<
  SkillCatalogMetadata | SkillExecutionContract | SkillProcedure | null
> {
  const catalogDir = options.catalogRoot ?? inside(options.root, "catalog");
  const filePath = inside(catalogDir, `skills/${id}/SKILL.md`);

  let content: string | null = null;
  if (await fs.exists(filePath)) {
    content = await fs.read(filePath);
  } else {
    const fallbackPath = inside(options.root, `skills/${id}/SKILL.md`);
    if (await fs.exists(fallbackPath)) {
      content = await fs.read(fallbackPath);
    }
  }
  if (!content) return null;

  try {
    const progressive = parseSkillProgressive(id, content);
    if (level === "catalog") return progressive.catalog;
    if (level === "contract") return progressive.contract;
    return progressive.procedure;
  } catch {
    return null;
  }
}
