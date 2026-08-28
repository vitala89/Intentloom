import { cwd } from "node:process";
import {
  getTaskSummary,
  listTaskSummaries,
  nodeFileSystem,
  recordTaskSummary,
  type FileSystem,
  type RetentionState,
  type TrustClass,
} from "@intentloom/application";
import { resolveWithin } from "@intentloom/core";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseSummaryArguments } from "./summary-parse.js";

export type SummaryCliExitCode = 0 | 2 | 3;

export interface SummaryCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface SummaryCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runSummaryCommand(
  args: readonly string[],
  dependencies: SummaryCliDependencies,
  io: SummaryCliIo,
): Promise<SummaryCliExitCode> {
  const parsed = parseSummaryArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

  if (subcommand === "list") {
    const trustClass = parsed.values.get("--trust-class") as
      TrustClass | undefined;
    const retentionState = parsed.values.get("--retention-state") as
      RetentionState | undefined;
    const summaries = await listTaskSummaries(
      {
        root,
        ...(trustClass ? { trustClass } : {}),
        ...(retentionState ? { retentionState } : {}),
      },
      fileSystem,
    );
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(summaries, null, 2)
        : summaries.length === 0
          ? "No task summaries recorded."
          : summaries
              .map(
                (s) =>
                  `[${s.id}] ${s.intent} (${s.validationOutcome}) [${s.trustClass}]`,
              )
              .join("\n"),
    );
    return 0;
  }
  if (subcommand === "get") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("summary get requires --id <id>");
    const summary = await getTaskSummary(id, { root }, fileSystem);
    if (!summary) {
      io.stderr(`Summary not found: ${id}\n`);
      return 3;
    }
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(summary, null, 2)
        : `[${summary.id}] ${summary.intent}\nOutcome: ${summary.validationOutcome}\nTrust: ${summary.trustClass}\nCreated: ${summary.createdAt}`,
    );
    return 0;
  }
  if (subcommand === "record") {
    const jsonInput = parsed.values.get("--json-input");
    const jsonFile = parsed.values.get("--file");
    let rawContent = jsonInput;
    if (!rawContent && jsonFile) {
      rawContent = await fileSystem.read(resolveWithin(root, jsonFile));
    }
    if (!rawContent) {
      throw new CliUsageError(
        "summary record requires --json-input <json> or --file <path>",
      );
    }
    const parsedSummary = JSON.parse(rawContent);
    const recorded = await recordTaskSummary(
      parsedSummary,
      { root },
      fileSystem,
    );
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(recorded, null, 2)
        : `Recorded task summary [${recorded.id}]`,
    );
    return 0;
  }
  throw new CliUsageError(`unsupported summary subcommand: ${subcommand}`);
}
