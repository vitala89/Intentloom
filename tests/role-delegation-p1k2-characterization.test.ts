import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryFileSystem,
  createProfile,
  delegateTaskRole,
  type FileSystem,
} from "@intentloom/application";
import { clampDelegationCapabilities } from "../packages/application/src/memory/role-delegation.js";
import {
  validateProfileDefinition,
  type ProfileDefinition,
} from "@intentloom/protocol";

function profile(
  name: string,
  overrides?: Partial<ProfileDefinition["allowedCapabilities"]>,
): ProfileDefinition {
  return validateProfileDefinition({
    schemaVersion: "1",
    name,
    description: "workspace profile",
    allowedCapabilities: {
      readOnly: false,
      allowedPaths: ["src/", "docs/"],
      allowedTools: ["git", "pnpm"],
      maxBudget: 50,
      allowNetwork: false,
      ...overrides,
    },
    activeRoles: ["context-scout", "feature-builder", "reviewer"],
    createdAt: "2026-07-26T00:00:00.000Z",
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

describe("P1K.2 role delegation behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects an invalid request before any filesystem write", async () => {
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
      delegateTaskRole({ schemaVersion: "9" }, { root: "project-root" }, fs),
    ).rejects.toThrow("unsupported delegation request schema version");
    expect(writes).toBe(0);
    expect(directories).toBe(0);
  });

  it("preserves the missing-profile error", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      delegateTaskRole(
        {
          schemaVersion: "1",
          profileName: "ghost-profile",
          role: "context-scout",
          parentTaskId: "task-1",
        },
        { root: "/project/missing-profile" },
        fs,
      ),
    ).rejects.toThrow("Profile not found: ghost-profile");
  });

  it("preserves the disallowed-role error", async () => {
    const root = "/project/disallowed-role";
    const fs = createMemoryFileSystem();
    await createProfile(
      { ...profile("narrow"), activeRoles: ["context-scout", "reviewer"] },
      { root },
      fs,
    );

    await expect(
      delegateTaskRole(
        {
          schemaVersion: "1",
          profileName: "narrow",
          role: "feature-builder",
          parentTaskId: "task-2",
        },
        { root },
        fs,
      ),
    ).rejects.toThrow(
      "Role [feature-builder] is not allowed by profile [narrow]",
    );
  });

  it("keeps context-scout and reviewer read-only with denial messages", () => {
    const prof = profile("dev");

    for (const role of ["context-scout", "reviewer"] as const) {
      const clamped = clampDelegationCapabilities(role, prof, {
        readOnly: false,
      });
      expect(clamped.effectiveCapabilities.readOnly).toBe(true);
      expect(clamped.deniedCapabilities).toEqual([
        "readOnly: false (role enforces read-only)",
      ]);
    }
  });

  it("follows profile read-only for other roles", () => {
    const readOnlyProfile = profile("read-only", { readOnly: true });
    const clamped = clampDelegationCapabilities(
      "feature-builder",
      readOnlyProfile,
      undefined,
    );
    expect(clamped.effectiveCapabilities.readOnly).toBe(true);
    expect(clamped.deniedCapabilities).toEqual([]);
  });

  it("does not allow network beyond the profile ceiling", () => {
    const prof = profile("offline");
    const clamped = clampDelegationCapabilities("feature-builder", prof, {
      allowNetwork: true,
    });
    expect(clamped.effectiveCapabilities.allowNetwork).toBe(false);
    expect(clamped.deniedCapabilities).toEqual([
      "allowNetwork: true (profile disallows network)",
    ]);
  });

  it("uses the minimum budget between profile and request", () => {
    const prof = profile("budgeted", { maxBudget: 50 });
    const clamped = clampDelegationCapabilities("feature-builder", prof, {
      maxBudget: 200,
    });
    expect(clamped.effectiveCapabilities.maxBudget).toBe(50);
    expect(clamped.deniedCapabilities).toEqual([]);
  });

  it("keeps allowed paths and tools unchanged from the profile", () => {
    const prof = profile("paths");
    const clamped = clampDelegationCapabilities("feature-builder", prof, {
      allowNetwork: true,
      maxBudget: 10,
    });
    expect(clamped.effectiveCapabilities.allowedPaths).toBe(
      prof.allowedCapabilities.allowedPaths,
    );
    expect(clamped.effectiveCapabilities.allowedTools).toBe(
      prof.allowedCapabilities.allowedTools,
    );
  });

  it("persists validated JSON with a trailing newline and stable id format", async () => {
    const root = "/project/persist";
    const fs = createMemoryFileSystem();
    await createProfile(profile("persist"), { root }, fs);
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_123);
    const isoSpy = vi
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-07-26T12:00:00.123Z");

    const delegation = await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "persist",
        role: "feature-builder",
        parentTaskId: "task-9",
      },
      { root },
      fs,
    );

    expect(delegation.delegationId).toBe("del-feature-builder-1700000000123");
    expect(delegation.createdAt).toBe("2026-07-26T12:00:00.123Z");
    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith(
        "/.aif/memory/delegations/del-feature-builder-1700000000123.json",
      ),
    );
    expect(stored?.[1]).toBe(`${JSON.stringify(delegation, null, 2)}\n`);

    nowSpy.mockRestore();
    isoSpy.mockRestore();
  });

  it("creates the delegations directory only when absent", async () => {
    const root = "/project/mkdir-once";
    const fs = createMemoryFileSystem();
    const directories = new Set<string>();
    let mkdirCount = 0;
    const baseExists = fs.exists.bind(fs);
    const baseMkdir = fs.mkdir.bind(fs);
    fs.exists = async (path) =>
      directories.has(path) ? true : baseExists(path);
    fs.mkdir = async (path) => {
      directories.add(path);
      mkdirCount += 1;
      return baseMkdir(path);
    };

    await createProfile(profile("delegate-only"), { root }, fs);
    mkdirCount = 0;
    await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "delegate-only",
        role: "context-scout",
        parentTaskId: "task-3",
      },
      { root },
      fs,
    );
    await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "delegate-only",
        role: "reviewer",
        parentTaskId: "task-4",
      },
      { root },
      fs,
    );

    expect(mkdirCount).toBe(1);
  });

  it("propagates filesystem failures", async () => {
    const root = "/project/write-fail";
    const fs = createMemoryFileSystem();
    await createProfile(profile("fail"), { root }, fs);
    fs.write = async () => {
      throw new Error("write failed");
    };

    await expect(
      delegateTaskRole(
        {
          schemaVersion: "1",
          profileName: "fail",
          role: "context-scout",
          parentTaskId: "task-5",
        },
        { root },
        fs,
      ),
    ).rejects.toThrow("write failed");
  });
});
