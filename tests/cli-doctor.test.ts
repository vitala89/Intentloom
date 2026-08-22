import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { createDoctorRequest } from "../packages/protocol/src/index.js";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function applicationDoctor(
  doctorRequest: ReturnType<typeof createDoctorRequest>,
) {
  const report = await doctorProject(
    {
      root: doctorRequest.params.root,
      profile: doctorRequest.params.profile,
      adapters: doctorRequest.params.adapters as ["codex"],
      catalogRoot,
    },
    nodeFileSystem,
  );
  return {
    findings: report.findings.map(
      ({ code, severity, category, path, message }) => ({
        code,
        severity,
        category,
        path,
        message,
      }),
    ),
    diagnostics: report.diagnostics,
    exitCode: report.findings.some((finding) => finding.severity === "error")
      ? (3 as const)
      : (0 as const),
  };
}

describe("doctor CLI", () => {
  it("dispatches doctor through runCliEntry", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n")).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "aif-config-missing" }),
      ]),
    );
  });

  it("accepts a positional project path without --root", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const output: string[] = [];

    const exitCode = await runCli(
      ["doctor", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(
      JSON.parse(output.join("\n")).findings.some(
        (finding: { code: string }) => finding.code === "aif-config-missing",
      ),
    ).toBe(true);
  });

  it("renders human output through the shared formatter", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        catalogRoot,
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--root", "/project"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("installation-healthy");
  });

  it("returns exit code 0 for a healthy initialized project", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        catalogRoot,
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "installation-healthy" }),
      ]),
    );
  });

  it("returns exit code 3 for error findings", async () => {
    const fs = createMemoryFileSystem({ "/project/private.txt": "secret" });
    const output: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(
      JSON.parse(output.join("\n")).findings.some(
        (finding: { severity: string }) => finding.severity === "error",
      ),
    ).toBe(true);
  });

  it("defaults adapters to codex when no config is present", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    const output: string[] = [];

    await runCli(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    const report = JSON.parse(output.join("\n"));
    expect(
      report.findings.every((finding: { adapter: string | null }) =>
        ["codex", null].includes(finding.adapter),
      ),
    ).toBe(true);
  });

  it("accepts --dry-run without changing doctor behavior", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "project\n" });
    await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        catalogRoot,
      },
      fs,
    );
    const before = [...fs.files.entries()];
    const output: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect([...fs.files.entries()]).toEqual(before);
    expect(JSON.parse(output.join("\n")).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "installation-healthy" }),
      ]),
    );
  });

  it("does not leak malformed metadata secrets in JSON output", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      {
        catalogRoot,
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
    expect(stdout.join("\n")).not.toContain("private");
  });

  it("requires explicit paired doctor daemon options", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--daemon-endpoint", "/tmp/intentloomd.sock"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors).toEqual([
      "--daemon-endpoint and --daemon-token-file must be used together",
    ]);
  });

  it("rejects daemon flags on non-doctor commands with legacy message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "sync",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors).toEqual(["daemon mode is only valid with doctor"]);
  });

  it("returns exit 2 when the daemon token file is missing", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "doctor",
        "--root",
        "/project",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/missing-doctor-token",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toMatch(/ENOENT|no such file/i);
  });

  it("returns exit 2 when the daemon token is too short", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-doctor-token-"));
    const tokenFile = join(parent, "token");
    await writeFile(tokenFile, "short", { mode: 0o600 });
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "doctor",
        "--root",
        parent,
        "--daemon-endpoint",
        join(parent, "daemon.sock"),
        "--daemon-token-file",
        tokenFile,
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors).toEqual(["session token is too short"]);
  });

  it("fails safely when the daemon token does not authenticate", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-doctor-auth-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    const tokenFile = join(parent, "token");
    await mkdir(root);
    await writeFile(tokenFile, "w".repeat(32), { mode: 0o600 });
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "n".repeat(32),
    });
    const errors: string[] = [];

    try {
      const exitCode = await runCli(
        [
          "doctor",
          "--root",
          root,
          "--daemon-endpoint",
          endpoint,
          "--daemon-token-file",
          tokenFile,
        ],
        { catalogRoot },
        { stdout: () => undefined, stderr: (message) => errors.push(message) },
      );

      expect(exitCode).toBe(2);
      expect(errors).toEqual(["authentication failed"]);
    } finally {
      await daemon.close();
    }
  });

  it("uses daemon wire exitCode on success", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloom-doctor-daemon-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    const tokenFile = join(parent, "token");
    const token = "m".repeat(32);
    await mkdir(root);
    await writeFile(tokenFile, token, { mode: 0o600 });
    await initProject(
      {
        root,
        profile: "generic",
        adapters: ["codex"],
        catalogRoot,
      },
      nodeFileSystem,
    );
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: token,
      doctor: applicationDoctor,
    });
    const output: string[] = [];

    try {
      const exitCode = await runCli(
        [
          "doctor",
          "--root",
          root,
          "--json",
          "--daemon-endpoint",
          endpoint,
          "--daemon-token-file",
          tokenFile,
        ],
        { catalogRoot },
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      const result = JSON.parse(output[0]!) as { exitCode: number };
      expect(exitCode).toBe(result.exitCode);
      expect(exitCode).toBe(0);
    } finally {
      await daemon.close();
    }
  });

  it("rejects unknown options with usage exit code", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["doctor", "--task", "example"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --task");
  });
});
