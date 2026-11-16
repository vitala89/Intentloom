import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelTask,
  createMemoryFileSystem,
  createTaskCheckpoint,
  deleteTaskCheckpoint,
  getTaskCheckpoint,
  listTaskCheckpoints,
  pauseTask,
  redirectTask,
  resumeTask,
  type FileSystem,
} from "@intentloom/application";
import {
  validateTaskCheckpoint,
  type TaskCheckpoint,
} from "@intentloom/protocol";

function checkpoint(
  id: string,
  overrides?: Partial<TaskCheckpoint>,
): TaskCheckpoint {
  return validateTaskCheckpoint({
    schemaVersion: "1",
    id,
    taskId: "task-p1k4",
    state: "active",
    completedSteps: [],
    unresolvedWork: [],
    createdSnapshotChecksum: "checksum",
    invalidatedPlans: [],
    createdAt: "2026-07-25T01:00:00.000Z",
    updatedAt: "2026-07-25T01:00:00.000Z",
    ...overrides,
  });
}

function fileSystem(overrides: Partial<FileSystem>): FileSystem {
  return {
    async exists() {
      return false;
    },
    async read() {
      throw new Error("read failed");
    },
    async write() {},
    async mkdir() {},
    async remove() {},
    async list() {
      return [];
    },
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
    ...overrides,
  };
}

