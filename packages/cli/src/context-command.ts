import { cwd } from "node:process";
import {
  getBoundedProjectContext,
  nodeFileSystem,
} from "@intentloom/application";
import {
  type CliDependencies,
  type CliExitCode,
  type CliIo,
} from "./command.js";
import { parseContextArguments } from "./context-parse.js";

export async function runContextCommand(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  const parsed = parseContextArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();

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
