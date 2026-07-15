import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  createMemoryFileSystem,
  doctorExitCode,
  doctorProject,
  initProject,
} from "@intentloom/cli";
import { runCli } from "../packages/cli/src/command.js";

const options = {
  root: "/project",
  profile: "generic",
  adapters: ["codex"] as const,
};

describe("doctor diagnostics", () => {
  it("reports missing required state and optional documentation without writing", async () => {
    const fs = createMemoryFileSystem({ "/project/private.txt": "secret" });
    const before = [...fs.files.entries()];

    const first = await doctorProject(options, fs);
    const second = await doctorProject(options, fs);

    expect(first).toEqual(second);
    expect([...fs.files.entries()]).toEqual(before);
    expect(first.findings.map((finding) => finding.code)).toEqual([
      "aif-config-missing",
      "manifest-lock-missing",
      "product-documentation-missing",
      "source-map-missing",
    ]);
    expect(first.findings.every((finding) => finding.readOnly)).toBe(true);
    expect(
      first.findings.find(
        (finding) => finding.code === "product-documentation-missing",
      )?.severity,
    ).toBe("warning");
    expect(doctorExitCode(first)).toBe(3);
    expect(fs.files.has("/project/.aif/config.yaml")).toBe(false);
  });

  it("returns informational healthy state and warning-only exit zero", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project" });
    await initProject(options, fs);
    const result = await doctorProject(options, fs);
    expect(
      result.findings.some((finding) => finding.severity === "error"),
    ).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "installation-healthy",
    );
    expect(doctorExitCode(result)).toBe(0);
  });

  it("normalizes malformed metadata into the doctor finding contract", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      {
        catalogRoot: resolve("catalog"),
        fileSystem: createMemoryFileSystem({
          "/project/.aif/config.yaml": "private: [",
        }),
      },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );
    expect(exitCode).toBe(3);
    expect(stderr).toEqual([]);
    const result = JSON.parse(stdout.join("\n"));
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "yaml-malformed",
          severity: "error",
          category: "schema",
          path: ".aif/config.yaml",
          readOnly: true,
        }),
      ]),
    );
    expect(stdout.join("\n")).not.toContain("private");
  });

  it("distinguishes stale versions, orphaned records, profile mismatch, and missing headers", async () => {
    const fs = createMemoryFileSystem({
      "/project/angular.json": "{}",
      "/project/README.md": "project",
    });
    await initProject(options, fs);
    const manifestPath = "/project/.aif/manifest.lock.json";
    const sourceMapPath = "/project/.aif/source-map.json";
    const manifest = JSON.parse(await fs.read(manifestPath));
    const sourceMap = JSON.parse(await fs.read(sourceMapPath));
    manifest.frameworkVersion = "0.0.1";
    sourceMap.frameworkVersion = "0.0.1";
    manifest.generated.push({ path: "orphan.md", checksum: "a".repeat(64) });
    sourceMap.files.push({
      path: "orphan.md",
      checksum: "a".repeat(64),
      sources: ["policies/core.md"],
      ownership: "aif-owned-generated",
    });
    await fs.write(manifestPath, `${JSON.stringify(manifest)}\n`);
    await fs.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
    await fs.write("/project/AGENTS.md", "header removed\n");

    const result = await doctorProject(options, fs);
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "framework-version-stale",
        "manifest-entry-orphaned",
        "source-map-record-orphaned",
        "profile-mismatch",
        "generated-header-missing",
      ]),
    );
  });

  it("validates planning artifacts during doctor without changing them", async () => {
    const fs = createMemoryFileSystem({
      "/project/.aif/plans/work.feature.json": "{}",
    });
    const before = [...fs.files.entries()];
    const stdout: string[] = [];
    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );
    const report = JSON.parse(stdout[0]!);
    expect(exitCode).toBe(3);
    expect(
      report.findings.some(
        (finding: { category: string; path: string }) =>
          finding.category === "schema" &&
          finding.path === ".aif/plans/work.feature.json",
      ),
    ).toBe(true);
    expect([...fs.files.entries()]).toEqual(before);
  });

  it("intrinsically diagnoses malformed metadata through the programmatic interface", async () => {
    const fs = createMemoryFileSystem({
      "/project/.aif/source-map.json": "{ malformed private bytes",
    });
    const result = await doctorProject(options, fs);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "json-malformed",
          path: ".aif/source-map.json",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("private bytes");
  });
});
