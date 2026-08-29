import {
  ArtifactValidationFailure,
  nodeFileSystem,
  type FileSystem,
  type TransactionOptions,
} from "@intentloom/application";
import { type ProviderCacheStore } from "@intentloom/evidence-provider";
import { runCleanCommand } from "./clean-command.js";
import { runConformanceCommand } from "./conformance-command.js";
import { runDoctorCommand } from "./doctor-command.js";
import { runInspectCommand } from "./inspect-command.js";
import { runTimelineCommand } from "./timeline-command.js";
import { runUiCommand } from "./ui-command.js";
import { runWorkspaceCommand } from "./workspace-command.js";
import { runNeutronCommand } from "./neutron-command.js";
import { runMemoryCommand } from "./memory-command.js";
import { runSessionCommand } from "./session-command.js";
import { runSecurityCommand } from "./security-command.js";
import { runDiffCommand } from "./diff-command.js";
import { runInitCommand } from "./init-command.js";
import { runPlanCommand } from "./plan-command.js";
import { runSyncCommand } from "./sync-command.js";
import { runAdoptCommand } from "./adopt-command.js";
import { runUpdateCommand } from "./update-command.js";
import { runSummaryCommand } from "./summary-command.js";
import { runSkillCommand } from "./skill-command.js";
import { runProposalCommand } from "./proposal-command.js";
import { runEvaluateCommand } from "./evaluate-command.js";
import { runCheckpointCommand } from "./checkpoint-command.js";
import { runProfileCommand } from "./profile-command.js";
import { runDelegateCommand } from "./delegate-command.js";
import { runRankCommand } from "./rank-command.js";
import { runContextCommand } from "./context-command.js";
import { runEvidenceCommand } from "./evidence-command.js";
import { runHarnessCommand } from "./harness-command.js";
import {
  CliProjectValidationError,
  CliUsageError,
  formatValidationFailure,
} from "./cli-project-metadata.js";
import { usage } from "./usage.js";
import { INTENTLOOM_VERSION } from "@intentloom/core";
import { SchemaCatalogError } from "@intentloom/validator";

export type CliExitCode = 0 | 2 | 3 | 4 | 5;

export interface CliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly providerCacheStore?: ProviderCacheStore;
  readonly transactionOptions?: TransactionOptions;
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  if (args.includes("--version") || args[0] === "--version") {
    io.stdout(INTENTLOOM_VERSION);
    return 0;
  }
  if (
    args.includes("--help") ||
    args[0] === "--help" ||
    args[0] === "help" ||
    args.length === 0
  ) {
    io.stdout(usage);
    return 0;
  }
  try {
    if (args[0] === "harness") {
      return await runHarnessCommand(
        args,
        { fileSystem: dependencies.fileSystem ?? nodeFileSystem },
        io,
      );
    }
    if (args[0] === "evidence") {
      return await runEvidenceCommand(args, io);
    }
    if (args[0] === "clean") {
      return runCleanCommand(args, dependencies, io);
    }
    if (args[0] === "inspect") {
      return runInspectCommand(args, dependencies, io);
    }
    if (args[0] === "timeline") {
      return runTimelineCommand(args, {}, io);
    }
    if (args[0] === "conformance") {
      return runConformanceCommand(args, dependencies, io);
    }
    if (args[0] === "doctor") {
      return runDoctorCommand(args, dependencies, io);
    }
    if (args[0] === "ui") {
      return runUiCommand(args, dependencies, io);
    }
    if (args[0] === "workspace") {
      return await runWorkspaceCommand(args, dependencies, io);
    }
    if (args[0] === "neutron") {
      return await runNeutronCommand(args, dependencies, io);
    }
    if (args[0] === "memory") {
      return await runMemoryCommand(args, dependencies, io);
    }
    if (args[0] === "session") {
      return await runSessionCommand(args, dependencies, io);
    }
    if (args[0] === "security") {
      return await runSecurityCommand(args, dependencies, io);
    }
    if (args[0] === "diff") return await runDiffCommand(args, dependencies, io);
    if (args[0] === "plan") return await runPlanCommand(args, dependencies, io);
    if (args[0] === "init") return await runInitCommand(args, dependencies, io);
    if (args[0] === "sync") return await runSyncCommand(args, dependencies, io);
    if (args[0] === "adopt")
      return await runAdoptCommand(args, dependencies, io);
    if (args[0] === "update")
      return await runUpdateCommand(args, dependencies, io);
    if (args[0] === "summary")
      return await runSummaryCommand(args, dependencies, io);
    if (args[0] === "skill")
      return await runSkillCommand(args, dependencies, io);
    if (args[0] === "proposal")
      return await runProposalCommand(args, dependencies, io);
    if (args[0] === "evaluate")
      return await runEvaluateCommand(args, dependencies, io);
    if (args[0] === "checkpoint")
      return await runCheckpointCommand(args, dependencies, io);
    if (args[0] === "profile")
      return await runProfileCommand(args, dependencies, io);
    if (args[0] === "delegate")
      return await runDelegateCommand(args, dependencies, io);
    if (args[0] === "rank") return await runRankCommand(args, dependencies, io);
    if (args[0] === "context")
      return await runContextCommand(args, dependencies, io);
    throw new CliUsageError(usage);
  } catch (error) {
    if (error instanceof SchemaCatalogError) {
      const payload = {
        status: "invalid",
        errorCode: error.code,
        schemaFile: error.schemaFile,
      };
      const output = args.includes("--json")
        ? JSON.stringify(payload, null, 2)
        : `Intentloom schema catalog validation failed: ${error.schemaFile} [${error.code}]`;
      io.stderr(output);
      return 3;
    }
    if (
      error instanceof CliProjectValidationError ||
      error instanceof ArtifactValidationFailure
    ) {
      const json = args.includes("--json");
      io.stderr(formatValidationFailure(error.results, json));
      return 3;
    }
    io.stderr(error instanceof Error ? error.message : "configuration error");
    return 2;
  }
}
