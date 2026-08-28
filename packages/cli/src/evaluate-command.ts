import { cwd } from "node:process";
import {
  evaluateSkillProposal,
  listSkillEvaluations,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseEvaluateArguments } from "./evaluate-parse.js";

export type EvaluateCliExitCode = 0 | 2;

export interface EvaluateCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface EvaluateCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runEvaluateCommand(
  args: readonly string[],
  dependencies: EvaluateCliDependencies,
  io: EvaluateCliIo,
): Promise<EvaluateCliExitCode> {
  const parsed = parseEvaluateArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

  if (subcommand === "run") {
    const proposalId = parsed.values.get("--proposal-id") ?? args[2];
    if (!proposalId) {
      throw new CliUsageError("evaluate run requires --proposal-id <id>");
    }
    const caseId = parsed.values.get("--case-id");
    const evalResult = await evaluateSkillProposal(
      proposalId,
      {
        root,
        ...(caseId !== undefined ? { caseId } : {}),
      },
      fileSystem,
    );
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(evalResult, null, 2)
        : `Evaluated proposal [${proposalId}]: outcome=${evalResult.outcome}, passed=${evalResult.passed}, securityPass=${evalResult.securityPass}`,
    );
    return 0;
  }
  if (subcommand === "list") {
    const skillId = parsed.values.get("--skill-id");
    const evaluations = await listSkillEvaluations(
      {
        root,
        ...(skillId !== undefined ? { skillId } : {}),
      },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(evaluations, null, 2));
    } else {
      const lines = evaluations.map(
        (e) =>
          `- [${e.id}] skill=${e.skillId} outcome=${e.outcome} passed=${e.passed}`,
      );
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  throw new CliUsageError(`unsupported evaluate subcommand: ${subcommand}`);
}
