import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  startAgentSession,
  getAgentSession,
  listAgentSessions,
  closeAgentSession,
  deleteAgentSession,
  exportAgentSession,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { validateAgentSessionItem } from "@intentloom/protocol";

describe("Memory & Security Candidate M4", () => {
  it("tracks agent session lifecycle through application operations", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const options = { root, projectId: "project-m4", sessionId: "sess-100" };

    const session = await startAgentSession(
      {
        ...options,
        activeTask: "Refactor session engine",
        unresolvedQuestions: ["Should we support retention?"],
        decisions: ["Use JSON session files"],
      },
      fs,
    );

    expect(session.sessionId).toBe("sess-100");
    expect(session.state).toBe("active");
    expect(session.activeTask).toBe("Refactor session engine");

    const fetched = await getAgentSession("sess-100", { root }, fs);
    expect(fetched).not.toBeNull();
    expect(fetched?.sessionId).toBe("sess-100");

    const closed = await closeAgentSession(
      "sess-100",
      {
        root,
        outcomes: ["Session engine refactored"],
        decisions: ["Verified lifecycle transitions"],
      },
      fs,
    );

    expect(closed.state).toBe("closed");
    expect(closed.outcomes).toEqual(["Session engine refactored"]);
    expect(closed.decisions).toEqual([
      "Use JSON session files",
      "Verified lifecycle transitions",
    ]);

    const activeList = await listAgentSessions({ root, state: "active" }, fs);
    expect(activeList).toHaveLength(0);

    const closedList = await listAgentSessions({ root, state: "closed" }, fs);
    expect(closedList).toHaveLength(1);
    expect(closedList[0]?.sessionId).toBe("sess-100");
  });

  it("redacts secret-like path prose in agent session items", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const session = await startAgentSession(
      {
        root,
        projectId: "project-m4",
        sessionId: "sess-secret",
        activeTask: ".env",
        unresolvedQuestions: [".env.production"],
        decisions: ["server.key"],
      },
      fs,
    );

    expect(session.activeTask).toBe("[REDACTED]");
    expect(session.unresolvedQuestions).toEqual(["[REDACTED]"]);
    expect(session.decisions).toEqual(["[REDACTED]"]);
  });

  it("exports and deletes agent session items cleanly", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const options = { root, projectId: "project-m4", sessionId: "sess-export" };

    await startAgentSession(
      {
        ...options,
        activeTask: "Build export feature",
      },
      fs,
    );

    const exported = await exportAgentSession(
      "sess-export",
      { root, projectId: "project-m4", targetPath: "exports/session.json" },
      fs,
    );

    expect(exported.session.sessionId).toBe("sess-export");
    expect(await fs.exists(`${root}/exports/session.json`)).toBe(true);

    await deleteAgentSession("sess-export", { root }, fs);
    expect(await getAgentSession("sess-export", { root }, fs)).toBeNull();
  });

  it("routes session lifecycle subcommands through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const startExit = await runCli(
      [
        "session",
        "start",
        "--id",
        "sess-cli",
        "--task",
        "CLI session test",
        "--root",
        root,
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(startExit).toBe(0);
    expect(output).toContain("Started agent session sess-cli");

    output = "";
    const listExit = await runCli(
      ["session", "list", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(listExit).toBe(0);
    expect(JSON.parse(output)).toHaveLength(1);

    output = "";
    const closeExit = await runCli(
      ["session", "close", "--id", "sess-cli", "--root", root],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(closeExit).toBe(0);
    expect(output).toContain("Closed agent session sess-cli");

    output = "";
    const exportExit = await runCli(
      [
        "session",
        "export",
        "--id",
        "sess-cli",
        "--output",
        "exported.json",
        "--root",
        root,
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(exportExit).toBe(0);
    expect(output).toContain("Exported agent session sess-cli");

    output = "";
    const deleteExit = await runCli(
      ["session", "delete", "--id", "sess-cli", "--root", root],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(deleteExit).toBe(0);
    expect(output).toContain("Deleted agent session: sess-cli");
  });

  it("rejects invalid agent session items in protocol validation", () => {
    expect(() =>
      validateAgentSessionItem({
        schemaVersion: "1",
        sessionId: "invalid",
        projectId: "p",
        state: "unknown-state",
      }),
    ).toThrow("invalid agent session state");
  });
});
