import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-plan-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

describe("plan CLI", () => {
  it("dispatches plan through runCliEntry", async () => {
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      ["plan", "--task", "entry-dispatch-task"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("\n")) as Record<string, unknown>;
    expect(payload).toHaveProperty("featureBrief");
    expect(payload).toHaveProperty("contextPack");
  });

  it("plans a feature brief with --task", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", "bounded-task"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("\n")) as {
      featureBrief: { id: string };
      contextPack: { taskId: string };
    };
    expect(payload.featureBrief.id).toBe("bounded-task");
    expect(payload.contextPack.taskId).toBe("bounded-task");
  });

  it("rejects missing --task through application error", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("task identifier is required");
  });

  it("rejects empty --task through application error", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", ""],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("task identifier is required");
  });

  it("accepts --root without changing plan output shape", async () => {
    const projectRoot = resolve("plan root project");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--root", projectRoot, "--task", "root-task"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("\n")) as {
      featureBrief: { id: string };
    };
    expect(payload.featureBrief.id).toBe("root-task");
  });

  it("rejects positional project path", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "./repo"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: ./repo");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--unknown-flag"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--profile"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("missing value for --profile");
  });

  it("accepts legacy ignored boolean flags such as --strict", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--strict", "--task", "ignored-flag-task"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("featureBrief");
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--profile", "generic", "--task", "ignored-value-task"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("featureBrief");
  });

  it("rejects --force with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --cache with the clean-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--cache"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--project-owned-mapping", "src=dest"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("rejects paired daemon flags on plan", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "plan",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "daemon mode is only valid with doctor",
    );
  });

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--unknown-flag"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
    expect(stderr.join("\n")).not.toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("returns exit code 3 for broken catalog bootstrap", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", "catalog-task"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("does not block on invalid project metadata", async () => {
    const projectRoot = resolve("plan invalid metadata");
    const fs = createMemoryFileSystem({
      [join(projectRoot, ".aif/config.yaml")]:
        "profile: generic\nadapters:\n  - cursor\n",
      [join(projectRoot, ".aif/source-map.json")]: "null",
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--root", projectRoot, "--task", "metadata-task"],
      { catalogRoot, fileSystem: fs },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("featureBrief");
  });

  it("runs in a repository without stored config", async () => {
    const projectRoot = resolve("plan without config");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--root", projectRoot, "--task", "no-config-task"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("featureBrief");
  });

  it("prints the feature brief artifact shape on success", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", "shape-task"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("\n")) as {
      featureBrief: Record<string, unknown>;
      contextPack: Record<string, unknown>;
    };
    expect(payload.featureBrief).toMatchObject({
      schemaVersion: "1",
      id: "shape-task",
      title: "shape-task",
      status: "draft",
    });
    expect(payload.contextPack).toMatchObject({
      schemaVersion: "1",
      taskId: "shape-task",
    });
  });

  it("preserves the legacy --json quirk by JSON-encoding the string payload", async () => {
    const plain: string[] = [];
    const jsonFlag: string[] = [];

    const plainExit = await runCli(
      ["plan", "--task", "json-quirk-task"],
      { catalogRoot },
      { stdout: (message) => plain.push(message), stderr: () => undefined },
    );
    const jsonExit = await runCli(
      ["plan", "--task", "json-quirk-task", "--json"],
      { catalogRoot },
      {
        stdout: (message) => jsonFlag.push(message),
        stderr: () => undefined,
      },
    );

    expect(plainExit).toBe(0);
    expect(jsonExit).toBe(0);
    expect(JSON.parse(plain.join("\n"))).toHaveProperty("featureBrief");
    expect(JSON.parse(jsonFlag.join("\n"))).toBe(plain.join("\n"));
  });

  it("does not mutate project files", async () => {
    const projectRoot = resolve("plan read only");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "AGENTS.md")]: "before\n",
    });
    const before = fs.files.get(join(projectRoot, "AGENTS.md"));

    const exitCode = await runCli(
      ["plan", "--root", projectRoot, "--task", "read-only-task"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(fs.files.get(join(projectRoot, "AGENTS.md"))).toBe(before);
  });

  it("routes schema catalog failures through outer catch with --json", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", "catalog-json-task", "--json"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(stderr.join("\n"))).toMatchObject({
      status: "invalid",
      errorCode: expect.any(String),
      schemaFile: expect.any(String),
    });
  });

  it("preserves bare update legacy fallthrough to planFeature", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("task identifier is required");
  });
});
