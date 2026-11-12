import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
} from "../packages/application/src/index.js";

const desiredCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock(
  "../packages/application/src/project-lifecycle/desired-generated-state.js",
  async () => {
    const actual = await vi.importActual<
      typeof import("../packages/application/src/project-lifecycle/desired-generated-state.js")
    >(
      "../packages/application/src/project-lifecycle/desired-generated-state.js",
    );
    return {
      ...actual,
      desired: async (...args: Parameters<typeof actual.desired>) => {
        desiredCalls.count += 1;
        return actual.desired(...args);
      },
    };
  },
);

const options = {
  root: "/project",
  profile: "generic",
  adapters: ["codex"] as const,
};

describe("P1I.3 adoption desired evaluations", () => {
  beforeEach(() => {
    desiredCalls.count = 0;
  });

  it("evaluates desired twice on a dry run and four times on a permitted write", async () => {
    const dry = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const before = [...dry.files.entries()];
    const preview = await adoptProject({ ...options, dryRun: true }, dry);
    expect(preview.applied).toBe(false);
    expect(preview.applicationStatus).toBe("not-requested");
    expect([...dry.files.entries()]).toEqual(before);
    expect(desiredCalls.count).toBe(2);

    desiredCalls.count = 0;
    const write = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const applied = await adoptProject(options, write);
    expect(applied.applied).toBe(true);
    expect(applied.applicationStatus).toBe("applied");
    expect(write.files.has("/project/.aif/manifest.lock.json")).toBe(true);
    expect(desiredCalls.count).toBe(4);
  });
});
