import { cwd } from "node:process";
import {
  delegateTaskRole,
  nodeFileSystem,
  type DelegatedAgentRole,
  type FileSystem,
} from "@intentloom/application";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseDelegateArguments } from "./delegate-parse.js";

export type DelegateCliExitCode = 0 | 2;

export interface DelegateCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface DelegateCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runDelegateCommand(
  args: readonly string[],
  dependencies: DelegateCliDependencies,
  io: DelegateCliIo,
): Promise<DelegateCliExitCode> {
  const parsed = parseDelegateArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const profileName = parsed.values.get("--profile");
  const role = parsed.values.get("--role");
  const parentTaskId = parsed.values.get("--task-id");
  if (!profileName || !role || !parentTaskId) {
    throw new CliUsageError(
      "delegate requires --profile <name>, --role <role>, and --task-id <id>",
    );
  }
  const delegation = await delegateTaskRole(
    {
      schemaVersion: "1",
      profileName,
      role: role as DelegatedAgentRole,
      parentTaskId,
    },
    { root },
    fileSystem,
  );
  io.stdout(
    parsed.flags.has("--json")
      ? JSON.stringify(delegation, null, 2)
      : `Delegated role [${delegation.grantedRole}] under profile [${profileName}] (ID: ${delegation.delegationId})`,
  );
  return 0;
}
