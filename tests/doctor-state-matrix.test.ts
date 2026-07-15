import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem, type FileSystem } from "@intentloom/cli";
import { runCli } from "../packages/cli/src/command.js";

type MemoryFs = FileSystem & { files: Map<string, string> };
interface DoctorCase {
  readonly name: string;
  readonly adapter?: "codex" | "copilot";
  readonly mutate?: (fs: MemoryFs) => Promise<void>;
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly exitCode: 0 | 3;
}

const catalogRoot = resolve("catalog");
const lock = "/project/.aif/manifest.lock.json";
const map = "/project/.aif/source-map.json";
const config = "/project/.aif/config.yaml";

async function json(fs: MemoryFs, path: string) {
  return JSON.parse(await fs.read(path));
}
async function writeJson(fs: MemoryFs, path: string, value: unknown) {
  await fs.write(path, `${JSON.stringify(value)}\n`);
}
async function initialized(adapter: "codex" | "copilot" = "codex") {
  const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
  const stderr: string[] = [];
  const exit = await runCli(
    ["init", "--root", "/project", "--adapters", adapter],
    { catalogRoot, fileSystem: fs },
    { stdout: () => undefined, stderr: (message) => stderr.push(message) },
  );
  expect(stderr).toEqual([]);
  expect(exit).toBe(0);
  return fs;
}

const cases: DoctorCase[] = [
  {
    name: "healthy installation",
    code: "installation-healthy",
    severity: "info",
    exitCode: 0,
  },
  {
    name: "missing config",
    mutate: async (fs) => fs.remove(config),
    code: "aif-config-missing",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "missing manifest",
    mutate: async (fs) => fs.remove(lock),
    code: "manifest-lock-missing",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "missing source map",
    mutate: async (fs) => fs.remove(map),
    code: "source-map-missing",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "malformed config",
    mutate: async (fs) => fs.write(config, "private-value: ["),
    code: "yaml-malformed",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "malformed manifest",
    mutate: async (fs) => fs.write(lock, "{"),
    code: "json-malformed",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "malformed source map",
    mutate: async (fs) => fs.write(map, "{"),
    code: "json-malformed",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "generated file missing",
    mutate: async (fs) => fs.remove("/project/AGENTS.md"),
    code: "generated-file-missing",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "generated checksum drift",
    mutate: async (fs) => fs.write("/project/AGENTS.md", "private drift\n"),
    code: "generated-checksum-drift",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "header without ownership proof",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      const sourceMap = await json(fs, map);
      manifest.generated = manifest.generated.filter(
        (record: { path: string }) => record.path !== "AGENTS.md",
      );
      sourceMap.files = sourceMap.files.filter(
        (record: { path: string }) => record.path !== "AGENTS.md",
      );
      await writeJson(fs, lock, manifest);
      await writeJson(fs, map, sourceMap);
    },
    code: "generated-header-without-ownership",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "orphaned source-map record",
    mutate: async (fs) => {
      const sourceMap = await json(fs, map);
      sourceMap.files.push({
        path: "orphan.md",
        checksum: "a".repeat(64),
        sources: ["policies/core.md"],
        ownership: "aif-owned-generated",
      });
      await writeJson(fs, map, sourceMap);
    },
    code: "source-map-record-orphaned",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "orphaned manifest entry",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      manifest.generated.push({
        path: "orphan.md",
        checksum: "a".repeat(64),
      });
      await writeJson(fs, lock, manifest);
    },
    code: "manifest-entry-orphaned",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "duplicate ownership destination",
    mutate: async (fs) => {
      const sourceMap = await json(fs, map);
      sourceMap.files.push(sourceMap.files[0]);
      await writeJson(fs, map, sourceMap);
    },
    code: "metadata-duplicate-destination",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "unsupported adapter selected",
    mutate: async (fs) =>
      fs.write(
        config,
        "schemaVersion: '1'\nprofile: generic\nadapters: [unsupported]\n",
      ),
    code: "schema-constraint-failed",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "adapter output stale",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      const sourceMap = await json(fs, map);
      manifest.adapterOutputVersion = "0.0.1";
      sourceMap.adapterOutputVersion = "0.0.1";
      await writeJson(fs, lock, manifest);
      await writeJson(fs, map, sourceMap);
    },
    code: "adapter-version-stale",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "experimental adapter capability",
    adapter: "copilot",
    code: "adapter-capability-experimental",
    severity: "warning",
    exitCode: 0,
  },
  {
    name: "profile mismatch",
    mutate: async (fs) => fs.write("/project/angular.json", "{}"),
    code: "profile-mismatch",
    severity: "warning",
    exitCode: 0,
  },
  {
    name: "conflicting instruction files",
    mutate: async (fs) => fs.write("/project/CLAUDE.md", "project\n"),
    code: "instruction-files-conflicting",
    severity: "warning",
    exitCode: 0,
  },
  {
    name: "owned generated header missing",
    mutate: async (fs) => fs.write("/project/AGENTS.md", "header removed\n"),
    code: "generated-header-missing",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "stale framework version",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      const sourceMap = await json(fs, map);
      manifest.frameworkVersion = "0.0.1";
      sourceMap.frameworkVersion = "0.0.1";
      await writeJson(fs, lock, manifest);
      await writeJson(fs, map, sourceMap);
    },
    code: "framework-version-stale",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "stale schema version",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      manifest.schemaVersion = "2";
      await writeJson(fs, lock, manifest);
    },
    code: "schema-version-stale",
    severity: "error",
    exitCode: 3,
  },
  {
    name: "conflicting selected adapters",
    mutate: async (fs) => {
      const manifest = await json(fs, lock);
      manifest.adapters = [{ id: "claude", version: "0.1.0" }];
      await writeJson(fs, lock, manifest);
    },
    code: "adapter-selection-conflict",
    severity: "error",
    exitCode: 3,
  },
];

describe("doctor existing-state matrix", () => {
  it.each(cases)("diagnoses $name deterministically", async (scenario) => {
    const fs = await initialized(scenario.adapter);
    await scenario.mutate?.(fs);
    const before = [...fs.files.entries()];
    const invoke = async () => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      const exitCode = await runCli(
        ["doctor", "--root", "/project", "--json"],
        { catalogRoot, fileSystem: fs },
        {
          stdout: (message) => stdout.push(message),
          stderr: (message) => stderr.push(message),
        },
      );
      expect(stderr).toEqual([]);
      return { exitCode, output: stdout.join("\n") };
    };
    const first = await invoke();
    const second = await invoke();
    expect(first).toEqual(second);
    expect(first.exitCode).toBe(scenario.exitCode);
    const report = JSON.parse(first.output);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: scenario.code,
          severity: scenario.severity,
          readOnly: true,
        }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(before);
    expect(first.output).not.toContain("private drift");
    expect(first.output).not.toContain("private-value");
  });
});
