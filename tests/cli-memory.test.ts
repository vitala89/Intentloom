import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acceptPersistentMemory,
  createMemoryFileSystem,
  createSkillProposal,
  evaluateSkillProposal,
  exportPersistentMemory,
  getPersistentMemoryItem,
  initProject,
  proposePersistentMemory,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-memory-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

async function preparedProject(root = "/project") {
  const fs = createMemoryFileSystem();
  await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
  return { fs, root, dependencies: { catalogRoot, fileSystem: fs } };
}

async function proposedItem(
  fs: ReturnType<typeof createMemoryFileSystem>,
  root: string,
  id = "mem-item",
) {
  return proposePersistentMemory(
    {
      id,
      projectId: "p",
      classification: "working-context",
      content: "memory content",
      provenance: "test",
    },
    { root },
    fs,
  );
}

describe("memory CLI", () => {
  it("dispatches memory through runCliEntry", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["memory", "summary", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      totalProposals: expect.any(Number),
    });
  });

  it.each([
    ["inspect", 0],
    ["summary", 0],
    ["list", 0],
    ["propose", 2],
    ["review", 2],
    ["accept", 2],
    ["forget", 2],
    ["export", 2],
    ["import", 2],
    ["search", 2],
    ["render", 2],
    ["index", 2],
  ] as const)(
    "recognizes memory %s subcommand routing",
    async (subcommand, expectedExit) => {
      const { root, dependencies } = await preparedProject();
      const errors: string[] = [];
      const base = ["memory", subcommand, "--root", root];

      const exitCode = await runCli(base, dependencies, {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      });

      expect(exitCode).toBe(expectedExit);
      expect(errors.join("\n")).not.toContain("unsupported memory subcommand");
    },
  );

  it("rejects missing memory subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unsupported memory subcommand");
  });

  it("rejects unknown memory subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "supersede"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unsupported memory subcommand");
  });

  it("parses options starting after the subcommand", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "summary", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toHaveProperty("totalProposals");
  });

  it("rejects bare project path positional after subcommand", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(["memory", "list", root], dependencies, {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(`unexpected argument: ${root}`);
  });

  it("accepts --root for project path", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects duplicate --root", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--root", "/a", "--root", "/b"],
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

  it("rejects unknown options", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--unknown-flag"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects missing option values", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "review", "--id"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("missing value for --id");
  });

  it("accepts legacy ignored boolean flags such as --dry-run", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--root", root, "--dry-run", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--root", root, "--profile", "generic", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--force"],
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
      ["memory", "list", "--cache"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects adoption mapping flags", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--project-owned-mapping", "src=dest"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("requires daemon endpoint and token file to be paired", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--daemon-endpoint", "/tmp/intentloomd.sock"],
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

  it("rejects paired daemon flags on memory", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "list",
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
    const { fs, root } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--root", root],
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

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "list", "--unknown-flag"],
      { catalogRoot: brokenRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --unknown-flag");
    expect(errors.join("\n")).not.toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("routes async application errors through outer catch", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "accept",
        "--root",
        root,
        "--id",
        "missing-item",
        "--approved-by",
        "reviewer",
        "--evidence",
        "note",
      ],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns exit 2 for malformed propose JSON", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "propose", "--root", root, "--json-input", "{bad"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns exit 2 for malformed import JSON", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "import",
        "--root",
        root,
        "--project-id",
        "p",
        "--json-input",
        "{bad",
      ],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("renders memory summary in text and JSON modes", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await createSkillProposal(
      {
        id: "prop-cli",
        name: "helper",
        version: "1.0.0",
        sourceTaskIds: ["task-1"],
        observedPattern: "pattern",
        confidence: 0.8,
        uncertainty: "none",
        requestedCapabilities: ["refactoring"],
        supportedProfiles: ["all"],
        validationExpectations: ["build"],
        privacyImpact: "none",
        trustClass: "verified-evidence",
        content: "content",
      },
      { root },
      fs,
    );
    await evaluateSkillProposal("prop-cli", { root }, fs);

    const textOutput: string[] = [];
    expect(
      await runCli(["memory", "summary", "--root", root], dependencies, {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(textOutput.join("\n")).toContain("Procedural Memory Summary:");
    expect(textOutput.join("\n")).toContain("Total Proposals:");

    const jsonOutput: string[] = [];
    expect(
      await runCli(
        ["memory", "summary", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => jsonOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))).toMatchObject({
      totalProposals: 1,
    });
  });

  it("renders memory inspect in text and JSON modes", async () => {
    const { root, dependencies } = await preparedProject();
    const textOutput: string[] = [];
    const jsonOutput: string[] = [];

    expect(
      await runCli(["memory", "inspect", "--root", root], dependencies, {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(textOutput.join("\n")).toContain("Procedural Memory Inspection:");

    expect(
      await runCli(
        ["memory", "inspect", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => jsonOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))).toHaveProperty("summary");
  });

  it("renders memory list in text and JSON modes", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "listed-item");
    const textOutput: string[] = [];
    const jsonOutput: string[] = [];

    expect(
      await runCli(["memory", "list", "--root", root], dependencies, {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(textOutput.join("\n")).toContain(
      "[listed-item] proposed working-context",
    );

    expect(
      await runCli(["memory", "list", "--root", root, "--json"], dependencies, {
        stdout: (message) => jsonOutput.push(message),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))[0]).toMatchObject({
      id: "listed-item",
    });
  });

  it("reviews an existing item with --id", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "review-id");
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "review", "--root", root, "--id", "review-id", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({ id: "review-id" });
  });

  it("returns silent exit 3 when review item is not found", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "review", "--root", root, "--id", "missing-review"],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(output.join("\n")).toBe("");
    expect(errors.join("\n")).toBe("");
  });

  it("rejects positional item IDs at parse time for review", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "pos-review");
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "review", "pos-review", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: pos-review");
  });

  it("proposes persistent memory as proposed lifecycle", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];
    const input = JSON.stringify({
      id: "proposed-cli",
      projectId: "p",
      classification: "working-context",
      content: "proposal body",
      provenance: "cli",
    });

    const exitCode = await runCli(
      ["memory", "propose", "--root", root, "--json-input", input, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      id: "proposed-cli",
      lifecycleState: "proposed",
    });
  });

  it("accepts persistent memory with required approval fields", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "accept-cli");
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "accept",
        "--root",
        root,
        "--id",
        "accept-cli",
        "--approved-by",
        "maintainer",
        "--evidence",
        "review",
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      id: "accept-cli",
      lifecycleState: "accepted",
    });
  });

  it("requires approval and evidence for accept", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "accept-missing");
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "accept", "--root", root, "--id", "accept-missing"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "memory accept requires --id, --approved-by, and --evidence",
    );
  });

  it("rejects positional item IDs at parse time for accept", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "pos-accept");
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "accept",
        "pos-accept",
        "--root",
        root,
        "--approved-by",
        "maintainer",
        "--evidence",
        "review",
      ],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: pos-accept");
  });

  it("forgets persistent memory and redacts content", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "forget-cli");
    await acceptPersistentMemory(
      "forget-cli",
      { approvedBy: "maintainer", evidence: "review" },
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["memory", "forget", "--root", root, "--id", "forget-cli", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      id: "forget-cli",
      lifecycleState: "deleted",
      content: "[REDACTED]",
    });
  });

  it("rejects positional item IDs at parse time for forget", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "pos-forget");
    const errors: string[] = [];

    const exitCode = await runCli(
      ["memory", "forget", "pos-forget", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: pos-forget");
  });

  it("exports persistent memory as JSON stdout regardless of --json", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "export-item");
    const plainOutput: string[] = [];
    const jsonFlagOutput: string[] = [];

    expect(
      await runCli(
        ["memory", "export", "--root", root, "--project-id", "p"],
        dependencies,
        {
          stdout: (message) => plainOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    const plain = JSON.parse(plainOutput.join("\n"));
    expect(plain).toHaveProperty("items");

    expect(
      await runCli(
        ["memory", "export", "--root", root, "--project-id", "p", "--json"],
        dependencies,
        {
          stdout: (message) => jsonFlagOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    const withJsonFlag = JSON.parse(jsonFlagOutput.join("\n"));
    expect(withJsonFlag.schemaVersion).toBe(plain.schemaVersion);
    expect(withJsonFlag.projectId).toBe(plain.projectId);
    expect(withJsonFlag.items).toEqual(plain.items);
  });

  it("imports persistent memory in text and JSON modes", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "bundle-item");
    const bundle = await exportPersistentMemory({ root, projectId: "p" }, fs);
    const textOutput: string[] = [];
    const jsonOutput: string[] = [];

    expect(
      await runCli(
        [
          "memory",
          "import",
          "--root",
          "/import-target",
          "--project-id",
          "p",
          "--json-input",
          JSON.stringify(bundle),
        ],
        dependencies,
        {
          stdout: (message) => textOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(textOutput.join("\n")).toContain(
      "Imported 1 persistent memory proposals",
    );

    expect(
      await runCli(
        [
          "memory",
          "import",
          "--root",
          "/import-target-json",
          "--project-id",
          "p",
          "--json-input",
          JSON.stringify(bundle),
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => jsonOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))[0]).toMatchObject({
      lifecycleState: "proposed",
    });
  });

  it("returns exit 2 when import project identity mismatches", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "mismatch-item");
    const bundle = await exportPersistentMemory({ root, projectId: "p" }, fs);
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "memory",
        "import",
        "--root",
        "/mismatch-target",
        "--project-id",
        "other",
        "--json-input",
        JSON.stringify(bundle),
      ],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("identity mismatch");
  });

  it("searches persistent memory with JSON stdout regardless of --json", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "search-item");
    await acceptPersistentMemory(
      "search-item",
      { approvedBy: "maintainer", evidence: "review" },
      { root },
      fs,
    );
    const plainOutput: string[] = [];
    const jsonFlagOutput: string[] = [];

    expect(
      await runCli(
        [
          "memory",
          "search",
          "--root",
          root,
          "--project-id",
          "p",
          "--query",
          "memory",
        ],
        dependencies,
        {
          stdout: (message) => plainOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    const plain = JSON.parse(plainOutput.join("\n"));
    expect(plain.items.map((item: { id: string }) => item.id)).toContain(
      "search-item",
    );

    expect(
      await runCli(
        [
          "memory",
          "search",
          "--root",
          root,
          "--project-id",
          "p",
          "--query",
          "memory",
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => jsonFlagOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(jsonFlagOutput.join("\n"))).toEqual(plain);
  });

  it("renders persistent memory context in text and JSON modes", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "render-item");
    await acceptPersistentMemory(
      "render-item",
      { approvedBy: "maintainer", evidence: "review" },
      { root },
      fs,
    );
    const textOutput: string[] = [];
    const jsonOutput: string[] = [];

    expect(
      await runCli(
        [
          "memory",
          "render",
          "--root",
          root,
          "--project-id",
          "p",
          "--query",
          "memory",
          "--target",
          "codex",
        ],
        dependencies,
        {
          stdout: (message) => textOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(textOutput.join("\n")).toContain("memory content");

    expect(
      await runCli(
        [
          "memory",
          "render",
          "--root",
          root,
          "--project-id",
          "p",
          "--query",
          "memory",
          "--target",
          "codex",
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => jsonOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))).toMatchObject({
      target: "codex",
      itemIds: ["render-item"],
    });
  });

  it("rebuilds index with JSON stdout and clears index without deleting items", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await proposedItem(fs, root, "index-item");
    await acceptPersistentMemory(
      "index-item",
      { approvedBy: "maintainer", evidence: "review" },
      { root },
      fs,
    );
    const rebuildOutput: string[] = [];
    const clearOutput: string[] = [];

    expect(
      await runCli(
        ["memory", "index", "--root", root, "--project-id", "p"],
        dependencies,
        {
          stdout: (message) => rebuildOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(rebuildOutput.join("\n"))).toMatchObject({
      schemaVersion: "1",
      projectId: "p",
      itemIds: ["index-item"],
    });
    expect(await fs.exists(`${root}/.aif/memory/index.json`)).toBe(true);

    expect(
      await runCli(
        ["memory", "index", "--root", root, "--clear"],
        dependencies,
        {
          stdout: (message) => clearOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(clearOutput.join("\n")).toBe("Cleared persistent memory index");
    expect(await fs.exists(`${root}/.aif/memory/index.json`)).toBe(false);
    expect(
      await getPersistentMemoryItem("index-item", { root }, fs),
    ).toBeDefined();
  });
});