describe("P1K.4 task checkpoint store behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists validated checkpoint JSON with a trailing newline under .aif/memory/checkpoints/", async () => {
    const root = "/project/p1k4-create";
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-store-1",
      {
        root,
        completedSteps: ["Init"],
        unresolvedWork: ["Build"],
      },
      fs,
    );

    expect(created.state).toBe("active");
    expect(created.id).toMatch(/^chk-task-store-1-\d+$/);
    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith(`/.aif/memory/checkpoints/${created.id}.json`),
    );
    expect(stored?.[1]).toBe(`${JSON.stringify(created, null, 2)}\n`);
    expect(await getTaskCheckpoint(created.id, { root }, fs)).toEqual(created);
  });

  it("reads Date.now separately for checkpoint id and snapshot checksum", async () => {
    let call = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      call += 1;
      if (call === 1) return 1_700_000_000_000;
      if (call === 2) return 1_700_000_000_111;
      return 1_700_000_000_222;
    });
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2026-01-01T00:00:00.000Z",
    );

    const created = await createTaskCheckpoint(
      "clock-task",
      { root: "/project" },
      createMemoryFileSystem(),
    );

    expect(created.id).toBe("chk-clock-task-1700000000000");
    expect(created.createdSnapshotChecksum).toHaveLength(64);
    expect(created.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(created.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("creates the checkpoint directory only when it is absent", async () => {
    const directories = new Set<string>();
    let mkdirCount = 0;
    const fs = fileSystem({
      async exists(path) {
        return directories.has(path);
      },
      async mkdir(path) {
        directories.add(path);
        mkdirCount += 1;
      },
      async write() {},
    });

    await createTaskCheckpoint("one", { root: "project-root" }, fs);
    await createTaskCheckpoint("two", { root: "project-root" }, fs);
    expect(mkdirCount).toBe(1);
  });

  it("returns null for missing, malformed, invalid, or unreadable checkpoints", async () => {
    const root = "/project/p1k4-get";
    const fs = createMemoryFileSystem();
    expect(await getTaskCheckpoint("missing", { root }, fs)).toBeNull();

    const created = await createTaskCheckpoint("stored", { root }, fs);
    const key = [...fs.files.keys()].find((path) => path.includes(created.id));
    expect(key).toBeDefined();
    fs.files.set(key ?? "", "{");
    expect(await getTaskCheckpoint(created.id, { root }, fs)).toBeNull();
    fs.files.set(key ?? "", '{"schemaVersion":"9"}');
    expect(await getTaskCheckpoint(created.id, { root }, fs)).toBeNull();

    const failingRead = fileSystem({
      async exists() {
        return true;
      },
      async read() {
        throw new Error("read failed");
      },
    });
    expect(
      await getTaskCheckpoint(
        created.id,
        { root: "project-root" },
        failingRead,
      ),
    ).toBe(null);

    const failingExists = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
    });
    await expect(
      getTaskCheckpoint(created.id, { root: "project-root" }, failingExists),
    ).rejects.toThrow("exists failed");
  });

  it("lists checkpoints newest-first with task filters and cross-platform paths", async () => {
    const root = "project-root";
    const older = checkpoint("chk-old", {
      taskId: "task-a",
      updatedAt: "2026-07-25T01:00:00.000Z",
    });
    const newer = checkpoint("chk-new", {
      taskId: "task-b",
      updatedAt: "2026-07-25T02:00:00.000Z",
    });
    const sameTask = checkpoint("chk-a2", {
      taskId: "task-a",
      updatedAt: "2026-07-25T03:00:00.000Z",
    });
    const files = new Map<string, string>([
      [".aif/memory/checkpoints/chk-old.json", JSON.stringify(older)],
      [".aif/memory/checkpoints/chk-new.json", JSON.stringify(newer)],
      [".aif/memory/checkpoints/chk-a2.json", JSON.stringify(sameTask)],
      [".aif/memory/checkpoints/broken.json", "{"],
      [".aif/memory/checkpoints/invalid.json", '{"schemaVersion":"9"}'],
    ]);
    const fs = fileSystem({
      async list() {
        return [
          `${root}/README.md`,
          `${root}/.aif/memory/checkpoints/chk-new.json`,
          `${root}/.aif/memory/checkpoints/broken.json`,
          ".aif\\memory\\checkpoints\\chk-old.json",
          `${root}/.aif/memory/checkpoints/chk-a2.json`,
          `${root}/.aif/memory/checkpoints/invalid.json`,
          `${root}/.aif/memory/checkpoints/unreadable.json`,
        ];
      },
      async read(path) {
        const normalized = path.replaceAll("\\", "/");
        if (normalized.endsWith("/unreadable.json")) {
          throw new Error("read failed");
        }
        const content = [...files.entries()].find(([key]) =>
          normalized.endsWith(key),
        )?.[1];
        if (content === undefined) throw new Error(`missing ${path}`);
        return content;
      },
    });

    expect(
      (await listTaskCheckpoints({ root }, fs)).map((item) => item.id),
    ).toEqual(["chk-a2", "chk-new", "chk-old"]);
    expect(
      (await listTaskCheckpoints({ root, taskId: "task-a" }, fs)).map(
        (item) => item.id,
      ),
    ).toEqual(["chk-a2", "chk-old"]);
  });

  it("propagates filesystem list failures from listTaskCheckpoints", async () => {
    const fs = fileSystem({
      async list() {
        throw new Error("list failed");
      },
    });

    await expect(
      listTaskCheckpoints({ root: "project-root" }, fs),
    ).rejects.toThrow("list failed");
  });

  it("throws the existing not-found error for missing pause, cancel, redirect, and resume targets", async () => {
    const fs = createMemoryFileSystem();
    const root = { root: "/project" };
    await expect(pauseTask("chk-missing", root, fs)).rejects.toThrow(
      "Task checkpoint not found: chk-missing",
    );
    await expect(cancelTask("chk-missing", root, fs)).rejects.toThrow(
      "Task checkpoint not found: chk-missing",
    );
    await expect(
      redirectTask("chk-missing", "new intent", root, fs),
    ).rejects.toThrow("Task checkpoint not found: chk-missing");
    await expect(resumeTask("chk-missing", root, fs)).rejects.toThrow(
      "Task checkpoint not found: chk-missing",
    );
  });

  it("applies pause, cancel, redirect, and resume transitions with existing semantics", async () => {
    const root = "/project/p1k4-transitions";
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint("task-trans", { root }, fs);

    const paused = await pauseTask(created.id, { root }, fs);
    expect(paused.state).toBe("paused");

    const cancelled = await cancelTask(created.id, { root }, fs);
    expect(cancelled.state).toBe("cancelled");
    await expect(resumeTask(created.id, { root }, fs)).rejects.toThrow(
      `Cannot resume cancelled task checkpoint: ${created.id}`,
    );

    const activeAgain = await createTaskCheckpoint(
      "task-redirect",
      { root },
      fs,
    );
    const redirected = await redirectTask(
      activeAgain.id,
      "Build the API layer",
      { root, reason: "unused" },
      fs,
    );
    expect(redirected.state).toBe("redirected");
    expect(redirected.unresolvedWork.at(-1)).toBe(
      "Redirected: Build the API layer",
    );
    expect(redirected.invalidatedPlans).toHaveLength(1);
    expect(redirected.invalidatedPlans[0]).toMatch(/^plan-invalidated-\d+$/);

    const resumed = await resumeTask(activeAgain.id, { root }, fs);
    expect(resumed.valid).toBe(true);
    expect(resumed.verifiedRoot).toBe(root);
    expect(resumed.invalidatedCount).toBe(1);
    expect(resumed.checkpointId).toBe(activeAgain.id);
    expect(resumed.resumedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const afterResume = await getTaskCheckpoint(activeAgain.id, { root }, fs);
    expect(afterResume?.state).toBe("resumed");
  });

  it("allows repeated pause and redirect transitions without extra state guards", async () => {
    const root = "/project/p1k4-repeat";
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint("task-repeat", { root }, fs);
    await pauseTask(created.id, { root }, fs);
    const pausedAgain = await pauseTask(created.id, { root }, fs);
    expect(pausedAgain.state).toBe("paused");

    const redirected = await redirectTask(created.id, "first", { root }, fs);
    const redirectedAgain = await redirectTask(
      created.id,
      "second",
      { root },
      fs,
    );
    expect(redirectedAgain.invalidatedPlans.length).toBe(
      redirected.invalidatedPlans.length + 1,
    );
    expect(redirectedAgain.unresolvedWork.at(-1)).toBe("Redirected: second");
  });

  it("deletes existing checkpoints and returns false when absent", async () => {
    const root = "/project/p1k4-delete";
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint("task-del", { root }, fs);
    expect(await deleteTaskCheckpoint("missing", { root }, fs)).toBe(false);
    expect(await deleteTaskCheckpoint(created.id, { root }, fs)).toBe(true);
    expect(await getTaskCheckpoint(created.id, { root }, fs)).toBeNull();
    expect(await deleteTaskCheckpoint(created.id, { root }, fs)).toBe(false);
  });

  it("propagates delete remove failures", async () => {
    const root = "/project/p1k4-delete-fail";
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint("task-del-fail", { root }, fs);
    const failing = fileSystem({
      async exists() {
        return true;
      },
      async remove() {
        throw new Error("remove failed");
      },
    });
    await expect(
      deleteTaskCheckpoint(created.id, { root }, failing),
    ).rejects.toThrow("remove failed");
  });
});
