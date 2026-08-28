import {
  assertDaemonFlagsAllowed,
  CliUsageError,
} from "./cli-project-metadata.js";

const supportedSubcommands = new Set(["list", "get", "record"]);

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

export interface SummaryParsedArguments {
  readonly subcommand: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
}

export function parseSummaryArguments(
  args: readonly string[],
): SummaryParsedArguments {
  const subcommand = args[1] ?? "";
  if (!supportedSubcommands.has(subcommand)) {
    throw new CliUsageError("summary requires list, get, or record subcommand");
  }

  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();

  for (let index = 2; index < args.length; index += 1) {
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
  assertDaemonFlagsAllowed(
    "summary",
    values.has("--daemon-endpoint"),
    values.has("--daemon-token-file"),
  );
  if (flags.has("--cache"))
    throw new CliUsageError("--cache is only valid with clean");

  return { subcommand, flags, values };
}
