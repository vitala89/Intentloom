import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getSecurityAuditReport,
  importSarifSecurityReport,
  writeSandboxCapabilityPolicy,
  writeSecurityPolicy,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";
import {
  validateSandboxCapabilityPolicy,
  validateSecurityPolicy,
} from "@intentloom/protocol";

const catalogRoot = resolve("catalog");

const sampleSarif = JSON.stringify({
  $schema: "https://json.schemastore.org/sarif-2.1.0.json",
  version: "2.1.0",
  runs: [
    {
      tool: { driver: { name: "CodeQL", version: "2.15.0" } },
      results: [
        {
          ruleId: "js/sql-injection",
          level: "error",
          message: { text: "Database query built from user-controlled input" },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: "src/db/query.js" },
                region: { startLine: 42 },
              },
            },
          ],
        },
        {
          ruleId: "js/secret-exposure",
          level: "warning",
          message: { text: "Hardcoded secret key in config file" },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: ".env.production" },
                region: { startLine: 1 },
              },
            },
          ],
        },
      ],
    },
  ],
});

const criticalSarif = JSON.stringify({
  $schema: "https://json.schemastore.org/sarif-2.1.0.json",
  version: "2.1.0",
  runs: [
    {
      tool: { driver: { name: "CodeQL" } },
      results: [
        {
          ruleId: "js/critical-injection",
          level: "error",
          message: { text: "Critical vulnerability" },
          locations: [
            { physicalLocation: { artifactLocation: { uri: "src/app.js" } } },
          ],
        },
      ],
    },
  ],
});

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-security-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

function preparedSecurityRoot(root = "/project") {
  const fs = createMemoryFileSystem();
  return { fs, root, dependencies: { catalogRoot, fileSystem: fs } };
}

async function seedSarifImport(
  root: string,
  fs: ReturnType<typeof createMemoryFileSystem>,
) {
  await fs.mkdir(`${root}/reports`);
  await fs.write(`${root}/reports/codeql.sarif.json`, sampleSarif);
}

async function seedScanFindings(
  root: string,
  fs: ReturnType<typeof createMemoryFileSystem>,
) {
  await fs.mkdir(root);
  await fs.write(
    `${root}/package.json`,
    JSON.stringify({ dependencies: { lodash: "*", express: "^4.18.0" } }),
  );
  await fs.write(`${root}/.env.production`, "API_KEY=secret_12345");
}

