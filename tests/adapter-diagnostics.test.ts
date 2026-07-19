import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
} from "../packages/application/src/index.js";

describe("adapter compatibility diagnostics", () => {
  it("reports Cursor experimental and unsupported capabilities from its contract", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["cursor"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const report = await doctorProject(options, fs);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "adapter-capability-experimental",
          severity: "warning",
          adapter: "cursor",
        }),
        expect.objectContaining({
          code: "adapter-capability-unsupported",
          severity: "info",
          adapter: "cursor",
        }),
      ]),
    );
  });

  it("reports missing adapter output", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["codex"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    await fs.remove("/project/AGENTS.md");
    expect((await doctorProject(options, fs)).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "generated-file-missing",
          path: "AGENTS.md",
          adapter: "codex",
        }),
      ]),
    );
  });

  it("reports a shared-file ownership conflict", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["claude", "codex", "cursor", "copilot"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const sourceMapPath = "/project/.aif/source-map.json";
    const sourceMap = JSON.parse(await fs.read(sourceMapPath));
    sourceMap.files = sourceMap.files.filter(
      (record: { path: string }) => record.path !== "AGENTS.md",
    );
    await fs.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
    expect((await doctorProject(options, fs)).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "shared-file-conflict",
          path: "AGENTS.md",
        }),
      ]),
    );
  });

  it("reports invalid path-scoped rule frontmatter without exposing content", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "typescript",
      adapters: ["cursor"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const path = ".cursor/rules/intentloom-typescript.mdc";
    await fs.write(`/project/${path}`, "PRIVATE globs: C:\\project\\**\n");
    const report = await doctorProject(options, fs);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "path-scoped-rule-invalid", path }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("PRIVATE");
  });

  it("reports incompatible stored ownership paths", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: ["codex"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const sourceMapPath = "/project/.aif/source-map.json";
    const sourceMap = JSON.parse(await fs.read(sourceMapPath));
    sourceMap.files[0].path = "C:\\project\\AGENTS.md";
    await fs.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
    expect((await doctorProject(options, fs)).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "stored-path-incompatible",
          path: ".aif/source-map.json",
        }),
      ]),
    );
  });

  it("reports an adapter selected with an unsupported profile", async () => {
    const fs = createMemoryFileSystem();
    const installed = {
      root: "/project",
      profile: "generic",
      adapters: ["codex"] as const,
      catalogRoot: resolve("catalog"),
    };
    await initProject(installed, fs);
    const report = await doctorProject(
      { ...installed, profile: "unknown-profile" },
      fs,
    );
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "adapter-profile-unsupported" }),
      ]),
    );
  });
});
