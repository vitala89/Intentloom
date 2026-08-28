import { cwd } from "node:process";
import {
  ArtifactValidationFailure,
  nodeFileSystem,
  rankProceduralMemory,
  getSemanticRankingConfig,
  updateSemanticRankingConfig,
  getBoundedProjectContext,
  type SemanticRankingProvider,
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
import { runEvidenceCommand } from "./evidence-command.js";
import { runHarnessCommand } from "./harness-command.js";
import {
  assertDaemonFlagsAllowed,
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

interface ParsedArguments {
  readonly command: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly mappingValues: ReadonlyMap<string, readonly string[]>;
}

const commands = new Set(["evidence", "rank", "context"]);
const booleanFlags = new Set([
  "--cache",
  "--dry-run",
  "--force",
  "--json",
  "--plan",
  "--strict",
  "--enable",
  "--disable",
  "--clear",
]);
const valueFlags = new Set([
  "--root",
  "--profile",
  "--adapters",
  "--task",
  "--daemon-endpoint",
  "--daemon-token-file",
  "--case-id",
  "--provider",
  "--file",
  "--project-key",
  "--policy",
  "--timeline",
  "--case-type",
  "--output",
  "--apply",
  "--id",
  "--trust-class",
  "--retention-state",
  "--json-input",
  "--level",
  "--pack",
  "--role",
  "--query",
  "--max-budget",
  "--state",
  "--severity",
  "--reason",
  "--category",
  "--evidence",
  "--proposal-id",
  "--skill-id",
  "--action",
  "--plan-file",
  "--new-intent",
  "--task-id",
  "--name",
  "--max-tokens",
  "--max-items",
  "--approved-by",
  "--project-id",
  "--target",
  "--path",
  "--conversation-id",
  "--content",
  "--mode",
  "--input",
  "--view",
]);
const mappingValueFlags = new Set([
  "--project-owned-mapping",
  "--documentation-mapping",
]);

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  if (
    command === "evidence" &&
    !["fetch", "import", "analyze"].includes(args[1] ?? "")
  )
    throw new CliUsageError("evidence requires fetch, import, or analyze");
  if (command === "context" && args[1] !== "get")
    throw new CliUsageError("context requires get subcommand");
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();
  for (
    let index =
      command === "evidence" ||
      command === "context" ||
      (command === "rank" && args[1] !== undefined && !args[1].startsWith("--"))
        ? 2
        : 1;
    index < args.length;
    index += 1
  ) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--"))
      throw new CliUsageError(`unexpected argument: ${token}`);
    if (!valueFlags.has(token) && !mappingValueFlags.has(token))
      throw new CliUsageError(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new CliUsageError("project path specified more than once");
    if (mappingValueFlags.has(token)) {
      const entries = mappingValues.get(token) ?? [];
      entries.push(value);
      mappingValues.set(token, entries);
    } else values.set(token, value);
    index += 1;
  }
  if (flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  if (mappingValues.size > 0)
    throw new CliUsageError(
      "adoption mappings are only valid with init or adopt",
    );
  const daemonEndpoint = values.has("--daemon-endpoint");
  const daemonTokenFile = values.has("--daemon-token-file");
  assertDaemonFlagsAllowed(command, daemonEndpoint, daemonTokenFile);
  if (flags.has("--cache")) {
    throw new CliUsageError("--cache is only valid with clean");
  }
  return { command, flags, values, mappingValues };
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
    const parsed = parseArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    if (parsed.command === "rank") {
      const subcommand = args[1];
      if (subcommand === "config") {
        let enabled: boolean | undefined;
        if (parsed.flags.has("--enable")) enabled = true;
        if (parsed.flags.has("--disable")) enabled = false;

        const rawProvider = parsed.values.get("--provider");
        const provider = rawProvider as SemanticRankingProvider | undefined;

        if (enabled !== undefined || provider !== undefined) {
          const current = await getSemanticRankingConfig({ root }, fileSystem);
          const updated = await updateSemanticRankingConfig(
            {
              ...current,
              ...(enabled !== undefined ? { enabled } : {}),
              ...(provider !== undefined ? { provider } : {}),
            },
            { root },
            fileSystem,
          );
          io.stdout(
            parsed.flags.has("--json")
              ? JSON.stringify(updated, null, 2)
              : `Updated semantic ranking config: enabled=${updated.enabled}, provider=${updated.provider}`,
          );
          return 0;
        }

        const config = await getSemanticRankingConfig({ root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(config, null, 2)
            : `Semantic ranking config: enabled=${config.enabled}, provider=${config.provider}`,
        );
        return 0;
      }

      const query = parsed.values.get("--query") ?? args[1];
      if (!query) {
        throw new CliUsageError(
          "rank requires a query string or 'config' subcommand",
        );
      }

      const rawProvider = parsed.values.get("--provider");
      const provider = rawProvider as SemanticRankingProvider | undefined;
      const enabled = parsed.flags.has("--disable") ? false : undefined;

      const result = await rankProceduralMemory(
        query,
        {
          root,
          ...(provider !== undefined ? { provider } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
        },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Semantic Rank Results for: "${result.query}" (Provider: ${result.provider}, Latency: ${result.rankingLatencyMs}ms)`,
          ...result.items.map(
            (item) =>
              `- [${item.score.toFixed(2)}] [${item.type}] ${item.id}: ${item.relevanceReason}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    if (parsed.command === "context") {
      const subcommand = args[1];
      if (subcommand !== "get") {
        throw new CliUsageError("context requires get subcommand");
      }
      const query = parsed.values.get("--query");
      const rawMaxTokens = parsed.values.get("--max-tokens");
      const rawMaxItems = parsed.values.get("--max-items");

      const maxTokens = rawMaxTokens ? parseInt(rawMaxTokens, 10) : undefined;
      const maxItems = rawMaxItems ? parseInt(rawMaxItems, 10) : undefined;

      const result = await getBoundedProjectContext(
        {
          schemaVersion: "1",
          query,
          maxTokens,
          maxItems,
        },
        { root },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Bounded Project Context (Root: ${result.root}, Tokens: ${result.totalTokens}, Excluded: ${result.excludedPathsCount})`,
          ...result.items.map(
            (item) =>
              `- [${item.trustClass}] [${item.type}] ${item.path} (${item.tokenCount} tokens): ${item.summary}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    throw new CliUsageError(`unsupported command: ${parsed.command}`);
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
