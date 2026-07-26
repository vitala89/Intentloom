import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  runLocalSecurityAdapters,
  correlateSecurityFindings,
  listSecurityFindings,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import {
  validateSecurityAdapterMetadata,
  validateSecurityAdapterResult,
  validateSecurityFinding,
} from "@intentloom/protocol";

describe("Memory & Security Candidate S2", () => {
  it("validates protocol schemas for security adapters and results", () => {
    const meta = validateSecurityAdapterMetadata({
      schemaVersion: "1",
      name: "built-in:secret-adapter",
      category: "secret",
      version: "1.0.0",
      readOnly: true,
      networkAccess: false,
    });

    expect(meta.name).toBe("built-in:secret-adapter");
    expect(meta.category).toBe("secret");
    expect(meta.readOnly).toBe(true);

    const result = validateSecurityAdapterResult({
      schemaVersion: "1",
      adapter: meta,
      findings: [],
      totalCount: 0,
      executedAt: new Date().toISOString(),
    });

    expect(result.adapter.name).toBe("built-in:secret-adapter");
    expect(result.totalCount).toBe(0);
  });

  it("correlates duplicate security findings by rule ID and evidence path", () => {
    const f1 = validateSecurityFinding({
      schemaVersion: "1",
      id: "f-1",
      ruleId: "secret/hardcoded-key",
      title: "Hardcoded key",
      severity: "medium",
      state: "open",
      category: "secret",
      description: "Medium severity finding",
      scanner: "ScannerA",
      evidence: [{ path: "config.json" }],
      trustClass: "verified-evidence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const f2 = validateSecurityFinding({
      schemaVersion: "1",
      id: "f-2",
      ruleId: "secret/hardcoded-key",
      title: "Hardcoded key",
      severity: "high",
      state: "open",
      category: "secret",
      description: "Higher severity finding for same rule and path",
      scanner: "ScannerB",
      evidence: [{ path: "config.json" }],
      trustClass: "verified-evidence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const correlated = correlateSecurityFindings([f1, f2]);
    expect(correlated).toHaveLength(1);
    expect(correlated[0]?.severity).toBe("high");
  });

  it("executes local deterministic security adapters for dependency, secret, and mcp checks", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await fs.mkdir(root);
    await fs.write(
      "/project/package.json",
      JSON.stringify({
        dependencies: {
          lodash: "*",
          express: "^4.18.0",
        },
      }),
    );
    await fs.write("/project/.env.production", "API_KEY=secret_12345");
    await fs.mkdir("/project/.aif/mcp");
    await fs.write(
      "/project/.aif/mcp/server.json",
      JSON.stringify({
        name: "test-mcp",
        allowGenericShell: true,
      }),
    );

    const adapterResults = await runLocalSecurityAdapters({ root }, fs);
    expect(adapterResults.length).toBeGreaterThanOrEqual(4);

    const depResult = adapterResults.find(
      (r) => r.adapter.category === "dependency",
    );
    expect(depResult?.findings).toHaveLength(1);
    expect(depResult?.findings[0]?.ruleId).toBe("dep/unpinned-wildcard");

    const secretResult = adapterResults.find(
      (r) => r.adapter.category === "secret",
    );
    expect(secretResult?.findings).toHaveLength(1);
    expect(secretResult?.findings[0]?.ruleId).toBe(
      "secret/sensitive-file-location",
    );

    const mcpResult = adapterResults.find((r) => r.adapter.category === "mcp");
    expect(mcpResult?.findings).toHaveLength(1);
    expect(mcpResult?.findings[0]?.ruleId).toBe(
      "mcp/unrestricted-shell-permission",
    );

    const savedFindings = await listSecurityFindings({ root }, fs);
    expect(savedFindings.length).toBeGreaterThanOrEqual(3);
  });

  it("routes security scan subcommand through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    await fs.mkdir("/project");
    await fs.write(
      "/project/package.json",
      JSON.stringify({
        dependencies: {
          badPkg: "latest",
        },
      }),
    );

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const scanExit = await runCli(
      [
        "security",
        "scan",
        "--category",
        "dependency",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );

    expect(scanExit).toBe(0);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].adapter.category).toBe("dependency");
    expect(parsed[0].findings).toHaveLength(1);
  });
});
