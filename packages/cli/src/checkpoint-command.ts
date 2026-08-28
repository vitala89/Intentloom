import { cwd } from "node:process";
import {
  cancelTask,
  createTaskCheckpoint,
  deleteTaskCheckpoint,
  listTaskCheckpoints,
  nodeFileSystem,
  pauseTask,
  redirectTask,
  resumeTask,
  type FileSystem,
} from "@intentloom/application";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseCheckpointArguments } from "./checkpoint-parse.js";

export type CheckpointCliExitCode = 0 | 2;

export interface CheckpointCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CheckpointCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runCheckpointCommand(
  args: readonly string[],
  dependencies: CheckpointCliDependencies,
  io: CheckpointCliIo,
): Promise<CheckpointCliExitCode> {
  const parsed = parseCheckpointArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

  if (subcommand === "create") {
    const taskId = parsed.values.get("--task-id") ?? args[2];
    if (!taskId) {
      throw new CliUsageError("checkpoint create requires --task-id <id>");
    }
    const created = await createTaskCheckpoint(taskId, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(created, null, 2)
        : `Created task checkpoint [${created.id}] for task [${taskId}]`,
    );
    return 0;
  }
  if (subcommand === "pause") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("checkpoint pause requires --id <id>");
    const paused = await pauseTask(id, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(paused, null, 2)
        : `Paused task checkpoint [${id}]`,
    );
    return 0;
  }
  if (subcommand === "cancel") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("checkpoint cancel requires --id <id>");
    const cancelled = await cancelTask(id, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(cancelled, null, 2)
        : `Cancelled task checkpoint [${id}]`,
    );
    return 0;
  }
  if (subcommand === "redirect") {
    const id = parsed.values.get("--id") ?? args[2];
    const newIntent = parsed.values.get("--new-intent");
    if (!id || !newIntent) {
      throw new CliUsageError(
        "checkpoint redirect requires --id <id> and --new-intent <intent>",
      );
    }
    const redirected = await redirectTask(id, newIntent, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(redirected, null, 2)
        : `Redirected task checkpoint [${id}] to: ${newIntent}`,
    );
    return 0;
  }
  if (subcommand === "resume") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("checkpoint resume requires --id <id>");
    const resumed = await resumeTask(id, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(resumed, null, 2)
        : `Resumed task checkpoint [${id}] (invalidated ${resumed.invalidatedCount} stale plans)`,
    );
    return 0;
  }
  if (subcommand === "list") {
    const taskId = parsed.values.get("--task-id");
    const checkpoints = await listTaskCheckpoints(
      { root, ...(taskId !== undefined ? { taskId } : {}) },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(checkpoints, null, 2));
    } else {
      const lines = checkpoints.map(
        (c) => `- [${c.id}] task=${c.taskId} state=${c.state}`,
      );
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (subcommand === "delete") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("checkpoint delete requires --id <id>");
    const deleted = await deleteTaskCheckpoint(id, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify({ id, deleted })
        : `Deleted checkpoint [${id}]: ${deleted}`,
    );
    return 0;
  }
  throw new CliUsageError(`unsupported checkpoint subcommand: ${subcommand}`);
}
