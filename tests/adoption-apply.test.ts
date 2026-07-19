import { describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
  doctorExitCode,
  doctorProject,
} from "../packages/application/src/index.js";

const options = {
  root: "/project",
  profile: "generic",
  adapters: ["codex"] as const,
};

describe("adoption apply", () => {
  it("transactionally applies a reviewed clean proposal and is idempotent", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const first = await adoptProject(options, fs);
    expect(first.applied).toBe(true);
    expect(fs.files.has("/project/.aif/manifest.lock.json")).toBe(true);
    expect(fs.files.has("/project/.aif/source-map.json")).toBe(true);
    const sourceMap = JSON.parse(
      await fs.read("/project/.aif/source-map.json"),
    );
    expect(
      sourceMap.files.some(
        (record: { path: string }) => record.path === "README.md",
      ),
    ).toBe(false);
    expect(
      sourceMap.files.some(
        (record: { path: string }) => record.path === "AGENTS.md",
      ),
    ).toBe(true);
    const afterFirst = [...fs.files.entries()];
    const second = await adoptProject(options, fs);
    expect(second.applied).toBe(true);
    expect([...fs.files.entries()]).toEqual(afterFirst);
    expect(doctorExitCode(await doctorProject(options, fs))).toBe(0);
  });

  it("preserves existing project-owned destinations and aborts every write", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project-owned instructions\n",
    });
    const before = [...fs.files.entries()];
    const result = await adoptProject(options, fs);
    expect(result.applied).toBe(false);
    expect([...fs.files.entries()]).toEqual(before);
    expect(fs.files.has("/project/.aif/config.yaml")).toBe(false);
  });

  it("requires explicit confirmation before applying an ambiguous profile", async () => {
    const initial = {
      "/project/package.json": '{"devDependencies":{"typescript":"latest"}}',
      "/project/tsconfig.json": "{}",
      "/project/Cargo.toml": '[package]\nname = "mixed"\n',
    };
    const fs = createMemoryFileSystem(initial);
    const blocked = await adoptProject(options, fs);
    expect(blocked.applicationStatus).toBe("blocked");
    expect(blocked.diagnostics).toContain(
      "profile: explicit confirmation required",
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));

    const confirmed = await adoptProject(
      { ...options, profileConfirmed: true },
      fs,
    );
    expect(confirmed.applicationStatus).toBe("applied");
    expect(confirmed.applied).toBe(true);
  });

  it("rolls back a partial adoption transaction", async () => {
    const fs = createMemoryFileSystem();
    const result = await adoptProject(options, fs, {
      failAt: "manifest-finalize",
    });
    expect(result.applied).toBe(false);
    expect(result.applicationStatus).toBe("failed-restored");
    expect(result.transactionOutcome).toMatchObject({
      status: "failed",
      failedStage: "manifest-finalize",
      rollbackCompleted: true,
      rollbackFailures: [],
    });
    expect(fs.files.size).toBe(0);
  });
});
