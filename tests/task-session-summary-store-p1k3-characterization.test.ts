import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryFileSystem,
  getTaskSummary,
  listSessionSummaries,
  listTaskSummaries,
  recordSessionSummary,
  recordTaskSummary,
  type FileSystem,
} from "@intentloom/application";
import {
  validateSessionSummary,
  validateTaskSummary,
  type SessionSummary,
  type TaskSummary,
} from "@intentloom/protocol";

function task(
  id: string,
  overrides?: Partial<TaskSummary>,
): Omit<TaskSummary, "schemaVersion" | "createdAt"> & { createdAt?: string } {
  return {
    id,
    root: "/project",
    intent: `Intent for ${id}`,
    affectedPaths: ["src/app.ts"],
    validationOutcome: "passed",
    evidenceReferences: [],
    usedSkills: [],
    unresolvedWork: [],
    provenance: "p1k3-test",
    trustClass: "verified-evidence",
    retentionState: "active",
    ...overrides,
  };
}

function session(
  id: string,
  overrides?: Partial<SessionSummary>,
): Omit<SessionSummary, "schemaVersion" | "createdAt"> & {
  createdAt?: string;
} {
  return {
    id,
    root: "/project",
    profile: "generic",
    activeAdapters: ["cursor"],
    completedTaskIds: [],
    ...overrides,
  };
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

describe("P1K.3 task and session summary store behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists validated task JSON with filtered paths and a trailing newline", async () => {
    const root = "/project/p1k3-task-round-trip";
    const fs = createMemoryFileSystem();
    const created = await recordTaskSummary(
      {
        ...task("task-store-1"),
        affectedPaths: ["src/app.ts", ".env", "secrets/key.pem"],
      },
      { root },
      fs,
    );

    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith("/.aif/memory/tasks/task-store-1.json"),
    );
    expect(created.affectedPaths).toEqual(["src/app.ts"]);
    expect(stored?.[1]).toBe(`${JSON.stringify(created, null, 2)}\n`);
    expect(await getTaskSummary("task-store-1", { root }, fs)).toEqual(created);
  });

  it("rejects an invalid task summary before any filesystem write", async () => {
    let writes = 0;
    let directories = 0;
    const fs = fileSystem({
      async write() {
        writes += 1;
      },
      async mkdir() {
        directories += 1;
      },
    });

    await expect(
      recordTaskSummary(
        {
          ...task("bad"),
          validationOutcome: "not-a-valid-outcome" as "passed",
        },
        { root: "project-root" },
        fs,
      ),
    ).rejects.toThrow(/validation/i);
    expect(writes).toBe(0);
    expect(directories).toBe(0);
  });

  it("creates the task directory only when it is absent", async () => {
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

    await recordTaskSummary(task("one"), { root: "project-root" }, fs);
    await recordTaskSummary(task("two"), { root: "project-root" }, fs);
    expect(mkdirCount).toBe(1);
  });

  it("propagates exists failures from recordTaskSummary outside the read path", async () => {
    const fs = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
    });

    await expect(
      recordTaskSummary(task("one"), { root: "project-root" }, fs),
    ).rejects.toThrow("exists failed");
  });

  it("returns null for missing, malformed, invalid, or unreadable task summaries", async () => {
    const root = "/project/p1k3-get-task";
    const fs = createMemoryFileSystem();
    expect(await getTaskSummary("missing", { root }, fs)).toBeNull();

    await recordTaskSummary(task("stored"), { root }, fs);
    const key = [...fs.files.keys()].find((path) =>
      path.endsWith("/.aif/memory/tasks/stored.json"),
    );
    expect(key).toBeDefined();
    fs.files.set(key ?? "", "{");
    expect(await getTaskSummary("stored", { root }, fs)).toBeNull();
    fs.files.set(key ?? "", '{"schemaVersion":"9"}');
    expect(await getTaskSummary("stored", { root }, fs)).toBeNull();

    const failingRead = fileSystem({
      async exists() {
        return true;
      },
      async read() {
        throw new Error("read failed");
      },
    });
    expect(
      await getTaskSummary("stored", { root: "project-root" }, failingRead),
    ).toBe(null);

    const failingExists = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
    });
    await expect(
      getTaskSummary("stored", { root: "project-root" }, failingExists),
    ).rejects.toThrow("exists failed");
  });

  it("lists task summaries newest-first with filters and skips bad records", async () => {
    const root = "project-root";
    const validA = validateTaskSummary({
      schemaVersion: "1",
      ...task("alpha", {
        createdAt: "2026-07-25T01:00:00.000Z",
        trustClass: "verified-evidence",
        retentionState: "active",
      }),
    });
    const validB = validateTaskSummary({
      schemaVersion: "1",
      ...task("beta", {
        createdAt: "2026-07-25T02:00:00.000Z",
        trustClass: "agent-generated",
        retentionState: "archived",
      }),
    });
    const files = new Map<string, string>([
      [".aif/memory/tasks/alpha.json", JSON.stringify(validA)],
      [".aif/memory/tasks/beta.json", JSON.stringify(validB)],
      [".aif/memory/tasks/broken.json", "{"],
      [".aif/memory/tasks/invalid.json", '{"schemaVersion":"9"}'],
    ]);
    const fs = fileSystem({
      async list() {
        return [
          `${root}/README.md`,
          `${root}/.aif/memory/sessions/s1.json`,
          `${root}/.aif/memory/tasks/beta.json`,
          `${root}/.aif/memory/tasks/broken.json`,
          ".aif\\memory\\tasks\\alpha.json",
          `${root}/.aif/memory/tasks/invalid.json`,
          `${root}/.aif/memory/tasks/unreadable.json`,
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
      (await listTaskSummaries({ root }, fs)).map((item) => item.id),
    ).toEqual(["beta", "alpha"]);
    expect(
      (
        await listTaskSummaries({ root, trustClass: "verified-evidence" }, fs)
      ).map((item) => item.id),
    ).toEqual(["alpha"]);
    expect(
      (await listTaskSummaries({ root, retentionState: "archived" }, fs)).map(
        (item) => item.id,
      ),
    ).toEqual(["beta"]);
  });

  it("propagates a task list failure", async () => {
    const fs = fileSystem({
      async list() {
        throw new Error("list failed");
      },
    });

    await expect(
      listTaskSummaries({ root: "project-root" }, fs),
    ).rejects.toThrow("list failed");
  });

  it("persists session notes without secretLikePath filtering", async () => {
    const root = "/project/p1k3-session-notes";
    const fs = createMemoryFileSystem();
    const created = await recordSessionSummary(
      {
        ...session("sess-notes"),
        summaryNotes: ".env secrets/key.pem keep verbatim",
      },
      { root },
      fs,
    );

    expect(created.summaryNotes).toBe(".env secrets/key.pem keep verbatim");
    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith("/.aif/memory/sessions/sess-notes.json"),
    );
    expect(stored?.[1]).toBe(`${JSON.stringify(created, null, 2)}\n`);
  });

  it("lists session summaries newest-first and skips bad records", async () => {
    const root = "project-root";
    const older = validateSessionSummary({
      schemaVersion: "1",
      ...session("older", { createdAt: "2026-07-25T01:00:00.000Z" }),
    });
    const newer = validateSessionSummary({
      schemaVersion: "1",
      ...session("newer", { createdAt: "2026-07-25T02:00:00.000Z" }),
    });
    const files = new Map<string, string>([
      [".aif/memory/sessions/older.json", JSON.stringify(older)],
      [".aif/memory/sessions/newer.json", JSON.stringify(newer)],
      [".aif/memory/sessions/broken.json", "{"],
    ]);
    const fs = fileSystem({
      async list() {
        return [
          `${root}/.aif/memory/sessions/newer.json`,
          `${root}/.aif/memory/tasks/t.json`,
          ".aif\\memory\\sessions\\older.json",
          `${root}/.aif/memory/sessions/broken.json`,
        ];
      },
      async read(path) {
        const normalized = path.replaceAll("\\", "/");
        const content = [...files.entries()].find(([key]) =>
          normalized.endsWith(key),
        )?.[1];
        if (content === undefined) throw new Error(`missing ${path}`);
        return content;
      },
    });

    expect(
      (await listSessionSummaries({ root }, fs)).map((item) => item.id),
    ).toEqual(["newer", "older"]);
  });

  it("propagates write failures from recordSessionSummary", async () => {
    const fs = fileSystem({
      async exists() {
        return false;
      },
      async mkdir() {},
      async write() {
        throw new Error("write failed");
      },
    });

    await expect(
      recordSessionSummary(
        session("sess-write-fail"),
        { root: "project-root" },
        fs,
      ),
    ).rejects.toThrow("write failed");
  });
});
