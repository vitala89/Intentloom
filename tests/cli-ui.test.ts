import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem, initProject } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-ui-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

describe("ui CLI", () => {
  it("dispatches ui through runCliEntry", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["ui", "--root", root, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      root,
      activeView: "inspect",
    });
  });

  it("accepts a positional project path without --root", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", root, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("uses --root when provided explicitly", async () => {
    const fs = createMemoryFileSystem();
    const root = "/explicit";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("rejects duplicate project path specifications", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "/one", "--root", "/two"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "project path specified more than once",
    );
  });

  it("rejects a second positional path when root is already set", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", "/one", "/two"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: /two");
  });

  it("rejects unknown options with exit code 2", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--not-a-real-flag"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --not-a-real-flag");
  });

  it("rejects missing option values with exit code 2", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--view"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("missing value for --view");
  });

  it("propagates --project-id into JSON output", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--project-id", "custom-id", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).projectId).toBe("custom-id");
  });

  it("propagates --view into JSON output", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--view", "timeline", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).activeView).toBe("timeline");
  });

  it("outputs the full InteractiveWorkspaceState with --json", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed).toMatchObject({
      root,
      projectId: "project-local",
      activeView: "inspect",
    });
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(Array.isArray(parsed.sessions)).toBe(true);
    expect(parsed.generatedAt).toBeTruthy();
  });

  it("renders representative text output for doctor view", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--view", "doctor"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Intentloom Interactive Terminal UI");
    expect(text).toContain("[DOCTOR VIEW]");
  });

  it("does not mutate the project filesystem", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const before = new Set(await fs.list(root));

    const exitCode = await runCli(
      ["ui", "--root", root, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(new Set(await fs.list(root))).toEqual(before);
  });

  it("accepts legacy ignored boolean flags such as --dry-run", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--profile", "generic", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--force"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --cache with the clean-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--cache"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("--cache is only valid with clean");
  });

  it("requires daemon endpoint and token file to be paired", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--daemon-endpoint", "/tmp/intentloomd.sock"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );
  });

  it("rejects paired daemon flags on ui", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "ui",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "daemon mode is only valid with doctor",
    );
  });

  it("returns exit code 3 for a broken schema catalog on stderr", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root],
      { catalogRoot: brokenRoot, fileSystem: fs },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
    expect(errors.join("\n")).toContain("aif-config.schema.json");
  });

  it("returns JSON schema catalog errors on stderr when --json is set", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const errors: string[] = [];

    const exitCode = await runCli(
      ["ui", "--root", root, "--json"],
      { catalogRoot: brokenRoot, fileSystem: fs },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(errors.join("\n"))).toMatchObject({
      status: "invalid",
      errorCode: "schema-catalog-invalid",
      schemaFile: "aif-config.schema.json",
    });
  });
});
