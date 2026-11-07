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
  recordSessionSummary,
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

  it("returns null when an agent session file is missing", async () => {
    const fs = createMemoryFileSystem();
    expect(
      await getAgentSession("missing-session", { root: "/project" }, fs),
    ).toBeNull();
  });

  it("returns null when an agent session file is invalid JSON", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const path = `${root}/.aif/memory/sessions/bad-json.json`;
    await fs.write(path, "{not-json");

    expect(await getAgentSession("bad-json", { root }, fs)).toBeNull();
    expect(await fs.read(path)).toBe("{not-json");
  });

  it("returns null when an agent session file fails validation", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const path = `${root}/.aif/memory/sessions/bad-state.json`;
    const stored = `${JSON.stringify({
      schemaVersion: "1",
      sessionId: "bad-state",
      projectId: "project-m4",
      state: "unknown-state",
    })}\n`;
    await fs.write(path, stored);

    expect(await getAgentSession("bad-state", { root }, fs)).toBeNull();
    expect(await fs.read(path)).toBe(stored);
  });

  it("lists agent sessions sorted by session id", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    for (const sessionId of ["sess-c", "sess-a", "sess-b"]) {
      await startAgentSession(
        { root, projectId: "project-m4", sessionId, activeTask: sessionId },
        fs,
      );
    }

    const listed = await listAgentSessions({ root }, fs);
    expect(listed.map((session) => session.sessionId)).toEqual([
      "sess-a",
      "sess-b",
      "sess-c",
    ]);
  });

  it("skips session summary files when listing agent sessions", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await recordSessionSummary(
      {
        id: "summary-only",
        root,
        profile: "generic",
        activeAdapters: ["claude"],
        completedTaskIds: ["task-A"],
      },
      { root },
      fs,
    );
    await startAgentSession(
      {
        root,
        projectId: "project-m4",
        sessionId: "agent-only",
        activeTask: "Keep the agent session",
      },
      fs,
    );

    const listed = await listAgentSessions({ root }, fs);
    expect(listed.map((session) => session.sessionId)).toEqual(["agent-only"]);
  });

  it("persists a compacted close with redacted appended outcomes", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await startAgentSession(
      {
        root,
        projectId: "project-m4",
        sessionId: "compact-1",
        activeTask: "Compact the session",
        decisions: ["Keep the original decision"],
      },
      fs,
    );

    const closed = await closeAgentSession(
      "compact-1",
      {
        root,
        state: "compacted",
        outcomes: [".env", "kept outcome"],
        decisions: ["server.key"],
      },
      fs,
    );

    expect(closed.state).toBe("compacted");
    expect(closed.closedAt).toBe(closed.updatedAt);
    expect(closed.outcomes).toEqual(["[REDACTED]", "kept outcome"]);
    expect(closed.decisions).toEqual([
      "Keep the original decision",
      "[REDACTED]",
    ]);

    const stored = await getAgentSession("compact-1", { root }, fs);
    expect(stored?.state).toBe("compacted");
    expect(stored?.closedAt).toBe(closed.closedAt);
    expect(stored?.updatedAt).toBe(closed.updatedAt);
    expect(stored?.outcomes).toEqual(["[REDACTED]", "kept outcome"]);
  });

  it("returns an export envelope without writing when targetPath is omitted", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await startAgentSession(
      {
        root,
        projectId: "session-project",
        sessionId: "export-envelope",
        activeTask: "Export without a file",
      },
      fs,
    );
    const before = [...(await fs.list(root))].toSorted();

    const exported = await exportAgentSession(
      "export-envelope",
      { root, projectId: "export-argument" },
      fs,
    );

    expect(exported.schemaVersion).toBe("1");
    expect(exported.projectId).toBe("export-argument");
    expect(exported.session.sessionId).toBe("export-envelope");
    expect(exported.session.projectId).toBe("session-project");
    expect(exported.exportedAt).toEqual(expect.any(String));
    expect([...(await fs.list(root))].toSorted()).toEqual(before);
  });

  it("throws when an export target path escapes the project root", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await startAgentSession(
      {
        root,
        projectId: "project-m4",
        sessionId: "export-escape",
        activeTask: "Stay inside the root",
      },
      fs,
    );

    await expect(
      exportAgentSession(
        "export-escape",
        { root, projectId: "project-m4", targetPath: "../escape.json" },
        fs,
      ),
    ).rejects.toThrow("path traversal: ../escape.json");
    expect(await fs.exists("/escape.json")).toBe(false);
  });

  it("persists default trust and retention and round-trips metadata", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const metadata = { note: "kept", nested: { ok: true } };
    const session = await startAgentSession(
      {
        root,
        projectId: "project-m4",
        sessionId: "defaults",
        activeTask: "Record defaults",
        metadata,
      },
      fs,
    );

    expect(session.trustClass).toBe("user-supplied");
    expect(session.retentionPolicy).toBe("project");
    expect(session.metadata).toEqual(metadata);

    const stored = JSON.parse(
      await fs.read(`${root}/.aif/memory/sessions/defaults.json`),
    ) as {
      trustClass: string;
      retentionPolicy: string;
      metadata: unknown;
    };
    expect(stored.trustClass).toBe("user-supplied");
    expect(stored.retentionPolicy).toBe("project");
    expect(stored.metadata).toEqual(metadata);

    const fetched = await getAgentSession("defaults", { root }, fs);
    expect(fetched?.trustClass).toBe("user-supplied");
    expect(fetched?.retentionPolicy).toBe("project");
    expect(fetched?.metadata).toEqual(metadata);
  });
});
