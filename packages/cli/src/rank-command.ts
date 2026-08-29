import { cwd } from "node:process";
import {
  nodeFileSystem,
  rankProceduralMemory,
  getSemanticRankingConfig,
  updateSemanticRankingConfig,
  type SemanticRankingProvider,
} from "@intentloom/application";
import {
  type CliDependencies,
  type CliExitCode,
  type CliIo,
} from "./command.js";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseRankArguments } from "./rank-parse.js";

export async function runRankCommand(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  const parsed = parseRankArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();

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
