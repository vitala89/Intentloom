import { describe, expect, it, vi } from "vitest";
import {
  createMemoryFileSystem,
  getNeutronSubagentTask,
  initProject,
  listNeutronSubagentTasks,
  spawnNeutronSubagentTask,
  syncLocalWorkspaceState,
} from "@intentloom/application";
import {
  ProtocolValidationError,
  type NeutronSubagentRole,
} from "@intentloom/protocol";
import type { FileSystem } from "../packages/application/src/host-file-system.ts";
import { inside } from "../packages/application/src/project-path.ts";

const root = "/project";
const createdAt = "2026-01-15T12:00:00.000Z";
const taskId = `task-${Date.parse(createdAt)}-4fzzzx`;

function taskPath(id: string): string {
  return inside(root, `.aif/neutron/subagents/${id}.json`);
}

function absoluteTaskPath(id: string): string {
  return `${root}/.aif/neutron/subagents/${id}.json`;
}

function recordJson(record: {
  id: string;
  conversationId: string | null;
  createdAt: string;
}): string {
  return JSON.stringify({
    schemaVersion: "1",
    id: record.id,
    projectId: "project-1",
    conversationId: record.conversationId,
    role: "research",
    status: "completed",
    taskInput: record.id,
    resultOutput: "stored",
    createdAt: record.createdAt,
    completedAt: record.createdAt,
  });
}

function filesystem(
  files: Map<string, string>,
  list: () => Promise<string[]>,
): FileSystem {
  return {
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write() {
      throw new Error("unexpected write");
    },
    async mkdir() {},
    async remove() {},
    list,
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
  };
}