describe("security CLI", () => {
  it("dispatches security through runCliEntry", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["security", "policy", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).defaultEnforcement).toBe("warn");
  });

  it.each([
    "import",
    "inspect",
    "coverage",
    "dismiss",
    "accept-risk",
    "list",
    "scan",
    "baseline",
    "policy",
    "sandbox",
    "audit",
    "verify",
  ] as const)(
    "recognizes security %s subcommand routing",
    async (subcommand) => {
      const { root, dependencies } = preparedSecurityRoot();
      const errors: string[] = [];

      const exitCode = await runCli(
        ["security", subcommand, "--root", root],
        dependencies,
        {
          stdout: () => undefined,
          stderr: (message) => errors.push(message),
        },
      );

      expect(errors.join("\n")).not.toContain(
        "security requires import, inspect, coverage, dismiss, accept-risk, list, scan, baseline, policy, sandbox, audit, or verify subcommand",
      );
      expect([0, 2, 3]).toContain(exitCode);
    },
  );

  it("rejects missing security subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "security requires import, inspect, coverage, dismiss, accept-risk, list, scan, baseline, policy, sandbox, audit, or verify subcommand",
    );
  });

  it("rejects unknown security subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "archive"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "security requires import, inspect, coverage, dismiss, accept-risk, list, scan, baseline, policy, sandbox, audit, or verify subcommand",
    );
  });

  it("parses options starting at index 2 by default", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).projectId).toBe("project-local");
  });

  it("parses baseline nested action options starting at index 3", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "baseline", "check", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).exitCode).toBe(0);
  });

  it("parses sandbox nested action options starting at index 3", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "sandbox", "validate", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).allowed).toBe(true);
  });

  it("rejects bare project root positionals", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(["security", "scan", root], dependencies, {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(`unexpected argument: ${root}`);
  });

  it("rejects duplicate --root", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--root", "/a", "--root", "/b"],
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
      ["security", "policy", "--unknown-flag"],
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
      ["security", "dismiss", "--id"],
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
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--root", root, "--dry-run", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).defaultEnforcement).toBe("warn");
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--root", root, "--profile", "generic", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).defaultEnforcement).toBe("warn");
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--force"],
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
      ["security", "policy", "--cache"],
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
      ["security", "policy", "--project-owned-mapping", "src=dest"],
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
      ["security", "policy", "--daemon-endpoint", "/tmp/intentloomd.sock"],
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

  it("rejects paired daemon flags on security", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "security",
        "policy",
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
    const { fs, root } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "policy", "--root", root],
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
      ["security", "policy", "--unknown-flag"],
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
    const { root, dependencies } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "dismiss", "--root", root, "--id", "missing-finding"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "security finding not found: missing-finding",
    );
  });

  it("imports SARIF with text output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "security",
        "import",
        "--file",
        "reports/codeql.sarif.json",
        "--root",
        root,
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Imported 2 security findings");
  });

  it("imports SARIF with JSON output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "security",
        "import",
        "--file",
        "reports/codeql.sarif.json",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).importedCount).toBe(2);
  });

  it("rejects import without --file", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "import", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "security import requires --file <path>",
    );
  });

  it("rejects malformed SARIF import", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await fs.mkdir(`${root}/reports`);
    await fs.write(`${root}/reports/bad.sarif`, "{ malformed json }");
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "import", "--file", "reports/bad.sarif", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("malformed SARIF JSON document");
  });

  it("reports inspect coverage with text output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "inspect", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Security Posture Report");
    expect(output.join("\n")).toContain("Total Findings: 2");
  });

  it("reports coverage with JSON output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "coverage", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).totalFindings).toBe(2);
  });

  it("dismisses a finding successfully", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "security",
        "dismiss",
        "--id",
        "sarif-finding-1",
        "--reason",
        "Reviewed OK",
        "--root",
        root,
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Dismissed security finding sarif-finding-1",
    );
  });

  it("uses default dismiss reason", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "dismiss", "--id", "sarif-finding-2", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Dismissed by maintainer");
  });

  it("rejects dismiss without finding ID", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "dismiss", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "security dismiss requires finding ID (--id or positional argument)",
    );
  });

  it("accepts risk successfully", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "accept-risk", "--id", "sarif-finding-1", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Accepted risk for security finding sarif-finding-1",
    );
  });

  it("uses default accept-risk approvedBy and reason", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "accept-risk", "--id", "sarif-finding-2", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("by maintainer");
  });

  it("lists findings with text and JSON output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );

    const textOutput: string[] = [];
    const textExit = await runCli(
      ["security", "list", "--root", root],
      dependencies,
      {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(textExit).toBe(0);
    expect(textOutput.join("\n")).toContain("Security Findings (2):");

    const jsonOutput: string[] = [];
    const jsonExit = await runCli(
      ["security", "list", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => jsonOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(jsonExit).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n"))).toHaveLength(2);
  });

  it("filters list by severity and state without strict enum validation", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedSarifImport(root, fs);
    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );

    const filteredOutput: string[] = [];
    const filteredExit = await runCli(
      [
        "security",
        "list",
        "--severity",
        "high",
        "--state",
        "open",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      {
        stdout: (message) => filteredOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(filteredExit).toBe(0);
    expect(Array.isArray(JSON.parse(filteredOutput.join("\n")))).toBe(true);

    const invalidOutput: string[] = [];
    const invalidExit = await runCli(
      [
        "security",
        "list",
        "--severity",
        "not-a-severity",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      {
        stdout: (message) => invalidOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(invalidExit).toBe(0);
    expect(JSON.parse(invalidOutput.join("\n"))).toHaveLength(0);
  });

  it("rejects bare positional finding IDs for dismiss", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "dismiss", "sarif-finding-1", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: sarif-finding-1");
  });

  it("runs all-category scan and exits 0 even with findings", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedScanFindings(root, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "scan", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Ran ");
    expect(output.join("\n")).toContain("findings");
  });

  it("runs single-category scan with JSON output", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await seedScanFindings(root, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "scan", "--category", "secret", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("treats bare security baseline as check", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "baseline", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Security Baseline & Policy Check");
  });

  it("runs explicit baseline update after findings import", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await importSarifSecurityReport(
      criticalSarif,
      "report.sarif",
      { root },
      fs,
    );

    const updateOutput: string[] = [];
    const updateExit = await runCli(
      ["security", "baseline", "update", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => updateOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(updateExit).toBe(0);
    expect(JSON.parse(updateOutput.join("\n")).acceptedFindings).toHaveLength(
      1,
    );
  });

  it("preserves security baseline --root PATH as baseline check", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "baseline", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Security Baseline & Policy Check");
    expect(output.join("\n")).toContain("Exit Code: 0");
  });

  it("returns exit 3 for baseline policy failure on stdout", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await importSarifSecurityReport(
      criticalSarif,
      "report.sarif",
      { root },
      fs,
    );
    await writeSecurityPolicy(
      validateSecurityPolicy({
        schemaVersion: "1",
        projectId: "p1",
        defaultEnforcement: "warn",
        rules: [{ target: "high", enforcement: "fail" }],
        updatedAt: new Date().toISOString(),
      }),
      { root },
      fs,
    );

    const output: string[] = [];
    const exitCode = await runCli(
      ["security", "baseline", "check", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.exitCode).toBe(3);
    expect(parsed.policyViolations.length).toBeGreaterThan(0);
  });

  it("reads security policy with text and JSON output", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const textOutput: string[] = [];
    const textExit = await runCli(
      ["security", "policy", "--root", root],
      dependencies,
      {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(textExit).toBe(0);
    expect(textOutput.join("\n")).toContain("Security Policy for");

    const jsonOutput: string[] = [];
    const jsonExit = await runCli(
      ["security", "policy", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => jsonOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(jsonExit).toBe(0);
    expect(JSON.parse(jsonOutput.join("\n")).defaultEnforcement).toBe("warn");
  });

  it("treats bare sandbox as policy when no nested action is present", async () => {
    const fs = createMemoryFileSystem();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "sandbox"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Sandbox Capability Policy");
  });

  it("preserves sandbox --root-only silent exit 0 compatibility quirk", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "sandbox", "--root", root],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toBe("");
    expect(errors.join("\n")).toBe("");
  });

  it("treats sandbox check as policy alias", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["security", "sandbox", "check", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).mode).toBe("proposal-only");
  });

  it("evaluates sandbox validate and eval aliases", async () => {
    const { root, dependencies } = preparedSecurityRoot();

    const validateOutput: string[] = [];
    const validateExit = await runCli(
      [
        "security",
        "sandbox",
        "validate",
        "--path",
        "src/index.ts",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      {
        stdout: (message) => validateOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(validateExit).toBe(0);
    expect(JSON.parse(validateOutput.join("\n")).allowed).toBe(true);

    const evalOutput: string[] = [];
    const evalExit = await runCli(
      ["security", "sandbox", "eval", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => evalOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(evalExit).toBe(0);
    expect(JSON.parse(evalOutput.join("\n")).allowed).toBe(true);
  });

  it("returns exit 3 for blocked sandbox evaluation on stdout", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await writeSandboxCapabilityPolicy(
      validateSandboxCapabilityPolicy({
        schemaVersion: "1",
        projectId: "p1",
        mode: "read-only",
        pathRules: [
          { pathPrefix: "src/", allowWrite: true, allowDelete: true },
        ],
        commandRules: [],
        allowNetwork: false,
        updatedAt: new Date().toISOString(),
      }),
      { root },
      fs,
    );

    const output: string[] = [];
    const exitCode = await runCli(
      ["security", "sandbox", "validate", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n")).allowed).toBe(false);
  });

  it("silently exits 0 for unknown sandbox actions", async () => {
    const { root, dependencies } = preparedSecurityRoot();
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      ["security", "sandbox", "foo", "--root", root],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toBe("");
    expect(errors.join("\n")).toBe("");
  });

  it("runs audit and verify with matching success semantics", async () => {
    const { root, dependencies } = preparedSecurityRoot();

    const auditOutput: string[] = [];
    const auditExit = await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => auditOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(auditExit).toBe(0);
    const auditReport = JSON.parse(auditOutput.join("\n"));
    expect(auditReport.healthScore).toBeGreaterThanOrEqual(80);

    const verifyOutput: string[] = [];
    const verifyExit = await runCli(
      ["security", "verify", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => verifyOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(verifyExit).toBe(0);
    const verifyReport = JSON.parse(verifyOutput.join("\n"));
    expect(verifyReport.invariantChecks).toHaveLength(28);
  });

  it("returns exit 3 for audit and verify policy failures", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();
    await importSarifSecurityReport(
      criticalSarif,
      "report.sarif",
      { root },
      fs,
    );
    await writeSecurityPolicy(
      validateSecurityPolicy({
        schemaVersion: "1",
        projectId: "p1",
        defaultEnforcement: "warn",
        rules: [{ target: "high", enforcement: "fail" }],
        updatedAt: new Date().toISOString(),
      }),
      { root },
      fs,
    );

    const auditOutput: string[] = [];
    const auditExit = await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => auditOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(auditExit).toBe(3);
    const auditReport = JSON.parse(auditOutput.join("\n"));
    expect(
      auditReport.invariantChecks.some(
        (check: { status: string }) => check.status === "failed",
      ),
    ).toBe(true);

    const verifyOutput: string[] = [];
    const verifyExit = await runCli(
      ["security", "verify", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => verifyOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(verifyExit).toBe(3);
    expect(
      JSON.parse(verifyOutput.join("\n")).invariantChecks.some(
        (check: { status: string }) => check.status === "failed",
      ),
    ).toBe(true);
  });

  it("persists audit reports through audit and verify", async () => {
    const { root, fs, dependencies } = preparedSecurityRoot();

    await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const report = await getSecurityAuditReport({ root }, fs);
    expect(report?.auditHash).toBeTruthy();
    expect(report?.invariantChecks.length).toBe(28);
  });
});
