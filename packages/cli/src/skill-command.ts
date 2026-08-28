import { cwd } from "node:process";
import {
  discoverSkills,
  nodeFileSystem,
  type FileSystem,
  type SkillLoadingLevel,
  type TrustClass,
} from "@intentloom/application";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseSkillArguments } from "./skill-parse.js";

export type SkillCliExitCode = 0 | 2;

export interface SkillCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface SkillCliDependencies {
  readonly catalogRoot?: string;
  readonly fileSystem?: FileSystem;
}

export async function runSkillCommand(
  args: readonly string[],
  dependencies: SkillCliDependencies,
  io: SkillCliIo,
): Promise<SkillCliExitCode> {
  const parsed = parseSkillArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

  if (subcommand === "discover") {
    const rawLevel = parsed.values.get("--level");
    if (
      rawLevel !== undefined &&
      !["catalog", "contract", "procedure"].includes(rawLevel)
    ) {
      throw new CliUsageError(
        "--level must be catalog, contract, or procedure",
      );
    }
    const level = (rawLevel as SkillLoadingLevel | undefined) ?? "catalog";
    const pack = parsed.values.get("--pack");
    const role = parsed.values.get("--role");
    const query = parsed.values.get("--query");
    const rawTrust = parsed.values.get("--trust-class");
    const trustClass = rawTrust as TrustClass | undefined;
    const rawBudget = parsed.values.get("--max-budget");
    const maxBudget = rawBudget ? parseInt(rawBudget, 10) : undefined;

    const result = await discoverSkills(
      {
        root,
        ...(dependencies.catalogRoot !== undefined
          ? { catalogRoot: dependencies.catalogRoot }
          : {}),
        level,
        ...(pack !== undefined ? { pack } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(query !== undefined ? { query } : {}),
        ...(trustClass !== undefined ? { trustClass } : {}),
        ...(maxBudget !== undefined && !Number.isNaN(maxBudget)
          ? { maxBudget }
          : {}),
      },
      fileSystem,
    );

    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(result, null, 2));
    } else {
      const lines = [
        `Discovered ${result.skills.length} skills (Level: ${result.level})`,
        `Total context budget: ${result.totalBudgetEstimate} tokens (Savings: ${result.budgetSavingsPercentage}% vs eager loading)`,
        "",
      ];
      for (const s of result.skills) {
        lines.push(`- [${s.id}] ${s.name} (v${s.version}): ${s.description}`);
      }
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  throw new CliUsageError(`unsupported skill subcommand: ${subcommand}`);
}
