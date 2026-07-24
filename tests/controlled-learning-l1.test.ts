import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getTaskSummary,
  listSessionSummaries,
  listTaskSummaries,
  recordSessionSummary,
  recordTaskSummary,
} from "@intentloom/application";
import {
  validateSessionSummary,
  validateTaskSummary,
  type TaskSummary,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L1 — Task & Session Summaries", () => {
  it("validates task summary and session summary schemas", () => {
    const validTask: TaskSummary = {
      schemaVersion: "1",
      id: "task-001",
      root: "/project",
      intent: "Implement feature X",
      affectedPaths: ["src/index.ts"],
      validationOutcome: "passed",
      evidenceReferences: ["git:commit:123456"],
      usedSkills: ["skills/refactoring.md"],
      unresolvedWork: [],
      provenance: "agent-session-42",
      trustClass: "verified-evidence",
      retentionState: "active",
      createdAt: "2026-07-25T00:00:00.000Z",
    };

    const validated = validateTaskSummary(validTask);
    expect(validated).toEqual(validTask);

    const validSession = {
      schemaVersion: "1" as const,
      id: "session-001",
      root: "/project",
      profile: "typescript",
      activeAdapters: ["cursor", "codex"],
      completedTaskIds: ["task-001"],
      summaryNotes: "Session completed successfully",
      createdAt: "2026-07-25T00:00:00.000Z",
    };

    expect(validateSessionSummary(validSession)).toEqual(validSession);
  });

  it("records task summary redacting secret-like paths", async () => {
    const fs = createMemoryFileSystem();
    const recorded = await recordTaskSummary(
      {
        id: "task-002",
        root: "/project",
        intent: "Setup environment",
        affectedPaths: ["src/config.ts", ".env", "secrets/key.pem"],
        validationOutcome: "passed",
        evidenceReferences: [],
        usedSkills: [],
        unresolvedWork: [],
        provenance: "agent",
        trustClass: "user-supplied",
        retentionState: "active",
      },
      { root: "/project" },
      fs,
    );

    expect(recorded.affectedPaths).toEqual(["src/config.ts"]);
    expect(fs.files.has("/project/.aif/memory/tasks/task-002.json")).toBe(true);

    const fetched = await getTaskSummary("task-002", { root: "/project" }, fs);
    expect(fetched).toEqual(recorded);
  });

  it("lists task summaries with filtering by trustClass and retentionState", async () => {
    const fs = createMemoryFileSystem();

    await recordTaskSummary(
      {
        id: "task-A",
        root: "/project",
        intent: "Task A",
        affectedPaths: [],
        validationOutcome: "passed",
        evidenceReferences: [],
        usedSkills: [],
        unresolvedWork: [],
        provenance: "agent",
        trustClass: "verified-evidence",
        retentionState: "active",
        createdAt: "2026-07-25T01:00:00.000Z",
      },
      { root: "/project" },
      fs,
    );

    await recordTaskSummary(
      {
        id: "task-B",
        root: "/project",
        intent: "Task B",
        affectedPaths: [],
        validationOutcome: "passed",
        evidenceReferences: [],
        usedSkills: [],
        unresolvedWork: [],
        provenance: "agent",
        trustClass: "agent-generated",
        retentionState: "archived",
        createdAt: "2026-07-25T02:00:00.000Z",
      },
      { root: "/project" },
      fs,
    );

    const all = await listTaskSummaries({ root: "/project" }, fs);
    expect(all.length).toBe(2);
    expect(all[0]!.id).toBe("task-B"); // Sorts newest first

    const verifiedOnly = await listTaskSummaries(
      { root: "/project", trustClass: "verified-evidence" },
      fs,
    );
    expect(verifiedOnly.length).toBe(1);
    expect(verifiedOnly[0]!.id).toBe("task-A");

    const archivedOnly = await listTaskSummaries(
      { root: "/project", retentionState: "archived" },
      fs,
    );
    expect(archivedOnly.length).toBe(1);
    expect(archivedOnly[0]!.id).toBe("task-B");
  });

  it("records and lists session summaries", async () => {
    const fs = createMemoryFileSystem();
    const session = await recordSessionSummary(
      {
        id: "session-100",
        root: "/project",
        profile: "generic",
        activeAdapters: ["claude"],
        completedTaskIds: ["task-A"],
      },
      { root: "/project" },
      fs,
    );

    expect(session.id).toBe("session-100");
    const sessions = await listSessionSummaries({ root: "/project" }, fs);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.id).toBe("session-100");
  });

  it("executes CLI intentloom summary commands", async () => {
    const fs = createMemoryFileSystem();
    const taskData = {
      id: "task-cli-1",
      root: "/project",
      intent: "CLI test task",
      affectedPaths: ["src/app.ts"],
      validationOutcome: "passed",
      evidenceReferences: [],
      usedSkills: [],
      unresolvedWork: [],
      provenance: "cli-test",
      trustClass: "verified-evidence",
      retentionState: "active",
    };

    const recordOutput: string[] = [];
    const recordExit = await runCli(
      [
        "summary",
        "record",
        "--root",
        "/project",
        "--json-input",
        JSON.stringify(taskData),
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => recordOutput.push(msg), stderr: () => undefined },
    );

    expect(recordExit).toBe(0);
    const recorded = JSON.parse(recordOutput.join("\n"));
    expect(recorded.id).toBe("task-cli-1");

    const listOutput: string[] = [];
    const listExit = await runCli(
      ["summary", "list", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => listOutput.push(msg), stderr: () => undefined },
    );

    expect(listExit).toBe(0);
    const list = JSON.parse(listOutput.join("\n"));
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("task-cli-1");

    const getOutput: string[] = [];
    const getExit = await runCli(
      ["summary", "get", "--root", "/project", "--id", "task-cli-1", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => getOutput.push(msg), stderr: () => undefined },
    );

    expect(getExit).toBe(0);
    const fetched = JSON.parse(getOutput.join("\n"));
    expect(fetched.id).toBe("task-cli-1");
  });
});
