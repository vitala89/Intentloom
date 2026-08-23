import { cwd } from "node:process";
import {
  getNeutronSubagentTask,
  listNeutronSubagentTasks,
  nodeFileSystem,
  spawnNeutronSubagentTask,
  syncLocalWorkspaceState,
  type FileSystem,
  type NeutronSubagentRole,
} from "@intentloom/application";
import { createCliArtifactValidator } from "./cli-project-metadata.js";
import { parseNeutronArguments } from "./neutron-parse.js";

export type NeutronCliExitCode = 0 | 2 | 3;

export interface NeutronCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface NeutronCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runNeutronCommand(
  args: readonly string[],
  dependencies: NeutronCliDependencies,
  io: NeutronCliIo,
): Promise<NeutronCliExitCode> {
  const parsed = parseNeutronArguments(args);
  await createCliArtifactValidator(dependencies.catalogRoot);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const json = parsed.flags.has("--json");

  if (parsed.section === "sync") {
    const syncState = await syncLocalWorkspaceState({ root }, fileSystem);
    if (json) {
      io.stdout(JSON.stringify(syncState, null, 2));
    } else {
      const lines = [
        `Neutron Workspace Sync (${syncState.projectId}):`,
        `Readiness: ${syncState.readiness}`,
        `Findings: ${syncState.findingsCount}`,
        `Security Score: ${syncState.securityScore ?? "N/A"}`,
        `Active Conversations: ${syncState.activeConversationsCount}`,
        `Subagent Tasks: ${syncState.subagentTasksCount}`,
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }

  if (parsed.section === "subagent") {
    const subaction = parsed.nestedAction;
    if (subaction === "spawn") {
      const roleArg = (parsed.values.get("--role") ??
        "research") as NeutronSubagentRole;
      const taskInput =
        parsed.values.get("--input") ??
        parsed.values.get("--content") ??
        "General research task";
      const conversationId = parsed.values.get("--conversation-id");
      const task = await spawnNeutronSubagentTask(
        {
          root,
          projectId: "project-local",
          role: roleArg,
          taskInput,
          ...(conversationId !== undefined ? { conversationId } : {}),
        },
        fileSystem,
      );
      if (json) {
        io.stdout(JSON.stringify(task, null, 2));
      } else {
        io.stdout(
          `Spawned Neutron subagent task ${task.id} (role: ${task.role}, status: ${task.status})`,
        );
      }
      return 0;
    }
    if (subaction === "get") {
      const taskId =
        parsed.values.get("--task-id") ?? parsed.values.get("--id") ?? "";
      const task = await getNeutronSubagentTask({ root, taskId }, fileSystem);
      if (!task) {
        io.stderr(`Neutron subagent task ${taskId} not found\n`);
        return 3;
      }
      if (json) {
        io.stdout(JSON.stringify(task, null, 2));
      } else {
        io.stdout(
          `Neutron subagent task ${task.id} [${task.role}]: ${task.status}\nOutput: ${task.resultOutput ?? "none"}`,
        );
      }
      return 0;
    }
    if (subaction === "list") {
      const conversationId = parsed.values.get("--conversation-id");
      const tasks = await listNeutronSubagentTasks(
        {
          root,
          ...(conversationId !== undefined ? { conversationId } : {}),
        },
        fileSystem,
      );
      if (json) {
        io.stdout(JSON.stringify(tasks, null, 2));
      } else {
        const lines = [
          `Neutron Subagent Tasks (${tasks.length}):`,
          ...tasks.map(
            (t) => `- ${t.id} [${t.role}] (${t.status}): ${t.taskInput}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    throw new Error("task identifier is required");
  }

  return 2;
}