describe("P1J legacy subagent task record behavior", () => {
  it("persists the same validated completed record and JSON bytes", async () => {
    const fs = createMemoryFileSystem();
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse(createdAt));
    const iso = vi
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue(createdAt);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    try {
      const record = await spawnNeutronSubagentTask(
        {
          root,
          projectId: "project-1",
          conversationId: "conversation-1",
          role: "research",
          taskInput: "Inspect routing",
        },
        fs,
      );
      const expected = {
        schemaVersion: "1" as const,
        id: taskId,
        projectId: "project-1",
        conversationId: "conversation-1",
        role: "research" as const,
        status: "completed" as const,
        taskInput: "Inspect routing",
        resultOutput:
          'Neutron subagent (research) completed research task: "Inspect routing"',
        createdAt,
        completedAt: createdAt,
      };
      expect(record).toEqual(expected);
      expect(Object.keys(record)).toEqual(Object.keys(expected));
      expect(record.createdAt).toBe(record.completedAt);
      expect(await fs.read(taskPath(record.id))).toBe(
        `${JSON.stringify(expected, null, 2)}\n`,
      );

      random.mockReturnValue(0.987654321);
      const omitted = await spawnNeutronSubagentTask(
        {
          root,
          projectId: "project-1",
          role: "arch-checker",
          taskInput: "Check boundaries",
        },
        fs,
      );
      expect(omitted.conversationId).toBeNull();
      expect(omitted.status).toBe("completed");
      expect(omitted.resultOutput).toBe(
        'Neutron subagent (arch-checker) completed research task: "Check boundaries"',
      );
    } finally {
      now.mockRestore();
      iso.mockRestore();
      random.mockRestore();
    }
  });

  it("rejects an invalid role before any filesystem write", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      spawnNeutronSubagentTask(
        {
          root,
          projectId: "project-1",
          role: "not-a-role" as NeutronSubagentRole,
          taskInput: "Inspect routing",
        },
        fs,
      ),
    ).rejects.toThrow(ProtocolValidationError);
    expect([...fs.files.keys()]).toEqual([]);
  });

  it("returns null for a missing, malformed, invalid, or unreadable task", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      getNeutronSubagentTask({ root, taskId: "missing" }, fs),
    ).resolves.toBeNull();

    await fs.write(taskPath("malformed"), "{");
    await expect(
      getNeutronSubagentTask({ root, taskId: "malformed" }, fs),
    ).resolves.toBeNull();

    await fs.write(taskPath("invalid"), '{"schemaVersion":"9"}');
    await expect(
      getNeutronSubagentTask({ root, taskId: "invalid" }, fs),
    ).resolves.toBeNull();

    const reading = filesystem(
      new Map([[taskPath("readable"), "{}"]]),
      async () => [],
    );
    reading.read = async () => {
      throw new Error("read-failed");
    };
    reading.exists = async () => true;
    await expect(
      getNeutronSubagentTask({ root, taskId: "readable" }, reading),
    ).resolves.toBeNull();
  });

  it("propagates filesystem exists and list failures", async () => {
    const exists = filesystem(new Map(), async () => []);
    exists.exists = async () => {
      throw new Error("exists-failed");
    };
    await expect(
      getNeutronSubagentTask({ root, taskId: "task-1" }, exists),
    ).rejects.toThrow("exists-failed");

    const listing = filesystem(new Map(), async () => {
      throw new Error("list-failed");
    });
    await expect(listNeutronSubagentTasks({ root }, listing)).rejects.toThrow(
      "list-failed",
    );
  });

  it("rejects a resolved task path outside the project root", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      getNeutronSubagentTask({ root, taskId: "../../../../outside" }, fs),
    ).rejects.toThrow(/path traversal/);
  });

  it("filters only a nonempty conversation id and sorts by createdAt descending", async () => {
    const files = new Map<string, string>([
      [
        taskPath("task-new"),
        recordJson({
          id: "task-new",
          conversationId: "conv-a",
          createdAt: "2026-03-02T00:00:00.000Z",
        }),
      ],
      [
        taskPath("task-old"),
        recordJson({
          id: "task-old",
          conversationId: "conv-b",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
      [
        taskPath("task-mid"),
        recordJson({
          id: "task-mid",
          conversationId: null,
          createdAt: "2026-02-02T00:00:00.000Z",
        }),
      ],
      [taskPath("task-bad"), "{"],
      [taskPath("task-invalid"), '{"schemaVersion":"9"}'],
    ]);
    const fs = filesystem(files, async () => [
      absoluteTaskPath("task-new"),
      ".aif/neutron/subagents/task-old.json",
      ".aif\\neutron\\subagents\\task-mid.json",
      absoluteTaskPath("task-bad"),
      ".aif/neutron/subagents/task-invalid.json",
    ]);

    const listed = await listNeutronSubagentTasks({ root }, fs);
    expect(listed.map((record) => record.id)).toEqual([
      "task-new",
      "task-mid",
      "task-old",
    ]);

    const filtered = await listNeutronSubagentTasks(
      { root, conversationId: "conv-a" },
      fs,
    );
    expect(filtered.map((record) => record.id)).toEqual(["task-new"]);

    const empty = await listNeutronSubagentTasks(
      { root, conversationId: "" },
      fs,
    );
    const omitted = await listNeutronSubagentTasks({ root }, fs);
    expect(empty.map((record) => record.id)).toEqual([
      "task-new",
      "task-mid",
      "task-old",
    ]);
    expect(omitted.map((record) => record.id)).toEqual(
      empty.map((record) => record.id),
    );
  });

  it("does not write during local workspace sync on a memory filesystem", async () => {
    const fs = createMemoryFileSystem();
    const calls = { write: 0, mkdir: 0, remove: 0 };
    const observed: FileSystem & { files: Map<string, string> } = {
      ...fs,
      files: fs.files,
      async write(path, content) {
        calls.write += 1;
        await fs.write(path, content);
      },
      async mkdir(path) {
        calls.mkdir += 1;
        await fs.mkdir(path);
      },
      async remove(path) {
        calls.remove += 1;
        await fs.remove(path);
      },
    };
    await initProject({ root, adapters: ["codex"] }, observed);
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-1",
        role: "research",
        taskInput: "Inspect routing",
      },
      observed,
    );
    const before = new Map(observed.files);
    const writes = calls.write;
    const mkdirs = calls.mkdir;
    const removes = calls.remove;

    const synced = await syncLocalWorkspaceState(
      { root, projectId: "project-1" },
      observed,
    );

    expect(synced.projectId).toBe("project-1");
    expect(synced.subagentTasksCount).toBe(1);
    expect(calls.write).toBe(writes);
    expect(calls.mkdir).toBe(mkdirs);
    expect(calls.remove).toBe(removes);
    expect([...observed.files]).toEqual([...before]);
  });
});
