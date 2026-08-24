import { cwd } from "node:process";
import {
  closeAgentSession,
  deleteAgentSession,
  exportAgentSession,
  getAgentSession,
  listAgentSessions,
  nodeFileSystem,
  startAgentSession,
  type AgentSessionState,
  type FileSystem,
} from "@intentloom/application";
import {
  CliUsageError,
  createCliArtifactValidator,
} from "./cli-project-metadata.js";
import { parseSessionArguments } from "./session-parse.js";

export type SessionCliExitCode = 0 | 2 | 3;

export interface SessionCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface SessionCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runSessionCommand(
  args: readonly string[],
  dependencies: SessionCliDependencies,
  io: SessionCliIo,
): Promise<SessionCliExitCode> {
  const parsed = parseSessionArguments(args);
  await createCliArtifactValidator(dependencies.catalogRoot);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;
  const sessionId =
    parsed.values.get("--id") ??
    (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
  const activeTask = parsed.values.get("--task") ?? "unspecified-task";
  const projectId = parsed.values.get("--project-id") ?? "project-local";

  if (subcommand === "start") {
    const session = await startAgentSession(
      {
        root,
        projectId,
        activeTask,
        ...(sessionId !== undefined ? { sessionId } : {}),
      },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(session, null, 2));
    } else {
      io.stdout(
        `Started agent session ${session.sessionId} [${session.state}] for task: ${session.activeTask}`,
      );
    }
    return 0;
  }
  if (subcommand === "close") {
    if (!sessionId)
      throw new CliUsageError(
        "session close requires session ID (--id or positional argument)",
      );
    const session = await closeAgentSession(sessionId, { root }, fileSystem);
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(session, null, 2));
    } else {
      io.stdout(`Closed agent session ${session.sessionId} [${session.state}]`);
    }
    return 0;
  }
  if (subcommand === "list") {
    const rawState = parsed.values.get("--state");
    const state = rawState as AgentSessionState | undefined;
    const sessions = await listAgentSessions(
      {
        root,
        ...(state !== undefined ? { state } : {}),
      },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(sessions, null, 2));
    } else {
      const lines = [
        `Agent Sessions (${sessions.length}):`,
        ...sessions.map(
          (s) => `- ${s.sessionId} [${s.state}] (${s.activeTask})`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (subcommand === "get") {
    if (!sessionId)
      throw new CliUsageError(
        "session get requires session ID (--id or positional argument)",
      );
    const session = await getAgentSession(sessionId, { root }, fileSystem);
    if (!session) {
      throw new Error(`agent session not found: ${sessionId}`);
    }
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(session, null, 2));
    } else {
      const lines = [
        `Agent Session: ${session.sessionId}`,
        `State: ${session.state}`,
        `Task: ${session.activeTask}`,
        `Created: ${session.createdAt}`,
        `Updated: ${session.updatedAt}`,
        ...(session.closedAt ? [`Closed: ${session.closedAt}`] : []),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (subcommand === "delete") {
    if (!sessionId)
      throw new CliUsageError(
        "session delete requires session ID (--id or positional argument)",
      );
    await deleteAgentSession(sessionId, { root }, fileSystem);
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify({ status: "deleted", sessionId }, null, 2));
    } else {
      io.stdout(`Deleted agent session: ${sessionId}`);
    }
    return 0;
  }
  if (subcommand === "export") {
    if (!sessionId)
      throw new CliUsageError(
        "session export requires session ID (--id or positional argument)",
      );
    const targetPath = parsed.values.get("--output");
    const result = await exportAgentSession(
      sessionId,
      {
        root,
        projectId,
        ...(targetPath !== undefined ? { targetPath } : {}),
      },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(result, null, 2));
    } else {
      io.stdout(
        `Exported agent session ${sessionId} for project ${projectId}${targetPath ? ` to ${targetPath}` : ""}`,
      );
    }
    return 0;
  }

  throw new CliUsageError(
    "session requires start, close, list, get, delete, or export subcommand",
  );
}
