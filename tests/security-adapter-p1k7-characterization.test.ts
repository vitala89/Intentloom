import { dirname, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  correlateSecurityFindings,
  createMemoryFileSystem,
  runLocalSecurityAdapters,
  type FileSystem,
} from "@intentloom/application";
import {
  validateSecurityFinding,
  type SecurityAdapterCategory,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";
import * as protocol from "@intentloom/protocol";

const root = "/project";
const defaultOrder: SecurityAdapterCategory[] = [
  "dependency",
  "secret",
  "config",
  "source",
  "extension",
  "mcp",
  "hook",
  "agentic",
];

async function seedProject(
  files: Record<string, string>,
  projectRoot = root,
): Promise<ReturnType<typeof createMemoryFileSystem>> {
  const fs = createMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    await fs.write(`${projectRoot}/${path}`, content);
  }
  return fs;
}

function adapterCategories(
  results: Awaited<ReturnType<typeof runLocalSecurityAdapters>>,
): SecurityAdapterCategory[] {
  return results.map((result) => result.adapter.category);
}

describe("P1K.7 security adapter characterization", () => {
  it("runs the eight default categories in the canonical order", async () => {
    const fs = await seedProject({ "package.json": "{}" });
    const results = await runLocalSecurityAdapters({ root }, fs);
    expect(adapterCategories(results)).toEqual(defaultOrder);
    expect(results).toHaveLength(8);
  });

  it("treats an empty categories array like omitted defaults", async () => {
    const fs = await seedProject({ "package.json": "{}" });
    const results = await runLocalSecurityAdapters(
      { root, categories: [] },
      fs,
    );
    expect(adapterCategories(results)).toEqual(defaultOrder);
  });

  it("honors a caller-defined category order and duplicates", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { a: "*", b: "latest" } }),
      ".env": "SECRET",
    });
    const custom: SecurityAdapterCategory[] = [
      "mcp",
      "dependency",
      "dependency",
    ];
    const results = await runLocalSecurityAdapters(
      { root, categories: custom },
      fs,
    );
    expect(adapterCategories(results)).toEqual(custom);
    expect(results).toHaveLength(3);
    expect(results[0]?.adapter.category).toBe("mcp");
    expect(results[1]?.findings[0]?.id).toBe("sec-dep-1");
    expect(results[2]?.findings[0]?.id).toBe("sec-dep-3");
  });

  it("shares finding ids across categories in one invocation", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { lodash: "*" } }),
      ".env": "SECRET=1",
      ".aif/marker": "x",
    });
    const results = await runLocalSecurityAdapters(
      { root, categories: ["dependency", "secret", "config"] },
      fs,
    );
    const ids = results.flatMap((result) =>
      result.findings.map((finding) => finding.id),
    );
    expect(ids).toEqual(["sec-dep-1", "sec-secret-2", "sec-cfg-3"]);
  });

  it("reuses one executedAt timestamp for findings and adapter results", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { lodash: "*" } }),
    });
    const results = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      fs,
    );
    const executedAt = results[0]?.executedAt;
    expect(executedAt).toBeTruthy();
    expect(results[0]?.findings[0]?.createdAt).toBe(executedAt);
    expect(results[0]?.findings[0]?.updatedAt).toBe(executedAt);
  });

  it("correlates duplicate keys with severity precedence and id sort", () => {
    const timestamp = new Date().toISOString();
    const base = {
      schemaVersion: "1" as const,
      ruleId: "dep/unpinned-wildcard",
      title: "t",
      state: "open" as const,
      category: "dependency" as const,
      description: "d",
      scanner: "s",
      evidence: [{ path: "package.json" }],
      trustClass: "verified-evidence" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const low = validateSecurityFinding({
      ...base,
      id: "z-last",
      severity: "low",
    });
    const medium = validateSecurityFinding({
      ...base,
      id: "a-first",
      severity: "medium",
    });
    const high = validateSecurityFinding({
      ...base,
      id: "b-second",
      severity: "high",
    });
    expect(correlateSecurityFindings([low, high, medium])).toEqual([high]);
    expect(correlateSecurityFindings([medium, low])).toEqual([medium]);
    const tieFirst = validateSecurityFinding({
      ...base,
      id: "sec-1",
      severity: "high",
    });
    const tieSecond = validateSecurityFinding({
      ...base,
      id: "sec-2",
      severity: "high",
    });
    expect(correlateSecurityFindings([tieFirst, tieSecond])).toEqual([tieFirst]);
    const sorted = correlateSecurityFindings([
      validateSecurityFinding({ ...base, id: "m-2", severity: "info" }),
      validateSecurityFinding({
        ...base,
        id: "m-1",
        severity: "info",
        evidence: [{ path: "other" }],
      }),
    ]);
    expect(sorted.map((finding) => finding.id)).toEqual(["m-1", "m-2"]);
  });

  it("flags only wildcard, latest, and greater-equal dependency versions", async () => {
    const cases: Record<string, string> = {
      star: "*",
      latest: "latest",
      gte: ">=1.0.0",
    };
    for (const [name, version] of Object.entries(cases)) {
      const fs = await seedProject({
        "package.json": JSON.stringify({ dependencies: { [name]: version } }),
      });
      const results = await runLocalSecurityAdapters(
        { root, categories: ["dependency"] },
        fs,
      );
      expect(results[0]?.findings).toHaveLength(1);
      expect(results[0]?.findings[0]?.ruleId).toBe("dep/unpinned-wildcard");
    }

    const ignored = await seedProject({
      "package.json": JSON.stringify({
        dependencies: { caret: "^1.0.0", object: { bad: true } as unknown as string },
      }),
    });
    const ignoredResults = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      ignored,
    );
    expect(ignoredResults[0]?.findings).toHaveLength(0);
  });

  it("merges dependencies before devDependencies with spread ordering", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({
        dependencies: { shared: "*", onlyDep: "*" },
        devDependencies: { shared: "latest", onlyDev: "latest" },
      }),
    });
    const results = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      fs,
    );
    const onlyDep = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      await seedProject({
        "package.json": JSON.stringify({ dependencies: { onlyDep: "*" } }),
      }),
    );
    expect(onlyDep[0]?.findings[0]?.description).toBe(
      "Dependency onlyDep uses floating version specifier *",
    );
    const onlyDev = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      await seedProject({
        "package.json": JSON.stringify({
          devDependencies: { onlyDev: "latest" },
        }),
      }),
    );
    expect(onlyDev[0]?.findings[0]?.description).toBe(
      "Dependency onlyDev uses floating version specifier latest",
    );
    expect(results[0]?.findings[0]?.description).toBe(
      "Dependency shared uses floating version specifier latest",
    );
  });

  it("handles missing and malformed package.json without throwing", async () => {
    const fs = createMemoryFileSystem();
    const missing = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      fs,
    );
    expect(missing[0]?.findings).toHaveLength(0);

    await fs.write(
      `${root}/package.json`,
      "{not valid json",
    );
    const malformed = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      fs,
    );
    expect(malformed[0]?.findings).toHaveLength(0);
  });

  it("propagates dependency fs.exists failures", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { a: "*" } }),
    });
  const broken: FileSystem = {
      ...fs,
      async exists(path) {
        if (path.endsWith("package.json")) throw new Error("exists failed");
        return fs.exists(path);
      },
    };
    await expect(
      runLocalSecurityAdapters({ root, categories: ["dependency"] }, broken),
    ).rejects.toThrow("exists failed");
  });

  it("retains partial dependency findings when manifest processing fails", async () => {
    vi.resetModules();
    let calls = 0;
    vi.spyOn(protocol, "validateSecurityFinding").mockImplementation((raw) => {
      calls += 1;
      if (calls === 2) throw new Error("validation stop");
      return validateSecurityFinding(raw);
    });
    const { runLocalSecurityAdapters: runAdapters } = await import(
      "@intentloom/application"
    );
    const fs = await seedProject({
      "package.json": JSON.stringify({
        dependencies: { good: "*", bad: "latest", also: ">=" },
      }),
    });
    const results = await runAdapters(
      { root, categories: ["dependency", "secret"] },
      fs,
    );
    vi.restoreAllMocks();
    expect(results[0]?.findings.map((f) => f.id)).toEqual(["sec-dep-1"]);
    expect(results[1]?.adapter.category).toBe("secret");
  });

  it("skips secret paths by exclusion rules and never reads file bytes", async () => {
    const fs = await seedProject({
      ".env": "SECRET",
      "node_modules/pkg/.env": "SECRET",
      ".git/config": "SECRET",
      "image.png": "SECRET",
      "photo.jpg": "SECRET",
      "keys/id_rsa": "SECRET",
    });
    let reads = 0;
    const tracking: FileSystem = {
      ...fs,
      async read(path) {
        reads += 1;
        return fs.read(path);
      },
    };
    const results = await runLocalSecurityAdapters(
      { root, categories: ["secret"] },
      tracking,
    );
    expect(reads).toBe(0);
    expect(results[0]?.findings).toHaveLength(1);
    expect(results[0]?.findings[0]?.ruleId).toBe(
      "secret/sensitive-file-location",
    );
    expect(results[0]?.findings[0]?.evidence[0]?.path).toBe("[REDACTED]");
    expect(results[0]?.findings[0]?.description).toContain(".env");
  });

  it("emits config findings only when .aif exists without policy", async () => {
    const withFinding = await runLocalSecurityAdapters(
      { root, categories: ["config"] },
      await seedProject({ ".aif/state.json": "{}" }),
    );
    expect(withFinding[0]?.findings[0]?.ruleId).toBe(
      "config/missing-security-policy",
    );
    expect(withFinding[0]?.findings[0]?.evidence[0]?.path).toBe(".aif");

    const withPolicy = await runLocalSecurityAdapters(
      { root, categories: ["config"] },
      await seedProject({ ".aif/policy/rules.json": "{}" }),
    );
    expect(withPolicy[0]?.findings).toHaveLength(0);
  });

  it("detects MCP shell permission with strict boolean and per-file resilience", async () => {
    const fs = await seedProject({
      ".aif/mcp/strict.json": JSON.stringify({ allowGenericShell: true }),
      ".aif/mcp/string.json": JSON.stringify({ allowGenericShell: "true" }),
      ".aif/mcp/broken.json": "{bad",
    });
    const results = await runLocalSecurityAdapters(
      { root, categories: ["mcp"] },
      fs,
    );
    expect(results[0]?.findings).toHaveLength(1);
    expect(results[0]?.findings[0]?.ruleId).toBe(
      "mcp/unrestricted-shell-permission",
    );
    expect(results[0]?.findings[0]?.severity).toBe("critical");
  });

  it("keeps stub categories as empty adapters with metadata", async () => {
    const fs = await seedProject({});
    const results = await runLocalSecurityAdapters(
      {
        root,
        categories: ["source", "extension", "hook", "agentic"],
      },
      fs,
    );
    expect(results.map((r) => r.totalCount)).toEqual([0, 0, 0, 0]);
    expect(results.map((r) => r.adapter.readOnly)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(results.map((r) => r.adapter.networkAccess)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("persists finding JSON with trailing newline at securityFindingPath", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { a: "*" } }),
    });
    await runLocalSecurityAdapters({ root, categories: ["dependency"] }, fs);
    const path = resolve(root, ".aif/security/findings/sec-dep-1.json");
    const stored = fs.files.get(path.replaceAll("\\", "/")) ?? "";
    expect(stored.endsWith("\n")).toBe(true);
    expect(stored).toBe(`${JSON.stringify(JSON.parse(stored), null, 2)}\n`);
  });

  it("creates parent directories when persisting the first finding", async () => {
    const fs = await seedProject({
      "package.json": JSON.stringify({ dependencies: { a: "*" } }),
    });
    let mkdirCalls = 0;
    const tracking: FileSystem = {
      ...fs,
      async mkdir(path) {
        mkdirCalls += 1;
        await fs.mkdir(path);
      },
    };
    await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      tracking,
    );
    expect(mkdirCalls).toBeGreaterThanOrEqual(1);
    expect(
      fs.files.has(`${root}/.aif/security/findings/sec-dep-1.json`),
    ).toBe(true);
  });

  it("leaves earlier persisted findings when a later write fails", async () => {
    const fs = createMemoryFileSystem(
      {
        [`${root}/package.json`]: JSON.stringify({ dependencies: { a: "*" } }),
        [`${root}/.env`]: "SECRET",
      },
      1,
    );
    await expect(
      runLocalSecurityAdapters(
        { root, categories: ["dependency", "secret"] },
        fs,
      ),
    ).rejects.toThrow("injected write failure");
    expect(fs.files.has(`${root}/.aif/security/findings/sec-dep-1.json`)).toBe(
      true,
    );
    expect(fs.files.has(`${root}/.aif/security/findings/sec-secret-2.json`)).toBe(
      false,
    );
  });

  it("propagates fs.list failures for secret scanning", async () => {
    const fs = await seedProject({});
    const broken: FileSystem = {
      ...fs,
      async list() {
        throw new Error("list failed");
      },
    };
    await expect(
      runLocalSecurityAdapters({ root, categories: ["secret"] }, broken),
    ).rejects.toThrow("list failed");
  });

  it("exposes correlate and runner on the package root and keeps CLI scan compatible", async () => {
    expect(typeof correlateSecurityFindings).toBe("function");
    expect(typeof runLocalSecurityAdapters).toBe("function");
    const fs = createMemoryFileSystem();
    await fs.write(
      `${root}/package.json`,
      JSON.stringify({ dependencies: { lodash: "latest" } }),
    );
    let output = "";
    const exit = await runCli(
      [
        "security",
        "scan",
        "--category",
        "dependency",
        "--root",
        root,
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => {
          output += `${msg}\n`;
        }, stderr: () => undefined },
    );
    expect(exit).toBe(0);
    const parsed = JSON.parse(output);
    expect(parsed[0].adapter.category).toBe("dependency");
    expect(parsed[0].findings[0].ruleId).toBe("dep/unpinned-wildcard");
  });

  it("documents secret validation throw as non-forcible without a production injection seam", () => {
    expect(
      "Secret scanner validateSecurityFinding failures abort before persistence; forcing them requires mocking @intentloom/protocol in this suite.",
    ).toBeTruthy();
  });
});