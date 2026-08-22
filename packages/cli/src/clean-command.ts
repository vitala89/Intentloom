import { cwd } from "node:process";
import type { ProviderCacheStore } from "@intentloom/evidence-provider";
import { cleanProviderCache } from "./clean-cache.js";
import { formatCleanCacheHuman } from "./formatters.js";

export type CleanCliExitCode = 0 | 2;

export interface CleanCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CleanCliDependencies {
  readonly providerCacheStore?: ProviderCacheStore;
}

interface CleanArguments {
  readonly root: string;
  readonly json: boolean;
  readonly provider?: "github" | "gitlab";
  readonly projectKey?: string;
}

const legacyBooleanFlags = new Set([
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
const valueFlags = new Set(["--root", "--provider", "--project-key"]);

const cleanUsage =
  "Usage: intentloom clean --cache [PROJECT_PATH|--root PATH] [--provider github|gitlab] [--project-key KEY] [--json]";

function parseCleanArguments(args: readonly string[]): CleanArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (legacyBooleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (values.has("--root"))
        throw new Error("project path specified more than once");
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token)) throw new Error(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new Error("project path specified more than once");
    values.set(token, value);
    index += 1;
  }

  if (!flags.has("--cache")) throw new Error("clean requires --cache");
  const unexpectedFlag = [...flags].find(
    (flag) => !["--cache", "--json"].includes(flag),
  );
  if (unexpectedFlag)
    throw new Error(`clean does not support ${unexpectedFlag}`);
  const unexpectedValue = [...values.keys()].find(
    (flag) => !["--root", "--provider", "--project-key"].includes(flag),
  );
  if (unexpectedValue)
    throw new Error(`clean does not support ${unexpectedValue}`);
  if (values.has("--project-key") && !values.has("--provider"))
    throw new Error("clean --project-key requires --provider");
  if (values.has("--project-key") && !values.get("--project-key"))
    throw new Error("clean --project-key cannot be empty");

  const providerValue = values.get("--provider");
  if (
    providerValue !== undefined &&
    providerValue !== "github" &&
    providerValue !== "gitlab"
  )
    throw new Error("clean --provider must be github or gitlab");

  return {
    root: values.get("--root") ?? cwd(),
    json: flags.has("--json"),
    ...(providerValue ? { provider: providerValue } : {}),
    ...(values.has("--project-key")
      ? { projectKey: values.get("--project-key")! }
      : {}),
  };
}

export async function runCleanCommand(
  args: readonly string[],
  dependencies: CleanCliDependencies,
  io: CleanCliIo,
): Promise<CleanCliExitCode> {
  try {
    const parsed = parseCleanArguments(args);
    const result = await cleanProviderCache({
      projectRoot: parsed.root,
      ...(parsed.provider ? { provider: parsed.provider } : {}),
      ...(parsed.projectKey ? { projectKey: parsed.projectKey } : {}),
      ...(dependencies.providerCacheStore
        ? { store: dependencies.providerCacheStore }
        : {}),
    });
    io.stdout(
      parsed.json
        ? JSON.stringify(result, null, 2)
        : formatCleanCacheHuman(result),
    );
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : cleanUsage);
    return 2;
  }
}
