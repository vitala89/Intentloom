import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createProfile,
  delegateTaskRole,
  getProfile,
  listProfiles,
  type FileSystem,
} from "@intentloom/application";
import {
  validateProfileDefinition,
  type ProfileDefinition,
} from "@intentloom/protocol";

function profile(name: string): ProfileDefinition {
  return validateProfileDefinition({
    schemaVersion: "1",
    name,
    description: "workspace profile",
    allowedCapabilities: {
      readOnly: false,
      allowedPaths: ["src/"],
      allowedTools: ["git"],
      maxBudget: 50,
      allowNetwork: false,
    },
    activeRoles: ["context-scout", "reviewer"],
    createdAt: "2026-07-26T00:00:00.000Z",
  });
}

function json(name: string): string {
  return JSON.stringify(profile(name));
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

describe("P1K.1 profile store behavior", () => {
  it("persists validated JSON and round-trips get and sorted list", async () => {
    const root = "/project/p1k1-round-trip";
    const fs = createMemoryFileSystem();
    const created = await createProfile(
      { ...profile("zeta-profile"), extra: true },
      { root },
      fs,
    );
    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith("/.aif/memory/profiles/zeta-profile.json"),
    );

    expect(created).toEqual(profile("zeta-profile"));
    expect(stored?.[1]).toBe(`${JSON.stringify(created, null, 2)}\n`);
    expect(await getProfile("zeta-profile", { root }, fs)).toEqual(created);
    await createProfile(profile("alpha-profile"), { root }, fs);
    expect((await listProfiles({ root }, fs)).map((item) => item.name)).toEqual(
      ["alpha-profile", "zeta-profile"],
    );
  });

  it("rejects an invalid profile before any filesystem write", async () => {
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
      createProfile({ schemaVersion: "9" }, { root: "project-root" }, fs),
    ).rejects.toThrow("unsupported profile definition schema version");
    expect(writes).toBe(0);
    expect(directories).toBe(0);
  });

  it("creates the profile directory only when it is absent", async () => {
    const directories = new Set<string>();
    let mkdirCount = 0;
    const written: string[] = [];
    const fs = fileSystem({
      async exists(path) {
        return directories.has(path);
      },
      async mkdir(path) {
        directories.add(path);
        mkdirCount += 1;
      },
      async write(_path, content) {
        written.push(content);
      },
    });

    await createProfile(profile("one"), { root: "project-root" }, fs);
    await createProfile(profile("two"), { root: "project-root" }, fs);

    expect(mkdirCount).toBe(1);
    expect(written).toEqual([
      `${JSON.stringify(profile("one"), null, 2)}\n`,
      `${JSON.stringify(profile("two"), null, 2)}\n`,
    ]);
  });

  it("propagates a directory exists failure from create", async () => {
    let writes = 0;
    const fs = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
      async write() {
        writes += 1;
      },
    });

    await expect(
      createProfile(profile("one"), { root: "project-root" }, fs),
    ).rejects.toThrow("exists failed");
    expect(writes).toBe(0);
  });

  it("returns null for a missing, malformed, invalid, or unreadable profile", async () => {
    const root = "/project/p1k1-get";
    const fs = createMemoryFileSystem();
    expect(await getProfile("missing", { root }, fs)).toBeNull();

    await createProfile(profile("stored"), { root }, fs);
    const key = [...fs.files.keys()].find((path) =>
      path.endsWith("/.aif/memory/profiles/stored.json"),
    );
    expect(key).toBeDefined();
    fs.files.set(key ?? "", "{");
    expect(await getProfile("stored", { root }, fs)).toBeNull();
    fs.files.set(key ?? "", '{"schemaVersion":"nope"}');
    expect(await getProfile("stored", { root }, fs)).toBeNull();

    const failingRead = fileSystem({
      async exists() {
        return true;
      },
      async read() {
        throw new Error("read failed");
      },
    });
    expect(
      await getProfile("stored", { root: "project-root" }, failingRead),
    ).toBe(null);

    const failingExists = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
    });
    await expect(
      getProfile("stored", { root: "project-root" }, failingExists),
    ).rejects.toThrow("exists failed");
  });

  it("lists root-prefixed and relative records in name order and skips bad files", async () => {
    const root = "project-root";
    const files = new Map<string, string>([
      [".aif/memory/profiles/zeta.json", json("zeta")],
      [".aif/memory/profiles/middle.json", json("middle")],
      [".aif/memory/profiles/alpha.json", json("alpha")],
      [".aif/memory/profiles/broken.json", "{"],
      [".aif/memory/profiles/invalid.json", '{"schemaVersion":"9"}'],
    ]);
    const fs = fileSystem({
      async list() {
        return [
          `${root}/README.md`,
          `${root}/.aif/memory/tasks/task.json`,
          `${root}/.aif/memory/profiles/zeta.json`,
          `${root}/.aif/memory/profiles/broken.json`,
          ".aif\\memory\\profiles\\alpha.json",
          `${root}/.aif/memory/profiles/invalid.json`,
          `${root}/.aif/memory/profiles/unreadable.json`,
          `${root}/.aif/memory/profiles/middle.json`,
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

    expect((await listProfiles({ root }, fs)).map((item) => item.name)).toEqual(
      ["alpha", "middle", "zeta"],
    );
  });

  it("propagates a profile list failure", async () => {
    const fs = fileSystem({
      async list() {
        throw new Error("list failed");
      },
    });

    await expect(listProfiles({ root: "project-root" }, fs)).rejects.toThrow(
      "list failed",
    );
  });

  it("keeps delegation on the profile read from the package root", async () => {
    const root = "/project/p1k1-delegate";
    const fs = createMemoryFileSystem();

    await expect(
      delegateTaskRole(
        {
          schemaVersion: "1",
          profileName: "missing-profile",
          role: "context-scout",
          parentTaskId: "task-1",
        },
        { root },
        fs,
      ),
    ).rejects.toThrow("Profile not found: missing-profile");

    await createProfile(profile("dev-profile"), { root }, fs);
    const delegation = await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "dev-profile",
        role: "context-scout",
        requestedCapabilities: { readOnly: false },
        parentTaskId: "task-2",
      },
      { root },
      fs,
    );

    expect(delegation.grantedRole).toBe("context-scout");
    expect(delegation.effectiveCapabilities.readOnly).toBe(true);
    expect(delegation.deniedCapabilities).toEqual([
      "readOnly: false (role enforces read-only)",
    ]);
  });
});
