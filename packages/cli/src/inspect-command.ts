import { cwd } from "node:process";
import {
  inspectProject,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import { formatInspection } from "./formatters.js";

export type InspectCliExitCode = 0 | 2 | 3;

export interface InspectCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface InspectCliDependencies {
  readonly fileSystem?: FileSystem;
}

interface InspectArguments {
  readonly root: string;
  readonly json: boolean;
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
const valueFlags = new Set(["--root"]);

const inspectUsage =
  "Usage: intentloom inspect [PROJECT_PATH|--root PATH] [--json]";

function parseInspectArguments(args: readonly string[]): InspectArguments {
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

  return {
    root: values.get("--root") ?? cwd(),
    json: flags.has("--json"),
  };
}

export async function runInspectCommand(
  args: readonly string[],
  dependencies: InspectCliDependencies,
  io: InspectCliIo,
): Promise<InspectCliExitCode> {
  try {
    const parsed = parseInspectArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const result = await inspectProject(parsed.root, fileSystem);
    io.stdout(
      parsed.json ? JSON.stringify(result, null, 2) : formatInspection(result),
    );
    return result.findings.some((finding) => finding.severity === "error")
      ? 3
      : 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : inspectUsage);
    return 2;
  }
}
